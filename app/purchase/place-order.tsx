// app/purchase/place-order.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { supabase } from "@/utils/supabase/client";

const BUCKET_VENDOR = "vendor_images";

type Params = {
  // size flow
  productId?: string;
  product_id?: string;
  productCode?: string;
  product_code?: string;

  mode?: string;
  selectedSize?: string;

  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  f?: string;
  g?: string;
  h?: string;
  i?: string;
  j?: string;
  k?: string;
  l?: string;
  m?: string;
  n?: string;

  // ✅ dress category passthrough (stitched/unstitched etc.)
  product_category?: string;

  // product detail params (sometimes forwarded, sometimes not)
  productName?: string;
  product_name?: string;
  price?: string;
  currency?: string;
  imageUrl?: string;
  image_url?: string;

  // optional vendor overrides
  vendorName?: string;
  vendorMobile?: string;
  vendorAddress?: string;

  // ✅ dyeing (buyer selection + vendor cost)
  dye_shade_id?: string;
  dye_hex?: string;
  dye_label?: string;
  dyeing_cost_pkr?: string;

  // ✅ NEW: explicit dyeing choice (1/0/true/false)
  dyeing_selected?: string;

  // tolerate older key from modal
  dyeing_selected_shade?: string;

  // ✅ tailoring (vendor-set cost + turnaround)
  tailoring_cost_pkr?: string;
  tailoring_turnaround_days?: string;

  // ✅ NEW: explicit tailoring choice + availability
  tailoring_selected?: string;
  tailoring_available?: string;
};

type VendorState = {
  shop_name: string | null;
  owner_name: string | null;
  mobile: string | null;
  landline: string | null;
  address: string | null;
  location_url: string | null;
  government_permission_url: string | null;
  banner_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  status: string | null;
};

type VendorRow = {
  id: string | number;
  name?: string | null;
  shop_name?: string | null;
  address?: string | null;
  mobile?: string | null;
  landline?: string | null;
  email?: string | null;
  location?: string | null;
  location_url?: string | null;
  profile_image_path?: string | null;
  banner_path?: string | null;
  status?: string | null;
};

