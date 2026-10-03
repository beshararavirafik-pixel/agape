-- Any authorized planner can revoke a household link, including one created by their partner.
create or replace function public.revoke_rsvp_invite(invite_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not exists (
    select 1 from rsvp_invites i where i.id=invite_id and public.owns_event(i.event_id)
  ) then raise exception 'Invitation is not accessible'; end if;
  update rsvp_invites set revoked_at=now() where id=invite_id;
end;
$$;
revoke all on function public.revoke_rsvp_invite(uuid) from public, anon;
grant execute on function public.revoke_rsvp_invite(uuid) to authenticated;
