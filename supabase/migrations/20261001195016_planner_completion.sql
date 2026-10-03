alter table public.events add column details jsonb;
alter table public.guests add column details jsonb;
alter table public.floor_objects add column locked boolean;
alter table public.partner_invites add column revoked_at timestamptz;
create table public.plan_versions(id uuid primary key default gen_random_uuid(),event_id uuid not null references public.events on delete cascade,revision integer not null,snapshot jsonb not null,actor_id uuid not null references auth.users,created_at timestamptz not null default now());
alter table public.plan_versions enable row level security;
create policy versions_access on public.plan_versions for all to authenticated using(public.owns_event(event_id)) with check(public.owns_event(event_id) and actor_id=auth.uid());
grant select,insert,delete on public.plan_versions to authenticated;
create index versions_event_revision on public.plan_versions(event_id,revision desc);
create or replace function public.save_plan(plan jsonb, expected_revision integer) returns integer language plpgsql security invoker set search_path=public as $$
declare e uuid := (plan->'event'->>'id')::uuid; current_revision integer;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select revision into current_revision from events where id=e for update;
 if found then
  if current_revision<>expected_revision then raise exception 'This plan changed in another tab. Reload before editing.';end if;
  insert into plan_versions(event_id,revision,snapshot,actor_id) select e,current_revision,jsonb_build_object('event',to_jsonb(ev),'guests',coalesce((select jsonb_agg(g) from guests g where event_id=e),'[]'::jsonb),'objects',coalesce((select jsonb_agg(o) from floor_objects o where event_id=e),'[]'::jsonb),'seats',coalesce((select jsonb_agg(st) from seats st where event_id=e),'[]'::jsonb),'records',coalesce((select jsonb_agg(r) from planning_records r where event_id=e),'[]'::jsonb),'family_links',coalesce((select jsonb_agg(l) from family_links l where event_id=e),'[]'::jsonb)),auth.uid() from events ev where id=e;
  delete from plan_versions where event_id=e and id not in(select id from plan_versions where event_id=e order by created_at desc limit 20);
  update events set details=coalesce(plan->'event'->'details',details),name=plan->'event'->>'name',partner_one=plan->'event'->>'partner_one',partner_two=plan->'event'->>'partner_two',mode=plan->'event'->>'mode',date=nullif(plan->'event'->>'date','')::date,venue=plan->'event'->>'venue',budget=(plan->'event'->>'budget')::numeric,palette=plan->'event'->'palette',room_width_ft=(plan->'event'->>'room_width_ft')::numeric,room_depth_ft=(plan->'event'->>'room_depth_ft')::numeric,revision=revision+1 where id=e;
 else
  insert into events(id,owner_id,name,partner_one,partner_two,mode,date,venue,budget,palette,details,revision) values(e,auth.uid(),plan->'event'->>'name',plan->'event'->>'partner_one',plan->'event'->>'partner_two',plan->'event'->>'mode',nullif(plan->'event'->>'date','')::date,plan->'event'->>'venue',(plan->'event'->>'budget')::numeric,plan->'event'->'palette',plan->'event'->'details',1);
 end if;
 delete from family_links where event_id=e;delete from seats where event_id=e;delete from planning_records where event_id=e;delete from guests where event_id=e;delete from floor_objects where event_id=e;
 insert into guests select * from jsonb_populate_recordset(null::guests,plan->'guests');
 insert into floor_objects select * from jsonb_populate_recordset(null::floor_objects,plan->'objects');
 insert into planning_records select * from jsonb_populate_recordset(null::planning_records,plan->'records');
 insert into seats select * from jsonb_populate_recordset(null::seats,plan->'seats');
 insert into family_links select * from jsonb_populate_recordset(null::family_links,coalesce(plan->'family_links','[]'::jsonb));
 update events set room_width_ft=(plan->'event'->>'room_width_ft')::numeric,room_depth_ft=(plan->'event'->>'room_depth_ft')::numeric where id=e;
 return coalesce(current_revision,0)+1;end$$;


create table public.rsvp_invites(id uuid primary key default gen_random_uuid(),event_id uuid not null references public.events on delete cascade,guest_ids uuid[] not null,token_hash text not null unique,created_by uuid not null references auth.users,expires_at timestamptz not null default now()+interval '60 days',revoked_at timestamptz);
alter table public.rsvp_invites enable row level security;
create policy rsvp_invite_management on public.rsvp_invites for all to authenticated using(public.owns_event(event_id)) with check(public.owns_event(event_id) and created_by=auth.uid());
grant select,insert,update,delete on public.rsvp_invites to authenticated;
create index rsvp_invites_event on public.rsvp_invites(event_id);
create function public.create_rsvp_invite(e uuid,ids uuid[]) returns text language plpgsql security invoker set search_path=public as $$declare token text:=gen_random_uuid()::text||gen_random_uuid()::text;begin
 if auth.uid() is null or not owns_event(e) then raise exception 'You cannot invite guests to this celebration';end if;
 if ids is null or cardinality(ids)<1 or cardinality(ids)>50 or exists(select 1 from unnest(ids) x where not exists(select 1 from guests where id=x and event_id=e)) then raise exception 'Choose guests from this celebration';end if;
 insert into rsvp_invites(event_id,guest_ids,token_hash,created_by) values(e,ids,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid());return token;end$$;
