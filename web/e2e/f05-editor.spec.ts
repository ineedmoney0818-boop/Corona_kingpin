import { test, expect, attach, makeReel, credits, a11y } from "./fixtures";
import type { Page } from "@playwright/test";

async function openEditor(page: Page) {
  await attach(page, ["photo.jpg", "desk.png"]);
  await makeReel(page, "Edit me later");
  await expect(page.getByLabel("Your reel")).toBeVisible({ timeout: 180_000 });
  await page.getByRole("link", { name: "Edit" }).click();
  await page.waitForURL("**/edit");
  await expect(page.getByLabel("Text")).toBeVisible();
}

test.describe("F05 tweak a generated reel", () => {
  test("F05-H1 edit, save free, render for 1 credit", async ({ page }) => {
    await openEditor(page);
    await a11y(page, "editor");
    await page.getByLabel("Text").fill("Edited on purpose");
    await page.getByRole("button", { name: "Bottom" }).click();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: /Save changes/ }).click();
    await expect(page.getByText("All changes saved")).toBeVisible();
    expect(await credits(page)).toBe(6); // saving is free
    await page.getByRole("link", { name: /Render/ }).click();
    await page.getByRole("button", { name: /Render again, uses 1 credit/ }).click();
    await expect(page.getByText("Render history (2)")).toBeVisible({ timeout: 180_000 });
    await expect(page.getByLabel("Your reel")).toBeVisible({ timeout: 180_000 });
    expect(await credits(page)).toBe(5);
  });

  test("F05-E1 two tabs: the second save is refused, not overwritten", async ({ page, context }) => {
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

  test("F05-E2 editor at phone width", async ({ page }) => {
    await openEditor(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByLabel("Text")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
