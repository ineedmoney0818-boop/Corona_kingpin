-- Ideas chat (F04): chat-only answers, quoted and charged like everything else, without a render.

alter table quotes drop constraint quotes_kind_check;
alter table quotes add constraint quotes_kind_check check (kind in ('new-reel','new-carousel','re-render','ideas'));

-- Structured reply content (idea cards) and per-message idempotency.
alter table messages add column ideas jsonb;
alter table messages add column idempotency_key text;
create unique index one_message_per_idempotency_key on messages (user_id, idempotency_key) where idempotency_key is not null;

-- Ledger rows can belong to a message (ideas) instead of a render.
alter table credit_ledger add column message_id uuid references messages(id) on delete set null;
create index on credit_ledger (message_id);
create unique index one_spend_per_message on credit_ledger (message_id) where kind = 'spend' and message_id is not null;

-- One transaction: replay check, quote check, chat (new or owned), both messages, charge.
-- Called after the ideas were produced, so a failed AI call never charges.
create or replace function create_ideas_reply(
  p_user uuid, p_chat uuid, p_title text, p_prompt text, p_reply text, p_ideas jsonb, p_quote uuid, p_key text
) returns table (chat_id uuid, message_id uuid, replayed boolean)
language plpgsql security definer set search_path = public as $$
declare q quotes; prior messages; c uuid; um uuid; am uuid; a credit_accounts; from_plan int; from_topup int;
begin
  select * into prior from messages where user_id = p_user and idempotency_key = p_key;
  if prior.id is not null then
    return query select prior.chat_id, (select m.id from messages m where m.chat_id = prior.chat_id and m.role = 'assistant' and m.created_at >= prior.created_at order by m.created_at limit 1), true;
    return;
  end if;
  select * into q from quotes where id = p_quote and user_id = p_user and kind = 'ideas';
  if q.id is null or q.expires_at < now() then raise exception 'quote_expired' using errcode = 'P0001'; end if;
  if p_chat is null then
    insert into chats (user_id, title) values (p_user, left(coalesce(nullif(p_title, ''), 'Ideas'), 80)) returning id into c;
  else
    select ch.id into c from chats ch where ch.id = p_chat and ch.user_id = p_user;
    if c is null then raise exception 'chat_not_found' using errcode = 'P0002'; end if;
  end if;
  begin
    insert into messages (chat_id, user_id, role, content, idempotency_key)
    values (c, p_user, 'user', p_prompt, p_key) returning id into um;
  exception when unique_violation then
    if p_chat is null then delete from chats where id = c; end if;
    select * into prior from messages where user_id = p_user and idempotency_key = p_key;
    return query select prior.chat_id, (select m.id from messages m where m.chat_id = prior.chat_id and m.role = 'assistant' and m.created_at >= prior.created_at order by m.created_at limit 1), true;
    return;
  end;
  insert into messages (chat_id, user_id, role, content, ideas)
  values (c, p_user, 'assistant', p_reply, p_ideas) returning id into am;
  update chats ch set updated_at = now() where ch.id = c;
  -- charge (same bucket order and overdraft rule as spend_credits)
  select * into a from credit_accounts where user_id = p_user for update;
  if a.plan_credits + a.topup_credits < q.credits then raise exception 'insufficient_credits' using errcode = 'P0001'; end if;
  from_plan := least(a.plan_credits, q.credits);
  from_topup := q.credits - from_plan;
  update credit_accounts set plan_credits = plan_credits - from_plan, topup_credits = topup_credits - from_topup, updated_at = now()
   where user_id = p_user;
  if q.credits > 0 then
    insert into credit_ledger (user_id, kind, plan_delta, topup_delta, message_id, note)
    values (p_user, 'spend', -from_plan, -from_topup, am, 'ideas');
  end if;
  return query select c, am, false;
end $$;

do $$ begin
  revoke all on function create_ideas_reply(uuid,uuid,text,text,text,jsonb,uuid,text) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function create_ideas_reply(uuid,uuid,text,text,text,jsonb,uuid,text) from anon, authenticated;
    grant execute on function create_ideas_reply(uuid,uuid,text,text,text,jsonb,uuid,text) to service_role;
  end if;
end $$;
