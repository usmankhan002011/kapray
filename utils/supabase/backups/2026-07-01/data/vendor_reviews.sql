-- Data backup for public.vendor_reviews
-- Row count: 1

insert into public."vendor_reviews" ("id", "created_at", "updated_at", "vendor_id", "buyer_user_id", "order_id", "rating", "comment", "vendor_reply", "vendor_reply_at", "is_verified_purchase", "is_public", "is_hidden") values
  (1, '2026-04-23T08:40:09.893131+00:00', '2026-04-23T08:40:09.893131+00:00', 41, '2fe44a86-b79c-468e-acce-099de1a80f31', 123, 4, 'Timely delivery. Little undersized', NULL, NULL, TRUE, TRUE, FALSE);

select setval(pg_get_serial_sequence('public.vendor_reviews', 'id'), coalesce((select max(id) from public."vendor_reviews"), 1), true);

