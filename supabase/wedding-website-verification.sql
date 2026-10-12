begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000911');
insert into public.events(id,owner_id,name,partner_one,partner_two,mode,date,venue,budget,palette) values('00000000-0000-4000-8000-000000000912','00000000-0000-4000-8000-000000000911','Website test','Test','Couple','wedding','2027-06-19','Venue',100,'[]');
insert into public.invitation_settings(event_id,content) values('00000000-0000-4000-8000-000000000912','{"website_published":false,"website_design":{"texture":"linen"},"website_sections":[{"id":"story","title":"Our story","text":"A beginning"}],"contact":"PRIVATE CONTACT","publish_assignments":true}');
set local role anon;
do $$begin
  if public.read_wedding_website('00000000-0000-4000-8000-000000000912') is not null then raise exception 'Draft website is exposed'; end if;
end$$;
reset role;
update public.invitation_settings set content=jsonb_set(content,'{website_published}','true') where event_id='00000000-0000-4000-8000-000000000912';
set local role anon;
do $$declare result jsonb; begin
  result:=public.read_wedding_website('00000000-0000-4000-8000-000000000912');
  if result->'content'->'website_design'->>'texture' is distinct from 'linen' then raise exception 'Published design unavailable';end if;
  if result::text like '%PRIVATE CONTACT%' or result ? 'guests' or result ? 'clergy' or result->'event' ? 'budget' or result->'event' ? 'owner_id' then raise exception 'Private data exposed';end if;
  if public.read_wedding_website('00000000-0000-4000-8000-000000000913') is not null then raise exception 'Unknown website available';end if;
end$$;
reset role;
update public.invitation_settings set content=jsonb_set(content,'{website_published}','false') where event_id='00000000-0000-4000-8000-000000000912';
set local role anon;
do $$begin if public.read_wedding_website('00000000-0000-4000-8000-000000000912') is not null then raise exception 'Unpublish failed';end if;end$$;
reset role;
select 'PASS: anonymous published design, hidden drafts, hidden private data, unknown pages, unpublish' as verification;
rollback;
