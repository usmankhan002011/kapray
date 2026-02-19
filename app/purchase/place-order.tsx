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

  a?: string; b?: string; c?: string; d?: string; e?: string; f?: string; g?: string;
  h?: string; i?: string; j?: string; k?: string; l?: string; m?: string; n?: string;

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
      a: norm(params.a), b: norm(params.b), c: norm(params.c), d: norm(params.d),
      e: norm(params.e), f: norm(params.f), g: norm(params.g), h: norm(params.h),
      i: norm(params.i), j: norm(params.j), k: norm(params.k), l: norm(params.l),
      m: norm(params.m), n: norm(params.n)
    };

    const exactPairs: Array<[string, string]> = [
      ["A", letters.a], ["B", letters.b], ["C", letters.c], ["D", letters.d],
      ["E", letters.e], ["F", letters.f], ["G", letters.g], ["H", letters.h],
      ["I", letters.i], ["J", letters.j], ["K", letters.k], ["L", letters.l],
      ["M", letters.m], ["N", letters.n]
    ].filter((pair) => {
      const v = pair[1];
      return typeof v === "string" && v.length > 0;
    });

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
      imageUrl
    };
  }, [params]);

  // fetched fallback (when details were not forwarded)
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [fetchedProduct, setFetchedProduct] = useState<ProductRow | null>(null);

  const loadProductIfNeeded = useCallback(async () => {
    const shouldFetch =
      (!!base.productId || !!base.productCode) &&
      (!base.productName || !base.imageUrl || !base.price);

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

    const vendorBanner =
      norm(vendor?.banner_url) ||
      resolvePublicUrl(vJoin?.banner_path) ||
      "";

    const vendorStatus = firstNonEmpty(vendor?.status, vJoin?.status);

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
      vendorStatus
    };
  }, [base, fetchedProduct, vendor, params.vendorName, params.vendorMobile, params.vendorAddress]);

  // buyer / delivery fields
  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const canContinue =
    buyerName.trim().length >= 2 &&
    buyerMobile.trim().length >= 10 &&
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

        // keep forwarding so it’s instant next time
        productName: resolved.title,
        price: resolved.priceParam,
        currency: resolved.currency,
        imageUrl: resolved.imageUrl
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
        price: resolved.priceParam,
        currency: resolved.currency,
        imageUrl: resolved.imageUrl,

        vendorName: resolved.vendorName,
        vendorMobile: resolved.vendorMobile,
        vendorAddress: resolved.vendorAddress,

        mode: base.mode,
        selectedSize: base.selectedSize,
        ...base.letters,

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

              {/* ✅ changed: show Dress Title instead of an ID/dressType */}
              <Text style={styles.meta}>
                Dress Title: <Text style={styles.metaStrong}>{resolved.title || "—"}</Text>
              </Text>

              <Text style={styles.meta}>
                Price:{" "}
                <Text style={styles.metaStrong}>
                  {resolved.priceParam ? `${resolved.currency} ${resolved.priceText}` : `${resolved.currency} —`}
                </Text>
              </Text>
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

          <Pressable onPress={goChangeSize} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
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
            onPress={goToPayment}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canContinue && styles.disabledBtn,
              pressed && canContinue && styles.pressed
            ]}
          >
            <Text style={styles.primaryText}>Continue to Payment</Text>
          </Pressable>

          {!canContinue ? <Text style={styles.helper}>Fill name, mobile, address, and city to continue.</Text> : null}
        </View>

        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
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
  imageBox: { width: 86, height: 86, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" },
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

  primaryBtn: { backgroundColor: "#111", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 6 },
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