revoke all on function public.create_rsvp_invite(uuid,uuid[]) from public,anon;grant execute on function public.create_rsvp_invite(uuid,uuid[]) to authenticated;

create function private.read_household_rsvp(token text) returns jsonb language plpgsql security definer set search_path=public as $$declare invite rsvp_invites;result jsonb;begin
 if length(token)>200 then raise exception 'Invalid invitation';end if;
 select * into invite from rsvp_invites where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and revoked_at is null and expires_at>now();
 if not found then raise exception 'This RSVP link has expired or been revoked';end if;
 select jsonb_build_object('celebration',ev.name,'partner_one',ev.partner_one,'partner_two',ev.partner_two,'date',ev.date,'venue',ev.venue,'deadline',ev.details->>'rsvp_deadline','guests',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'rsvp',g.rsvp,'meal',g.meal,'allergies',g.details->>'allergies','dietary_notes',g.details->>'dietary_notes')) from guests g where g.event_id=invite.event_id and g.id=any(invite.guest_ids)),'[]'::jsonb)) into result from events ev where id=invite.event_id;
 return result;end$$;
create function private.submit_household_rsvp(token text,responses jsonb) returns jsonb language plpgsql security definer set search_path=public as $$declare invite rsvp_invites;response jsonb;begin
 if token is null or responses is null or length(token)>200 or jsonb_typeof(responses)<>'array' or jsonb_array_length(responses)>50 then raise exception 'Invalid RSVP';end if;
 select * into invite from rsvp_invites where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and revoked_at is null and expires_at>now() for update;
 if not found then raise exception 'This RSVP link has expired or been revoked';end if;
 perform 1 from events where id=invite.event_id for update;
 for response in select * from jsonb_array_elements(responses) loop
  if response->>'id' is null or response->>'rsvp' is null or not ((response->>'id')::uuid=any(invite.guest_ids)) or response->>'rsvp' not in ('accepted','declined','pending') then raise exception 'Invalid guest response';end if;
  update guests set rsvp=response->>'rsvp',meal=left(coalesce(response->>'meal','Standard'),200),details=coalesce(details,'{}'::jsonb)||jsonb_build_object('allergies',left(coalesce(response->>'allergies',''),1000),'dietary_notes',left(coalesce(response->>'dietary_notes',''),1000)) where id=(response->>'id')::uuid and event_id=invite.event_id;
  if response->>'rsvp'='declined' then delete from seats where guest_id=(response->>'id')::uuid and event_id=invite.event_id;end if;
 end loop;
 update events set revision=revision+1 where id=invite.event_id;
 return private.read_household_rsvp(token);end$$;
create function public.read_household_rsvp(token text) returns jsonb language sql security invoker set search_path=public as $$select private.read_household_rsvp(token)$$;
create function public.submit_household_rsvp(token text,responses jsonb) returns jsonb language sql security invoker set search_path=public as $$select private.submit_household_rsvp(token,responses)$$;
revoke all on function private.read_household_rsvp(text),private.submit_household_rsvp(text,jsonb),public.read_household_rsvp(text),public.submit_household_rsvp(text,jsonb) from public;
grant usage on schema private to anon;
grant execute on function private.read_household_rsvp(text),private.submit_household_rsvp(text,jsonb),public.read_household_rsvp(text),public.submit_household_rsvp(text,jsonb) to anon,authenticated;

create function private.revoke_partner(invite_id uuid) returns void language plpgsql security definer set search_path=public as $$declare invitation partner_invites;begin
 select * into invitation from partner_invites where id=invite_id;
 if not found or auth.uid() is null or not exists(select 1 from events where id=invitation.event_id and owner_id=auth.uid()) then raise exception 'Only the owner can revoke an invitation';end if;
 update partner_invites set revoked_at=now() where id=invite_id;
 delete from event_members where event_id=invitation.event_id and user_id in(select id from auth.users where lower(email)=invitation.email) and user_id<>auth.uid();end$$;
create function public.revoke_partner_invite(invite_id uuid) returns void language sql security invoker set search_path=public as $$select private.revoke_partner(invite_id)$$;
revoke all on function private.revoke_partner(uuid),public.revoke_partner_invite(uuid) from public,anon;grant execute on function private.revoke_partner(uuid),public.revoke_partner_invite(uuid) to authenticated;
create or replace function private.accept_partner_invite(invite_token text) returns uuid language plpgsql security definer set search_path=public as $$declare invitation partner_invites;begin
 if auth.uid() is null then raise exception 'Sign in before joining';end if;
 select * into invitation from partner_invites where token_hash=md5(invite_token) and accepted_at is null and revoked_at is null and expires_at>now() for update;
 if not found then raise exception 'This invitation has expired or was already used';end if;
 if invitation.email<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Sign in with the email address this invitation was created for';end if;
 insert into event_members(event_id,user_id) values(invitation.event_id,auth.uid()) on conflict do nothing;
 update partner_invites set accepted_at=now() where id=invitation.id;return invitation.event_id;end$$;
