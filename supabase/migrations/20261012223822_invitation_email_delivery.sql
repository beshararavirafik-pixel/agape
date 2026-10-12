-- Private, durable send reservations: no raw invitation tokens or provider keys.
create table private.invitation_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  invitation_id uuid not null,
  invitation_kind text not null check (invitation_kind in ('partner','guest')),
  recipient text not null,
  event_name text not null,
  send_day date not null default (now() at time zone 'UTC')::date,
  created_at timestamptz not null default now(),
  unique (invitation_kind, invitation_id, recipient, send_day)
);
alter table private.invitation_email_deliveries enable row level security;
revoke all on private.invitation_email_deliveries from public, anon, authenticated;
create index invitation_email_user_time on private.invitation_email_deliveries(user_id, created_at);

create function private.prepare_invitation_email(e uuid, invitation_kind text, invitation_token text, recipient_email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  actor uuid := auth.uid();
  selected_invitation_id uuid;
  selected_recipient text;
  celebration text;
  delivery private.invitation_email_deliveries;
begin
  if actor is null or not private.can_access_event(e) then
    raise exception 'Sign in to manage this celebration';
  end if;
  select left(coalesce(nullif(name,''), 'our celebration'), 200) into celebration from public.events where id=e;
  if invitation_kind='partner' then
    if not exists(select 1 from public.events where id=e and owner_id=actor) then
      raise exception 'Only the owner can email a partner invitation';
    end if;
    select i.id, lower(trim(i.email)) into selected_invitation_id, selected_recipient from public.partner_invites i
    where i.event_id=e and i.token_hash=md5(invitation_token) and i.accepted_at is null and i.expires_at>now();
  elsif invitation_kind='guest' then
    selected_recipient := lower(trim(recipient_email));
    select i.id into selected_invitation_id from private.guest_invitations i
    where i.event_id=e and i.token_hash=encode(sha256(invitation_token::bytea),'hex')
      and not i.revoked and i.expires_at>now()
      and exists(select 1 from public.guests g where g.event_id=e and g.id=any(i.guest_ids) and lower(trim(g.email))=selected_recipient);
  else
    raise exception 'Invalid invitation type';
  end if;
  if selected_invitation_id is null then
    raise exception 'This invitation is unavailable or the recipient is not one of its saved guests';
  end if;
  if selected_recipient is null or length(selected_recipient)>254 or selected_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Add a valid saved email address for this recipient';
  end if;
  -- Serialize per sender so parallel requests cannot race past the quota.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  select * into delivery from private.invitation_email_deliveries d
  where d.invitation_kind=prepare_invitation_email.invitation_kind and d.invitation_id=selected_invitation_id
    and d.recipient=selected_recipient and d.send_day=(now() at time zone 'UTC')::date;
  if not found then
    if (select count(*) from private.invitation_email_deliveries where user_id=actor and created_at>now()-interval '1 hour')>=20 then
      raise exception 'Invitation email limit reached. Try again in an hour';
    end if;
    insert into private.invitation_email_deliveries(user_id,event_id,invitation_id,invitation_kind,recipient,event_name)
    values(actor,e,selected_invitation_id,invitation_kind,selected_recipient,celebration)
    on conflict (invitation_kind,invitation_id,recipient,send_day) do nothing;
    select * into delivery from private.invitation_email_deliveries d
    where d.invitation_kind=prepare_invitation_email.invitation_kind and d.invitation_id=selected_invitation_id
      and d.recipient=selected_recipient and d.send_day=(now() at time zone 'UTC')::date;
  end if;
  return jsonb_build_object('delivery_id',delivery.id,'recipient',delivery.recipient,'event_name',delivery.event_name);
end;
$$;
create function public.prepare_invitation_email(e uuid, invitation_kind text, invitation_token text, recipient_email text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.prepare_invitation_email(e,invitation_kind,invitation_token,recipient_email);
$$;
revoke all on function private.prepare_invitation_email(uuid,text,text,text), public.prepare_invitation_email(uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.prepare_invitation_email(uuid,text,text,text), public.prepare_invitation_email(uuid,text,text,text) to authenticated;
