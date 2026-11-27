-- Run this entire script in Supabase SQL Editor.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  status text default 'Completed',
  image_url text,
  description text,
  created_at timestamptz default now()
);
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  caption text,
  media_type text not null check (media_type in ('photo','video')),
  file_name text,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz default now()
);
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  phone text,
  email text,
  location text
);
insert into public.site_settings(id,phone,email,location)
values(1,'+94 XX XXX XXXX','hello@kavithconstruction.com','Sri Lanka')
on conflict(id) do nothing;

alter table public.projects enable row level security;
alter table public.media enable row level security;
alter table public.site_settings enable row level security;

-- Public visitors can read published website content.
create policy "Public can view projects" on public.projects for select using (true);
create policy "Public can view media" on public.media for select using (true);
create policy "Public can view settings" on public.site_settings for select using (true);

-- Only signed-in administrators can change content.
create policy "Admins manage projects" on public.projects for all to authenticated using (true) with check (true);
create policy "Admins manage media" on public.media for all to authenticated using (true) with check (true);
create policy "Admins manage settings" on public.site_settings for all to authenticated using (true) with check (true);

-- Create a public storage bucket for website gallery files.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('construction-media','construction-media',true,104857600,
 array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict(id) do nothing;

create policy "Public can view construction media"
on storage.objects for select using (bucket_id = 'construction-media');
create policy "Authenticated admins upload construction media"
on storage.objects for insert to authenticated with check (bucket_id = 'construction-media');
create policy "Authenticated admins update construction media"
on storage.objects for update to authenticated using (bucket_id = 'construction-media') with check (bucket_id = 'construction-media');
create policy "Authenticated admins delete construction media"
on storage.objects for delete to authenticated using (bucket_id = 'construction-media');
