// app/orders/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
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

function isUnstitchedFromSpec(spec: any): boolean {
  const s = spec && typeof spec === "object" ? spec : {};

  const modeRaw = safeText(
    s?.price_mode ??
      s?.priceMode ??
      s?.mode ??
      s?.pricing_mode ??
      s?.price?.mode ??
      s?.price_snapshot?.mode ??
      s?.priceMode_snapshot
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

function getCatLineFromSpec(spec: any): string {
  const s = spec && typeof spec === "object" ? spec : {};

  const modeRaw = safeText(
    s?.price_mode ??
      s?.priceMode ??
      s?.mode ??
      s?.pricing_mode ??
      s?.price?.mode ??
      s?.price_snapshot?.mode ??
      s?.priceMode_snapshot
  );

  const isUnstitched =
    modeRaw.toLowerCase().includes("unstitched") ||
    modeRaw.toLowerCase().includes("per_meter") ||
    boolish(s?.is_unstitched);

  const dyeEnabled = boolish(s?.dyeing_enabled ?? s?.dyeable ?? s?.is_dyeable);
  const tailoringEnabled = boolish(
    s?.tailoring_enabled ?? s?.tailoring_required ?? s?.requires_tailoring
  );

  // NOTE: This line is now shown WITHOUT the "Category:" label in UI (see below).
  if (!isUnstitched) return "Ready to wear (Stitched)";

  const dyeTxt = `Dyeable: ${dyeEnabled ? "Yes" : "No"}`;
  const tailTxt = `Tailoring: ${tailoringEnabled ? "Yes" : "No"}`;
  return `Unstitched • ${dyeTxt} • ${tailTxt}`;
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
    m?.thumbnail_url
  ];

  // arrays (prefer images > thumbs)
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

  // storage path -> public URL (bucket is public in your setup)
  // NOTE: this assumes bucket name is "vendor_images" (as per your project plan)
  try {
    const { data } = supabase.storage.from("vendor_images").getPublicUrl(s);
    return data?.publicUrl ?? "";
  } catch {
    return "";
  }
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const orderId = useMemo(() => String(params.id ?? "").trim(), [params.id]);

  const vendorIdFromStore = useAppSelector((s) => (s.vendor as any)?.id ?? null);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);

  // Dispatch modal state
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
        `
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

        currency: String(o.currency ?? "PKR"),
        subtotal_pkr: o.subtotal_pkr != null ? Number(o.subtotal_pkr) : null,
        delivery_pkr: o.delivery_pkr != null ? Number(o.delivery_pkr) : null,
        discount_pkr: o.discount_pkr != null ? Number(o.discount_pkr) : null,
        total_pkr: o.total_pkr != null ? Number(o.total_pkr) : null,

        size_mode: String(o.size_mode ?? "standard"),
        selected_size: o.selected_size ? String(o.selected_size) : null,
        exact_measurements: o.exact_measurements ?? {},

        courier_name: o.courier_name ? String(o.courier_name) : null,
        tracking_number: o.tracking_number ? String(o.tracking_number) : null
      });

      // preload dispatch fields from DB if present
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

  const isVendorView = useMemo(() => {
    if (!order) return false;
    const vId = vendorIdFromStore != null ? Number(vendorIdFromStore) : null;
    if (!vId) return false;
    return vId === order.vendor_id;
  }, [order, vendorIdFromStore]);

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

  const dyeHex = useMemo(() => {
    if (!order) return "";
    const spec =
      order.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};
    const hex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
    return hex !== "—" ? hex : "";
  }, [order]);

  const dyeCostLine = useMemo(() => {
    if (!order) return "";
    const spec =
      order.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};
    const enabled = boolish(spec?.dyeing_enabled ?? spec?.dyeable ?? spec?.is_dyeable);

    const costRaw =
      spec?.dyeing_cost_pkr ??
      spec?.dye_cost_pkr ??
      spec?.dyeingCostPkr ??
      spec?.dyeCostPkr ??
      spec?.dye_cost ??
      spec?.dyeing_cost ??
      null;

    if (!enabled && (costRaw == null || costRaw === "")) return "";

    const cost =
      costRaw != null && costRaw !== "" && !Number.isNaN(Number(costRaw)) ? Number(costRaw) : null;

    if (cost == null) return "Dyeing: Included";
    return `Dyeing: Cost: ${order.currency} ${cost.toLocaleString()}`;
  }, [order]);

  const fabricCostLine = useMemo(() => {
    if (!order) return "";
    const spec =
      order.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};

    const costRaw =
      spec?.fabric_cost_pkr ??
      spec?.fabricCostPkr ??
      spec?.fabric_cost ??
      spec?.fabricCost ??
      spec?.cloth_cost_pkr ??
      spec?.clothCostPkr ??
      spec?.cloth_cost ??
      spec?.clothCost ??
      null;

    if (costRaw == null || costRaw === "") return "";

    const cost = !Number.isNaN(Number(costRaw)) ? Number(costRaw) : null;
    if (cost == null) return "";

    return `Fabric: Cost: ${order.currency} ${cost.toLocaleString()}`;
  }, [order]);

  // ✅ Product cost line (use subtotal_pkr; fallback to total_pkr if subtotal missing)
  const productCostLine = useMemo(() => {
    if (!order) return "";
    const base = order.subtotal_pkr != null ? order.subtotal_pkr : order.total_pkr;
    if (base == null) return "";
    return `Product Cost: ${money(order.currency, base)}`;
  }, [order]);

  const catLine = useMemo(() => {
    if (!order) return "—";
    const spec =
      order.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};
    return getCatLineFromSpec(spec);
  }, [order]);

  // ✅ Dress category line (from spec snapshot)
  const dressCatLine = useMemo(() => {
    if (!order) return "—";
    const spec =
      order.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};
    return getDressCatFromSpec(spec);
  }, [order]);

  // ✅ Dress banner image (from media snapshot)
  const bannerUrl = useMemo(() => {
    if (!order) return "";
    const picked = pickFirstImageCandidate(order.media_snapshot);
    return resolvePublicUrlFromPath(picked);
  }, [order]);

  const tailoringLine = useMemo(() => {
    if (!order) return "";
    const spec =
      order.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};
    const enabled = !!spec?.tailoring_enabled;
    const cost = spec?.tailoring_cost_pkr;
    const days = spec?.tailoring_turnaround_days;

    if (!enabled && !cost && !days) return "";
    const costTxt =
      cost != null && cost !== "" ? `Cost: ${order.currency} ${Number(cost).toLocaleString()}` : "";
    const daysTxt = days != null && days !== "" ? `Days: ${days}` : "";
    const join = [costTxt, daysTxt].filter(Boolean).join(" • ");
    return join.length ? `Tailoring: ${join}` : "Tailoring: Included";
  }, [order]);

  const nextAction = useMemo(() => {
    if (!order) return null;
    const s = norm(order.status);

    const spec =
      order.spec_snapshot && typeof order.spec_snapshot === "object" ? order.spec_snapshot : {};
    const isUnstitched = isUnstitchedFromSpec(spec);
    const isReadyToWear = !isUnstitched;

    // Simple pipeline:
    // Unstitched: placed -> seen -> in_progress -> packed -> dispatched -> delivered
    // Ready-to-wear: placed -> seen -> packed -> dispatched -> delivered  (bypass dyeing/tailoring)
    if (s === "placed") return { next: "seen", label: "Mark Seen" };

    if (s === "seen") {
      if (isReadyToWear) return { next: "packed", label: "Mark Packed" };
      return { next: "in_progress", label: "Started Dyeing/Tailoring" };
    }

    if (s === "in_progress") return { next: "packed", label: "Mark Packed" };
    if (s === "packed") return { next: "dispatched", label: "Dispatch" };
    if (s === "dispatched") return { next: "delivered", label: "Mark Delivered" };
    return null;
  }, [order]);

  const updateStatus = useCallback(
    async (nextStatus: string) => {
      if (!order) return;

      // Dispatch requires courier + tracking
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

        // Keep existing courier/tracking when not dispatching
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
    [order, courierName, trackingNumber, load]
  );

  const openDispatchModal = () => {
    setDispatchOpen(true);
  };

  const statusBadgeStyle = useMemo(() => {
    const s = norm(order?.status ?? "");
    return s === "placed" ? styles.badgeRed : styles.badgeBlue;
  }, [order?.status]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Pressable
          onPress={() => router.back()}
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
                Created: <Text style={styles.strong}>{new Date(order.created_at).toLocaleString()}</Text>
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.h2}>Product</Text>

              {/* ✅ Banner Image */}
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

              {/* ✅ Dress Cat */}
              <Text style={styles.meta}>
                Dress Category: <Text style={styles.strong}>{dressCatLine}</Text>
              </Text>

              {/* ✅ Product Cost (ABOVE Tailoring) */}
              {!!productCostLine ? <Text style={styles.meta}>{productCostLine}</Text> : null}

              {/* ✅ REMOVED ENTIRELY: Category label + value line */}
              {/* (catLine is still computed for pipeline logic; just not displayed) */}

              {!!tailoringLine ? <Text style={styles.meta}>{tailoringLine}</Text> : null}
              {!!dyeCostLine ? <Text style={styles.meta}>{dyeCostLine}</Text> : null}
              {!!fabricCostLine ? <Text style={styles.meta}>{fabricCostLine}</Text> : null}

              {/* Work swatch (dye selection) */}
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
                City: <Text style={styles.strong}>{order.city}</Text>
              </Text>
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
              <Text style={styles.meta}>
                Subtotal: <Text style={styles.strong}>{money(order.currency, order.subtotal_pkr)}</Text>
              </Text>
              <Text style={styles.meta}>
                Delivery: <Text style={styles.strong}>{money(order.currency, order.delivery_pkr)}</Text>
              </Text>
              <Text style={styles.meta}>
                Discount: <Text style={styles.strong}>{money(order.currency, order.discount_pkr)}</Text>
              </Text>
              <View style={styles.divider} />
              <Text style={styles.meta}>
                Total: <Text style={styles.strong}>{money(order.currency, order.total_pkr)}</Text>
              </Text>
            </View>

            {/* ✅ Vendor actions only if vendor_id matches store */}
            {isVendorView ? (
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

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Dispatch Modal */}
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
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.fieldLabel}>Tracking Number</Text>
                <TextInput
                  value={trackingNumber}
                  onChangeText={setTrackingNumber}
                  placeholder="e.g., 123456789"
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
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

const LABEL_BLUE = "#1F4E8C";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  top: { padding: 16, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 18, fontWeight: "900" },
  backBtn: { borderWidth: 1, borderColor: "#111", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  backText: { fontWeight: "800" },
  pressed: { opacity: 0.7 },

  loading: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#444" },

  container: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 14, gap: 8 },

  cardNewRed: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF7F7"
  },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },

  h1: { fontSize: 18, fontWeight: "900", flex: 1, color: "#111" },
  h2: { fontSize: 14, fontWeight: "900", marginBottom: 2 },

  // ✅ labels now LIGHT BLUE
  meta: { fontSize: 13, color: LABEL_BLUE, fontWeight: "700" },

  // ✅ values stay BLACK
  strong: { fontWeight: "900", color: "#111" },

  badge: {
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden"
  },
  badgeRed: { color: "#991B1B", backgroundColor: "#FEE2E2" },
  badgeBlue: { color: "#1E3A8A", backgroundColor: "#DBEAFE" },

  // ✅ Banner
  bannerWrap: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 4
  },
  bannerImg: { width: "100%", height: "100%" },

  dyeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 6 },
  dyeSwatch: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff"
  },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },

  primaryBtn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    flex: 1
  },
  secondaryText: { color: "#111", fontWeight: "900", fontSize: 14 },

  empty: { padding: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  modalSub: { fontSize: 12, color: "#64748B", fontWeight: "700" },

  // ✅ labels now LIGHT BLUE
  fieldLabel: { fontSize: 12, color: LABEL_BLUE, fontWeight: "900", marginTop: 2 },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    fontWeight: "800",
    backgroundColor: "#fff"
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 }
});