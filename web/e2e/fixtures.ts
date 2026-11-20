import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const SUPABASE = "http://127.0.0.1:54321";
// Local stack secret, read from `supabase status` by global-setup. Never hard-coded.
export const SECRET = process.env.E2E_SUPABASE_SECRET_KEY ?? "";
export const MEDIA = `${__dirname}/media`;
export const PASSWORD = "pass-word-123";

/** Read-only checks and test setup in the local database. Never used against a hosted project. */
export function sql(q: string, params: string[] = []): string {
  // Query via stdin: psql only substitutes :'p1' style parameters there, not in -c.
  const args = ["-Atq", "-v", "ON_ERROR_STOP=1", DB, ...params.flatMap((p, i) => ["-v", `p${i + 1}=${p}`])];
  return execFileSync("psql", args, { input: q.endsWith(";") ? q : q + ";" }).toString().trim();
}
export const uniqueEmail = (tag = "user") => `${tag}-${randomUUID().slice(0, 8)}@example.test`;

/** Every page in every test: fail on console errors (except expected 4xx resource logs) and on any 5xx. */
function guard(page: Page, problems: string[]) {
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (/Failed to load resource: the server responded with a status of 4\d\d/.test(m.text())) return;
    problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 500) problems.push(`${r.status()} on ${r.request().method()} ${r.url()}`); });
}

type Fixtures = { problems: string[]; user: { email: string; page: Page }; newUser: (name?: string) => Promise<{ email: string; page: Page; context: BrowserContext }> };

export const test = base.extend<Fixtures>({
  problems: [async ({ page }, use) => {
    const problems: string[] = [];
    guard(page, problems);
    await use(problems);
    expect(problems, "console errors / 5xx during the test").toEqual([]);
  }, { auto: true }],
  newUser: async ({ browser }, use) => {
    const extra: { context: BrowserContext; problems: string[] }[] = [];
    await use(async (name = "Test Creator") => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
      const page = await context.newPage();
      const problems: string[] = []; guard(page, problems); extra.push({ context, problems });
      const email = uniqueEmail();
      await signUp(page, name, email);
      return { email, page, context };
    });
    for (const e of extra) { expect(e.problems, "console errors / 5xx in second user").toEqual([]); await e.context.close(); }
  },
  user: async ({ page }, use) => {
    const email = uniqueEmail();
    await signUp(page, "Test Creator", email);
    await use({ email, page });
  },
});
export { expect };

export async function signUp(page: Page, name: string, email: string, password = PASSWORD) {
  sql("delete from rate_limits where key like 'signup:%'"); // test setup: the suite signs up ~30 users from one IP
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Make my account" }).click();
  await page.waitForURL("**/app");
}
export async function signIn(page: Page, email: string, password = PASSWORD) {
  sql("delete from rate_limits where key like 'signin:%'");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app");
}
export async function attach(page: Page, files: string[]) {
  await page.setInputFiles("#composer-files", files.map((f) => `${MEDIA}/${f}`));
  await expect(page.getByText("uploading…")).toHaveCount(0, { timeout: 60_000 });
}
export async function credits(page: Page) {
  return Number((await page.locator("aside").getByText(/\d+ credits?/).first().textContent())!.match(/\d+/)![0]);
}
export async function makeReel(page: Page, prompt: string) {
  await page.getByLabel("What do you want to make?").fill(prompt);
  await page.getByRole("button", { name: /Make reel, uses 4 credits/ }).click();
  await page.waitForURL("**/app/chats/**", { timeout: 60_000 });
}
export async function a11y(page: Page, label: string) {
  // axe ships its own playwright-core typings; the runtime Page is compatible.
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = r.violations.map((v) => `${label}: ${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `accessibility violations on ${label}`).toEqual([]);
}
export const userId = (email: string) => sql(`select id from auth.users where email = :'p1'`, [email]);
