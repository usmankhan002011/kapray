alter table public.vendor
add column if not exists additional_mobile_numbers text[] not null default '{}'::text[],
add column if not exists additional_landline_numbers text[] not null default '{}'::text[];
