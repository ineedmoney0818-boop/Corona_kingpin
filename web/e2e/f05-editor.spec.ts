import { test, expect, attach, makeReel, credits, a11y, sql, userId } from "./fixtures";
import type { Page } from "@playwright/test";

async function openEditor(page: Page) { // caller must already be signed in (user fixture)
  await attach(page, ["photo.jpg", "desk.png"]);
  await makeReel(page, "Edit me later");
  await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
  await page.getByRole("link", { name: "Edit", exact: true }).filter({ visible: true }).click();
  await page.waitForURL("**/edit");
  await expect(page.getByLabel("Text")).toBeVisible();
}

test.describe("F05 tweak a generated reel", () => {
  test("F05-H1 edit, save free, render for 1 credit", async ({ page, user }) => {
    await openEditor(page);
    await a11y(page, "editor");
    await page.getByLabel("Text").fill("Edited on purpose");
    await page.getByRole("button", { name: "Bottom" }).click();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: /Save changes/ }).click();
    await expect(page.getByText("All changes saved")).toBeVisible();
    expect(await credits(page)).toBe(6); // saving is free
    await page.getByRole("link", { name: /Render/ }).click();
    await page.getByRole("button", { name: /Render my edits 1 credit/ }).click();
    await expect(page.getByText("Render history (2)")).toBeVisible({ timeout: 180_000 });
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
    expect(await credits(page)).toBe(5);
  });

  test("F05-E1 two tabs: the second save is refused, not overwritten", async ({ page, context, user }) => {
    await openEditor(page);
    const url = page.url();
    const tabB = await context.newPage();
    await tabB.goto(url);
    await page.getByLabel("Text").fill("From tab A");
    await page.getByRole("button", { name: /Save changes/ }).click();
    await expect(page.getByText("All changes saved")).toBeVisible();
    await tabB.getByLabel("Text").fill("From tab B");
    await tabB.getByRole("button", { name: /Save changes/ }).click();
    await expect(tabB.getByText("This was changed somewhere else. Reload to get the latest.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Text")).toHaveValue("From tab A");
  });

  test("F05-E2 editor at phone width", async ({ page, user }) => {
    await openEditor(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByLabel("Text")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("F05-H2 add scene, add image, change background, text layers", async ({ page, user }) => {
    await openEditor(page);
    const scenes = page.getByRole("region", { name: "Scenes" }).getByRole("listitem");
    await expect(scenes).toHaveCount(2);
    await page.getByRole("button", { name: "Add scene" }).click();
    await expect(scenes).toHaveCount(3);
    await page.getByRole("button", { name: "Add image" }).click();
    const picker = page.getByRole("dialog", { name: /Add an image/ });
    await expect(picker).toBeVisible();
    await a11y(page, "editor media picker");
    await picker.getByRole("button", { name: "photo.jpg" }).click();
    await expect(picker).toBeHidden();
    await expect(scenes).toHaveCount(4);
    // New scenes go right after the selected one: [orig 1, new scene, new image scene, orig 2]
    const settings = page.getByRole("region", { name: /Scene \d+ settings/ });
    await expect(settings.getByRole("heading", { name: "Scene 3" })).toBeVisible();
    await expect(settings.getByText("photo.jpg", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Change background" }).click();
    const bg = page.getByRole("dialog", { name: "Choose a background" });
    await bg.getByRole("button", { name: "Ink" }).click();
    await expect(page.getByRole("region", { name: /Scene \d+ settings/ }).getByText("Ink", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add text" }).click();
    await page.getByLabel("Text", { exact: true }).fill("Second line");
    await expect(page.getByRole("button", { name: "Text 2" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Save changes/ }).click();
    await expect(page.getByText("All changes saved")).toBeVisible();
    const plan = JSON.parse(sql(`select plan::text from generations where user_id = :'p1'`, [userId(user.email)]));
    expect(plan.scenes).toHaveLength(4);
    expect(plan.scenes[1].background).toEqual({ kind: "color", assetId: null, color: "accent" });
    const edited = plan.scenes[2];
    expect(edited.background).toEqual({ kind: "color", assetId: null, color: "text" });
    expect(edited.layers.map((l: { text: string }) => l.text)).toEqual(["New scene", "Second line"]);
    await page.getByRole("button", { name: "Remove this text" }).click();
    await expect(page.getByRole("button", { name: "Text 2" })).toHaveCount(0);
  });

  test("F05-N1 media from another user can't be saved into a plan", async ({ page, user, newUser }) => {
    await openEditor(page);
    const genId = page.url().split("/").slice(-2)[0];
    const eve = await newUser("Eve");
    await eve.page.setInputFiles("#composer-files", `${__dirname}/media/desk.png`);
    await expect(eve.page.getByText("uploading…")).toHaveCount(0, { timeout: 60_000 });
    const eveAsset = sql(`select id from assets where user_id = :'p1'`, [userId(eve.email)]);
    const status = await page.evaluate(async ([g, a]) => {
      const plan = { version: 1, kind: "reel", aspect: "9:16", hook: "x", caption: "", hashtags: [],
        scenes: [{ id: "s1", durationMs: 3000, background: { kind: "image", assetId: a, color: null }, layers: [] }] };
      return (await fetch(`/api/generations/${g}/plan`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, baseVersion: 1 }) })).status;
    }, [genId, eveAsset]);
    expect(status).toBe(404);
  });
});
