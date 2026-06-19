alter table public.vendor
add column if not exists offers_dyeing boolean not null default false;
