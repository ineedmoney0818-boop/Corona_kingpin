import { test, expect, a11y, attach, makeReel } from "./fixtures";

test.describe("All screens", () => {
  test("X-A1 public screens pass axe", async ({ page }) => {
    for (const [path, label] of [["/", "landing"], ["/pricing", "pricing"], ["/sign-in", "sign-in"], ["/forgot-password", "forgot-password"]]) {
      await page.goto(path);
      await a11y(page, label);
    }
  });

  test("X-A2 app screens pass axe, empty and filled", async ({ page, user }) => {
    void user;
    for (const [path, label] of [["/app/library", "library (empty)"], ["/app/projects", "projects (empty)"], ["/app/settings", "settings"]]) {
      await page.goto(path);
      await a11y(page, label);
    }
    await page.goto("/app");
    await attach(page, ["photo.jpg"]);
    await makeReel(page, "screens");
    await expect(page.getByLabel("Your reel").filter({ visible: true })).toBeVisible({ timeout: 180_000 });
    await page.getByRole("link", { name: "Open" }).filter({ visible: true }).click();
    await a11y(page, "generation");
    await page.goto("/app/library");
    await a11y(page, "library (filled)");
  });

  test("X-T1 dates show in the user's time zone", async ({ browser }) => {
    // Credit history dates must match the viewer's local date, not the server's.
    const ctx = await browser.newContext({ timezoneId: "Pacific/Kiritimati" }); // UTC+14: local date is usually a day ahead of UTC
    const page = await ctx.newPage();
    const { signUp, uniqueEmail } = await import("./fixtures");
    await signUp(page, "Tz Tester", uniqueEmail("tz"));
    await page.goto("/app/settings");
    const local = await page.evaluate(() => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    await expect(page.getByRole("cell", { name: local })).toBeVisible();
    await ctx.close();
  });
});