type ProductRow = {
  id: string | number;
  product_code?: string | null;
  title?: string | null;
  price?: any;
  media?: any;
  vendor_id?: string | number | null;
  vendor?: VendorRow | null;
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

function resolvePublicUrl(path: string | null | undefined) {
  const p = norm(path);
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(p);
  return data?.publicUrl ?? "";
}

function getPriceForDisplay(priceObj: any): { currency: string; amountText: string; amountParam: string } {
  const currency = "PKR";

  if (!priceObj || typeof priceObj !== "object") {
    return { currency, amountText: "—", amountParam: "" };
  }

  const mode = String(priceObj?.mode ?? "");
  const total = priceObj?.cost_pkr_total;
  const perMeter = priceObj?.cost_pkr_per_meter;

  if (mode === "unstitched_per_meter" && typeof perMeter === "number") {
    return { currency, amountText: `${perMeter} / meter`, amountParam: String(perMeter) };
  }
  if (typeof total === "number") {
    return { currency, amountText: `${total}`, amountParam: String(total) };
  }
  if (typeof perMeter === "number") {
    return { currency, amountText: `${perMeter} / meter`, amountParam: String(perMeter) };
  }

  return { currency, amountText: "—", amountParam: "" };
}

function parseBoolParam(v: unknown): boolean | null {
  const s = norm(v).toLowerCase();
  if (!s) return null;
  if (s === "1" || s === "true" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n" || s === "off") return false;
  return null;
}

export default function PlaceOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  // vendor slice should be mounted under state.vendor
  const vendor = useSelector((s: any) => (s?.vendor ?? null)) as VendorState | null;

  const base = useMemo(() => {
    const productId = firstNonEmpty(params.productId, params.product_id);
    const productCode = firstNonEmpty(params.productCode, params.product_code);

    const mode = firstNonEmpty(params.mode) || "standard";
    const selectedSize = firstNonEmpty(params.selectedSize);

    const letters = {
      a: norm(params.a),
      b: norm(params.b),
      c: norm(params.c),
      d: norm(params.d),
      e: norm(params.e),
      f: norm(params.f),
      g: norm(params.g),
      h: norm(params.h),
      i: norm(params.i),
      j: norm(params.j),
      k: norm(params.k),
      l: norm(params.l),
      m: norm(params.m),
      n: norm(params.n)
    };
    const exactPairs: [string, string][] = [
      ["A", letters.a],
      ["B", letters.b],
      ["C", letters.c],
      ["D", letters.d],
      ["E", letters.e],
      ["F", letters.f],
      ["G", letters.g],
      ["H", letters.h],
      ["I", letters.i],
      ["J", letters.j],
      ["K", letters.k],
      ["L", letters.l],
      ["M", letters.m],
      ["N", letters.n]
    ].filter((pair): pair is [string, string] => typeof pair[1] === "string" && pair[1].length > 0);

    const sizeLabel =
      mode === "exact"
        ? exactPairs.length
          ? "Exact Measurements"
          : "Exact Measurements (Not set)"
        : selectedSize
          ? `Standard Size: ${selectedSize}`
          : "Standard Size (Not set)";

    const productName = firstNonEmpty(params.productName, params.product_name);
    const currency = firstNonEmpty(params.currency) || "PKR";
    const price = firstNonEmpty(params.price);
    const imageUrl = firstNonEmpty(params.imageUrl, params.image_url);

    // ✅ dyeing (tolerate multiple keys)
    const dyeShadeId = safeDecode(firstNonEmpty(params.dye_shade_id));
    const dyeHex = safeDecode(firstNonEmpty(params.dye_hex, params.dyeing_selected_shade));
    const dyeLabel = safeDecode(firstNonEmpty(params.dye_label));
    const dyeingCostPkr = safeDecode(firstNonEmpty(params.dyeing_cost_pkr));

    // ✅ explicit dyeing selected
    const dyeingSelected = parseBoolParam(params.dyeing_selected);

    // ✅ tailoring
    const tailoringCostPkr = safeDecode(firstNonEmpty(params.tailoring_cost_pkr));
    const tailoringTurnaroundDays = safeDecode(firstNonEmpty(params.tailoring_turnaround_days));

    // ✅ explicit tailoring selected + available
    const tailoringSelected = parseBoolParam(params.tailoring_selected);
    const tailoringAvailable = parseBoolParam(params.tailoring_available);

    return {
      productId,
      productCode,
      mode,
      selectedSize,
      letters,
      exactPairs,
      sizeLabel,
      productName,
      currency,
      price,
      imageUrl,

      dyeShadeId,
      dyeHex,
      dyeLabel,
      dyeingCostPkr,
      dyeingSelected,

      tailoringCostPkr,
      tailoringTurnaroundDays,
      tailoringSelected,
      tailoringAvailable
    };
  }, [params]);

  // fetched fallback (when details were not forwarded)
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [fetchedProduct, setFetchedProduct] = useState<ProductRow | null>(null);

  const loadProductIfNeeded = useCallback(async () => {
    const shouldFetch =
      (!!base.productId || !!base.productCode) && (!base.productName || !base.imageUrl || !base.price);

    if (!shouldFetch) return;

    try {
      setLoadingProduct(true);

      let q = supabase
        .from("products")
        .select(
          `
          id,
          vendor_id,
          product_code,
          title,
          price,
          media,
          vendor:vendor_id (
            id,
            name,
            shop_name,
            address,
            mobile,
            landline,
            email,
            location,
            location_url,
            profile_image_path,
            banner_path,
            status
          )
        `
        );

      if (base.productId) q = q.eq("id", base.productId);
      else q = q.eq("product_code", base.productCode);

      const { data, error } = await q.single();
      if (error) return;

      setFetchedProduct(data as any);
    } finally {
      setLoadingProduct(false);
    }
  }, [base.productId, base.productCode, base.productName, base.imageUrl, base.price]);

  useEffect(() => {
    loadProductIfNeeded();
  }, [loadProductIfNeeded]);

  const resolved = useMemo(() => {
    const fp = fetchedProduct;

    const title = base.productName || norm(fp?.title) || "Product";
    const code = base.productCode || norm(fp?.product_code) || "";
    const id = base.productId || norm(fp?.id) || "";

    const priceObj = fp?.price ?? null;
    const p = base.price
      ? { currency: base.currency || "PKR", amountText: base.price, amountParam: base.price }
      : getPriceForDisplay(priceObj);

    const media = fp?.media ?? {};
    const imagePath = media?.images?.[0] ?? "";
    const fetchedImageUrl = resolvePublicUrl(imagePath);

    const imageUrl = base.imageUrl || fetchedImageUrl || "";

    // vendor: prefer redux (already set via view-product), else fallback to fetched join
    const vJoin = fp?.vendor ?? null;

    const vendorName =
      firstNonEmpty(
        params.vendorName,
        vendor?.shop_name,
        vendor?.owner_name,
        vJoin?.shop_name,
        vJoin?.name
      ) || "Vendor";

    const vendorMobile = firstNonEmpty(params.vendorMobile, vendor?.mobile, vJoin?.mobile);
    const vendorAddress = firstNonEmpty(params.vendorAddress, vendor?.address, vJoin?.address);

    const vendorBanner = norm(vendor?.banner_url) || resolvePublicUrl(vJoin?.banner_path) || "";

    const vendorStatus = firstNonEmpty(vendor?.status, vJoin?.status);

    const dyeText = base.dyeLabel || base.dyeShadeId || base.dyeHex || "";

    // ✅ decide whether dyeing/tailoring are selected (explicit first, else infer from presence)
    const hasAnyDyeFields = !!base.dyeHex || !!base.dyeShadeId || !!base.dyeLabel;
    const dyeingSelected =
      typeof base.dyeingSelected === "boolean" ? base.dyeingSelected : hasAnyDyeFields;

    const tailoringSelected = typeof base.tailoringSelected === "boolean" ? base.tailoringSelected : false;

    return {
      id,
      code,
      title,
      currency: p.currency,
      priceText: p.amountText,
      priceParam: p.amountParam,
      imageUrl,

      vendorName,
      vendorMobile,
      vendorAddress,
      vendorBanner,
      vendorStatus,

      dyeText,
      dyeShadeId: base.dyeShadeId,
      dyeHex: base.dyeHex,
      dyeLabel: base.dyeLabel,
      dyeingCostPkr: base.dyeingCostPkr,
      dyeingSelected,

      tailoringCostPkr: base.tailoringCostPkr,
      tailoringTurnaroundDays: base.tailoringTurnaroundDays,
      tailoringSelected,

      tailoringAvailable: typeof base.tailoringAvailable === "boolean" ? base.tailoringAvailable : null
    };
  }, [base, fetchedProduct, vendor, params.vendorName, params.vendorMobile, params.vendorAddress]);

  // ✅ compute payable (base + dyeing + tailoring) using explicit selected flags
  const priceCalc = useMemo(() => {
    const basePrice = Number(resolved.priceParam || 0);

    const dyeCost = Number(resolved.dyeingCostPkr || 0);
    const safeBase = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 0;
    const safeDye = Number.isFinite(dyeCost) && dyeCost > 0 ? dyeCost : 0;

    const tailoringCost = Number(resolved.tailoringCostPkr || 0);
    const safeTailoring = Number.isFinite(tailoringCost) && tailoringCost > 0 ? tailoringCost : 0;

    const hasDyeing =
      Boolean(resolved.dyeingSelected) &&
      (!!resolved.dyeHex || !!resolved.dyeShadeId || !!resolved.dyeLabel);
    const hasTailoring = Boolean(resolved.tailoringSelected) && safeTailoring > 0;

    const dyeAdd = hasDyeing ? safeDye : 0;
    const tailoringAdd = hasTailoring ? safeTailoring : 0;

    const totalPayable = safeBase + dyeAdd + tailoringAdd;

    return { hasDyeing, hasTailoring, safeBase, safeDye, safeTailoring, dyeAdd, tailoringAdd, totalPayable };
  }, [
    resolved.priceParam,
    resolved.dyeingCostPkr,
    resolved.dyeHex,
    resolved.dyeShadeId,
    resolved.dyeLabel,
    resolved.dyeingSelected,
    resolved.tailoringCostPkr,
    resolved.tailoringSelected
  ]);

  // buyer / delivery fields
  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const canContinue =
    buyerName.trim().length >= 2 &&
    buyerMobile.trim().replace(/\D/g, "").length >= 10 &&
    deliveryAddress.trim().length >= 10 &&
    city.trim().length >= 2;

  const goChangeSize = () => {
    router.push({
      pathname: "/purchase/size",
      params: {
        returnTo: "/purchase/place-order",
        productId: resolved.id || base.productId,
        productCode: resolved.code || base.productCode,

        mode: base.mode,
        selectedSize: base.selectedSize,
        ...base.letters,

        // ✅ keep dress category flowing
        product_category: params.product_category ? String(params.product_category) : "",

        // keep forwarding so it’s instant next time
        productName: resolved.title,
        price: resolved.priceParam,
        currency: resolved.currency,
        imageUrl: resolved.imageUrl,

        // ✅ keep dyeing forward too (and its selection flag)
        dyeing_selected: resolved.dyeingSelected ? "1" : "0",
        dye_shade_id: resolved.dyeShadeId ? encodeURIComponent(resolved.dyeShadeId) : "",
        dye_hex: resolved.dyeHex ? encodeURIComponent(resolved.dyeHex) : "",
        dye_label: resolved.dyeLabel ? encodeURIComponent(resolved.dyeLabel) : "",
        dyeing_cost_pkr: resolved.dyeingCostPkr ? encodeURIComponent(resolved.dyeingCostPkr) : "",

        // ✅ keep tailoring forward too (and its selection flag)
        tailoring_available:
          resolved.tailoringAvailable === true ? "1" : resolved.tailoringAvailable === false ? "0" : "",
        tailoring_selected: resolved.tailoringSelected ? "1" : "0",
        tailoring_cost_pkr: resolved.tailoringCostPkr ? encodeURIComponent(resolved.tailoringCostPkr) : "",
        tailoring_turnaround_days: resolved.tailoringTurnaroundDays
          ? encodeURIComponent(resolved.tailoringTurnaroundDays)
          : ""
      }
    });
  };

  const goToPayment = () => {
    router.push({
      pathname: "/purchase/payment",
      params: {
        productId: resolved.id || base.productId,
        productCode: resolved.code || base.productCode,
        productName: resolved.title,

        // ✅ keep dress category flowing
        product_category: params.product_category ? String(params.product_category) : "",

        // ✅ IMPORTANT: send payable total (base + dyeing + tailoring)
        price: String(priceCalc.totalPayable || 0),

        currency: resolved.currency,
        imageUrl: resolved.imageUrl,

        vendorName: resolved.vendorName,
        vendorMobile: resolved.vendorMobile,
        vendorAddress: resolved.vendorAddress,

        mode: base.mode,
        selectedSize: base.selectedSize,
        ...base.letters,

        // ✅ dyeing goes to payment so it can be saved into order snapshot
        dyeing_selected: resolved.dyeingSelected ? "1" : "0",
        dye_shade_id: resolved.dyeShadeId ? encodeURIComponent(resolved.dyeShadeId) : "",
        dye_hex: resolved.dyeHex ? encodeURIComponent(resolved.dyeHex) : "",
        dye_label: resolved.dyeLabel ? encodeURIComponent(resolved.dyeLabel) : "",
        dyeing_cost_pkr: resolved.dyeingCostPkr ? encodeURIComponent(resolved.dyeingCostPkr) : "",

        // ✅ tailoring goes to payment so it can be saved into order snapshot
        tailoring_available:
          resolved.tailoringAvailable === true ? "1" : resolved.tailoringAvailable === false ? "0" : "",
        tailoring_selected: resolved.tailoringSelected ? "1" : "0",
        tailoring_cost_pkr: resolved.tailoringCostPkr ? encodeURIComponent(resolved.tailoringCostPkr) : "",
        tailoring_turnaround_days: resolved.tailoringTurnaroundDays
          ? encodeURIComponent(resolved.tailoringTurnaroundDays)
          : "",

        buyerName: buyerName.trim(),
        buyerMobile: buyerMobile.trim(),
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        notes: notes.trim()
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Place Order</Text>

        {loadingProduct ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.helper}>Loading product details…</Text>
          </View>
        ) : null}

        {/* Product */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Product</Text>

          <View style={styles.productRow}>
            <View style={styles.imageBox}>
              {resolved.imageUrl ? (
                <Image source={{ uri: resolved.imageUrl }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No Image</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.productName} numberOfLines={2}>
                {resolved.title}
              </Text>

              <Text style={styles.meta}>
                Code: <Text style={styles.metaStrong}>{resolved.code || "—"}</Text>
              </Text>

              {/* ✅ changed: show Dress Cat */}
              <Text style={styles.meta}>
                Dress Cat:{" "}
                <Text style={styles.metaStrong}>
                  {params.product_category
                    ? String(params.product_category)
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : "—"}
                </Text>
              </Text>

              <Text style={styles.meta}>
                Price:{" "}
                <Text style={styles.metaStrong}>
                  {resolved.priceParam
                    ? `${resolved.currency} ${resolved.priceText}`
                    : `${resolved.currency} —`}
                </Text>
              </Text>

              {/* ✅ Dyeing cost line (only if dyeing selected) */}
              {priceCalc.hasDyeing ? (
                <Text style={styles.meta}>
                  Dyeing:{" "}
                  <Text style={styles.metaStrong}>
                    {resolved.currency} {priceCalc.dyeAdd}
                  </Text>
                </Text>
              ) : null}

              {/* ✅ Tailoring cost line (only if tailoring selected) */}
              {priceCalc.hasTailoring ? (
                <Text style={styles.meta}>
                  Tailoring:{" "}
                  <Text style={styles.metaStrong}>
                    {resolved.currency} {priceCalc.tailoringAdd}
                    {resolved.tailoringTurnaroundDays ? ` • ${resolved.tailoringTurnaroundDays} days` : ""}
                  </Text>
                </Text>
              ) : null}

              {/* ✅ Total payable */}
              {resolved.priceParam ? (
                <Text style={styles.meta}>
                  Total Payable:{" "}
                  <Text style={styles.metaStrong}>
                    {resolved.currency} {priceCalc.totalPayable}
                  </Text>
                </Text>
              ) : null}

              {/* ✅ Selected Colour (preview only) */}
              {!!resolved.dyeHex && priceCalc.hasDyeing ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.meta}>Selected Colour for Dyeing</Text>

                  <View
                    style={{
                      marginTop: 8,
                      width: 60,
                      height: 60,
                      borderRadius: 14,
                      backgroundColor: resolved.dyeHex,
                      borderWidth: 1,
                      borderColor: "#CBD5E1"
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Size</Text>
          <Text style={styles.metaStrong}>{base.sizeLabel}</Text>

          {base.mode === "exact" && base.exactPairs.length ? (
            <View style={styles.pillsWrap}>
              {base.exactPairs.map(([k, v]) => (
                <View key={k} style={styles.pill}>
                  <Text style={styles.pillText}>
                    {k}: {v}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={goChangeSize}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Change Size</Text>
          </Pressable>
        </View>

        {/* Vendor */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vendor</Text>

          {!!resolved.vendorBanner && (
            <View style={styles.vendorBannerWrap}>
              <Image source={{ uri: resolved.vendorBanner }} style={styles.vendorBanner} />
            </View>
          )}

          <Text style={styles.meta}>
            Shop/Name: <Text style={styles.metaStrong}>{resolved.vendorName}</Text>
          </Text>

          {!!resolved.vendorMobile && (
            <Text style={styles.meta}>
              Mobile: <Text style={styles.metaStrong}>{resolved.vendorMobile}</Text>
            </Text>
          )}

          {!!resolved.vendorAddress && (
            <Text style={styles.meta}>
              Address: <Text style={styles.metaStrong}>{resolved.vendorAddress}</Text>
            </Text>
          )}

          {!!resolved.vendorStatus && (
            <Text style={styles.meta}>
              Status: <Text style={styles.metaStrong}>{resolved.vendorStatus}</Text>
            </Text>
          )}

          {!vendor ? (
            <Text style={styles.helper}>
              Vendor redux state is missing, so vendor info is coming from the product JOIN fallback.
            </Text>
          ) : null}
        </View>

        {/* Delivery */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery details</Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="e.g., Arif Nawaz Khan"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.fieldLabel}>Mobile</Text>
          <TextInput
            value={buyerMobile}
            onChangeText={setBuyerMobile}
            placeholder="e.g., 03XXXXXXXXX"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.fieldLabel}>Delivery Address</Text>
          <TextInput
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="House / Street / Area"
            style={[styles.input, styles.multiline]}
            multiline
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.fieldLabel}>City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="e.g., Lahore"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions"
            style={[styles.input, styles.multiline]}
            multiline
            placeholderTextColor="#9CA3AF"
          />

          <Pressable
            onPress={() => {
              if (!canContinue) return;
              goToPayment();
            }}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canContinue && styles.disabledBtn,
              pressed && canContinue && styles.pressed
            ]}
          >
            <Text style={styles.primaryText}>Continue to Payment</Text>
          </Pressable>

          {!canContinue ? (
            <Text style={styles.helper}>Fill name, mobile, address, and city to continue.</Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16, gap: 12 },

  title: { fontSize: 22, fontWeight: "900", color: "#111" },

  loadingRow: { flexDirection: "row", gap: 10, alignItems: "center" },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 10
  },

  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111" },

  productRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  imageBox: {
    width: 86,
    height: 86,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6"
  },
  imagePlaceholderText: { fontSize: 12, color: "#6B7280", fontWeight: "800" },

  productName: { fontSize: 15, fontWeight: "900", color: "#111" },

  meta: { fontSize: 12, color: "#374151", fontWeight: "700" },
  metaStrong: { fontSize: 12, color: "#111", fontWeight: "900" },

  divider: { height: 1, backgroundColor: "#E5E7EB" },

  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F9FAFB"
  },
  pillText: { fontSize: 12, color: "#111", fontWeight: "900" },

  vendorBannerWrap: {
    width: "100%",
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6"
  },
  vendorBanner: { width: "100%", height: "100%" },

  fieldLabel: { fontSize: 12, color: "#6B7280", fontWeight: "900", marginTop: 2 },
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
  multiline: { minHeight: 44, textAlignVertical: "top" },

  primaryBtn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#111",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    marginTop: 2
  },
  secondaryText: { color: "#111", fontWeight: "900", fontSize: 14 },

  disabledBtn: { opacity: 0.45 },

  helper: { fontSize: 12, color: "#6B7280", fontWeight: "700" },

  backBtn: { paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  backText: { color: "#111", fontWeight: "900", textDecorationLine: "underline" },

  pressed: { opacity: 0.85 }
});