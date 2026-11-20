import "server-only";
import { currentUser } from "@/lib/auth";
import { InsufficientCredits, NotFound, type User } from "@/lib/data";

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const err = (status: number, code: string, message: string, extra?: object) => json({ error: { code, message, ...extra } }, status);

/** Wraps a handler: requires a session, maps known errors to plain-language responses. */
export function withUser<A extends unknown[]>(fn: (user: User, ...args: A) => Promise<Response>) {
  return async (...args: A) => {
    const user = await currentUser();
    if (!user) return err(401, "unauthenticated", "Sign in to keep going.");
    try {
      return await fn(user, ...args);
    } catch (e) {
      if (e instanceof InsufficientCredits) return err(402, "insufficient_credits", `You have ${e.available}, this needs ${e.needed}.`, { needed: e.needed, available: e.available });
      if (e instanceof NotFound) return err(404, "not_found", "We couldn't find that.");
      const m = (e as Error).message;
      if (m === "quote_expired") return err(409, "quote_expired", "That price is out of date. Here's a fresh one.");
      if (m === "version_conflict") return err(409, "version_conflict", "This was changed somewhere else. Reload to get the latest.");
      console.error(e);
      return err(500, "internal_error", "That didn't work on our side. Nothing was charged.");
    }
  };
}
