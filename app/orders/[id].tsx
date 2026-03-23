// File: app/orders/[id].tsx

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
  return `${currency} ${n.toLocaleString()}`;
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

  const cat = String(s?.product_category ?? "").trim().toLowerCase();
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
  const raw = safeText(s?.product_category ?? s?.dress_category ?? s?.dress_cat ?? "");
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

  if (Array.isArray(m?.images) && m.images.length) candidates.unshift(m.images[0]);
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
  return value.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const orderId = useMemo(() => String(params.id ?? "").trim(), [params.id]);
  const fromParam = useMemo(() => String(params.from ?? "").trim().toLowerCase(), [params.from]);

  const vendorIdFromStore = useAppSelector((s) => (s.vendor as any)?.id ?? null);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);

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
        .select(`
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
        `)
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

  useEffect(() => {
    load();
  }, [load]);

  const isBuyerTrackView = useMemo(() => {
    return fromParam === "track" || fromParam === "buyer-track" || fromParam === "buyer-order";
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

  const backTarget = useMemo(() => {
    if (fromParam === "track" || fromParam === "buyer-track") return "/flow/orders/track";
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
    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  const spec = useMemo(() => {
    return order?.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};
  }, [order]);

  const isUnstitched = useMemo(() => isUnstitchedFromSpec(spec), [spec]);

  const sizeLine = useMemo(() => {
    if (!order) return "—";
    if (order.size_mode === "exact") {
      const m =
        order.exact_measurements && typeof order.exact_measurements === "object"
          ? order.exact_measurements
          : {};
      const pairs = Object.entries(m)
        .map(([k, v]) => `${k}=${String(v ?? "").trim()}`)
        .filter((x) => !x.endsWith("="));
      return pairs.length ? `Exact: ${pairs.join(", ")}` : "Exact: —";
    }
    return order.selected_size ? `Standard: ${order.selected_size}` : "Standard: —";
  }, [order]);

  const selectedUnstitchedSize = useMemo(() => {
    if (!order) return "";
    const raw = safeText(spec?.selected_unstitched_size ?? order.selected_size ?? "");
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
    return boolish(spec?.dyeing_selected) || !!dyeHex || safeText(spec?.dye_label ?? "") !== "—";
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
    return boolish(spec?.tailoring_enabled) || boolish(spec?.tailoring_selected);
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

  const noChangeInSelectedStyle = useMemo(() => {
    return (
      selectedNeckVariation === "no change in selected style" ||
      selectedSleeveVariation === "no change in selected style" ||
      selectedTrouserVariation === "no change in selected style"
    );
  }, [selectedNeckVariation, selectedSleeveVariation, selectedTrouserVariation]);

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

  const baseProductCostPkr = useMemo(() => {
    if (!order) return null;
    if (isUnstitched && fabricCostPkr != null) return fabricCostPkr;
    const direct =
      numOrNull(spec?.base_product_cost_pkr ?? null) ??
      numOrNull(spec?.stitched_total_pkr ?? null) ??
      null;
    if (direct != null) return direct;

    const subtotal = numOrNull(order.subtotal_pkr);
    const dye = dyeSelected ? numOrNull(dyeCostPkr) ?? 0 : 0;
    const tailoring = tailoringSelected ? numOrNull(tailoringCostPkr) ?? 0 : 0;
    const styleExtra = tailoringStyleExtraCostPkr ?? 0;
    if (subtotal != null) return Math.max(0, subtotal - dye - tailoring - styleExtra);

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

  const dressCatLine = useMemo(() => {
    if (!order) return "—";
    return getDressCatFromSpec(spec);
  }, [order, spec]);

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
    if (s === "dispatched") return { next: "delivered", label: "Mark Delivered" };
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
          Alert.alert("Missing details", "Courier name and tracking number are required to dispatch.");
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

        const { error } = await supabase.from("orders").update(payload).eq("id", order.id);
        if (error) throw error;

        setDispatchOpen(false);
        await load();
      } catch (e: any) {
        console.warn("status update error:", e?.message ?? e);
        Alert.alert("Update failed", e?.message ?? "Could not update order status.");
      } finally {
        setSaving(false);
      }
    },
    [order, courierName, trackingNumber, load],
  );

  const openDispatchModal = useCallback(() => {
    setDispatchOpen(true);
  }, []);

  const statusBadgeStyle = useMemo(() => {
    const s = norm(order?.status ?? "");
    return s === "placed" ? styles.badgeRed : styles.badgeBlue;
  }, [order?.status]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Pressable
          onPress={() => router.replace(backTarget as any)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Order Detail</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : !order ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Order not found</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={[styles.card, norm(order.status) === "placed" ? styles.cardNewRed : null]}>
              <View style={styles.rowBetween}>
                <Text style={styles.h1}>{order.order_no || `Order #${order.id}`}</Text>
                <Text style={[styles.badge, statusBadgeStyle]} numberOfLines={1}>
                  {order.status}
                </Text>
              </View>

              <Text style={styles.meta}>
                Created:{" "}
                <Text style={styles.strong}>{new Date(order.created_at).toLocaleString()}</Text>
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Product</Text>

              {!!bannerUrl ? (
                <View style={styles.bannerWrap}>
                  <Image source={{ uri: bannerUrl }} style={styles.bannerImg} resizeMode="cover" />
                </View>
              ) : null}

              <Text style={styles.meta}>
                Title: <Text style={styles.strong}>{order.title_snapshot}</Text>
              </Text>
              <Text style={styles.meta}>
                Code: <Text style={styles.strong}>{order.product_code_snapshot}</Text>
              </Text>
              <Text style={styles.meta}>
                Dress Category: <Text style={styles.strong}>{dressCatLine}</Text>
              </Text>

              {isUnstitched && selectedUnstitchedSize ? (
                <Text style={styles.meta}>
                  Selected Size: <Text style={styles.strong}>{selectedUnstitchedSize}</Text>
                </Text>
              ) : null}

              {isUnstitched && pricePerMeterPkr != null ? (
                <Text style={styles.meta}>
                  Cost per meter: <Text style={styles.strong}>{money(order.currency, pricePerMeterPkr)}</Text>
                </Text>
              ) : null}

              {isUnstitched && selectedFabricLengthM != null ? (
                <Text style={styles.meta}>
                  Fabric Length: <Text style={styles.strong}>{selectedFabricLengthM} meter(s)</Text>
                </Text>
              ) : null}

              {isUnstitched && fabricCostPkr != null ? (
                <Text style={styles.meta}>
                  Total Fabric Cost: <Text style={styles.strong}>{money(order.currency, fabricCostPkr)}</Text>
                </Text>
              ) : null}

              {!isUnstitched && baseProductCostPkr != null ? (
                <Text style={styles.meta}>
                  Product Cost: <Text style={styles.strong}>{money(order.currency, baseProductCostPkr)}</Text>
                </Text>
              ) : null}

              {tailoringSelected ? (
                <Text style={styles.meta}>
                  Tailoring:{" "}
                  <Text style={styles.strong}>
                    {tailoringCostPkr != null ? money(order.currency, tailoringCostPkr) : "Included"}
                    {tailoringTurnaroundDays != null ? ` • ${tailoringTurnaroundDays} days` : ""}
                  </Text>
                </Text>
              ) : null}

              {!!selectedTailoringStyleTitle ? (
                <Text style={styles.meta}>
                  Style: <Text style={styles.strong}>{selectedTailoringStyleTitle}</Text>
                </Text>
              ) : null}

              {tailoringSelected && noChangeInSelectedStyle ? (
                <Text style={styles.meta}>
                  <Text style={styles.strong}>No change in selected style</Text>
                </Text>
              ) : null}

              {tailoringSelected && !noChangeInSelectedStyle && !!selectedNeckVariation ? (
                <Text style={styles.meta}>
                  Neck:{" "}
                  <Text style={styles.strong}>
                    {cleanVariationLabel(selectedNeckVariation, "neck")}
                  </Text>
                </Text>
              ) : null}

              {tailoringSelected && !noChangeInSelectedStyle && !!selectedSleeveVariation ? (
                <Text style={styles.meta}>
                  Sleeve:{" "}
                  <Text style={styles.strong}>
                    {cleanVariationLabel(selectedSleeveVariation, "sleeve")}
                  </Text>
                </Text>
              ) : null}

              {tailoringSelected && !noChangeInSelectedStyle && !!selectedTrouserVariation ? (
                <Text style={styles.meta}>
                  Trouser: <Text style={styles.strong}>{selectedTrouserVariation}</Text>
                </Text>
              ) : null}

              {tailoringStyleExtraCostPkr != null ? (
                <Text style={styles.meta}>
                  Style Extra Cost: <Text style={styles.strong}>{money(order.currency, tailoringStyleExtraCostPkr)}</Text>
                </Text>
              ) : null}

              {!!customTailoringNote ? (
                <Text style={styles.meta}>
                  Additional Note for Vendor: <Text style={styles.strong}>{customTailoringNote}</Text>
                </Text>
              ) : null}

              {dyeSelected ? (
                <Text style={styles.meta}>
                  Dyeing:{" "}
                  <Text style={styles.strong}>
                    {dyeCostPkr != null ? money(order.currency, dyeCostPkr) : "Included"}
                  </Text>
                </Text>
              ) : null}

              {!!dyeHex ? (
                <View style={styles.dyeRow}>
                  <Text style={styles.meta}>
                    Dyeing Colour: <Text style={styles.strong}>Selected</Text>
                  </Text>
                  <View style={[styles.dyeSwatch, { backgroundColor: dyeHex }]} />
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Buyer</Text>
              <Text style={styles.meta}>
                Name: <Text style={styles.strong}>{order.buyer_name}</Text>
              </Text>
              <Text style={styles.meta}>
                Mobile: <Text style={styles.strong}>{order.buyer_mobile}</Text>
              </Text>
              {!!order.buyer_email && (
                <Text style={styles.meta}>
                  Email: <Text style={styles.strong}>{order.buyer_email}</Text>
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Delivery</Text>
              <Text style={styles.meta}>
                Address: <Text style={styles.strong}>{order.delivery_address}</Text>
              </Text>
              <Text style={styles.meta}>
                City: <Text style={styles.strong}>{order.city || "—"}</Text>
              </Text>

              {!!destinationType && (
                <Text style={styles.meta}>
                  Destination Type: <Text style={styles.strong}>{humanizeCat(destinationType)}</Text>
                </Text>
              )}

              {!!exportRegion && (
                <Text style={styles.meta}>
                  Export Region: <Text style={styles.strong}>{exportRegion}</Text>
                </Text>
              )}

              {deliveryWeightKg != null ? (
                <Text style={styles.meta}>
                  Delivery Weight: <Text style={styles.strong}>{deliveryWeightKg} kg</Text>
                </Text>
              ) : null}

              {!!order.notes && (
                <Text style={styles.meta}>
                  Notes: <Text style={styles.strong}>{order.notes}</Text>
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Size</Text>
              <Text style={styles.meta}>
                <Text style={styles.strong}>{sizeLine}</Text>
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Tracking</Text>
              <Text style={styles.meta}>
                Courier: <Text style={styles.strong}>{order.courier_name || "—"}</Text>
              </Text>
              <Text style={styles.meta}>
                Tracking #: <Text style={styles.strong}>{order.tracking_number || "—"}</Text>
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Totals</Text>

              {baseProductCostPkr != null ? (
                <Text style={styles.meta}>
                  {isUnstitched ? "Total Fabric Cost" : "Product Cost"}:{" "}
                  <Text style={styles.strong}>{money(order.currency, baseProductCostPkr)}</Text>
                </Text>
              ) : null}

              {dyeSelected ? (
                <Text style={styles.meta}>
                  Dyeing:{" "}
                  <Text style={styles.strong}>
                    {dyeCostPkr != null ? money(order.currency, dyeCostPkr) : `${order.currency} —`}
                  </Text>
                </Text>
              ) : null}

              {tailoringSelected ? (
                <Text style={styles.meta}>
                  Tailoring:{" "}
                  <Text style={styles.strong}>
                    {tailoringCostPkr != null
                      ? money(order.currency, tailoringCostPkr)
                      : `${order.currency} —`}
                  </Text>
                </Text>
              ) : null}

              {tailoringStyleExtraCostPkr != null ? (
                <Text style={styles.meta}>
                  Style Extra Cost:{" "}
                  <Text style={styles.strong}>
                    {money(order.currency, tailoringStyleExtraCostPkr)}
                  </Text>
                </Text>
              ) : null}

              <Text style={styles.meta}>
                Subtotal before delivery:{" "}
                <Text style={styles.strong}>{money(order.currency, order.subtotal_pkr)}</Text>
              </Text>
              <Text style={styles.meta}>
                Delivery: <Text style={styles.strong}>{money(order.currency, order.delivery_pkr)}</Text>
              </Text>
              <Text style={styles.meta}>
                Discount: <Text style={styles.strong}>{money(order.currency, order.discount_pkr)}</Text>
              </Text>

              <View style={styles.divider} />

              <Text style={styles.meta}>
                Grand Total: <Text style={styles.strong}>{money(order.currency, order.total_pkr)}</Text>
              </Text>
            </View>

            {showVendorActions ? (
              <View style={styles.card}>
                <Text style={styles.h2}>Update Status</Text>

                {nextAction ? (
                  nextAction.next === "dispatched" ? (
                    <Pressable
                      onPress={openDispatchModal}
                      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                      disabled={saving}
                    >
                      <Text style={styles.primaryText}>{saving ? "Saving…" : nextAction.label}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => updateStatus(nextAction.next)}
                      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                      disabled={saving}
                    >
                      <Text style={styles.primaryText}>{saving ? "Saving…" : nextAction.label}</Text>
                    </Pressable>
                  )
                ) : (
                  <Text style={styles.meta}>No further actions.</Text>
                )}
              </View>
            ) : null}

            <View style={styles.bottomSpacer} />
          </ScrollView>

          <Modal visible={dispatchOpen} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Dispatch Order</Text>
                <Text style={styles.modalSub}>Courier name and tracking number are required.</Text>

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
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryText}>Close</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => updateStatus("dispatched")}
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                    disabled={saving}
                  >
                    <Text style={styles.primaryText}>{saving ? "Saving…" : "Confirm Dispatch"}</Text>
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
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  top: {
    padding: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: stylesVars.bg,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
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
    fontWeight: "700",
    fontSize: 12,
    color: stylesVars.blue,
  },

  pressed: {
    opacity: 0.82,
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

  container: {
    padding: 16,
    gap: 12,
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 18,
    gap: 8,
    backgroundColor: stylesVars.cardBg,
  },

  cardNewRed: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: "#FFF7F7",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  h1: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    color: stylesVars.text,
  },

  h2: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
    color: stylesVars.text,
  },

  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  strong: {
    fontWeight: "700",
    color: stylesVars.text,
  },

  badge: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },

  badgeRed: {
    color: stylesVars.danger,
    backgroundColor: stylesVars.dangerSoft,
  },

  badgeBlue: {
    color: "#1E3A8A",
    backgroundColor: "#DBEAFE",
  },

  bannerWrap: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: stylesVars.border,
    marginBottom: 4,
  },

  bannerImg: {
    width: "100%",
    height: "100%",
  },

  dyeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },

  dyeSwatch: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: stylesVars.white,
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginVertical: 8,
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
    fontWeight: "700",
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
    fontWeight: "700",
    fontSize: 14,
  },

  empty: {
    padding: 16,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: stylesVars.text,
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
    fontWeight: "700",
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
    fontWeight: "700",
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