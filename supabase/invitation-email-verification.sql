begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000911'),('00000000-0000-4000-8000-000000000912');
insert into public.events(id,owner_id,name,partner_one,partner_two,mode,date,venue,budget,palette)
values('00000000-0000-4000-8000-000000000913','00000000-0000-4000-8000-000000000911','Email verification celebration','Test','Couple','wedding','2027-06-19','Test venue',100,'[]');
insert into public.guests(id,event_id,name,rsvp,meal,email)
values('00000000-0000-4000-8000-000000000914','00000000-0000-4000-8000-000000000913','Invited guest','pending','','guest@example.com');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000911',true);
set local role authenticated;
do $$
declare invitation jsonb; first_send jsonb; retry_send jsonb; partner_token text; denied boolean;
begin
 invitation:=public.create_guest_invitation('00000000-0000-4000-8000-000000000913',array['00000000-0000-4000-8000-000000000914'::uuid],null,'Guest');
 perform set_config('agape.email_test_token',invitation->>'token',true);
 first_send:=public.prepare_invitation_email('00000000-0000-4000-8000-000000000913','guest',invitation->>'token','guest@example.com');
 retry_send:=public.prepare_invitation_email('00000000-0000-4000-8000-000000000913','guest',invitation->>'token','GUEST@example.com');
 if first_send->>'delivery_id' is distinct from retry_send->>'delivery_id' then raise exception 'Retry was not idempotent';end if;
 denied:=false;begin perform public.prepare_invitation_email('00000000-0000-4000-8000-000000000913','guest',invitation->>'token','other@example.com');exception when others then denied:=true;end;
 if not denied then raise exception 'Uninvited recipient allowed';end if;
 partner_token:=public.create_partner_invite('00000000-0000-4000-8000-000000000913','partner@example.com');
 retry_send:=public.prepare_invitation_email('00000000-0000-4000-8000-000000000913','partner',partner_token,'attacker@example.com');
 if retry_send->>'recipient'<>'partner@example.com' then raise exception 'Partner recipient could be overwritten';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000912',true);
 denied:=false;begin perform public.prepare_invitation_email('00000000-0000-4000-8000-000000000913','guest',invitation->>'token','guest@example.com');exception when others then denied:=true;end;
 if not denied then raise exception 'Foreign account could email celebration';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000911',true);
 perform public.manage_guest_invitations('00000000-0000-4000-8000-000000000913',(invitation->>'id')::uuid);
 denied:=false;begin perform public.prepare_invitation_email('00000000-0000-4000-8000-000000000913','guest',invitation->>'token','guest@example.com');exception when others then denied:=true;end;
 if not denied then raise exception 'Withdrawn invitation could be emailed';end if;
end $$;
reset role;
-- Fill the sender's reservation quota without actually emailing anyone.
insert into private.invitation_email_deliveries(user_id,event_id,invitation_id,invitation_kind,recipient,event_name)
select '00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000913',gen_random_uuid(),'guest','quota@example.com','Quota' from generate_series(1,18);
set local role authenticated;
do $$declare invitation jsonb; denied boolean:=false;begin
 invitation:=public.create_guest_invitation('00000000-0000-4000-8000-000000000913',array['00000000-0000-4000-8000-000000000914'::uuid],null,'Quota guest');
 begin perform public.prepare_invitation_email('00000000-0000-4000-8000-000000000913','guest',invitation->>'token','guest@example.com');exception when others then
   if sqlerrm not like '%limit%' then raise;end if;denied:=true;end;
 if not denied then raise exception 'Sending quota was bypassed';end if;
end$$;
reset role;
select 'PASS: invitation recipients, ownership, revocation, idempotency, sending quota' as verification;
rollback;
