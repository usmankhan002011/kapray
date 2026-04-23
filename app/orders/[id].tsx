import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";
import ExactMeasurementsModal from "../(tabs)/flow/purchase/exact-measurements-modal";
import type { ExactMeasurementSheetRow } from "../(tabs)/flow/purchase/exact-measurements-sheet";

type Params = { id?: string; from?: string };

type OrderRow = {
  id: number;
  vendor_id: number;

  created_at: string;
  order_no: string | null;
  status: string;

  buyer_name: string;
  buyer_mobile: string;
  buyer_email: string | null;

  delivery_address: string;
  city: string;
  notes: string | null;

  product_code_snapshot: string;
  title_snapshot: string;

  spec_snapshot: any;
  media_snapshot: any;
  price_snapshot: any;

  currency: string;
  subtotal_pkr: number | null;
  delivery_pkr: number | null;
  discount_pkr: number | null;
  total_pkr: number | null;

  size_mode: string;
  selected_size: string | null;
  exact_measurements: any;

  courier_name: string | null;
  tracking_number: string | null;
};

function money(currency: string, v: any) {
  if (v == null || v === "") return `${currency} —`;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return `${currency} —`;
  return `${currency} ${Math.round(n).toLocaleString()}`;
}

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function norm(v: unknown) {
  return (v == null ? "" : String(v)).trim().toLowerCase();
}

function boolish(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return !!v;
}

