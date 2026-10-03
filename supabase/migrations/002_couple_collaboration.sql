create schema if not exists private;
create table public.event_members(event_id uuid references public.events on delete cascade,user_id uuid references auth.users on delete cascade,primary key(event_id,user_id));
alter table public.event_members enable row level security;
create function private.can_access_event(e uuid) returns boolean language sql stable security definer set search_path=public as $$select auth.uid() is not null and (exists(select 1 from events where id=e and owner_id=auth.uid()) or exists(select 1 from event_members where event_id=e and user_id=auth.uid()))$$;
revoke all on function private.can_access_event(uuid) from public,anon;grant usage on schema private to authenticated;grant execute on function private.can_access_event(uuid) to authenticated;
create or replace function public.owns_event(e uuid) returns boolean language sql stable security invoker set search_path=public as $$select private.can_access_event(e)$$;
drop policy owner_events on public.events;
create policy read_event on public.events for select to authenticated using(private.can_access_event(id));
create policy create_event on public.events for insert to authenticated with check(owner_id=auth.uid());
create policy edit_event on public.events for update to authenticated using(private.can_access_event(id)) with check(private.can_access_event(id));
create policy delete_event on public.events for delete to authenticated using(owner_id=auth.uid());
create function private.keep_event_owner() returns trigger language plpgsql set search_path=public as $$begin if new.owner_id<>old.owner_id then raise exception 'Event owner cannot change';end if;return new;end$$;
create trigger immutable_event_owner before update of owner_id on public.events for each row execute function private.keep_event_owner();
create policy view_members on public.event_members for select to authenticated using(private.can_access_event(event_id));
grant select on public.event_members to authenticated;
create table public.partner_invites(id uuid primary key default gen_random_uuid(),event_id uuid not null references public.events on delete cascade,email text not null,token_hash text unique not null,created_by uuid not null references auth.users,expires_at timestamptz not null default now()+interval '14 days',accepted_at timestamptz);
alter table public.partner_invites enable row level security;
create policy manage_own_invites on public.partner_invites for all to authenticated using(exists(select 1 from events where id=event_id and owner_id=auth.uid())) with check(created_by=auth.uid() and exists(select 1 from events where id=event_id and owner_id=auth.uid()));
grant select,insert,delete on public.partner_invites to authenticated;
create function public.create_partner_invite(event_id uuid,partner_email text) returns text language plpgsql security invoker set search_path=public as $$declare invite_token text:=gen_random_uuid()::text||gen_random_uuid()::text;begin
 if auth.uid() is null or not exists(select 1 from events where id=event_id and owner_id=auth.uid()) then raise exception 'Only the owner can invite a partner';end if;
 if trim(partner_email)='' then raise exception 'Partner email is required';end if;
 insert into partner_invites(event_id,email,token_hash,created_by) values(event_id,lower(trim(partner_email)),md5(invite_token),auth.uid());return invite_token;end$$;
create function private.accept_partner_invite(invite_token text) returns uuid language plpgsql security definer set search_path=public as $$declare invitation partner_invites;begin
 if auth.uid() is null then raise exception 'Sign in before joining';end if;
 select * into invitation from partner_invites where token_hash=md5(invite_token) and accepted_at is null and expires_at>now() for update;
 if not found then raise exception 'This invitation has expired or was already used';end if;
 if invitation.email<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Sign in with the email address this invitation was created for';end if;
 insert into event_members(event_id,user_id) values(invitation.event_id,auth.uid()) on conflict do nothing;
 update partner_invites set accepted_at=now() where id=invitation.id;return invitation.event_id;end$$;
create function public.accept_partner_invite(invite_token text) returns uuid language sql security invoker set search_path=public as $$select private.accept_partner_invite(invite_token)$$;
revoke all on function private.accept_partner_invite(text) from public,anon;grant execute on function private.accept_partner_invite(text) to authenticated;
revoke all on function public.create_partner_invite(uuid,text),public.accept_partner_invite(text) from public,anon;grant execute on function public.create_partner_invite(uuid,text),public.accept_partner_invite(text) to authenticated;
alter table public.guests add column guest_group text default 'Family';
alter table public.events alter column date drop not null;

create or replace function public.save_plan(plan jsonb, expected_revision integer) returns integer language plpgsql security invoker set search_path=public as $$
declare e uuid := (plan->'event'->>'id')::uuid; current_revision integer;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select revision into current_revision from events where id=e for update;
 if found then
  if current_revision<>expected_revision then raise exception 'This plan changed in another tab. Reload before editing.';end if;
  update events set name=plan->'event'->>'name',partner_one=plan->'event'->>'partner_one',partner_two=plan->'event'->>'partner_two',mode=plan->'event'->>'mode',date=nullif(plan->'event'->>'date','')::date,venue=plan->'event'->>'venue',budget=(plan->'event'->>'budget')::numeric,palette=plan->'event'->'palette',revision=revision+1 where id=e;
 else
  insert into events(id,owner_id,name,partner_one,partner_two,mode,date,venue,budget,palette,revision) values(e,auth.uid(),plan->'event'->>'name',plan->'event'->>'partner_one',plan->'event'->>'partner_two',plan->'event'->>'mode',nullif(plan->'event'->>'date','')::date,plan->'event'->>'venue',(plan->'event'->>'budget')::numeric,plan->'event'->'palette',1);
 end if;
 delete from seats where event_id=e;delete from planning_records where event_id=e;delete from guests where event_id=e;delete from floor_objects where event_id=e;
 insert into guests select * from jsonb_populate_recordset(null::guests,plan->'guests');
 insert into floor_objects select * from jsonb_populate_recordset(null::floor_objects,plan->'objects');
 insert into planning_records select * from jsonb_populate_recordset(null::planning_records,plan->'records');
 insert into seats select * from jsonb_populate_recordset(null::seats,plan->'seats');
 return coalesce(current_revision,0)+1;end$$;
