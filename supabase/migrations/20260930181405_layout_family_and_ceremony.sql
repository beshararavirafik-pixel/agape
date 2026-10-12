alter table public.events add column room_width_ft numeric check(room_width_ft between 20 and 200),add column room_depth_ft numeric check(room_depth_ft between 20 and 200);
alter table public.floor_objects add column width_ft numeric check(width_ft between 0.5 and 100),add column depth_ft numeric check(depth_ft between 0.5 and 100),add column chair_width_ft numeric check(chair_width_ft between 0.5 and 5),add column chair_depth_ft numeric check(chair_depth_ft between 0.5 and 5),add column chair_sizes jsonb;
alter table public.floor_objects drop constraint floor_objects_x_check,drop constraint floor_objects_y_check;
alter table public.floor_objects add constraint layout_x_range check(x between 0 and 2000),add constraint layout_y_range check(y between 0 and 2000);
create table public.family_links(id uuid primary key,event_id uuid not null references public.events on delete cascade,guest_id uuid not null,related_guest_id uuid not null,relationship text not null check(relationship in ('Mother','Father','Parent','Sibling','Partner','Child','Relative','Friend')),foreign key(guest_id,event_id) references public.guests(id,event_id) on delete cascade,foreign key(related_guest_id,event_id) references public.guests(id,event_id) on delete cascade,unique(guest_id,related_guest_id),check(guest_id<>related_guest_id));
alter table public.family_links enable row level security;
create policy family_event_access on public.family_links for all to authenticated using(public.owns_event(event_id)) with check(public.owns_event(event_id));
grant select,insert,update,delete on public.family_links to authenticated;
create index family_guest_idx on public.family_links(guest_id,event_id);
create index family_event_idx on public.family_links(event_id);create index family_related_idx on public.family_links(related_guest_id);
alter table public.planning_records drop constraint planning_records_kind_check;
alter table public.planning_records add constraint planning_record_kind check(kind in ('task','budget','vendor','decor','inspiration','timeline','day','note','document','ceremony_clergy','ceremony_prayer','ceremony_details'));
alter table public.planning_records add column details jsonb,add column assignee_id uuid,add constraint prayer_assignee_event foreign key(assignee_id,event_id) references public.planning_records(id,event_id) deferrable initially deferred;
create function public.validate_prayer_assignment() returns trigger language plpgsql set search_path=public as $$begin if new.assignee_id is not null and not exists(select 1 from public.planning_records where id=new.assignee_id and event_id=new.event_id and kind='ceremony_clergy' and details->>'role'='Deacon') then raise exception 'Prayer assignments must reference a deacon in this event';end if;if exists(select 1 from public.planning_records p join public.planning_records d on d.id=p.assignee_id and d.event_id=p.event_id where p.event_id=new.event_id and (d.kind<>'ceremony_clergy' or d.details->>'role' is distinct from 'Deacon')) then raise exception 'Prayer assignments must reference a deacon in this event';end if;return new;end$$;
create constraint trigger prayer_deacon_assignment after insert or update on public.planning_records deferrable initially deferred for each row execute function public.validate_prayer_assignment();
revoke execute on function public.validate_prayer_assignment() from public,anon;

create or replace function public.save_plan(plan jsonb, expected_revision integer) returns integer language plpgsql security invoker set search_path=public as $$
declare e uuid := (plan->'event'->>'id')::uuid; current_revision integer;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select revision into current_revision from events where id=e for update;
 if found then
  if current_revision<>expected_revision then raise exception 'This plan changed in another tab. Reload before editing.';end if;
  update events set name=plan->'event'->>'name',partner_one=plan->'event'->>'partner_one',partner_two=plan->'event'->>'partner_two',mode=plan->'event'->>'mode',date=nullif(plan->'event'->>'date','')::date,venue=plan->'event'->>'venue',budget=(plan->'event'->>'budget')::numeric,palette=plan->'event'->'palette',room_width_ft=(plan->'event'->>'room_width_ft')::numeric,room_depth_ft=(plan->'event'->>'room_depth_ft')::numeric,revision=revision+1 where id=e;
 else
  insert into events(id,owner_id,name,partner_one,partner_two,mode,date,venue,budget,palette,revision) values(e,auth.uid(),plan->'event'->>'name',plan->'event'->>'partner_one',plan->'event'->>'partner_two',plan->'event'->>'mode',nullif(plan->'event'->>'date','')::date,plan->'event'->>'venue',(plan->'event'->>'budget')::numeric,plan->'event'->'palette',1);
 end if;
 delete from family_links where event_id=e;delete from seats where event_id=e;delete from planning_records where event_id=e;delete from guests where event_id=e;delete from floor_objects where event_id=e;
 insert into guests select * from jsonb_populate_recordset(null::guests,plan->'guests');
 insert into floor_objects select * from jsonb_populate_recordset(null::floor_objects,plan->'objects');
 insert into planning_records select * from jsonb_populate_recordset(null::planning_records,plan->'records');
 insert into seats select * from jsonb_populate_recordset(null::seats,plan->'seats');
 insert into family_links select * from jsonb_populate_recordset(null::family_links,coalesce(plan->'family_links','[]'::jsonb));
 update events set room_width_ft=(plan->'event'->>'room_width_ft')::numeric,room_depth_ft=(plan->'event'->>'room_depth_ft')::numeric where id=e;
 return coalesce(current_revision,0)+1;end$$;

create index prayer_assignee_idx on public.planning_records(assignee_id,event_id);
