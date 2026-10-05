begin;
create table public.invitation_settings (
 event_id uuid primary key references public.events on delete cascade,
 content jsonb not null default '{}'
);
alter table public.invitation_settings enable row level security;
create policy invitation_settings_access on public.invitation_settings for all to authenticated using(private.can_access_event(event_id)) with check(private.can_access_event(event_id));
grant select,insert,update,delete on public.invitation_settings to authenticated;
create table private.guest_invitations (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.events on delete cascade,
 label text not null,guest_ids uuid[] not null,clergy_id uuid,token_hash text unique not null,
 expires_at timestamptz not null default now()+interval '1 year',revoked boolean not null default false
);
alter table private.guest_invitations enable row level security;
revoke all on private.guest_invitations from public,anon,authenticated;
create function private.create_guest_invitation(e uuid, ids uuid[], clergy uuid, label text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); i uuid;
begin
 if auth.uid() is null or not private.can_access_event(e) then raise exception 'Sign in to manage this celebration'; end if;
 if cardinality(ids)<1 or cardinality(ids)>100 or exists(select 1 from unnest(ids) g where not exists(select 1 from public.guests where id=g and event_id=e)) then raise exception 'Choose saved guests from this celebration'; end if;
 if clergy is not null and not exists(select 1 from public.planning_records where id=clergy and event_id=e and kind='ceremony_clergy') then raise exception 'Choose clergy from this celebration'; end if;
 insert into private.guest_invitations(event_id,guest_ids,clergy_id,label,token_hash) values(e,ids,clergy,left(label,150),encode(sha256(t::bytea),'hex')) returning id into i;
 return jsonb_build_object('id',i,'token',t);
end $$;
create function public.create_guest_invitation(e uuid,ids uuid[],clergy uuid,label text) returns jsonb language sql security invoker set search_path='' as $$select private.create_guest_invitation(e,ids,clergy,label)$$;
create function private.manage_guest_invitations(e uuid,revoke_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not private.can_access_event(e) then raise exception 'Sign in to manage this celebration';end if;
 if revoke_id is not null then update private.guest_invitations set revoked=true where id=revoke_id and event_id=e;end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'revoked',revoked,'expires_at',expires_at) order by label) from private.guest_invitations where event_id=e),'[]');
end$$;
create function public.manage_guest_invitations(e uuid,revoke_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.manage_guest_invitations(e,revoke_id)$$;
-- Possession of a random 256-bit token authorizes only the explicitly selected guests.
-- Privileged implementation lives outside the exposed schema; no direct table access.
create function private.read_guest_invitation(token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.guest_invitations; cfg jsonb; result jsonb;begin
 if length(token)<>64 then raise exception 'This invitation is unavailable'; end if;
 select * into i from private.guest_invitations where token_hash=encode(sha256(token::bytea),'hex') and not revoked and expires_at>now();
 if not found then raise exception 'This invitation has expired or was withdrawn';end if;
 select content into cfg from public.invitation_settings where event_id=i.event_id; cfg:=coalesce(cfg,'{}');
 select jsonb_build_object('event',jsonb_build_object('name',name,'partner_one',partner_one,'partner_two',partner_two,'date',date,'venue',venue,'palette',palette),'content',cfg,
 'guests',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'rsvp',g.rsvp,'meal',g.meal,'table',case when cfg->>'publish_seating'='true' then (select f.name from public.seats s join public.floor_objects f on f.id=s.table_id where s.guest_id=g.id and s.event_id=i.event_id limit 1) else null end) order by g.name) from public.guests g where g.event_id=i.event_id and g.id=any(i.guest_ids)),'[]'),
 'clergy',case when cfg->>'publish_assignments'='true' then (select jsonb_build_object('name',c.title,'role',c.details->>'role','pew',(select place->>'name' from public.planning_records layout_record cross join lateral jsonb_array_elements((layout_record.details->>'layout')::jsonb->'pews') place where layout_record.event_id=i.event_id and layout_record.kind='ceremony_details' and layout_record.details ? 'layout' and exists(select 1 from jsonb_each_text((layout_record.details->>'layout')::jsonb->'seats') seat where seat.value=i.clergy_id::text and split_part(seat.key,':',1)=place->>'id') limit 1),'assignments',coalesce((select jsonb_agg(jsonb_build_object('title',p.title,'language',p.details->>'language','notes',p.notes) order by coalesce(p.details->>'order','')) from public.planning_records p where p.event_id=i.event_id and p.kind='ceremony_prayer' and p.assignee_id=i.clergy_id),'[]')) from public.planning_records c where c.id=i.clergy_id and c.event_id=i.event_id and c.kind='ceremony_clergy') else null end) into result from public.events where id=i.event_id;
 return result;
end$$;
create function public.read_guest_invitation(token text) returns jsonb language sql security invoker set search_path='' as $$select private.read_guest_invitation(token)$$;
create function private.reply_guest_invitation(token text,replies jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.guest_invitations; r jsonb; cfg jsonb;begin
 perform private.read_guest_invitation(token);
 select * into i from private.guest_invitations where token_hash=encode(sha256(token::bytea),'hex') and not revoked and expires_at>now() for update;
 perform 1 from public.events where id=i.event_id for update;
 select content into cfg from public.invitation_settings where event_id=i.event_id;
 if nullif(cfg->>'deadline','') is not null and (cfg->>'deadline')::date<current_date then raise exception 'The RSVP deadline has passed. Please contact the couple.';end if;
 if jsonb_typeof(replies)<>'array' or jsonb_array_length(replies)>100 then raise exception 'Invalid response';end if;
 for r in select value from jsonb_array_elements(replies) loop
 if not ((r->>'id')::uuid=any(i.guest_ids)) or coalesce(r->>'rsvp','') not in ('accepted','declined','pending') or length(coalesce(r->>'meal',''))>500 then raise exception 'Invalid response';end if;
 update public.guests set rsvp=r->>'rsvp',meal=coalesce(r->>'meal','') where id=(r->>'id')::uuid and event_id=i.event_id;
 end loop;
 update public.events set revision=revision+1 where id=i.event_id;
 return private.read_guest_invitation(token);
end$$;
create function public.reply_guest_invitation(token text,replies jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.reply_guest_invitation(token,replies)$$;
revoke all on function private.create_guest_invitation(uuid,uuid[],uuid,text),private.manage_guest_invitations(uuid,uuid),private.read_guest_invitation(text),private.reply_guest_invitation(text,jsonb),public.create_guest_invitation(uuid,uuid[],uuid,text),public.manage_guest_invitations(uuid,uuid),public.read_guest_invitation(text),public.reply_guest_invitation(text,jsonb) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.create_guest_invitation(uuid,uuid[],uuid,text),private.manage_guest_invitations(uuid,uuid),public.create_guest_invitation(uuid,uuid[],uuid,text),public.manage_guest_invitations(uuid,uuid) to authenticated;
grant execute on function private.read_guest_invitation(text),private.reply_guest_invitation(text,jsonb),public.read_guest_invitation(text),public.reply_guest_invitation(text,jsonb) to anon,authenticated;
commit;
