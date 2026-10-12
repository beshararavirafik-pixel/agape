-- Explicit grants make deployment independent of Supabase default privileges.
-- RLS remains the authorization boundary for every exposed table.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.events, public.guests, public.floor_objects,
  public.seats, public.planning_records, public.family_links, public.rsvp_invites,
  public.invitation_settings to authenticated;
grant select on public.event_members, public.plan_versions to authenticated;
alter function private.keep_event_owner() set search_path = public;
revoke execute on function public.validate_seat(), public.validate_capacity_change() from public, anon, authenticated;
