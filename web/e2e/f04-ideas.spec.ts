import { test, expect, sql, userId, credits, a11y } from "./fixtures";

test.describe("F04 brainstorm ideas in chat", () => {
  test("F04-H1 ideas reply: priced, charged once, cards fill the composer", async ({ page, user }) => {
    await page.getByRole("button", { name: "Ideas", exact: true }).click();
    const submit = page.getByRole("form", { name: "Message Reelplain" }).locator("button[type=submit]");
    await expect(submit).toHaveText(/Get ideas\s*1 credit/);
    await page.getByLabel("What do you want to make?").fill("Posts about my morning routine");
    await submit.click();
    await page.waitForURL("**/app/chats/**");
    const cards = page.getByRole("list", { name: "Ideas" }).filter({ visible: true }).getByRole("listitem");
    await expect(cards).toHaveCount(3);
    expect(await credits(page)).toBe(9);
    expect(sql(`select count(*) from renders where user_id = :'p1'`, [userId(user.email)])).toBe("0"); // ideas never render
    await a11y(page, "chat with ideas");
    await cards.first().getByRole("button", { name: /Use this idea/ }).click();
    await expect(page.getByLabel("What do you want to make?")).toHaveValue(/3 things nobody tells you about/);
    await expect(page.getByRole("button", { name: "Reel", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(submit).toHaveText(/Make reel\s*4 credits/);
  });

  test("F04-E1 five identical requests charge once", async ({ page, user }) => {
    const res = await page.evaluate(async () => {
      const q = (await (await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: '{"kind":"ideas"}' })).json()).quote;
      const body = JSON.stringify({ chatId: null, prompt: "race ideas", quoteId: q.id, idempotencyKey: "ideas-race-1234" });
      return Promise.all([1, 2, 3, 4, 5].map(async () => { const r = await fetch("/api/ideas", { method: "POST", headers: { "content-type": "application/json" }, body }); return [r.status, (await r.json()).chatId]; }));
    });
    expect(new Set(res.map((r) => r[1])).size).toBe(1);
    const uid = userId(user.email);
    expect(sql(`select count(*) from credit_ledger where user_id = :'p1' and kind = 'spend'`, [uid])).toBe("1");
    expect(sql(`select count(*) from chats where user_id = :'p1'`, [uid])).toBe("1");
    expect(sql(`select count(*) from messages where user_id = :'p1'`, [uid])).toBe("2");
  });

  test("F04-N1 no credits: refused, nothing written", async ({ page, user }) => {
    const uid = userId(user.email);
    sql(`update credit_accounts set plan_credits = 0 where user_id = :'p1'`, [uid]);
    await page.reload();
    await page.getByRole("button", { name: "Ideas", exact: true }).click();
    await expect(page.getByText("You have 0, this needs 1.")).toBeVisible();
    const status = await page.evaluate(async () => {
      const q = (await (await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: '{"kind":"ideas"}' })).json()).quote;
      return (await fetch("/api/ideas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId: null, prompt: "x", quoteId: q.id, idempotencyKey: "broke-12345" }) })).status;
    });
    expect(status).toBe(402);
    expect(sql(`select count(*) from messages where user_id = :'p1'`, [uid])).toBe("0");
  });

  test("F04-E2 another user's chat is off limits", async ({ page, user, newUser }) => {
    await page.getByRole("button", { name: "Ideas", exact: true }).click();
    await page.getByLabel("What do you want to make?").fill("private ideas");
    await page.getByRole("form", { name: "Message Reelplain" }).locator("button[type=submit]").click();
    await page.waitForURL("**/app/chats/**");
    const chatId = page.url().split("/").pop()!;
    const eve = await newUser("Eve");
    const status = await eve.page.evaluate(async (c) => {
      const q = (await (await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: '{"kind":"ideas"}' })).json()).quote;
      return (await fetch("/api/ideas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId: c, prompt: "sneak", quoteId: q.id, idempotencyKey: "sneak-12345" }) })).status;
    }, chatId);
    expect(status).toBe(404);
  });
});