function numOrNull(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function isUnstitchedFromSpec(spec: any): boolean {
  const s = spec && typeof spec === "object" ? spec : {};

  const cat = String(s?.product_category ?? "")
    .trim()
    .toLowerCase();
  if (
    cat === "unstitched_plain" ||
    cat === "unstitched_dyeing" ||
    cat === "unstitched_dyeing_tailoring"
  ) {
    return true;
  }

  const modeRaw = safeText(
    s?.price_mode ??
      s?.priceMode ??
      s?.mode ??
      s?.pricing_mode ??
      s?.price?.mode ??
      s?.price_snapshot?.mode ??
      s?.priceMode_snapshot,
  );

  return (
    modeRaw.toLowerCase().includes("unstitched") ||
    modeRaw.toLowerCase().includes("per_meter") ||
    boolish(s?.is_unstitched)
  );
}

function humanizeCat(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDressCatFromSpec(spec: any): string {
  const s = spec && typeof spec === "object" ? spec : {};
  const raw = safeText(
    s?.product_category ?? s?.dress_category ?? s?.dress_cat ?? "",
  );
  if (raw === "—") return "—";
  return humanizeCat(raw);
}

function looksLikeUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function pickFirstImageCandidate(media: any): string {
  const m = media && typeof media === "object" ? media : {};

  const candidates: any[] = [
    m?.banner,
    m?.banner_url,
    m?.bannerUrl,
    m?.image,
    m?.image_url,
    m?.imageUrl,
    m?.thumb,
    m?.thumb_url,
    m?.thumbnail,
    m?.thumbnail_url,
  ];

  if (Array.isArray(m?.images) && m.images.length)
    candidates.unshift(m.images[0]);
  if (Array.isArray(m?.thumbs) && m.thumbs.length) candidates.push(m.thumbs[0]);

  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }
  return "";
}

function resolvePublicUrlFromPath(pathOrUrl: string) {
  const s = String(pathOrUrl ?? "").trim();
  if (!s) return "";
  if (looksLikeUrl(s)) return s;

  try {
    const { data } = supabase.storage.from("vendor_images").getPublicUrl(s);
    return data?.publicUrl ?? "";
  } catch {
    return "";
  }
}

function cleanVariationLabel(value: string, kind: "neck" | "sleeve") {
  if (!value || value === "—") return "";
  const pattern = kind === "neck" ? /\bneck\b/gi : /\bsleeve\b/gi;
  return value
    .replace(pattern, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildAddressPreview(args: {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  destinationType: string;
}) {
  const address = String(args.address ?? "").trim();
  const city = String(args.city ?? "").trim();
  const postalCode = String(args.postalCode ?? "").trim();
  const country = String(args.country ?? "").trim();
  const destinationType = String(args.destinationType ?? "")
    .trim()
    .toLowerCase();

  const cityLine = [city, postalCode].filter(Boolean).join(" ");
  const endCountry = destinationType === "export" ? country : "";
  return [address, cityLine, endCountry].filter(Boolean).join(", ");
}

function SectionCard({
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

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const orderId = useMemo(() => String(params.id ?? "").trim(), [params.id]);
  const fromParam = useMemo(
    () =>
      String(params.from ?? "")
        .trim()
        .toLowerCase(),
    [params.from],
  );

  const vendorIdFromStore = useAppSelector(
    (s) => (s.vendor as any)?.id ?? null,
  );
  const vendorFromStore = useAppSelector((s) => s.vendor as any);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);

  const [reviewLoading, setReviewLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          vendor_id,
          created_at,
          order_no,
          status,
          buyer_name,
          buyer_mobile,
          buyer_email,
          delivery_address,
          city,
          notes,
          product_code_snapshot,
          title_snapshot,
          spec_snapshot,
          media_snapshot,
          price_snapshot,
          currency,
          subtotal_pkr,
          delivery_pkr,
          discount_pkr,
          total_pkr,
          size_mode,
          selected_size,
          exact_measurements,
          courier_name,
          tracking_number
        `,
        )
        .eq("id", Number(orderId))
        .single();

      if (error) throw error;

      const o: any = data;

      setOrder({
        id: Number(o.id),
        vendor_id: Number(o.vendor_id ?? 0),

        created_at: String(o.created_at),
        order_no: o.order_no ?? null,
        status: String(o.status ?? "placed"),

        buyer_name: String(o.buyer_name ?? ""),
        buyer_mobile: String(o.buyer_mobile ?? ""),
        buyer_email: o.buyer_email ? String(o.buyer_email) : null,

        delivery_address: String(o.delivery_address ?? ""),
        city: String(o.city ?? ""),
        notes: o.notes ? String(o.notes) : null,

        product_code_snapshot: String(o.product_code_snapshot ?? ""),
        title_snapshot: String(o.title_snapshot ?? ""),

        spec_snapshot: o.spec_snapshot ?? {},
        media_snapshot: o.media_snapshot ?? {},
        price_snapshot: o.price_snapshot ?? {},

        currency: String(o.currency ?? "PKR"),
        subtotal_pkr: o.subtotal_pkr != null ? Number(o.subtotal_pkr) : null,
        delivery_pkr: o.delivery_pkr != null ? Number(o.delivery_pkr) : null,
        discount_pkr: o.discount_pkr != null ? Number(o.discount_pkr) : null,
        total_pkr: o.total_pkr != null ? Number(o.total_pkr) : null,

        size_mode: String(o.size_mode ?? "standard"),
        selected_size: o.selected_size ? String(o.selected_size) : null,
        exact_measurements: o.exact_measurements ?? {},

        courier_name: o.courier_name ? String(o.courier_name) : null,
        tracking_number: o.tracking_number ? String(o.tracking_number) : null,
      });

      setCourierName(o.courier_name ? String(o.courier_name) : "");
      setTrackingNumber(o.tracking_number ? String(o.tracking_number) : "");
    } catch (e: any) {
      console.warn("order detail error:", e?.message ?? e);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const loadReviewState = useCallback(async () => {
    if (!orderId) {
      setHasReviewed(false);
      return;
    }

    try {
      setReviewLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setHasReviewed(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("vendor_reviews")
        .select("id")
        .eq("order_id", Number(orderId))
        .eq("buyer_user_id", user.id)
        .limit(1);

      if (error) {
        console.warn("review state load error:", error.message);
        setHasReviewed(false);
        return;
      }

      setHasReviewed(Array.isArray(data) && data.length > 0);
    } catch (e: any) {
      console.warn("review state load error:", e?.message ?? e);
      setHasReviewed(false);
    } finally {
      setReviewLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
    loadReviewState();
  }, [load, loadReviewState]);

  const isBuyerTrackView = useMemo(() => {
    return (
      fromParam === "track" ||
      fromParam === "buyer-track" ||
      fromParam === "buyer-order"
    );
  }, [fromParam]);

  const isVendorView = useMemo(() => {
    if (!order) return false;
    const vId = vendorIdFromStore != null ? Number(vendorIdFromStore) : null;
    if (!vId) return false;
    return vId === order.vendor_id;
  }, [order, vendorIdFromStore]);

  const showVendorActions = useMemo(() => {
    if (isBuyerTrackView) return false;
    return isVendorView;
  }, [isBuyerTrackView, isVendorView]);

  const canReview = useMemo(() => {
    if (!order) return false;

    const isDelivered = norm(order.status) === "delivered";

    return isBuyerTrackView && isDelivered && !hasReviewed;
  }, [order, isBuyerTrackView, hasReviewed]);

  const backTarget = useMemo(() => {
    if (fromParam === "track" || fromParam === "buyer-track")
      return "/flow/orders/track";
    if (fromParam === "buyer-order") return "/";
    if (isVendorView) return "/orders";
    return "/";
  }, [fromParam, isVendorView]);

  const handleBack = useCallback(() => {
    if (fromParam === "buyer-order") {
      router.dismissAll();
      router.replace("/" as any);
      return true;
    }

    router.replace(backTarget as any);
    return true;
  }, [fromParam, backTarget, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBack,
    );
    return () => subscription.remove();
  }, [handleBack]);

  const spec = useMemo(() => {
    return order?.spec_snapshot && typeof order.spec_snapshot === "object"
      ? order.spec_snapshot
      : {};
  }, [order]);

  const isUnstitched = useMemo(() => isUnstitchedFromSpec(spec), [spec]);

  const exactPairs = useMemo(() => {
    if (!order || order.size_mode !== "exact") return [] as [string, string][];

    const m =
      order.exact_measurements && typeof order.exact_measurements === "object"
        ? order.exact_measurements
        : {};

    const orderedNumericKeys = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
    ];

    const orderedMKeys = [
      "m1",
      "m2",
      "m3",
      "m4",
      "m5",
      "m6",
      "m7",
      "m8",
      "m9",
      "m10",
      "m11",
      "m12",
      "m13",
      "m14",
      "m15",
      "m16",
      "m17",
    ];

    const orderedLegacyKeys = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
    ];

    const numericPairs = orderedNumericKeys
      .map((k) => [k, String(m[k] ?? "").trim()] as [string, string])
      .filter(([, v]) => !!v);

    if (numericPairs.length) return numericPairs;

    const mKeyPairs = orderedMKeys
      .map(
        (k, index) =>
          [String(index + 1), String(m[k] ?? "").trim()] as [string, string],
      )
      .filter(([, v]) => !!v);

    if (mKeyPairs.length) return mKeyPairs;

    const legacyPairs = orderedLegacyKeys
      .map((k) => [k, String(m[k] ?? "").trim()] as [string, string])
      .filter(([, v]) => !!v);

    return legacyPairs;
  }, [order]);

  const customDimensions = useMemo(() => {
    const raw = spec?.custom_dimensions;
    if (!Array.isArray(raw))
      return [] as Array<{ label: string; value: string }>;

    return raw
      .map((row: any) => ({
        label: String(row?.label ?? "").trim(),
        value: String(row?.value ?? "").trim(),
      }))
      .filter((row) => row.label && row.value);
  }, [spec]);

  const measurementRows = useMemo<ExactMeasurementSheetRow[]>(() => {
    const measurementMap =
      order?.exact_measurements && typeof order.exact_measurements === "object"
        ? order.exact_measurements
        : {};

    const labels = [
      "1. Neck",
      "2. Across front",
      "3. Bust",
      "4. Under bust",
      "5. Waist",
      "6. Hips",
      "7. Thigh",
      "8. Upper arm",
      "9. Elbow",
      "10. Wrist",
      "11. Shoulder to waist",
      "12. Shoulder to floor",
      "13. Shoulder to shoulder",
      "14. Back neck to waist",
      "15. Across back",
      "16. Inner arm length",
      "17. Ankle",
    ];

    const standardRows = labels
      .map((label, index) => {
        const nKey = String(index + 1);
        const mKey = `m${index + 1}`;
        const value = String(
          measurementMap[nKey] ?? measurementMap[mKey] ?? "",
        ).trim();

        return {
          order: index + 1,
          label,
          value,
        };
      })
      .filter((row) => row.value);

    const customRows = customDimensions.map((row, index) => ({
      order: 100 + index,
      label: row.label,
      value: row.value,
    }));

    return [...standardRows, ...customRows];
  }, [customDimensions, order]);

  const sizeLabel = useMemo(() => {
    if (!order) return "—";
    if (order.size_mode === "exact") {
      return exactPairs.length
        ? "Exact measurements"
        : "Exact measurements not set";
    }
    return order.selected_size || "Not set";
  }, [order, exactPairs]);

  const selectedUnstitchedSize = useMemo(() => {
    if (!order) return "";
    const raw = safeText(
      spec?.selected_unstitched_size ?? order.selected_size ?? "",
    );
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const selectedFabricLengthM = useMemo(() => {
    if (!order) return null;
    return numOrNull(spec?.selected_fabric_length_m ?? "");
  }, [order, spec]);

  const pricePerMeterPkr = useMemo(() => {
    if (!order) return null;
    return numOrNull(
      spec?.price_per_meter_pkr ??
        spec?.cost_pkr_per_meter ??
        spec?.price_snapshot?.cost_pkr_per_meter ??
        order.price_snapshot?.cost_pkr_per_meter ??
        null,
    );
  }, [order, spec]);

  const fabricCostPkr = useMemo(() => {
    if (!order) return null;
    return numOrNull(
      spec?.fabric_cost_pkr ??
        spec?.fabricCostPkr ??
        spec?.fabric_cost ??
        spec?.fabricCost ??
        spec?.cloth_cost_pkr ??
        spec?.clothCostPkr ??
        spec?.cloth_cost ??
        spec?.clothCost ??
        null,
    );
  }, [order, spec]);

  const dyeHex = useMemo(() => {
    if (!order) return "";
    const hex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
    return hex !== "—" ? hex : "";
  }, [order, spec]);

  const dyeSelected = useMemo(() => {
    if (!order) return false;
    return (
      boolish(spec?.dyeing_selected) ||
      !!dyeHex ||
      safeText(spec?.dye_label ?? "") !== "—"
    );
  }, [order, spec, dyeHex]);

  const dyeCostPkr = useMemo(() => {
    if (!order) return null;
    return numOrNull(
      spec?.dyeing_cost_pkr ??
        spec?.dye_cost_pkr ??
        spec?.dyeingCostPkr ??
        spec?.dyeCostPkr ??
        spec?.dye_cost ??
        spec?.dyeing_cost ??
        null,
    );
  }, [order, spec]);

  const tailoringSelected = useMemo(() => {
    if (!order) return false;
    return (
      boolish(spec?.tailoring_enabled) || boolish(spec?.tailoring_selected)
    );
  }, [order, spec]);

  const tailoringCostPkr = useMemo(() => {
    if (!order) return null;
    return numOrNull(
      spec?.tailoring_cost_pkr ??
        spec?.tailoringCostPkr ??
        spec?.tailoring_cost ??
        spec?.tailoringCost ??
        null,
    );
  }, [order, spec]);

  const tailoringTurnaroundDays = useMemo(() => {
    if (!order) return null;
    return numOrNull(spec?.tailoring_turnaround_days ?? null);
  }, [order, spec]);

  const selectedTailoringStyleTitle = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.selected_tailoring_style_title ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const selectedTailoringStyleImage = useMemo(() => {
    if (!order) return "";
    const raw = safeText(
      spec?.selected_tailoring_style_image ??
        spec?.selected_tailoring_style_snapshot?.image_url ??
        "",
    );
    return raw === "—" ? "" : resolvePublicUrlFromPath(raw);
  }, [order, spec]);

  const selectedNeckVariation = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.selected_neck_variation ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const selectedSleeveVariation = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.selected_sleeve_variation ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const selectedTrouserVariation = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.selected_trouser_variation ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const customTailoringNote = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.custom_tailoring_note ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const tailoringStyleExtraCostPkr = useMemo(() => {
    if (!order) return null;
    return numOrNull(
      spec?.tailoring_style_extra_cost_pkr ??
        spec?.style_extra_cost_pkr ??
        spec?.selected_style_extra_cost_pkr ??
        null,
    );
  }, [order, spec]);

  const destinationType = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.destination_type ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const exportRegion = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.export_region ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const deliveryWeightKg = useMemo(() => {
    if (!order) return null;
    return numOrNull(spec?.delivery_weight_kg ?? spec?.weight_kg ?? null);
  }, [order, spec]);

  const postalCode = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.postal_code ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const country = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.country ?? "");
    return raw === "—" ? "" : raw;
  }, [order, spec]);

  const addressPreview = useMemo(() => {
    if (!order) return "";
    return buildAddressPreview({
      address: order.delivery_address,
      city: order.city,
      postalCode,
      country,
      destinationType,
    });
  }, [order, postalCode, country, destinationType]);

  const baseProductCostPkr = useMemo(() => {
    if (!order) return null;
    if (isUnstitched && fabricCostPkr != null) return fabricCostPkr;

    const direct =
      numOrNull(spec?.base_product_cost_pkr ?? null) ??
      numOrNull(spec?.stitched_total_pkr ?? null) ??
      null;
    if (direct != null) return direct;

    const subtotal = numOrNull(order.subtotal_pkr);
    const dye = dyeSelected ? (numOrNull(dyeCostPkr) ?? 0) : 0;
    const tailoring = tailoringSelected
      ? (numOrNull(tailoringCostPkr) ?? 0)
      : 0;
    const styleExtra = tailoringStyleExtraCostPkr ?? 0;
    if (subtotal != null)
      return Math.max(0, subtotal - dye - tailoring - styleExtra);

    return null;
  }, [
    order,
    spec,
    isUnstitched,
    fabricCostPkr,
    dyeSelected,
    dyeCostPkr,
    tailoringSelected,
    tailoringCostPkr,
    tailoringStyleExtraCostPkr,
  ]);

  const categoryLabel = useMemo(() => {
    if (!order) return "—";
    return getDressCatFromSpec(spec);
  }, [order, spec]);

  const vendorNameForMeasurements = useMemo(() => {
    const fromSpec = safeText(
      spec?.vendor_name ?? spec?.vendor_shop_name ?? "",
    );
    if (fromSpec !== "—") return fromSpec;

    const fromStore = safeText(
      vendorFromStore?.shop_name ??
        vendorFromStore?.owner_name ??
        vendorFromStore?.name ??
        "",
    );
    if (fromStore !== "—") return fromStore;

    if (isVendorView) return "Your Store";

    return "";
  }, [spec, vendorFromStore, isVendorView]);

  const bannerUrl = useMemo(() => {
    if (!order) return "";
    const picked = pickFirstImageCandidate(order.media_snapshot);
    return resolvePublicUrlFromPath(picked);
  }, [order]);

  const nextAction = useMemo(() => {
    if (!order) return null;
    const s = norm(order.status);

    if (s === "placed") return { next: "seen", label: "Mark Seen" };
    if (s === "seen") {
      if (!isUnstitched) return { next: "packed", label: "Mark Packed" };
      return { next: "in_progress", label: "Started Dyeing/Tailoring" };
    }
    if (s === "in_progress") return { next: "packed", label: "Mark Packed" };
    if (s === "packed") return { next: "dispatched", label: "Dispatch" };
    if (s === "dispatched")
      return { next: "delivered", label: "Mark Delivered" };
    return null;
  }, [order, isUnstitched]);

  const updateStatus = useCallback(
    async (nextStatus: string) => {
      if (!order) return;

      const ns = norm(nextStatus);
      const courierTrim = courierName.trim();
      const trackingTrim = trackingNumber.trim();

      if (ns === "dispatched") {
        if (!courierTrim || !trackingTrim) {
          Alert.alert(
            "Missing details",
            "Courier name and tracking number are required to dispatch.",
          );
          return;
        }
      }

      try {
        setSaving(true);

        const payload: any = { status: nextStatus };

        if (ns === "dispatched") {
          payload.courier_name = courierTrim;
          payload.tracking_number = trackingTrim;
        }

        const { error } = await supabase
          .from("orders")
          .update(payload)
          .eq("id", order.id);
        if (error) throw error;

        setDispatchOpen(false);
        await load();
      } catch (e: any) {
        console.warn("status update error:", e?.message ?? e);
        Alert.alert(
          "Update failed",
          e?.message ?? "Could not update order status.",
        );
      } finally {
        setSaving(false);
      }
    },
    [order, courierName, trackingNumber, load],
  );

  const openDispatchModal = useCallback(() => {
    setDispatchOpen(true);
  }, []);

  const statusPillStyle = useMemo(() => {
    const s = norm(order?.status ?? "");
    if (s === "placed") return [styles.statusPill, styles.statusPillRed];
    if (s === "delivered") return [styles.statusPill, styles.statusPillGreen];
    return [styles.statusPill, styles.statusPillBlue];
  }, [order?.status]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Order Detail</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading order…</Text>
        </View>
      ) : !order ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Order not found</Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.headerCard,
                norm(order.status) === "placed" ? styles.headerCardNew : null,
              ]}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerMeta}>
                  <Text style={styles.orderNo}>
                    {order.order_no || `Order #${order.id}`}
                  </Text>
                  <Text style={styles.headerSubtext}>
                    Created {new Date(order.created_at).toLocaleString()}
                  </Text>
                </View>

                <View style={statusPillStyle}>
                  <Text style={styles.statusPillText}>
                    {humanizeCat(order.status)}
                  </Text>
                </View>
              </View>
            </View>

            <SectionCard title="Product Summary">
              <View style={styles.productRow}>
                <View style={styles.imageBox}>
                  {bannerUrl ? (
                    <Image
                      source={{ uri: bannerUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>No image</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productMetaWrap}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {order.title_snapshot}
                  </Text>

                  <View style={styles.productMetaInfo}>
                    <Text style={styles.productMetaLabel}>Category</Text>
                    <Text style={styles.productMetaValue}>{categoryLabel}</Text>
                  </View>

                  {!!order.product_code_snapshot && (
                    <View style={styles.productMetaInfo}>
                      <Text style={styles.productMetaLabel}>Code</Text>
                      <Text style={styles.productMetaValue}>
                        {order.product_code_snapshot}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.heroPrice}>
                    {money(order.currency, baseProductCostPkr)}
                  </Text>
                </View>
              </View>
            </SectionCard>

            <SectionCard title="Customization">
              {order.size_mode !== "exact" ? (
                <KVRow
                  label="Size"
                  value={isUnstitched ? selectedUnstitchedSize : sizeLabel}
                />
              ) : null}

              {order.size_mode === "exact" && measurementRows.length ? (
                <View style={styles.inlineActionRow}>
                  <Text style={styles.helper}>
                    {measurementRows.length} dimensions saved
                    {customDimensions.length
                      ? ` • ${customDimensions.length} custom`
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

              {isUnstitched ? (
                <>
                  <KVRow
                    label="Fabric length"
                    value={
                      selectedFabricLengthM != null
                        ? `${selectedFabricLengthM} m`
                        : ""
                    }
                  />
                  <KVRow
                    label="Rate"
                    value={
                      pricePerMeterPkr != null
                        ? `${money(order.currency, pricePerMeterPkr)} / meter`
                        : ""
                    }
                  />
                </>
              ) : null}

              {dyeSelected ? (
                <View style={styles.customBlock}>
                  <View style={styles.kvRow}>
                    <Text style={styles.kvLabel}>Dyeing color</Text>
                    <View style={styles.colorPreviewRow}>
                      {!!dyeHex && (
                        <View
                          style={[
                            styles.dyeSwatch,
                            { backgroundColor: dyeHex },
                          ]}
                        />
                      )}
                      <Text style={styles.helper}>
                        {dyeCostPkr != null
                          ? money(order.currency, dyeCostPkr)
                          : `${order.currency} —`}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {tailoringSelected ? (
                <View style={styles.customBlock}>
                  <KVRow
                    label="Tailoring"
                    value={`${tailoringCostPkr != null ? money(order.currency, tailoringCostPkr) : "Included"}${
                      tailoringTurnaroundDays != null
                        ? ` • ${tailoringTurnaroundDays} days`
                        : ""
                    }`}
                  />

                  {!!selectedTailoringStyleImage && (
                    <View style={styles.tailoringImageWrap}>
                      <Image
                        source={{ uri: selectedTailoringStyleImage }}
                        style={styles.tailoringImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <KVRow label="Style" value={selectedTailoringStyleTitle} />
                  <KVRow
                    label="Neck"
                    value={
                      selectedNeckVariation &&
                      selectedNeckVariation !== "no change in selected style"
                        ? cleanVariationLabel(selectedNeckVariation, "neck")
                        : ""
                    }
                  />
                  <KVRow
                    label="Sleeve"
                    value={
                      selectedSleeveVariation &&
                      selectedSleeveVariation !== "no change in selected style"
                        ? cleanVariationLabel(selectedSleeveVariation, "sleeve")
                        : ""
                    }
                  />
                  <KVRow
                    label="Trouser"
                    value={
                      selectedTrouserVariation &&
                      selectedTrouserVariation !== "no change in selected style"
                        ? selectedTrouserVariation
                        : ""
                    }
                  />

                  {tailoringStyleExtraCostPkr != null ? (
                    <KVRow
                      label="Additional style cost"
                      value={money(order.currency, tailoringStyleExtraCostPkr)}
                    />
                  ) : null}

                  {!!customTailoringNote && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>Tailoring note</Text>
                      <Text style={styles.noteText}>{customTailoringNote}</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title="Buyer">
              <KVRow label="Name" value={order.buyer_name} />
              <KVRow label="Mobile" value={order.buyer_mobile} />
              <KVRow label="Email" value={order.buyer_email} muted />
            </SectionCard>

            <SectionCard title="Delivery">
              {!!addressPreview ? (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Address</Text>
                  <Text style={styles.previewText}>{addressPreview}</Text>
                </View>
              ) : (
                <KVRow label="Address" value={order.delivery_address} />
              )}

              <KVRow
                label="Delivery type"
                value={destinationType ? humanizeCat(destinationType) : ""}
              />
              <KVRow label="Region" value={exportRegion} muted />
              <KVRow
                label="Weight"
                value={deliveryWeightKg != null ? `${deliveryWeightKg} kg` : ""}
                muted
              />
              <KVRow label="Notes" value={order.notes} muted />
            </SectionCard>

            <SectionCard title="Tracking">
              <KVRow label="Courier" value={order.courier_name || "—"} />
              <KVRow
                label="Tracking number"
                value={order.tracking_number || "—"}
              />
              <Text style={styles.helper}>
                Buyer may track this order anytime from their Home screen.
              </Text>
            </SectionCard>

            <SectionCard title="Price Summary">
              {baseProductCostPkr != null ? (
                <PriceRow
                  label={isUnstitched ? "Total fabric cost" : "Product"}
                  value={money(order.currency, baseProductCostPkr)}
                />
              ) : null}

              {dyeSelected ? (
                <PriceRow
                  label="Dyeing"
                  value={
                    dyeCostPkr != null
                      ? money(order.currency, dyeCostPkr)
                      : `${order.currency} —`
                  }
                />
              ) : null}

              {tailoringSelected ? (
                <PriceRow
                  label="Tailoring"
                  value={
                    tailoringCostPkr != null
                      ? money(order.currency, tailoringCostPkr)
                      : `${order.currency} —`
                  }
                />
              ) : null}

              {tailoringStyleExtraCostPkr != null ? (
                <PriceRow
                  label="Additional style tailoring cost"
                  value={money(order.currency, tailoringStyleExtraCostPkr)}
                />
              ) : null}

              <PriceRow
                label="Subtotal"
                value={money(order.currency, order.subtotal_pkr)}
              />
              <PriceRow
                label="Shipping"
                value={money(order.currency, order.delivery_pkr)}
              />
              {!!order.discount_pkr ? (
                <PriceRow
                  label="Discount"
                  value={money(order.currency, order.discount_pkr)}
                />
              ) : null}

              <View style={styles.divider} />

              <PriceRow
                label="Total"
                value={money(order.currency, order.total_pkr)}
                strong
              />
            </SectionCard>

            {isBuyerTrackView && norm(order.status) === "delivered" ? (
              <SectionCard title="Review">
                {hasReviewed ? (
                  <Text style={styles.helper}>Review already submitted.</Text>
                ) : (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(buyer)/review-vendor-modal",
                        params: {
                          orderId: String(order.id),
                          vendorId: String(order.vendor_id),
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.pressed,
                      reviewLoading && styles.disabledBtn,
                    ]}
                    disabled={reviewLoading}
                  >
                    <Text style={styles.primaryText}>
                      {reviewLoading ? "Checking..." : "Rate Vendor"}
                    </Text>
                  </Pressable>
                )}
              </SectionCard>
            ) : null}

            {showVendorActions ? (
              <SectionCard title="Update Status">
                {nextAction ? (
                  nextAction.next === "dispatched" ? (
                    <Pressable
                      onPress={openDispatchModal}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        pressed && styles.pressed,
                      ]}
                      disabled={saving}
                    >
                      <Text style={styles.primaryText}>
                        {saving ? "Saving…" : nextAction.label}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => updateStatus(nextAction.next)}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        pressed && styles.pressed,
                      ]}
                      disabled={saving}
                    >
                      <Text style={styles.primaryText}>
                        {saving ? "Saving…" : nextAction.label}
                      </Text>
                    </Pressable>
                  )
                ) : (
                  <Text style={styles.helper}>No further actions.</Text>
                )}
              </SectionCard>
            ) : null}

            <View style={styles.bottomSpacer} />
          </ScrollView>

          <ExactMeasurementsModal
            visible={measurementsOpen}
            onClose={() => setMeasurementsOpen(false)}
            title="Exact Measurements"
            rows={measurementRows}
            inferredSize={selectedUnstitchedSize || order.selected_size || ""}
            unit="cm"
            fabricLengthM={selectedFabricLengthM ?? undefined}
            fabricCostPkr={fabricCostPkr ?? undefined}
            showGuideImage
            orderNo={order.order_no || `Order #${order.id}`}
            buyerName={order.buyer_name}
            vendorName={vendorNameForMeasurements}
            productName={order.title_snapshot}
            productCode={order.product_code_snapshot}
            productCategory={categoryLabel}
            note={order.notes || undefined}
          />

          <Modal visible={dispatchOpen} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Dispatch Order</Text>
                <Text style={styles.modalSub}>
                  Courier name and tracking number are required.
                </Text>

                <Text style={styles.fieldLabel}>Courier Name</Text>
                <TextInput
                  value={courierName}
                  onChangeText={setCourierName}
                  placeholder="e.g., Leopards / TCS"
                  style={styles.input}
                  placeholderTextColor={stylesVars.placeholder}
                />

                <Text style={styles.fieldLabel}>Tracking Number</Text>
                <TextInput
                  value={trackingNumber}
                  onChangeText={setTrackingNumber}
                  placeholder="e.g., 123456789"
                  style={styles.input}
                  placeholderTextColor={stylesVars.placeholder}
                />

                <View style={styles.modalBtns}>
                  <Pressable
                    onPress={() => setDispatchOpen(false)}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.pressed,
                    ]}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryText}>Close</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => updateStatus("dispatched")}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.pressed,
                    ]}
                    disabled={saving}
                  >
                    <Text style={styles.primaryText}>
                      {saving ? "Saving…" : "Confirm Dispatch"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
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
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  success: "#166534",
  successSoft: "#DCFCE7",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: stylesVars.bg,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: stylesVars.text,
  },

  backBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontWeight: "800",
    fontSize: 12,
    color: stylesVars.blue,
  },

  pressed: {
    opacity: 0.82,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  loading: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  empty: {
    padding: 16,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: stylesVars.text,
  },

  container: {
    padding: 16,
    gap: 14,
  },

  headerCard: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 20,
    padding: 16,
    backgroundColor: stylesVars.cardBg,
  },

  headerCardNew: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: "#FFF7F7",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },

  headerMeta: {
    flex: 1,
    gap: 3,
  },

  orderNo: {
    fontSize: 18,
    fontWeight: "800",
    color: stylesVars.text,
  },

  headerSubtext: {
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  statusPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },

  statusPillRed: {
    backgroundColor: stylesVars.dangerSoft,
  },

  statusPillBlue: {
    backgroundColor: "#DBEAFE",
  },

  statusPillGreen: {
    backgroundColor: stylesVars.successSoft,
  },

  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.text,
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    backgroundColor: stylesVars.cardBg,
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

  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
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

  primaryBtn: {
    minHeight: 48,
    backgroundColor: stylesVars.blue,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "800",
    fontSize: 14,
  },

  secondaryBtn: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    flex: 1,
  },

  secondaryText: {
    color: stylesVars.blue,
    fontWeight: "800",
    fontSize: 14,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: stylesVars.cardBg,
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    gap: 10,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
  },

  modalSub: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  fieldLabel: {
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "800",
    marginTop: 2,
  },

  input: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: stylesVars.white,
  },

  modalBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  bottomSpacer: {
    height: 20,
  },
});
