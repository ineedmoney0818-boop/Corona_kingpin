-- The init migration revoked these from public/anon/authenticated but never granted them
-- back to service_role. On hosted Supabase that left the server unable to grant plan
-- credits (invoice.paid), add top-ups, or refund failed renders: "permission denied".
grant execute on function spend_credits(uuid), refund_render(uuid, text),
  grant_monthly_credits(uuid, int, text), add_topup(uuid, int, text) to service_role;
