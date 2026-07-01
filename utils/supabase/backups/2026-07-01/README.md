# Supabase Backup - 2026-07-01

This folder contains a regeneration backup for the live Kapray Supabase tables used by the app.

## Files

- `schema.sql` recreates the public tables, indexes, product-code/order triggers, checkout RPC, grants, and `vendor_review_summary`.
- `data.sql` restores all exported table rows in dependency order.
- `data/*.sql` contains one data file per table.
- `restore_all.sql` is a `psql` wrapper that runs `schema.sql` and `data.sql`.
- `manifest.json` records exported tables, columns, row counts, and generation metadata.

## Restore

From this folder:

```sql
\i restore_all.sql
```

Or run the files manually in this order:

```sql
\i schema.sql
\i data.sql
```

## Scope Notes

- Data was exported through the app publishable key. If any future table or row is hidden from that key by RLS, it will need a service-role or database dump backup.
- Supabase Storage bucket files are not included. Table rows include storage paths only.
- RLS policies were not introspectable from the app key, so production policies should be restored separately from Supabase dashboard/CLI exports.
