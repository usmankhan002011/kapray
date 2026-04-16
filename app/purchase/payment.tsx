import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase/client";
import ExactMeasurementsModal from "../(tabs)/flow/purchase/exact-measurements-modal";
import type { ExactMeasurementSheetRow } from "../(tabs)/flow/purchase/exact-measurements-sheet";

type Params = {
  productId?: string;
  product_id?: string;

  productCode?: string;
  product_code?: string;

  productName?: string;
  product_name?: string;

  product_category?: string;

  price?: string;
  currency?: string;
  imageUrl?: string;
  image_url?: string;

  price_per_meter_pkr?: string;
  stitched_total_pkr?: string;
  base_product_cost_pkr?: string;
  fabric_cost_pkr?: string;
  subtotal_before_delivery_pkr?: string;
  delivery_cost_pkr?: string;
  selected_fabric_length_m?: string;

  vendorName?: string;
  vendorShopName?: string;
  vendorMobile?: string;
  vendorAddress?: string;

  mode?: string;
  selectedSize?: string;
  selected_unstitched_size?: string;

  m1?: string;
  m2?: string;
  m3?: string;
  m4?: string;
  m5?: string;
  m6?: string;
  m7?: string;
  m8?: string;
  m9?: string;
  m10?: string;
  m11?: string;
  m12?: string;
  m13?: string;
  m14?: string;
  m15?: string;
  m16?: string;
  m17?: string;

  custom_label_1?: string;
  custom_value_1?: string;
  custom_label_2?: string;
  custom_value_2?: string;
  custom_label_3?: string;
  custom_value_3?: string;
  custom_label_4?: string;
  custom_value_4?: string;

  buyerName?: string;
  buyerMobile?: string;
  buyerEmail?: string;

  deliveryAddress?: string;
  city?: string;
  notes?: string;
  postal_code?: string;
  country?: string;

  destination_type?: string;
  export_region?: string;
  weight_kg?: string;

  dye_shade_id?: string;
  dye_hex?: string;
  dye_label?: string;
  dyeing_cost_pkr?: string;
  dyeing_selected?: string;

  tailoring_cost_pkr?: string;
  tailoring_turnaround_days?: string;
  tailoring_selected?: string;

  selected_tailoring_style_id?: string;
  selected_tailoring_style_title?: string;
  selected_tailoring_style_image?: string;
  selected_tailoring_style_snapshot?: string;
  selected_neck_variation?: string;
  selected_sleeve_variation?: string;
  selected_trouser_variation?: string;
  custom_tailoring_note?: string;
  tailoring_style_extra_cost_pkr?: string;
};

type SelectedTailoringStyleSnapshot = {
  id?: string | null;
  title?: string | null;
  note?: string | null;
  extra_cost_pkr?: number | string | null;
  default_neck?: string | null;
  default_sleeve?: string | null;
  default_trouser?: string | null;
  selected_neck_variation?: string | null;
  selected_sleeve_variation?: string | null;
  selected_trouser_variation?: string | null;
  image_url?: string | null;
  allow_custom_note?: boolean | null;
  custom_note?: string | null;
};

const norm = (v: unknown) => (v == null ? "" : String(v).trim());

function firstNonEmpty(...vals: Array<unknown>) {
  for (const v of vals) {
    const s = norm(v);
    if (s) return s;
  }
  return "";
}

