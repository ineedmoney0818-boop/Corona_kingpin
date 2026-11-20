import { execFileSync } from "node:child_process";
import { test, expect, sql, attach, credits, makeReel, a11y, userId, SUPABASE, SECRET } from "./fixtures";

const rendersFor = (email: string) => sql(`select count(*) from renders where user_id = :'p1'`, [userId(email)]);
const spendsFor = (email: string) => sql(`select count(*) from credit_ledger where user_id = :'p1' and kind = 'spend'`, [userId(email)]);

test.describe("F02 make a reel from my clips", () => {
  test("F02-H1 upload, make, render, download", async ({ page, user }) => {
    await attach(page, ["clip.mp4", "photo.jpg"]);
    await expect(page.getByRole("button", { name: /Make reel 4 credits/ })).toBeDisabled(); // no prompt yet
    await makeReel(page, "3 things I do before 7am");
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
    expect(await credits(page)).toBe(6);
    await a11y(page, "chat with finished reel");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download" }).filter({ visible: true }).click()]);
    const file = await dl.path();
    const info = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name", "-of", "csv=p=0", file!]).toString();
    expect(info).toContain("h264");
    expect(spendsFor(user.email)).toBe("1");
  });

  test("F02-E1 empty prompt keeps the button disabled", async ({ page, user }) => {
    await expect(page.getByRole("button", { name: /Make reel 4 credits/ })).toBeDisabled();
    await page.getByLabel("What do you want to make?").fill("   ");
    await expect(page.getByRole("button", { name: /Make reel 4 credits/ })).toBeDisabled();
  });

  test("F02-E2 very long prompt with emoji", async ({ page, user }) => {
    const prompt = ("Morning ritual ☕️ with Zoë — " + "lorem ipsum ".repeat(200)).slice(0, 2000);
    await makeReel(page, prompt);
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
    const title = await page.getByRole("heading", { level: 1 }).textContent();
    expect(title!.length).toBeLessThanOrEqual(60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });

  test("F02-E3 double click on the cost button charges once", async ({ page, user }) => {
    await page.getByLabel("What do you want to make?").fill("double click test");
    await page.getByRole("button", { name: /Make reel 4 credits/ }).dblclick();
    await page.waitForURL("**/app/chats/**");
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
    expect(rendersFor(user.email)).toBe("1");
    expect(await credits(page)).toBe(6);
  });

  test("F02-E4 five parallel identical requests: one render, one charge, no orphans", async ({ page, user }) => {
    const res = await page.evaluate(async () => {
      const q = (await (await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: '{"kind":"new-reel"}' })).json()).quote;
      const body = JSON.stringify({ chatId: null, prompt: "race", attachmentIds: [], kind: "reel", quoteId: q.id, idempotencyKey: "race-key-12345" });
      return Promise.all([1, 2, 3, 4, 5].map(async () => { const r = await fetch("/api/generations", { method: "POST", headers: { "content-type": "application/json" }, body }); return [r.status, (await r.json()).renderId]; }));
    });
    expect(new Set(res.map((r) => r[1])).size).toBe(1);
    expect(res.filter((r) => r[0] === 201)).toHaveLength(1);
    expect(rendersFor(user.email)).toBe("1");
    expect(spendsFor(user.email)).toBe("1");
    expect(sql(`select count(*) from chats where user_id = :'p1'`, [userId(user.email)])).toBe("1");
    expect(sql(`select count(*) from messages where user_id = :'p1' and role = 'user'`, [userId(user.email)])).toBe("1");
  });

  test("F02-E5 refresh mid-render keeps going", async ({ page, user }) => {
    await attach(page, ["clip.mp4"]);
    await makeReel(page, "refresh test");
    await page.reload();
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
  });

  test("F02-E6 back button right after submit makes no duplicate", async ({ page, user }) => {
    await makeReel(page, "back test");
    await page.goBack();
    await page.waitForURL("**/app");
    await page.goForward();
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
    expect(rendersFor(user.email)).toBe("1");
  });

  test("F02-E7 offline upload fails on the chip, nothing charged", async ({ page, context, user }) => {
    await context.setOffline(true);
    await page.setInputFiles("#composer-files", `${__dirname}/media/photo.jpg`);
    await expect(page.getByText(/Upload failed|Check your connection/)).toBeVisible();
    await context.setOffline(false);
    expect(await credits(page)).toBe(10);
  });

  test("F02-E8 slow network: button locks while starting", async ({ page, user }) => {
    await page.route("**/api/generations", async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
    await page.getByLabel("What do you want to make?").fill("slow network");
    // Locate the submit button by its form, not its name: the name changes to "Starting…".
    const submit = page.getByRole("form", { name: "Message Reelplain" }).locator("button[type=submit]");
    await submit.click();
    await expect(submit).toContainText("Starting…");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await page.waitForURL("**/app/chats/**");
  });

  test("F02-E9 a second user cannot see any of it", async ({ page, user, newUser }) => {
    await attach(page, ["photo.jpg"]);
    await makeReel(page, "private reel");
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
    const chatId = page.url().split("/").pop()!;
    const renderId = await page.getByRole("link", { name: "Download" }).filter({ visible: true }).getAttribute("href").then((h) => h!.split("/")[3]);
    const fileKey = await page.getByLabel("Your reel").filter({ visible: true }).getAttribute("src").then((s) => s!.replace("/api/files/", ""));
    const eve = await newUser("Eve");
    const statuses = await eve.page.evaluate(async ([r, f]) => [
      (await fetch(`/api/renders/${r}`)).status, (await fetch(`/api/renders/${r}/download`)).status, (await fetch(`/api/files/${f}`)).status,
    ], [renderId, fileKey]);
    expect(statuses).toEqual([404, 404, 404]);
    await eve.page.goto(`/app/chats/${chatId}`);
    await expect(eve.page.getByRole("heading", { name: "That chat isn't here" })).toBeVisible();
  });

  test("F02-N1 not enough credits: told before tapping, refused if forced", async ({ page, user }) => {
    sql(`update credit_accounts set plan_credits = 2 where user_id = :'p1'`, [userId(user.email)]);
    await page.reload();
    await expect(page.getByText("You have 2, this needs 4.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Get credits" })).toBeVisible();
    const status = await page.evaluate(async () => {
      const q = (await (await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: '{"kind":"new-reel"}' })).json()).quote;
      return (await fetch("/api/generations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId: null, prompt: "x", attachmentIds: [], kind: "reel", quoteId: q.id, idempotencyKey: "poor-123456" }) })).status;
    });
    expect(status).toBe(402);
    expect(sql(`select count(*) from chats where user_id = :'p1'`, [userId(user.email)])).toBe("0");
  });

  test("F02-N2 wrong file type is refused before upload", async ({ page, user }) => {
    await page.setInputFiles("#composer-files", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByText("Use a JPG, PNG or WebP photo, or an MP4, MOV or WebM video.")).toBeVisible();
  });

  test("F02-N3 failed render refunds automatically", async ({ page, user }) => {
    await attach(page, ["desk.png"]);
    const key = sql(`select storage_path from assets where user_id = :'p1' order by created_at desc limit 1`, [userId(user.email)]);
    const del = await fetch(`${SUPABASE}/storage/v1/object/media/${key}`, { method: "DELETE", headers: { authorization: `Bearer ${SECRET}`, apikey: SECRET } });
    expect(del.status).toBe(200);
    await makeReel(page, "this one will fail");
    await expect(page.getByText("Your 4 credits are back.", { exact: false })).toBeVisible({ timeout: 120_000 });
    await page.reload();
    expect(await credits(page)).toBe(10);
    await page.goto("/app/settings");
    await expect(page.getByRole("cell", { name: /Refunded/ })).toBeVisible();
  });
});
