-- Optional display label shared by members; invitation membership still uses household and family links.
alter table public.guests add column family_name text check (family_name is null or char_length(family_name) <= 120);
