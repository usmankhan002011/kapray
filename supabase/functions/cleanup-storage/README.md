# cleanup-storage

Deletes queued Supabase Storage objects from `public.storage_delete_queue`.

## Required secret

Set the backend secret key before deploying/running the function:

```bash
supabase secrets set KAPRAY_SUPABASE_SECRET_KEY=...
```

Optional hardening secret:

```bash
supabase secrets set CLEANUP_STORAGE_SECRET=...
```

When `CLEANUP_STORAGE_SECRET` is set, invoke with an `x-cleanup-secret` header.

## Suggested schedule

Run every 5 minutes with Supabase Cron + pg_net after storing the project URL,
publishable/anon key, and optional cleanup secret in Supabase Vault.

```sql
select cron.schedule(
  'cleanup-storage-every-5-minutes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/cleanup-storage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer '
        || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'x-cleanup-secret',
        coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_storage_secret'),
          ''
        )
    ),
    body := '{}'::jsonb
  );
  $$
);
```
