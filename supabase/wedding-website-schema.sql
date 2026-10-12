-- Only explicitly published wedding pages are available anonymously.
-- Existing invitation_settings RLS remains the write/ownership boundary.
create or replace function private.read_wedding_website(website_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'event', jsonb_build_object('partner_one', e.partner_one, 'partner_two', e.partner_two, 'date', e.date, 'venue', e.venue),
    'content', jsonb_build_object(
      'website_design', s.content->'website_design',
      'website_sections', s.content->'website_sections',
      'church', s.content->'church', 'church_time', s.content->'church_time',
      'reception', s.content->'reception', 'reception_time', s.content->'reception_time',
      'dress', s.content->'dress', 'parking', s.content->'parking'
    )
  ) from public.events e join public.invitation_settings s on s.event_id = e.id
  where e.id = website_id and s.content->>'website_published' = 'true';
$$;
create or replace function public.read_wedding_website(website_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.read_wedding_website(website_id);
$$;
revoke all on function private.read_wedding_website(uuid), public.read_wedding_website(uuid) from public, anon, authenticated;
grant execute on function private.read_wedding_website(uuid), public.read_wedding_website(uuid) to anon, authenticated;
