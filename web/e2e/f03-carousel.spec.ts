import { test, expect, attach, credits, a11y } from "./fixtures";

test.describe("F03 make a carousel from photos", () => {
  test("F03-H1 two photos become two slides", async ({ page, user }) => {
    await attach(page, ["photo.jpg", "desk.png"]);
    await page.getByRole("button", { name: "Carousel", exact: true }).click();
    await page.getByLabel("What do you want to make?").fill("Desk setup tour");
    await page.getByRole("button", { name: /Make carousel 3 credits/ }).click();
    await page.waitForURL("**/app/chats/**");
    const region = page.getByRole("region", { name: "Your carousel" });
    await expect(region).toBeVisible({ timeout: 180_000 });
    await expect(region.getByText("Slide 1 of 2")).toBeVisible();
    await region.getByRole("button", { name: "Next slide" }).click();
    await expect(region.getByText("Slide 2 of 2")).toBeVisible();
    await expect(region.getByRole("button", { name: "Next slide" })).toBeDisabled();
    await expect(region.getByRole("img", { name: "Slide 2 of 2" })).toBeVisible();
    expect(await credits(page)).toBe(7);
    await a11y(page, "chat with carousel");
  });

  test("F03-E1 a video can't go into a carousel", async ({ page, user }) => {
    await attach(page, ["clip.mp4"]);
    await page.getByRole("button", { name: "Carousel", exact: true }).click();
    await page.getByLabel("What do you want to make?").fill("won't work");
    await expect(page.getByText("Carousels use photos.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /Make carousel/ })).toBeDisabled();
  });
});
