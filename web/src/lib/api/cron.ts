// Scheduled routes are called by the host's cron with "Authorization: Bearer $CRON_SECRET".
export function cronAuthorized(req: Request) {
  const s = process.env.CRON_SECRET;
  return !!s && req.headers.get("authorization") === `Bearer ${s}`;
}
