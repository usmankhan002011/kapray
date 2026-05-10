-- Kapray: Atomic single-unit order creation with variant-size inventory support
-- Policy:
-- 1 order = 1 product unit.
-- made_on_order products do not reduce stock.
-- stitched_ready products with selected variant + size reduce that exact variant-size qty.
-- all other stock-managed products reduce products.inventory_qty by 1.
-- Product row is locked with FOR UPDATE to prevent overselling under simultaneous buyers.

create or replace function public.create_order_atomic_single_unit(
  p_product_id bigint,
  p_buyer_auth_user_id uuid,
  p_buyer_name text,
  p_buyer_mobile text,
  p_buyer_email text,
  p_delivery_address text,
  p_city text,
  p_notes text,
  p_product_code_snapshot text,
  p_title_snapshot text,
  p_spec_snapshot jsonb,
  p_price_snapshot jsonb,
  p_media_snapshot jsonb,
  p_currency text,
  p_subtotal_pkr numeric,
  p_delivery_pkr numeric,
  p_discount_pkr numeric,
  p_total_pkr numeric,
  p_size_mode text,
  p_selected_size text,
  p_exact_measurements jsonb,
  p_selected_variant_id text default null,
  p_selected_variant_size text default null
)
returns table (
  ok boolean,
  order_id bigint,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
  v_order_id bigint;
  v_price jsonb;
  v_variants jsonb;
  v_new_variants jsonb := '[]'::jsonb;
  v_variant jsonb;
  v_new_variant jsonb;
  v_sizes jsonb;
  v_new_sizes jsonb;
  v_size_row jsonb;
  v_new_size_row jsonb;
  v_variant_matched boolean := false;
  v_size_matched boolean := false;
  v_current_qty integer := 0;
  v_product_category text;
  v_selected_variant_id text := nullif(btrim(coalesce(p_selected_variant_id, '')), '');
  v_selected_variant_size text := nullif(btrim(coalesce(p_selected_variant_size, '')), '');
begin
  select
    id,
    vendor_id,
    coalesce(inventory_qty, 0) as inventory_qty,
    coalesce(made_on_order, false) as made_on_order,
    product_category,
    spec,
    price,
    media
  into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    return query select false, null::bigint, 'Product not found';
    return;
  end if;

  v_product_category := coalesce(v_product.product_category, '');

  if v_product.made_on_order = false then
    if v_product_category = 'stitched_ready'
       and v_selected_variant_id is not null
       and v_selected_variant_size is not null then

      v_price := coalesce(v_product.price, '{}'::jsonb);
      v_variants := coalesce(
        v_price -> 'variants',
        v_price -> 'ready_variants',
        v_price -> 'readyVariants',
        v_price -> 'stitched_variants',
        v_price -> 'stitchedVariants',
        '[]'::jsonb
      );

      if jsonb_typeof(v_variants) <> 'array' then
        return query select false, null::bigint, 'Variant inventory not found';
        return;
      end if;

      for v_variant in select value from jsonb_array_elements(v_variants) loop
        v_new_variant := v_variant;

        if coalesce(
          nullif(btrim(v_variant ->> 'id'), ''),
          nullif(btrim(v_variant ->> 'variant_id'), ''),
          nullif(btrim(v_variant ->> 'variantId'), ''),
          nullif(btrim(v_variant ->> 'label'), ''),
          nullif(btrim(v_variant ->> 'name'), '')
        ) = v_selected_variant_id then
          v_variant_matched := true;
          v_sizes := coalesce(v_variant -> 'sizes', '[]'::jsonb);

          if jsonb_typeof(v_sizes) <> 'array' then
            return query select false, null::bigint, 'Variant size inventory not found';
            return;
          end if;

          v_new_sizes := '[]'::jsonb;

          for v_size_row in select value from jsonb_array_elements(v_sizes) loop
            v_new_size_row := v_size_row;

            if lower(btrim(coalesce(
              v_size_row ->> 'size',
              v_size_row ->> 'label',
              v_size_row ->> 'name',
              v_size_row ->> 'value',
              ''
            ))) = lower(v_selected_variant_size) then
              v_size_matched := true;
              v_current_qty := greatest(0, coalesce(
                nullif(v_size_row ->> 'qty', '')::integer,
                nullif(v_size_row ->> 'stock_qty', '')::integer,
                nullif(v_size_row ->> 'stockQty', '')::integer,
                nullif(v_size_row ->> 'stock', '')::integer,
                nullif(v_size_row ->> 'quantity', '')::integer,
                0
              ));

              if v_current_qty < 1 then
                return query select false, null::bigint, 'Out of stock';
                return;
              end if;

              -- Preserve the app's canonical qty field. Also mirror common stock aliases if present.
              v_new_size_row := jsonb_set(v_new_size_row, '{qty}', to_jsonb(v_current_qty - 1), true);

              if v_new_size_row ? 'stock_qty' then
                v_new_size_row := jsonb_set(v_new_size_row, '{stock_qty}', to_jsonb(v_current_qty - 1), true);
              end if;

              if v_new_size_row ? 'stockQty' then
                v_new_size_row := jsonb_set(v_new_size_row, '{stockQty}', to_jsonb(v_current_qty - 1), true);
              end if;

              if v_new_size_row ? 'stock' then
                v_new_size_row := jsonb_set(v_new_size_row, '{stock}', to_jsonb(v_current_qty - 1), true);
              end if;

              if v_new_size_row ? 'quantity' then
                v_new_size_row := jsonb_set(v_new_size_row, '{quantity}', to_jsonb(v_current_qty - 1), true);
              end if;
            end if;

            v_new_sizes := v_new_sizes || jsonb_build_array(v_new_size_row);
          end loop;

          if not v_size_matched then
            return query select false, null::bigint, 'Selected size not found';
            return;
          end if;

          v_new_variant := jsonb_set(v_new_variant, '{sizes}', v_new_sizes, true);
        end if;

        v_new_variants := v_new_variants || jsonb_build_array(v_new_variant);
      end loop;

      if not v_variant_matched then
        return query select false, null::bigint, 'Selected variant not found';
        return;
      end if;

      -- Write back to the same variant array key family used by the product price JSON.
      if v_price ? 'variants' then
        v_price := jsonb_set(v_price, '{variants}', v_new_variants, true);
      elsif v_price ? 'ready_variants' then
        v_price := jsonb_set(v_price, '{ready_variants}', v_new_variants, true);
      elsif v_price ? 'readyVariants' then
        v_price := jsonb_set(v_price, '{readyVariants}', v_new_variants, true);
      elsif v_price ? 'stitched_variants' then
        v_price := jsonb_set(v_price, '{stitched_variants}', v_new_variants, true);
      elsif v_price ? 'stitchedVariants' then
        v_price := jsonb_set(v_price, '{stitchedVariants}', v_new_variants, true);
      else
        v_price := jsonb_set(v_price, '{variants}', v_new_variants, true);
      end if;

      update public.products
      set price = v_price
      where id = p_product_id;

    else
      if v_product.inventory_qty < 1 then
        return query select false, null::bigint, 'Out of stock';
        return;
      end if;

      update public.products
      set inventory_qty = inventory_qty - 1
      where id = p_product_id;
    end if;
  end if;

  insert into public.orders (
    vendor_id,
    buyer_auth_user_id,
    buyer_name,
    buyer_mobile,
    buyer_email,
    delivery_address,
    city,
    notes,
    product_id,
    product_code_snapshot,
    title_snapshot,
    spec_snapshot,
    price_snapshot,
    media_snapshot,
    currency,
    subtotal_pkr,
    delivery_pkr,
    discount_pkr,
    total_pkr,
    size_mode,
    selected_size,
    exact_measurements,
    status
  )
  values (
    v_product.vendor_id,
    p_buyer_auth_user_id,
    p_buyer_name,
    p_buyer_mobile,
    p_buyer_email,
    p_delivery_address,
    p_city,
    p_notes,
    p_product_id,
    p_product_code_snapshot,
    p_title_snapshot,
    p_spec_snapshot,
    p_price_snapshot,
    p_media_snapshot,
    p_currency,
    p_subtotal_pkr,
    p_delivery_pkr,
    p_discount_pkr,
    p_total_pkr,
    p_size_mode,
    p_selected_size,
    p_exact_measurements,
    'placed'
  )
  returning id into v_order_id;

  return query select true, v_order_id, 'Order created';
end;
$$;

grant execute on function public.create_order_atomic_single_unit(
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  jsonb,
  text,
  text
) to authenticated;
