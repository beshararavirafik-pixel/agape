-- Apply once in the Supabase SQL editor. All monetary values are in event currency (USD in v1).
create table public.events (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, partner_one text not null, partner_two text not null,
 mode text not null check (mode in ('wedding','engagement')), date date not null,
 venue text not null default '', budget numeric not null check(budget >= 0),
 palette jsonb not null default '[]', revision integer not null default 0
);
create table public.guests (
 id uuid primary key,event_id uuid not null references public.events on delete cascade,
 name text not null,household text not null default '',rsvp text not null check(rsvp in ('pending','accepted','declined')),
 meal text not null default '',email text not null default '',unique(id,event_id)
);
create table public.floor_objects (
 id uuid primary key,event_id uuid not null references public.events on delete cascade,
 name text not null,kind text not null,x numeric not null check(x between 0 and 800),y numeric not null check(y between 0 and 600),
 rotation numeric not null default 0,capacity integer not null check(capacity between 0 and 24),unique(id,event_id)
);
create table public.seats (
 id uuid primary key,event_id uuid not null references public.events on delete cascade,
 guest_id uuid not null,table_id uuid not null,position integer not null check(position>=0),
 foreign key(guest_id,event_id) references public.guests(id,event_id) on delete cascade,
 foreign key(table_id,event_id) references public.floor_objects(id,event_id) on delete cascade,
 unique(guest_id),unique(table_id,position)
);
-- Typed planning records share the same event and can reference a vendor record.
create table public.planning_records (
 id uuid primary key,event_id uuid not null references public.events on delete cascade,
 kind text not null check(kind in ('task','budget','vendor','decor','inspiration','timeline','day','note','document')),
 title text not null,status text not null,amount numeric not null default 0 check(amount>=0),paid numeric not null default 0 check(paid>=0),
 date text not null default '',notes text not null default '',url text not null default '',vendor_id uuid,
 storage_path text,unique(id,event_id),foreign key(vendor_id,event_id) references public.planning_records(id,event_id) deferrable initially deferred
);
create index on public.guests(event_id);create index on public.floor_objects(event_id);create index on public.seats(event_id);create index on public.planning_records(event_id,kind);
alter table public.events enable row level security;
create policy owner_events on public.events for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create function public.owns_event(e uuid) returns boolean language sql stable security invoker set search_path=public as $$select exists(select 1 from events where id=e and owner_id=auth.uid())$$;
revoke all on function public.owns_event(uuid) from public;grant execute on function public.owns_event(uuid) to authenticated;
do $$declare t text;begin foreach t in array array['guests','floor_objects','seats','planning_records'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy event_owner on public.%I for all to authenticated using(public.owns_event(event_id)) with check(public.owns_event(event_id))',t);end loop;end$$;
create function public.validate_seat() returns trigger language plpgsql set search_path=public as $$begin if not exists(select 1 from floor_objects where id=new.table_id and event_id=new.event_id and capacity>new.position and kind in ('round','rectangular','square','oval','sweetheart','head','cocktail')) then raise exception 'Seat outside table capacity';end if;return new;end$$;
create trigger seat_capacity before insert or update on public.seats for each row execute function public.validate_seat();
-- Atomic save, optimistic revision lock: never silently overwrite another tab's edits.
create function public.save_plan(plan jsonb, expected_revision integer) returns integer language plpgsql security invoker set search_path=public as $$
declare e uuid := (plan->'event'->>'id')::uuid; current_revision integer;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select revision into current_revision from events where id=e for update;
 if found then
  if current_revision<>expected_revision then raise exception 'This plan changed in another tab. Reload before editing.';end if;
  update events set name=plan->'event'->>'name',partner_one=plan->'event'->>'partner_one',partner_two=plan->'event'->>'partner_two',mode=plan->'event'->>'mode',date=(plan->'event'->>'date')::date,venue=plan->'event'->>'venue',budget=(plan->'event'->>'budget')::numeric,palette=plan->'event'->'palette',revision=revision+1 where id=e;
 else
  insert into events(id,owner_id,name,partner_one,partner_two,mode,date,venue,budget,palette,revision) values(e,auth.uid(),plan->'event'->>'name',plan->'event'->>'partner_one',plan->'event'->>'partner_two',plan->'event'->>'mode',(plan->'event'->>'date')::date,plan->'event'->>'venue',(plan->'event'->>'budget')::numeric,plan->'event'->'palette',1);
 end if;
 delete from seats where event_id=e;delete from planning_records where event_id=e;delete from guests where event_id=e;delete from floor_objects where event_id=e;
 insert into guests select * from jsonb_populate_recordset(null::guests,plan->'guests');
 insert into floor_objects select * from jsonb_populate_recordset(null::floor_objects,plan->'objects');
 insert into planning_records select * from jsonb_populate_recordset(null::planning_records,plan->'records');
 insert into seats select * from jsonb_populate_recordset(null::seats,plan->'seats');
 return coalesce(current_revision,0)+1;end$$;
revoke all on function public.save_plan(jsonb,integer) from public;grant execute on function public.save_plan(jsonb,integer) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('planning-documents','planning-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict do nothing;
create policy document_owner on storage.objects for all to authenticated using(bucket_id='planning-documents' and public.owns_event((storage.foldername(name))[1]::uuid)) with check(bucket_id='planning-documents' and public.owns_event((storage.foldername(name))[1]::uuid));
-- Protect capacity changes made outside save_plan as well.
create function public.validate_capacity_change() returns trigger language plpgsql set search_path=public as $$begin if exists(select 1 from seats where table_id=new.id and position>=new.capacity) then raise exception 'Unseat affected guests before reducing capacity';end if;return new;end$$;
create trigger capacity_change before update of capacity on public.floor_objects for each row execute function public.validate_capacity_change();

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.events,public.guests,public.floor_objects,public.seats,public.planning_records to authenticated;
revoke execute on function public.owns_event(uuid),public.save_plan(jsonb,integer),public.validate_seat(),public.validate_capacity_change() from anon;
