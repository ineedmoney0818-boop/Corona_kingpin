import { test, expect, sql, uniqueEmail, signUp, signIn, a11y, credits, userId, PASSWORD } from "./fixtures";

test.describe("F01 get started and manage the account", () => {
  test("F01-H1 sign up lands in the app with 10 credits", async ({ page }) => {
    await page.goto("/sign-up");
    await a11y(page, "sign-up");
    await signUp(page, "Ada Creator", uniqueEmail("h1"));
    await expect(page.getByRole("heading", { name: "What are we making, Ada?" })).toBeVisible();
    expect(await credits(page)).toBe(10);
    await a11y(page, "app (new chat)");
  });

  test("F01-H2 seeded demo user signs in and sees seed data", async ({ page }) => {
    await signIn(page, "demo@reelplain.test", "demo-pass-123");
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page.getByRole("heading", { name: "Morning routine series" })).toBeVisible();
    await a11y(page, "projects");
  });

  test("F01-H3 password reset by email", async ({ page, browser }) => {
    const email = uniqueEmail("reset");
    await signUp(page, "Reset Me", email);
    const fresh = await (await browser.newContext()).newPage();
    await fresh.goto("/forgot-password");
    await fresh.getByLabel("Email").fill(email);
    await fresh.getByRole("button", { name: "Send reset link" }).click();
    await expect(fresh.getByText(/If there's an account for/)).toBeVisible();
    let link: string | undefined;
    for (let i = 0; i < 30 && !link; i++) {
      const list = await (await fetch("http://127.0.0.1:54324/api/v1/messages")).json();
      const msg = list.messages?.find((m: { To: { Address: string }[] }) => m.To?.[0]?.Address === email);
      if (msg) {
        const full = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${msg.ID}`)).json();
        link = (full.HTML as string).match(/href="([^"]+token_hash[^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
      } else await fresh.waitForTimeout(500);
    }
    expect(link, "reset email with token link").toBeTruthy();
    await fresh.goto(link!);
    await fresh.waitForURL("**/reset-password");
    await fresh.getByLabel("New password").fill("a-brand-new-pass");
    await fresh.getByRole("button", { name: "Save password" }).click();
    await fresh.waitForURL("**/app");
    const third = await (await browser.newContext()).newPage();
    await third.goto("/sign-in");
    await third.getByLabel("Email").fill(email);
    await third.getByLabel("Password").fill(PASSWORD);
    await third.getByRole("button", { name: "Sign in" }).click();
    await expect(third.getByText("That email and password don't match an account.")).toBeVisible();
    await signIn(third, email, "a-brand-new-pass");
  });

  test("F01-H4 delete account removes everything", async ({ page, user }) => {
    const id = userId(user.email);
    await page.goto("/app/settings");
    await page.getByText("Delete my account").click();
    await page.getByLabel(/Type .* to confirm/).fill("someone-else@example.test");
    await page.getByRole("button", { name: "Delete everything" }).click();
    await expect(page.getByText("Type your email exactly to confirm.")).toBeVisible();
    await page.getByLabel(/Type .* to confirm/).fill(user.email);
    await page.getByRole("button", { name: "Delete everything" }).click();
    await page.waitForURL("**/?deleted=1");
    expect(sql(`select count(*) from auth.users where id = :'p1'`, [id])).toBe("0");
    expect(sql(`select count(*) from credit_ledger where user_id = :'p1'`, [id])).toBe("0");
    expect(sql(`select count(*) from storage.objects where name like :'p1' || '/%'`, [id])).toBe("0");
  });

  test("F01-E1 empty sign-up shows three field errors", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Make my account" }).click();
    await expect(page.getByText("Add your name.")).toBeVisible();
    await expect(page.getByText("That doesn't look like an email address.")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters.", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("F01-E2 very long name is capped and does not break layout", async ({ page }) => {
    const email = uniqueEmail("long");
    await signUp(page, "Bartholomew ".repeat(17).trim(), email);
    expect(Number(sql(`select length(display_name) from profiles where id = :'p1'`, [userId(email)]))).toBeLessThanOrEqual(60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });

  test("F01-E3 emoji and accents survive", async ({ page }) => {
    await signUp(page, "Zoë Ñandú 🎬", uniqueEmail("emoji"));
    await expect(page.getByRole("heading", { name: "What are we making, Zoë?" })).toBeVisible();
    await expect(page.locator("aside").getByText("Zoë Ñandú 🎬")).toBeVisible();
  });

  test("F01-E4 double click on sign-up makes one account", async ({ page }) => {
    const email = uniqueEmail("dbl");
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Double");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Make my account" }).dblclick();
    await page.waitForURL("**/app");
    expect(sql(`select count(*) from auth.users where email = :'p1'`, [email])).toBe("1");
  });

  test("F01-E5 keyboard-only sign up", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").focus();
    await page.keyboard.type("Keyboard Kim");
    await page.keyboard.press("Tab");
    await page.keyboard.type(uniqueEmail("kbd"));
    await page.keyboard.press("Tab");
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Enter");
    await page.waitForURL("**/app");
  });

  test("F01-E6 mobile width: no sideways scroll, menu works", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await ctx.newPage();
    await m.goto("/sign-up");
    expect(await m.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await signUp(m, "Mobile Mo", uniqueEmail("mob"));
    expect(await m.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await m.getByRole("button", { name: "Open menu" }).click();
    const menu = m.getByRole("dialog", { name: "Menu" });
    await menu.getByRole("link", { name: "Settings" }).click();
    await m.waitForURL("**/app/settings");
    await expect(menu).toBeHidden();
    await ctx.close();
  });

  test("F01-E7 sign out everywhere ends other sessions at once", async ({ page, user, browser }) => {
    const other = await (await browser.newContext()).newPage();
    await signIn(other, user.email);
    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Sign out everywhere" }).click();
    await page.waitForURL("**/sign-in");
    await other.goto("/app/settings");
    await other.waitForURL("**/sign-in");
    const status = await other.evaluate(async () => (await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: '{"kind":"new-reel"}' })).status);
    expect(status).toBe(401);
  });

  test("F01-N1 wrong password", async ({ page, user, browser }) => {
    const p = await (await browser.newContext()).newPage();
    await p.goto("/sign-in");
    await p.getByLabel("Email").fill(user.email);
    await p.getByLabel("Password").fill("not-the-password");
    await p.getByRole("button", { name: "Sign in" }).click();
    await expect(p.getByText("That email and password don't match an account.")).toBeVisible();
    await expect(p).toHaveURL(/\/sign-in/);
    await a11y(p, "sign-in with error");
    void page;
  });

  test("F01-N2 existing email", async ({ user, browser }) => {
    const p = await (await browser.newContext()).newPage();
    await p.goto("/sign-up");
    await p.getByLabel("Name").fill("Copycat");
    await p.getByLabel("Email").fill(user.email);
    await p.getByLabel("Password").fill(PASSWORD);
    await p.getByRole("button", { name: "Make my account" }).click();
    await expect(p.getByText(/already an account with this email/)).toBeVisible();
  });

  test("F01-E8 password show/hide toggle", async ({ page }) => {
    await page.goto("/sign-in");
    const pw = page.getByLabel("Password", { exact: true });
    await pw.fill("secret-pass");
    await expect(pw).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(pw).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    await a11y(page, "sign-in with password shown");
  });

  test("F01-N3 signed out visitors are sent to sign in", async ({ page }) => {
    const r = await page.request.get("/app/library", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toContain("/sign-in");
  });

  test("F01-N4 password reset is rate limited", async ({ browser }) => {
    sql("delete from rate_limits where key like 'reset:%'");
    const p = await (await browser.newContext()).newPage();
    let last = "";
    for (let i = 0; i < 6; i++) {
      await p.goto("/forgot-password");
      await p.getByLabel("Email").fill(uniqueEmail("rl"));
      await p.getByRole("button", { name: "Send reset link" }).click();
      await expect(p.getByText(/If there's an account|Too many requests/)).toBeVisible();
      last = (await p.getByText(/If there's an account|Too many requests/).textContent()) ?? "";
    }
    expect(last).toContain("Too many requests");
    sql("delete from rate_limits where key like 'reset:%'");
  });
});