function safeDecode(v: unknown) {
  const s = norm(v);
  if (!s) return "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function safeJsonDecode<T = any>(v: unknown, fallback: T): T {
  const s = safeDecode(v);
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function safePositiveNumber(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function parseBoolParam(v: unknown): boolean | null {
  const s = norm(v).toLowerCase();
  if (!s) return null;
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return null;
}

function prettyCategory(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanVariationLabel(value: string, kind: "neck" | "sleeve") {
  if (!value) return "";
  const pattern = kind === "neck" ? /\bneck\b/gi : /\bsleeve\b/gi;
  return value
    .replace(pattern, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${Math.round(amount || 0)}`;
}

function buildAddressPreview(args: {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  destinationType: string;
}) {
  const address = norm(args.address);
  const city = norm(args.city);
  const postalCode = norm(args.postalCode);
  const country = norm(args.country);
  const destinationType = norm(args.destinationType);

  const cityLine = [city, postalCode].filter(Boolean).join(" ");
  const endCountry = destinationType === "export" ? country : "";
  return [address, cityLine, endCountry].filter(Boolean).join(", ");
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function PlainSection({
  title,
  subtitle,
  children,
  withDivider = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  withDivider?: boolean;
}) {
  return (
    <View style={styles.plainSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {children}
      {withDivider ? <View style={styles.sectionDivider} /> : null}
    </View>
  );
}

function KVRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value?: React.ReactNode;
  muted?: boolean;
}) {
  if (
    value == null ||
    value === "" ||
    value === false ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, muted && styles.kvMuted]}>{value}</Text>
    </View>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, strong && styles.priceLabelStrong]}>
        {label}
      </Text>
      <Text style={[styles.priceValue, strong && styles.priceValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

function PaymentMethodCard({
  title,
  description,
  selected,
}: {
  title: string;
  description: string;
  selected?: boolean;
}) {
  return (
    <View
      style={[
        styles.paymentOptionCard,
        selected && styles.paymentOptionCardSelected,
      ]}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>

      <View style={styles.paymentOptionBody}>
        <Text style={styles.paymentOptionTitle}>{title}</Text>
        <Text style={styles.paymentOptionDesc}>{description}</Text>
      </View>
    </View>
  );
}

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const [submitting, setSubmitting] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);

  const data = useMemo(() => {
    const currency = norm(params.currency) || "PKR";
    const totalPkrSafe = safePositiveNumber(params.price);
    const subtotalBeforeDeliveryPkr = safePositiveNumber(
      params.subtotal_before_delivery_pkr,
    );
    const deliveryCostPkr = safePositiveNumber(params.delivery_cost_pkr);
    const baseProductCostPkr = safePositiveNumber(params.base_product_cost_pkr);
    const fabricCostPkr = safePositiveNumber(params.fabric_cost_pkr);
    const selectedFabricLengthM = safePositiveNumber(
      safeDecode(params.selected_fabric_length_m),
    );
    const pricePerMeterPkr = safePositiveNumber(params.price_per_meter_pkr);

    const mode = norm(params.mode) || "standard";
    const selectedSize = norm(params.selectedSize);
    const selectedUnstitchedSize = safeDecode(params.selected_unstitched_size);

    const measurements = {
      m1: norm(params.m1),
      m2: norm(params.m2),
      m3: norm(params.m3),
      m4: norm(params.m4),
      m5: norm(params.m5),
      m6: norm(params.m6),
      m7: norm(params.m7),
      m8: norm(params.m8),
      m9: norm(params.m9),
      m10: norm(params.m10),
      m11: norm(params.m11),
      m12: norm(params.m12),
      m13: norm(params.m13),
      m14: norm(params.m14),
      m15: norm(params.m15),
      m16: norm(params.m16),
      m17: norm(params.m17),
    };

    const exactPairs = (
      [
        ["1", measurements.m1],
        ["2", measurements.m2],
        ["3", measurements.m3],
        ["4", measurements.m4],
        ["5", measurements.m5],
        ["6", measurements.m6],
        ["7", measurements.m7],
        ["8", measurements.m8],
        ["9", measurements.m9],
        ["10", measurements.m10],
        ["11", measurements.m11],
        ["12", measurements.m12],
        ["13", measurements.m13],
        ["14", measurements.m14],
        ["15", measurements.m15],
        ["16", measurements.m16],
        ["17", measurements.m17],
      ] as [string, string][]
    ).filter(([, v]) => v.length > 0);

    const customDimensions = [
      {
        label: safeDecode(params.custom_label_1),
        value: safeDecode(params.custom_value_1),
      },
      {
        label: safeDecode(params.custom_label_2),
        value: safeDecode(params.custom_value_2),
      },
      {
        label: safeDecode(params.custom_label_3),
        value: safeDecode(params.custom_value_3),
      },
      {
        label: safeDecode(params.custom_label_4),
        value: safeDecode(params.custom_value_4),
      },
    ].filter((row) => row.label && row.value);

    const sizeLabel =
      mode === "exact"
        ? exactPairs.length
          ? "Exact measurements"
          : "Exact measurements not set"
        : selectedUnstitchedSize
          ? selectedUnstitchedSize
          : selectedSize
            ? selectedSize
            : "Not set";

    const dyeShadeId = safeDecode(params.dye_shade_id);
    const dyeHex = safeDecode(params.dye_hex);
    const dyeLabel = safeDecode(params.dye_label);
    const dyeingSelected = parseBoolParam(params.dyeing_selected) === true;
    const dyeCostPkr = dyeingSelected
      ? safePositiveNumber(safeDecode(params.dyeing_cost_pkr))
      : 0;

    const tailoringSelected =
      parseBoolParam(params.tailoring_selected) === true;
    const tailoringCostPkr = tailoringSelected
      ? safePositiveNumber(safeDecode(params.tailoring_cost_pkr))
      : 0;
    const tailoringTurnaroundDays = safePositiveNumber(
      safeDecode(params.tailoring_turnaround_days),
    );

    const selectedTailoringStyleSnapshot =
      safeJsonDecode<SelectedTailoringStyleSnapshot | null>(
        params.selected_tailoring_style_snapshot,
        null,
      );

    const selectedTailoringStyleId = safeDecode(
      params.selected_tailoring_style_id,
    );
    const selectedTailoringStyleTitle =
      safeDecode(params.selected_tailoring_style_title) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.title);

    const selectedTailoringStyleImage =
      safeDecode(params.selected_tailoring_style_image) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.image_url);

    const selectedNeckVariation =
      safeDecode(params.selected_neck_variation) ||
      safeDecode(
        (selectedTailoringStyleSnapshot as any)?.selected_neck_variation,
      );

    const selectedSleeveVariation =
      safeDecode(params.selected_sleeve_variation) ||
      safeDecode(
        (selectedTailoringStyleSnapshot as any)?.selected_sleeve_variation,
      );

    const selectedTrouserVariation =
      safeDecode(params.selected_trouser_variation) ||
      safeDecode(
        (selectedTailoringStyleSnapshot as any)?.selected_trouser_variation,
      );

    const customTailoringNote =
      safeDecode(params.custom_tailoring_note) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.custom_note);

    const tailoringStyleExtraCostPkr = safePositiveNumber(
      safeDecode(params.tailoring_style_extra_cost_pkr) ||
        (selectedTailoringStyleSnapshot as any)?.extra_cost_pkr,
    );

    const hasStyleSelected =
      tailoringSelected &&
      (Boolean(selectedTailoringStyleId) ||
        Boolean(selectedTailoringStyleTitle) ||
        Boolean(selectedTailoringStyleSnapshot));

    const destinationType = norm(params.destination_type) || "inland";
    const exportRegion = safeDecode(params.export_region);
    const postalCode = safeDecode(params.postal_code);
    const country = safeDecode(params.country);

    const addressPreview = buildAddressPreview({
      address: norm(params.deliveryAddress),
      city: norm(params.city),
      postalCode,
      country,
      destinationType,
    });

    return {
      productId: firstNonEmpty(params.productId, params.product_id),
      productCode: firstNonEmpty(params.productCode, params.product_code),
      productName:
        firstNonEmpty(params.productName, params.product_name) || "Product",
      productCategory: norm(params.product_category),
      imageUrl: firstNonEmpty(params.imageUrl, params.image_url),

      currency,
      totalPkrSafe,
      subtotalBeforeDeliveryPkr,
      deliveryCostPkr,
      baseProductCostPkr,
      fabricCostPkr,
      selectedFabricLengthM,
      pricePerMeterPkr,

      vendorName:
        norm(params.vendorName) || norm(params.vendorShopName) || "Vendor",
      vendorMobile: norm(params.vendorMobile),
      vendorAddress: norm(params.vendorAddress),

      buyerName: norm(params.buyerName),
      buyerMobile: norm(params.buyerMobile),
      buyerEmail: norm(params.buyerEmail),

      deliveryAddress: norm(params.deliveryAddress),
      city: norm(params.city),
      notes: norm(params.notes),
      postalCode,
      country,
      addressPreview,
      destinationType,
      exportRegion,
      weightKg: safePositiveNumber(params.weight_kg),

      mode,
      selectedSize,
      selectedUnstitchedSize,
      measurements,
      exactPairs,
      customDimensions,
      sizeLabel,

      dyeingSelected,
      dyeShadeId,
      dyeHex,
      dyeLabel,
      dyeCostPkr,

      tailoringSelected,
      tailoringCostPkr,
      tailoringTurnaroundDays,

      selectedTailoringStyleId,
      selectedTailoringStyleTitle,
      selectedTailoringStyleImage,
      selectedTailoringStyleSnapshot,
      selectedNeckVariation,
      selectedSleeveVariation,
      selectedTrouserVariation,
      customTailoringNote,
      tailoringStyleExtraCostPkr,
      hasStyleSelected,
    };
  }, [params]);

  const measurementRows = useMemo<ExactMeasurementSheetRow[]>(() => {
    const standardRows: ExactMeasurementSheetRow[] = [
      { order: 1, label: "1. Neck", value: data.measurements.m1 },
      { order: 2, label: "2. Across front", value: data.measurements.m2 },
      { order: 3, label: "3. Bust", value: data.measurements.m3 },
      { order: 4, label: "4. Under bust", value: data.measurements.m4 },
      { order: 5, label: "5. Waist", value: data.measurements.m5 },
      { order: 6, label: "6. Hips", value: data.measurements.m6 },
      { order: 7, label: "7. Thigh", value: data.measurements.m7 },
      { order: 8, label: "8. Upper arm", value: data.measurements.m8 },
      { order: 9, label: "9. Elbow", value: data.measurements.m9 },
      { order: 10, label: "10. Wrist", value: data.measurements.m10 },
      {
        order: 11,
        label: "11. Shoulder to waist",
        value: data.measurements.m11,
      },
      {
        order: 12,
        label: "12. Shoulder to floor",
        value: data.measurements.m12,
      },
      {
        order: 13,
        label: "13. Shoulder to shoulder",
        value: data.measurements.m13,
      },
      {
        order: 14,
        label: "14. Back neck to waist",
        value: data.measurements.m14,
      },
      { order: 15, label: "15. Across back", value: data.measurements.m15 },
      {
        order: 16,
        label: "16. Inner arm length",
        value: data.measurements.m16,
      },
      { order: 17, label: "17. Ankle", value: data.measurements.m17 },
    ].filter((row) => row.value);

    const customRows: ExactMeasurementSheetRow[] = data.customDimensions.map(
      (row, index) => ({
        order: 100 + index,
        label: row.label,
        value: row.value,
      }),
    );

    return [...standardRows, ...customRows];
  }, [data.customDimensions, data.measurements]);

  const onDummyPay = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      if (!data.productId && !data.productCode) {
        Alert.alert("Missing product", "Product id/code not found.");
        return;
      }

      let q = supabase
        .from("products")
        .select("id,vendor_id,product_code,title,spec,price,media")
        .limit(1);

      if (data.productId) q = q.eq("id", Number(data.productId));
      else q = q.eq("product_code", data.productCode);

      const { data: pRow, error: pErr } = await q.single();
      if (pErr) throw pErr;

      const productId = Number(pRow.id);
      const vendorId = Number(pRow.vendor_id);
      const productCode = String(pRow.product_code ?? data.productCode ?? "");
      const title = String(pRow.title ?? data.productName ?? "Product");

      const { data: auth } = await supabase.auth.getUser();
      const buyerAuthUserId = auth?.user?.id ?? null;

      const exactMap: Record<string, string> = {};
      for (const [k, v] of data.exactPairs) exactMap[k] = v;

      const specSnapshot =
        pRow.spec && typeof pRow.spec === "object"
          ? { ...(pRow.spec as any) }
          : {};

      if (data.productCategory) {
        (specSnapshot as any).product_category = data.productCategory;
      }

      if (data.selectedUnstitchedSize) {
        (specSnapshot as any).selected_unstitched_size =
          data.selectedUnstitchedSize;
      }

      if (data.selectedFabricLengthM > 0) {
        (specSnapshot as any).selected_fabric_length_m =
          data.selectedFabricLengthM;
      }

      if (data.fabricCostPkr > 0) {
        (specSnapshot as any).fabric_cost_pkr = data.fabricCostPkr;
      }

      if (data.customDimensions.length) {
        (specSnapshot as any).custom_dimensions = data.customDimensions;
      }

      if (data.dyeingSelected) {
        (specSnapshot as any).dye_shade_id = data.dyeShadeId || "";
        (specSnapshot as any).dye_hex = data.dyeHex || "";
        (specSnapshot as any).dye_label = data.dyeLabel || "";
        (specSnapshot as any).dyeing_cost_pkr = data.dyeCostPkr;
      }

      if (data.tailoringSelected) {
        (specSnapshot as any).tailoring_enabled = true;
        (specSnapshot as any).tailoring_selected = true;
        (specSnapshot as any).tailoring_cost_pkr = data.tailoringCostPkr;
        (specSnapshot as any).tailoring_turnaround_days =
          data.tailoringTurnaroundDays;

        if (data.selectedTailoringStyleId) {
          (specSnapshot as any).selected_tailoring_style_id =
            data.selectedTailoringStyleId;
        }

        if (data.selectedTailoringStyleTitle) {
          (specSnapshot as any).selected_tailoring_style_title =
            data.selectedTailoringStyleTitle;
        }

        if (data.selectedTailoringStyleImage) {
          (specSnapshot as any).selected_tailoring_style_image =
            data.selectedTailoringStyleImage;
        }

        if (data.selectedNeckVariation) {
          (specSnapshot as any).selected_neck_variation =
            data.selectedNeckVariation;
        }

        if (data.selectedSleeveVariation) {
          (specSnapshot as any).selected_sleeve_variation =
            data.selectedSleeveVariation;
        }

        if (data.selectedTrouserVariation) {
          (specSnapshot as any).selected_trouser_variation =
            data.selectedTrouserVariation;
        }

        if (data.customTailoringNote) {
          (specSnapshot as any).custom_tailoring_note =
            data.customTailoringNote;
        }

        if (data.tailoringStyleExtraCostPkr > 0) {
          (specSnapshot as any).tailoring_style_extra_cost_pkr =
            data.tailoringStyleExtraCostPkr;
        }

        if (data.selectedTailoringStyleSnapshot) {
          (specSnapshot as any).selected_tailoring_style_snapshot =
            data.selectedTailoringStyleSnapshot;
        }
      }

      (specSnapshot as any).destination_type = data.destinationType || "inland";
      (specSnapshot as any).export_region = data.exportRegion || "";
      (specSnapshot as any).delivery_weight_kg = data.weightKg || 0;

      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        "create_order_atomic_single_unit",
        {
          p_product_id: productId,
          p_buyer_auth_user_id: buyerAuthUserId,
          p_buyer_name: data.buyerName || "Buyer",
          p_buyer_mobile: data.buyerMobile || "",
          p_buyer_email: data.buyerEmail || null,
          p_delivery_address: data.deliveryAddress || "",
          p_city: data.city || "",
          p_notes: data.notes || null,
          p_product_code_snapshot: productCode,
          p_title_snapshot: title,
          p_spec_snapshot: specSnapshot,
          p_price_snapshot: pRow.price ?? {},
          p_media_snapshot: pRow.media ?? {},
          p_currency: data.currency,
          p_subtotal_pkr:
            data.subtotalBeforeDeliveryPkr || data.totalPkrSafe || null,
          p_delivery_pkr: data.deliveryCostPkr || 0,
          p_discount_pkr: 0,
          p_total_pkr: data.totalPkrSafe || null,
          p_size_mode: data.mode === "exact" ? "exact" : "standard",
          p_selected_size:
            data.mode === "exact"
              ? null
              : data.selectedUnstitchedSize || data.selectedSize || null,
          p_exact_measurements: data.mode === "exact" ? exactMap : {},
        },
      );
      if (rpcError) throw rpcError;

      const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      if (!rpcRow?.ok) {
        throw new Error(rpcRow?.message || "Could not create order.");
      }

      const orderId = Number(rpcRow.order_id);

      router.replace({
        pathname: "/orders/[id]",
        params: { id: String(orderId), from: "buyer-order" },
      });
    } catch (e: any) {
      console.warn("order create failed:", e?.message ?? e);
      Alert.alert("Order failed", e?.message ?? "Could not create order.");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryLabel = data.productCategory
    ? prettyCategory(data.productCategory)
    : "—";

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.title}>Payment</Text>
            <Text style={styles.pageSubtitle}>
              Review your order and confirm payment.
            </Text>
          </View>

          <Card title="Product Summary">
            <View style={styles.productRow}>
              <View style={styles.imageBox}>
                {data.imageUrl ? (
                  <Image source={{ uri: data.imageUrl }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.productMetaWrap}>
                <Text style={styles.productName} numberOfLines={2}>
                  {data.productName}
                </Text>

                <View style={styles.productMetaInfo}>
                  <Text style={styles.productMetaLabel}>Category</Text>
                  <Text style={styles.productMetaValue}>{categoryLabel}</Text>
                </View>

                {!!data.productCode && (
                  <View style={styles.productMetaInfo}>
                    <Text style={styles.productMetaLabel}>Code</Text>
                    <Text style={styles.productMetaValue}>
                      {data.productCode}
                    </Text>
                  </View>
                )}

                <Text style={styles.heroPrice}>
                  {formatMoney(
                    data.currency,
                    data.baseProductCostPkr || data.fabricCostPkr,
                  )}
                </Text>

                <Text style={styles.helper}>Sold by {data.vendorName}</Text>
              </View>
            </View>
          </Card>

          <PlainSection title="Customization">
            <KVRow
              label="Size"
              value={
                data.mode === "exact" ? "Exact measurements" : data.sizeLabel
              }
            />

            {data.mode === "exact" && measurementRows.length ? (
              <View style={styles.inlineActionRow}>
                <Text style={styles.helper}>
                  {measurementRows.length} dimensions saved
                  {data.customDimensions.length
                    ? ` • ${data.customDimensions.length} custom`
                    : ""}
                </Text>

                <Pressable
                  onPress={() => setMeasurementsOpen(true)}
                  style={styles.secondaryInlineBtn}
                >
                  <Text style={styles.secondaryInlineText}>
                    View Exact Measurements
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {data.fabricCostPkr > 0 ? (
              <>
                <KVRow
                  label="Fabric length"
                  value={`${data.selectedFabricLengthM || 0} m`}
                />
                <KVRow
                  label="Rate"
                  value={
                    data.pricePerMeterPkr
                      ? `${formatMoney(data.currency, data.pricePerMeterPkr)} / meter`
                      : ""
                  }
                />
              </>
            ) : null}

            {data.dyeingSelected ? (
              <View style={styles.customBlock}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Dyeing color</Text>
                  <View style={styles.colorPreviewRow}>
                    {!!data.dyeHex && (
                      <View
                        style={[
                          styles.dyeSwatch,
                          { backgroundColor: data.dyeHex },
                        ]}
                      />
                    )}
                    <Text style={styles.helper}>
                      {formatMoney(data.currency, data.dyeCostPkr)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {data.tailoringSelected ? (
              <View style={styles.customBlock}>
                <KVRow
                  label="Tailoring"
                  value={`${formatMoney(data.currency, data.tailoringCostPkr)}${
                    data.tailoringTurnaroundDays
                      ? ` • ${data.tailoringTurnaroundDays} days`
                      : ""
                  }`}
                />

                {data.hasStyleSelected ? (
                  <>
                    {!!data.selectedTailoringStyleImage && (
                      <View style={styles.tailoringImageWrap}>
                        <Image
                          source={{ uri: data.selectedTailoringStyleImage }}
                          style={styles.tailoringImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}

                    <KVRow
                      label="Style"
                      value={
                        data.selectedTailoringStyleTitle || "Selected style"
                      }
                    />

                    {!!data.selectedNeckVariation &&
                    data.selectedNeckVariation !==
                      "no change in selected style" ? (
                      <KVRow
                        label="Neck"
                        value={cleanVariationLabel(
                          data.selectedNeckVariation,
                          "neck",
                        )}
                      />
                    ) : null}

                    {!!data.selectedSleeveVariation &&
                    data.selectedSleeveVariation !==
                      "no change in selected style" ? (
                      <KVRow
                        label="Sleeve"
                        value={cleanVariationLabel(
                          data.selectedSleeveVariation,
                          "sleeve",
                        )}
                      />
                    ) : null}

                    {!!data.selectedTrouserVariation &&
                    data.selectedTrouserVariation !==
                      "no change in selected style" ? (
                      <KVRow
                        label="Trouser"
                        value={data.selectedTrouserVariation}
                      />
                    ) : null}

                    {data.tailoringStyleExtraCostPkr > 0 ? (
                      <KVRow
                        label="Additional style cost"
                        value={formatMoney(
                          data.currency,
                          data.tailoringStyleExtraCostPkr,
                        )}
                      />
                    ) : null}

                    {!!data.customTailoringNote ? (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteLabel}>Tailoring note</Text>
                        <Text style={styles.noteText}>
                          {data.customTailoringNote}
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            ) : null}
          </PlainSection>

          <PlainSection title="Delivery">
            <KVRow label="Buyer" value={data.buyerName || "—"} />
            <KVRow label="Mobile" value={data.buyerMobile || "—"} />

            {!!data.addressPreview ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Address</Text>
                <Text style={styles.previewText}>{data.addressPreview}</Text>
              </View>
            ) : (
              <KVRow label="Address" value={data.deliveryAddress || "—"} />
            )}

            <KVRow
              label="Delivery type"
              value={data.destinationType || "inland"}
            />
            <KVRow label="Region" value={data.exportRegion} muted />
            {!!data.notes && <KVRow label="Notes" value={data.notes} muted />}
          </PlainSection>

          <Card title="Price Summary">
            <PriceRow
              label="Product"
              value={formatMoney(
                data.currency,
                data.baseProductCostPkr || data.fabricCostPkr || 0,
              )}
            />

            {data.dyeingSelected ? (
              <PriceRow
                label="Dyeing"
                value={formatMoney(data.currency, data.dyeCostPkr)}
              />
            ) : null}

            {data.tailoringSelected ? (
              <PriceRow
                label="Tailoring"
                value={formatMoney(data.currency, data.tailoringCostPkr)}
              />
            ) : null}

            {data.tailoringStyleExtraCostPkr > 0 ? (
              <PriceRow
                label="Additional style cost"
                value={formatMoney(
                  data.currency,
                  data.tailoringStyleExtraCostPkr,
                )}
              />
            ) : null}

            <PriceRow
              label="Shipping"
              value={formatMoney(data.currency, data.deliveryCostPkr)}
            />
            <View style={styles.divider} />
            <PriceRow
              label="Total"
              value={formatMoney(data.currency, data.totalPkrSafe)}
              strong
            />
          </Card>

          <Card title="Payment Method">
            <PaymentMethodCard
              title="Cash on Delivery (Dummy)"
              description="For now this completes the flow and creates the order."
              selected
            />
          </Card>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.footerBar}>
          <View style={styles.footerTotalWrap}>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>
              {formatMoney(data.currency, data.totalPkrSafe)}
            </Text>
          </View>

          <Pressable
            onPress={onDummyPay}
            disabled={submitting}
            style={({ pressed }) => [
              styles.footerCta,
              (pressed || submitting) && styles.pressed,
              submitting && styles.disabledBtn,
            ]}
          >
            <Text style={styles.footerCtaText}>
              {submitting ? "Creating Order…" : "Confirm Order"}
            </Text>
          </Pressable>
        </View>

        <ExactMeasurementsModal
          visible={measurementsOpen}
          onClose={() => setMeasurementsOpen(false)}
          title="Exact Measurements"
          rows={measurementRows}
          inferredSize={data.selectedUnstitchedSize || data.selectedSize}
          unit="cm"
          fabricLengthM={data.selectedFabricLengthM}
          fabricCostPkr={data.fabricCostPkr}
          showGuideImage
        />
      </View>
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E2E8F0",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  mutedText: "#64748B",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  scroll: {
    flex: 1,
  },

  container: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },

  pageHeader: {
    gap: 4,
    marginBottom: 2,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: stylesVars.text,
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    backgroundColor: stylesVars.cardBg,
  },

  plainSection: {
    gap: 12,
    paddingTop: 2,
  },

  sectionHeader: {
    gap: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  sectionDivider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginTop: 4,
  },

  productRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },

  imageBox: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#F1F5F9",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  imagePlaceholderText: {
    color: stylesVars.mutedText,
    fontSize: 12,
    fontWeight: "600",
  },

  productMetaWrap: {
    flex: 1,
    gap: 8,
  },

  productName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: stylesVars.text,
  },

  productMetaInfo: {
    gap: 2,
  },

  productMetaLabel: {
    fontSize: 11,
    color: stylesVars.mutedText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  productMetaValue: {
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "700",
  },

  heroPrice: {
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  kvLabel: {
    flex: 0.9,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  kvValue: {
    flex: 1.1,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "700",
    textAlign: "right",
  },

  kvMuted: {
    color: stylesVars.mutedText,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  priceLabel: {
    fontSize: 14,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  priceValue: {
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "700",
  },

  priceLabelStrong: {
    fontSize: 16,
    color: stylesVars.text,
    fontWeight: "800",
  },

  priceValueStrong: {
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginVertical: 2,
  },

  inlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },

  secondaryInlineBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryInlineText: {
    color: stylesVars.blue,
    fontSize: 12,
    fontWeight: "700",
  },

  customBlock: {
    gap: 10,
    paddingTop: 2,
  },

  colorPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dyeSwatch: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  tailoringImageWrap: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#F1F5F9",
  },

  tailoringImage: {
    width: "100%",
    height: "100%",
  },

  noteBox: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F8FAFC",
    gap: 6,
  },

  noteLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
  },

  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "500",
  },

  previewBox: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F8FAFC",
    gap: 4,
  },

  previewLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
  },

  previewText: {
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "500",
  },

  paymentOptionCard: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: stylesVars.cardBg,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },

  paymentOptionCardSelected: {
    borderColor: "#BFD3FF",
    backgroundColor: "#F8FBFF",
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  radioOuterSelected: {
    borderColor: stylesVars.blue,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: stylesVars.blue,
  },

  paymentOptionBody: {
    flex: 1,
    gap: 4,
  },

  paymentOptionTitle: {
    fontWeight: "800",
    fontSize: 14,
    color: stylesVars.text,
  },

  paymentOptionDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  backBtn: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  backText: {
    color: stylesVars.blue,
    fontWeight: "800",
    fontSize: 12,
  },

  footerBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
    borderRadius: 18,
    padding: 12,
    backgroundColor: stylesVars.white,
    borderWidth: 1,
    borderColor: stylesVars.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  footerTotalWrap: {
    flex: 1,
    gap: 2,
  },

  footerTotalLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
  },

  footerTotalValue: {
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
  },

  footerCta: {
    minHeight: 48,
    minWidth: 152,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
  },

  footerCtaText: {
    color: stylesVars.white,
    fontWeight: "800",
    fontSize: 14,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  bottomSpacer: {
    height: 12,
  },

  pressed: {
    opacity: 0.82,
  },
});
