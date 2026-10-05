begin;
-- Disposable fixtures remain entirely inside this rolled-back transaction.
insert into auth.users(id) values('00000000-0000-4000-8000-000000000901');
insert into public.events(id,owner_id,name,partner_one,partner_two,mode,date,venue,budget,palette) values('00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000901','Invitation verification','Test','Couple','wedding','2027-06-19','Test venue',100,'[]');
insert into public.guests(id,event_id,name,rsvp,meal,email) values('00000000-0000-4000-8000-000000000903','00000000-0000-4000-8000-000000000902','Invited guest','pending','',''),('00000000-0000-4000-8000-000000000904','00000000-0000-4000-8000-000000000902','Private guest','pending','','');
insert into public.planning_records(id,event_id,kind,title,status,details,assignee_id) values
('00000000-0000-4000-8000-000000000905','00000000-0000-4000-8000-000000000902','ceremony_clergy','Test Deacon','open','{"role":"Deacon"}',null),
('00000000-0000-4000-8000-000000000906','00000000-0000-4000-8000-000000000902','ceremony_prayer','Assigned Gospel','open','{"language":"English","order":"1"}','00000000-0000-4000-8000-000000000905'),
('00000000-0000-4000-8000-000000000907','00000000-0000-4000-8000-000000000902','ceremony_prayer','Other deacon prayer','open','{}',null),
('00000000-0000-4000-8000-000000000908','00000000-0000-4000-8000-000000000902','ceremony_details','Church layout','open','{"layout":"{\"pews\":[{\"id\":\"pew-1\",\"name\":\"Pew 2\"}],\"seats\":{\"pew-1:0\":\"00000000-0000-4000-8000-000000000905\"}}"}',null);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000901',true);
insert into public.invitation_settings(event_id,content) values('00000000-0000-4000-8000-000000000902','{"publish_assignments":true,"publish_seating":false}');
do $$declare invitation jsonb; t text; result jsonb; denied boolean;begin
 invitation:=public.create_guest_invitation('00000000-0000-4000-8000-000000000902',array['00000000-0000-4000-8000-000000000903'::uuid],'00000000-0000-4000-8000-000000000905','Test');t:=invitation->>'token';
 perform set_config('request.jwt.claim.sub','',true);
 result:=public.read_guest_invitation(t);
 if jsonb_array_length(result->'guests')<>1 or result::text like '%Private guest%' or result->'event' ? 'budget' then raise exception 'Privacy boundary failed';end if;
 if result->'clergy'->>'pew'<>'Pew 2' or jsonb_array_length(result->'clergy'->'assignments')<>1 or result::text like '%Other deacon prayer%' then raise exception 'Deacon privacy or assignment failed';end if;
 result:=public.reply_guest_invitation(t,'[{"id":"00000000-0000-4000-8000-000000000903","rsvp":"accepted","meal":"Vegetarian"}]');
 if result->'guests'->0->>'rsvp'<>'accepted' then raise exception 'RSVP did not persist';end if;
 denied:=false;begin perform public.reply_guest_invitation(t,'[{"id":"00000000-0000-4000-8000-000000000904","rsvp":"accepted"}]');exception when others then denied:=true;end;
 if not denied then raise exception 'Cross-invitation update allowed';end if;
 denied:=false;begin perform public.read_guest_invitation(repeat('a',64));exception when others then denied:=true;end;
 if not denied then raise exception 'Invalid token allowed';end if;
 denied:=false;begin perform public.create_guest_invitation('00000000-0000-4000-8000-000000000902',array['00000000-0000-4000-8000-000000000903'::uuid],null,'Unauthorized');exception when others then denied:=true;end;
 if not denied then raise exception 'Unsigned management allowed';end if;
 update public.invitation_settings set content='{"deadline":"2000-01-01"}' where event_id='00000000-0000-4000-8000-000000000902';
 denied:=false;begin perform public.reply_guest_invitation(t,'[]');exception when others then denied:=true;end;
 if not denied then raise exception 'Deadline ignored';end if;
 update private.guest_invitations set revoked=true where id=(invitation->>'id')::uuid;
 denied:=false;begin perform public.read_guest_invitation(t);exception when others then denied:=true;end;
 if not denied then raise exception 'Revoked link allowed';end if;
end$$;
select 'PASS: isolated guests, RSVP persistence, invalid tokens, cross-invitation protection, signed-in management, deadlines, revocation' as verification;
rollback;
