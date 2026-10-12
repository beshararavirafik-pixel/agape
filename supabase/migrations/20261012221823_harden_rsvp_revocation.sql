-- Keep the privileged ownership check outside the exposed API schema.
create or replace function private.revoke_rsvp_invite(invite_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.rsvp_invites i
    where i.id = invite_id and private.can_access_event(i.event_id)
  ) then raise exception 'Invitation is not accessible'; end if;
  update public.rsvp_invites set revoked_at = now() where id = invite_id;
end;
$$;
create or replace function public.revoke_rsvp_invite(invite_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.revoke_rsvp_invite(invite_id);
$$;
revoke all on function private.revoke_rsvp_invite(uuid), public.revoke_rsvp_invite(uuid) from public, anon, authenticated;
grant execute on function private.revoke_rsvp_invite(uuid), public.revoke_rsvp_invite(uuid) to authenticated;
