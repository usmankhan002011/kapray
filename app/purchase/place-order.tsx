// File: app/purchase/place-order.tsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { supabase } from "@/utils/supabase/client";
import { getDeliveryCost } from "@/utils/kapray/delivery";

const BUCKET_VENDOR = "vendor_images";

type Params = {
  productId?: string;
  product_id?: string;
  productCode?: string;
  product_code?: string;

  mode?: string;
  selectedSize?: string;
  selected_unstitched_size?: string;
  selected_fabric_length_m?: string;
  fabric_cost_pkr?: string;

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
  o?: string;

  product_category?: string;

  productName?: string;
  product_name?: string;
  price?: string;
  price_per_meter_pkr?: string;
  stitched_total_pkr?: string;
  currency?: string;
  imageUrl?: string;
  image_url?: string;

  vendorName?: string;
  vendorMobile?: string;
  vendorAddress?: string;

  dye_shade_id?: string;
  dye_hex?: string;
  dye_label?: string;
  dyeing_cost_pkr?: string;
  dyeing_selected?: string;
  dyeing_available?: string;

  tailoring_cost_pkr?: string;
  tailoring_turnaround_days?: string;
  tailoring_selected?: string;
  tailoring_available?: string;

  selected_tailoring_style_id?: string;
  selected_tailoring_style_title?: string;
  selected_tailoring_style_image?: string;
  selected_tailoring_style_snapshot?: string;

  selected_neck_variation?: string;
  selected_sleeve_variation?: string;
  selected_trouser_variation?: string;

  custom_tailoring_note?: string;
  tailoring_style_extra_cost_pkr?: string;

  exports_enabled?: string;
  export_regions?: string;
  weight_kg?: string;
  package_cm?: string;
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
  exports_enabled?: boolean | null;
  export_regions?: unknown[] | null;
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
  exports_enabled?: boolean | null;
  export_regions?: unknown[] | null;
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

const PAKISTAN_CITY_OPTIONS = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Hyderabad",
  "Quetta",
  "Sialkot",
];

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
  if (s === "1" || s === "true" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n" || s === "off") return false;
  return null;
}

function resolvePublicUrl(path: string | null | undefined) {
  const p = norm(path);
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(p);
  return data?.publicUrl ?? "";
}

function prettyCategory(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function joinRegions(list?: unknown[] | null) {
  return Array.isArray(list) && list.length ? list.map((x) => String(x)).join(", ") : "";
}

function inferCityFromAddress(address: string) {
  const a = address.toLowerCase();
  const match = PAKISTAN_CITY_OPTIONS.find((c) => a.includes(c.toLowerCase()));
  return match || "";
}

function buildFullAddress(args: {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}) {
  const address = norm(args.address);
  const city = norm(args.city);
  const postalCode = norm(args.postalCode);
  const country = norm(args.country);

  const cityLine = [city, postalCode].filter(Boolean).join(" ");
  return [address, cityLine, country].filter(Boolean).join(", ");
}

function computeDeliveryCostSafe(args: {
  destinationType: "inland" | "export";
  city: string;
  exportRegion: string;
  weightKg: number;
  packageCm?: Record<string, unknown> | null;
}) {
  const { destinationType, city, exportRegion, weightKg, packageCm } = args;
  if (weightKg <= 0) return 0;

  try {
    const raw = getDeliveryCost({
      weightKg,
      packageCm: packageCm ?? undefined,
      scope: destinationType === "export" ? "international" : "inland",
      regionOrCity: destinationType === "export" ? exportRegion : city,
    } as any);

    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function cleanVariationLabel(value: string, kind: "neck" | "sleeve") {
  if (!value) return "";
  const pattern = kind === "neck" ? /\bneck\b/gi : /\bsleeve\b/gi;
  return value.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
}

export default function PlaceOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const vendor = useSelector((s: any) => (s?.vendor ?? null)) as VendorState | null;

  const base = useMemo(() => {
    const productId = firstNonEmpty(params.productId, params.product_id);
    const productCode = firstNonEmpty(params.productCode, params.product_code);

    const mode = firstNonEmpty(params.mode) || "standard";
    const selectedSize = firstNonEmpty(params.selectedSize);
    const selectedUnstitchedSize = safeDecode(params.selected_unstitched_size);
    const selectedFabricLengthM = safePositiveNumber(safeDecode(params.selected_fabric_length_m));
    const fabricCostPkr = safePositiveNumber(params.fabric_cost_pkr);

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
      n: norm(params.n),
      o: norm(params.o),
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
      ["N", letters.n],
      ["O", letters.o],
    ].filter((pair): pair is [string, string] => typeof pair[1] === "string" && pair[1].length > 0);

    const sizeLabel =
      mode === "exact"
        ? exactPairs.length
          ? "Exact Measurements"
          : "Exact Measurements (Not set)"
        : selectedSize
          ? `Standard Size: ${selectedSize}`
          : selectedUnstitchedSize
            ? `Standard Size: ${selectedUnstitchedSize}`
            : "Standard Size (Not set)";

    const selectedTailoringStyleId = safeDecode(firstNonEmpty(params.selected_tailoring_style_id));
    const selectedTailoringStyleTitle = safeDecode(
      firstNonEmpty(params.selected_tailoring_style_title),
    );
    const selectedTailoringStyleImage = safeDecode(
      firstNonEmpty(params.selected_tailoring_style_image),
    );

    const selectedTailoringStyleSnapshot = safeJsonDecode<SelectedTailoringStyleSnapshot | null>(
      params.selected_tailoring_style_snapshot,
      null,
    );

    const selectedNeckVariation =
      safeDecode(firstNonEmpty(params.selected_neck_variation)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.selected_neck_variation));

    const selectedSleeveVariation =
      safeDecode(firstNonEmpty(params.selected_sleeve_variation)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.selected_sleeve_variation));

    const selectedTrouserVariation =
      safeDecode(firstNonEmpty(params.selected_trouser_variation)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.selected_trouser_variation));

    const customTailoringNote =
      safeDecode(firstNonEmpty(params.custom_tailoring_note)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.custom_note));

    const styleExtraCostPkr = safePositiveNumber(
      safeDecode(firstNonEmpty(params.tailoring_style_extra_cost_pkr)) ||
        (selectedTailoringStyleSnapshot as any)?.extra_cost_pkr,
    );

    return {
      productId,
      productCode,
      mode,
      selectedSize,
      selectedUnstitchedSize,
      selectedFabricLengthM,
      fabricCostPkr,
      exactPairs,
      letters,

      productName: firstNonEmpty(params.productName, params.product_name),
      productCategory: norm(params.product_category),
      priceParam: norm(params.price),
      pricePerMeterPkr: safePositiveNumber(params.price_per_meter_pkr),
      stitchedTotalPkr: safePositiveNumber(params.stitched_total_pkr),
      currency: firstNonEmpty(params.currency) || "PKR",
      imageUrl: firstNonEmpty(params.imageUrl, params.image_url),

      dyeShadeId: safeDecode(firstNonEmpty(params.dye_shade_id)),
      dyeHex: safeDecode(firstNonEmpty(params.dye_hex)),
      dyeLabel: safeDecode(firstNonEmpty(params.dye_label)),
      dyeingCostPkr: safePositiveNumber(safeDecode(firstNonEmpty(params.dyeing_cost_pkr))),
      dyeingSelected: parseBoolParam(params.dyeing_selected),
      dyeingAvailable: parseBoolParam(params.dyeing_available),

      tailoringCostPkr: safePositiveNumber(safeDecode(firstNonEmpty(params.tailoring_cost_pkr))),
      tailoringTurnaroundDays: safePositiveNumber(
        safeDecode(firstNonEmpty(params.tailoring_turnaround_days)),
      ),
      tailoringSelected: parseBoolParam(params.tailoring_selected),
      tailoringAvailable: parseBoolParam(params.tailoring_available),

      selectedTailoringStyleId,
      selectedTailoringStyleTitle:
        selectedTailoringStyleTitle ||
        safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.title)),
      selectedTailoringStyleImage:
        selectedTailoringStyleImage ||
        safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.image_url)),
      selectedTailoringStyleSnapshot,
      selectedNeckVariation,
      selectedSleeveVariation,
      selectedTrouserVariation,
      customTailoringNote,
      styleExtraCostPkr,

      exportsEnabledParam: parseBoolParam(params.exports_enabled),
      exportRegionsParam: safeJsonDecode<string[]>(params.export_regions, []),
      weightKg: safePositiveNumber(params.weight_kg),
      packageCm: safeJsonDecode<Record<string, unknown> | null>(params.package_cm, null),

      sizeLabel,
    };
  }, [params]);

  const [loadingProduct, setLoadingProduct] = useState(false);
  const [fetchedProduct, setFetchedProduct] = useState<ProductRow | null>(null);

  const loadProductIfNeeded = useCallback(async () => {
    const shouldFetch =
      (!!base.productId || !!base.productCode) && (!base.productName || !base.imageUrl);

    if (!shouldFetch) return;

    try {
      setLoadingProduct(true);

      let q = supabase
        .from("products")
        .select(`
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
            status,
            exports_enabled,
            export_regions
          )
        `);

      const numericProductId = Number(base.productId);

      if (Number.isFinite(numericProductId)) q = q.eq("id", numericProductId);
      else if (base.productCode) q = q.eq("product_code", base.productCode);

      const { data, error } = await q.single();
      if (!error) setFetchedProduct(data as any);
    } finally {
      setLoadingProduct(false);
    }
  }, [base.productId, base.productCode, base.productName, base.imageUrl]);

  useEffect(() => {
    loadProductIfNeeded();
  }, [loadProductIfNeeded]);

  const resolved = useMemo(() => {
    const fp = fetchedProduct;
    const title = base.productName || norm(fp?.title) || "Product";
    const code = base.productCode || norm(fp?.product_code) || "";
    const id = base.productId || norm(fp?.id) || "";

    const media = fp?.media ?? {};
    const imagePath = media?.images?.[0] ?? "";
    const imageUrl = base.imageUrl || resolvePublicUrl(imagePath) || "";

    const vJoin = fp?.vendor ?? null;

    const vendorName =
      firstNonEmpty(
        params.vendorName,
        vendor?.shop_name,
        vendor?.owner_name,
        vJoin?.shop_name,
        vJoin?.name,
      ) || "Vendor";

    const vendorMobile = firstNonEmpty(params.vendorMobile, vendor?.mobile, vJoin?.mobile);
    const vendorAddress = firstNonEmpty(params.vendorAddress, vendor?.address, vJoin?.address);
    const vendorBanner = norm(vendor?.banner_url) || resolvePublicUrl(vJoin?.banner_path) || "";
    const vendorStatus = firstNonEmpty(vendor?.status, vJoin?.status);

    const exportsEnabled = Boolean(
      base.exportsEnabledParam ??
        vendor?.exports_enabled ??
        (vJoin as any)?.exports_enabled ??
        false,
    );

    const exportRegions =
      base.exportRegionsParam?.length
        ? base.exportRegionsParam
        : ((vendor?.export_regions as unknown[] | null | undefined) ??
            ((vJoin as any)?.export_regions ?? []));

    const isUnstitched =
      base.productCategory === "unstitched_plain" ||
      base.productCategory === "unstitched_dyeing" ||
      base.productCategory === "unstitched_dyeing_tailoring";

    const totalProductCostPkr = isUnstitched
      ? base.fabricCostPkr
      : base.stitchedTotalPkr || safePositiveNumber(base.priceParam);

    const hasDyeing =
      Boolean(base.dyeingSelected) &&
      (Boolean(base.dyeHex) || Boolean(base.dyeShadeId) || Boolean(base.dyeLabel));

    const hasTailoring = Boolean(base.tailoringSelected) && base.tailoringCostPkr > 0;
    const hasStyleSelected =
      hasTailoring &&
      (Boolean(base.selectedTailoringStyleId) ||
        Boolean(base.selectedTailoringStyleTitle) ||
        Boolean(base.selectedTailoringStyleSnapshot));

    return {
      id,
      code,
      title,
      imageUrl,
      vendorName,
      vendorMobile,
      vendorAddress,
      vendorBanner,
      vendorStatus,
      exportsEnabled,
      exportRegions,
      isUnstitched,
      totalProductCostPkr,
      hasDyeing,
      hasTailoring,
      hasStyleSelected,
    };
  }, [base, fetchedProduct, params.vendorAddress, params.vendorMobile, params.vendorName, vendor]);

  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [notes, setNotes] = useState("");

  const [destinationType, setDestinationType] = useState<"inland" | "export">("inland");
  const [exportRegion, setExportRegion] = useState("");

  const exportRegionList = useMemo(() => {
    return Array.isArray(resolved.exportRegions)
      ? resolved.exportRegions.map((x) => String(x))
      : [];
  }, [resolved.exportRegions]);

  useEffect(() => {
    if (destinationType !== "inland") return;
    if (country !== "Pakistan") setCountry("Pakistan");
  }, [destinationType, country]);

  useEffect(() => {
    if (destinationType !== "inland") return;
    if (city.trim()) return;
    const inferred = inferCityFromAddress(deliveryAddress);
    if (inferred) setCity(inferred);
  }, [deliveryAddress, destinationType, city]);

  const fullAddressPreview = useMemo(() => {
    return buildFullAddress({
      address: deliveryAddress,
      city,
      postalCode,
      country: destinationType === "inland" ? "Pakistan" : country,
    });
  }, [deliveryAddress, city, postalCode, country, destinationType]);

  const deliveryCostPkr = useMemo(() => {
    return computeDeliveryCostSafe({
      destinationType,
      city: city.trim(),
      exportRegion: exportRegion.trim(),
      weightKg: base.weightKg,
      packageCm: base.packageCm,
    });
  }, [base.packageCm, base.weightKg, city, destinationType, exportRegion]);

  const subtotalBeforeDeliveryPkr = useMemo(() => {
  return Math.round(
    resolved.totalProductCostPkr +
      (resolved.hasDyeing ? base.dyeingCostPkr : 0) +
      (resolved.hasTailoring ? base.tailoringCostPkr : 0) +
      (base.styleExtraCostPkr > 0 ? base.styleExtraCostPkr : 0)
  );
}, [
  base.dyeingCostPkr,
  base.tailoringCostPkr,
  base.styleExtraCostPkr,
  resolved.totalProductCostPkr,
  resolved.hasDyeing,
  resolved.hasTailoring,
]);

  const grandTotalPkr = useMemo(() => {
    return Math.round(subtotalBeforeDeliveryPkr + deliveryCostPkr);
  }, [subtotalBeforeDeliveryPkr, deliveryCostPkr]);

  const courierSummary = useMemo(() => {
    if (!base.weightKg) return "Shipping weight is not available yet.";
    if (destinationType === "export") {
      if (!exportRegion.trim()) return "Select export region to calculate courier.";
      return deliveryCostPkr > 0
        ? `Export courier: PKR ${deliveryCostPkr}`
        : `Export courier could not be calculated for ${exportRegion}.`;
    }
    if (!city.trim()) return "Select or enter city to calculate delivery.";
    return deliveryCostPkr > 0
      ? `Inland delivery: PKR ${deliveryCostPkr}`
      : `Delivery could not be calculated for ${city}.`;
  }, [base.weightKg, city, deliveryCostPkr, destinationType, exportRegion]);

  const canContinue =
    buyerName.trim().length >= 2 &&
    buyerMobile.trim().replace(/\D/g, "").length >= 10 &&
    deliveryAddress.trim().length >= 10 &&
    city.trim().length >= 2 &&
    (destinationType === "inland"
      ? true
      : country.trim().length >= 2 && resolved.exportsEnabled && exportRegion.trim().length >= 2);

  const goChangeSize = () => {
    router.push({
      pathname: "/purchase/size",
      params: {
        returnTo: "/purchase/place-order",
        productId: resolved.id || base.productId,
        productCode: resolved.code || base.productCode,
        productName: resolved.title,
        product_category: base.productCategory,
        currency: base.currency,
        imageUrl: resolved.imageUrl,

        price_per_meter_pkr: base.pricePerMeterPkr ? String(base.pricePerMeterPkr) : "",
        stitched_total_pkr: base.stitchedTotalPkr ? String(base.stitchedTotalPkr) : "",
        price: base.priceParam,

        selectedSize: base.selectedSize,
        selected_unstitched_size: base.selectedUnstitchedSize
          ? encodeURIComponent(base.selectedUnstitchedSize)
          : "",
        selected_fabric_length_m: base.selectedFabricLengthM
          ? encodeURIComponent(String(base.selectedFabricLengthM))
          : "",
        fabric_cost_pkr: base.fabricCostPkr ? String(base.fabricCostPkr) : "",

        mode: base.mode,
        ...base.letters,

        dyeing_available:
          base.dyeingAvailable === true ? "1" : base.dyeingAvailable === false ? "0" : "",
        dyeing_selected: base.dyeingSelected ? "1" : "0",
        dye_shade_id: base.dyeShadeId ? encodeURIComponent(base.dyeShadeId) : "",
        dye_hex: base.dyeHex ? encodeURIComponent(base.dyeHex) : "",
        dye_label: base.dyeLabel ? encodeURIComponent(base.dyeLabel) : "",
        dyeing_cost_pkr: base.dyeingCostPkr ? encodeURIComponent(String(base.dyeingCostPkr)) : "",

        tailoring_available:
          base.tailoringAvailable === true ? "1" : base.tailoringAvailable === false ? "0" : "",
        tailoring_selected: base.tailoringSelected ? "1" : "0",
        tailoring_cost_pkr: base.tailoringCostPkr
          ? encodeURIComponent(String(base.tailoringCostPkr))
          : "",
        tailoring_turnaround_days: base.tailoringTurnaroundDays
          ? encodeURIComponent(String(base.tailoringTurnaroundDays))
          : "",

        selected_tailoring_style_id: base.selectedTailoringStyleId
          ? encodeURIComponent(base.selectedTailoringStyleId)
          : "",
        selected_tailoring_style_title: base.selectedTailoringStyleTitle
          ? encodeURIComponent(base.selectedTailoringStyleTitle)
          : "",
        selected_tailoring_style_image: base.selectedTailoringStyleImage
          ? encodeURIComponent(base.selectedTailoringStyleImage)
          : "",
        selected_tailoring_style_snapshot: base.selectedTailoringStyleSnapshot
          ? encodeURIComponent(JSON.stringify(base.selectedTailoringStyleSnapshot))
          : "",
        selected_neck_variation: base.selectedNeckVariation
          ? encodeURIComponent(base.selectedNeckVariation)
          : "",
        selected_sleeve_variation: base.selectedSleeveVariation
          ? encodeURIComponent(base.selectedSleeveVariation)
          : "",
        selected_trouser_variation: base.selectedTrouserVariation
          ? encodeURIComponent(base.selectedTrouserVariation)
          : "",
        custom_tailoring_note: base.customTailoringNote
          ? encodeURIComponent(base.customTailoringNote)
          : "",
        tailoring_style_extra_cost_pkr:
          base.styleExtraCostPkr > 0 ? encodeURIComponent(String(base.styleExtraCostPkr)) : "",

        exports_enabled: resolved.exportsEnabled ? "1" : "0",
        export_regions: exportRegionList.length
          ? encodeURIComponent(JSON.stringify(exportRegionList))
          : "",
        weight_kg: base.weightKg ? String(base.weightKg) : "",
        package_cm: base.packageCm ? encodeURIComponent(JSON.stringify(base.packageCm)) : "",
      },
    });
  };

  const goToPayment = () => {
    router.push({
      pathname: "/purchase/payment",
      params: {
        productId: resolved.id || base.productId,
        productCode: resolved.code || base.productCode,
        productName: resolved.title,
        product_category: base.productCategory,

        currency: base.currency,
        imageUrl: resolved.imageUrl,

        price_per_meter_pkr: base.pricePerMeterPkr ? String(base.pricePerMeterPkr) : "",
        stitched_total_pkr: base.stitchedTotalPkr ? String(base.stitchedTotalPkr) : "",
        base_product_cost_pkr: String(resolved.totalProductCostPkr || 0),
        fabric_cost_pkr: base.fabricCostPkr ? String(base.fabricCostPkr) : "",
        selected_fabric_length_m: base.selectedFabricLengthM
          ? encodeURIComponent(String(base.selectedFabricLengthM))
          : "",

        subtotal_before_delivery_pkr: String(subtotalBeforeDeliveryPkr || 0),
        delivery_cost_pkr: String(deliveryCostPkr || 0),
        price: String(grandTotalPkr || 0),

        vendorName: resolved.vendorName,
        vendorMobile: resolved.vendorMobile,
        vendorAddress: resolved.vendorAddress,

        mode: base.mode,
        selectedSize: base.selectedSize,
        selected_unstitched_size: base.selectedUnstitchedSize
          ? encodeURIComponent(base.selectedUnstitchedSize)
          : "",
        ...base.letters,

        destination_type: destinationType,
        export_region:
          destinationType === "export" && exportRegion ? encodeURIComponent(exportRegion) : "",
        postal_code: postalCode ? encodeURIComponent(postalCode.trim()) : "",
        country: encodeURIComponent(
          (destinationType === "inland" ? "Pakistan" : country).trim(),
        ),
        weight_kg: base.weightKg ? String(base.weightKg) : "",

        dyeing_selected: resolved.hasDyeing ? "1" : "0",
        dye_shade_id: base.dyeShadeId ? encodeURIComponent(base.dyeShadeId) : "",
        dye_hex: base.dyeHex ? encodeURIComponent(base.dyeHex) : "",
        dye_label: base.dyeLabel ? encodeURIComponent(base.dyeLabel) : "",
        dyeing_cost_pkr: resolved.hasDyeing ? encodeURIComponent(String(base.dyeingCostPkr)) : "",

        tailoring_available:
          base.tailoringAvailable === true ? "1" : base.tailoringAvailable === false ? "0" : "",
        tailoring_selected: resolved.hasTailoring ? "1" : "0",
        tailoring_cost_pkr: resolved.hasTailoring
          ? encodeURIComponent(String(base.tailoringCostPkr))
          : "",
        tailoring_turnaround_days: base.tailoringTurnaroundDays
          ? encodeURIComponent(String(base.tailoringTurnaroundDays))
          : "",

        selected_tailoring_style_id: base.selectedTailoringStyleId
          ? encodeURIComponent(base.selectedTailoringStyleId)
          : "",
        selected_tailoring_style_title: base.selectedTailoringStyleTitle
          ? encodeURIComponent(base.selectedTailoringStyleTitle)
          : "",
        selected_tailoring_style_image: base.selectedTailoringStyleImage
          ? encodeURIComponent(base.selectedTailoringStyleImage)
          : "",
        selected_tailoring_style_snapshot: base.selectedTailoringStyleSnapshot
          ? encodeURIComponent(JSON.stringify(base.selectedTailoringStyleSnapshot))
          : "",
        selected_neck_variation: base.selectedNeckVariation
          ? encodeURIComponent(base.selectedNeckVariation)
          : "",
        selected_sleeve_variation: base.selectedSleeveVariation
          ? encodeURIComponent(base.selectedSleeveVariation)
          : "",
        selected_trouser_variation: base.selectedTrouserVariation
          ? encodeURIComponent(base.selectedTrouserVariation)
          : "",
        custom_tailoring_note: base.customTailoringNote
          ? encodeURIComponent(base.customTailoringNote)
          : "",
        tailoring_style_extra_cost_pkr:
          base.styleExtraCostPkr > 0 ? encodeURIComponent(String(base.styleExtraCostPkr)) : "",

        buyerName: buyerName.trim(),
        buyerMobile: buyerMobile.trim(),
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        notes: notes.trim(),
      },
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

            <View style={styles.productMetaWrap}>
              <Text style={styles.productName} numberOfLines={2}>
                {resolved.title}
              </Text>

              <Text style={styles.meta}>
                Code: <Text style={styles.metaStrong}>{resolved.code || "—"}</Text>
              </Text>

              <Text style={styles.meta}>
                Dress Cat:{" "}
                <Text style={styles.metaStrong}>
                  {base.productCategory ? prettyCategory(base.productCategory) : "—"}
                </Text>
              </Text>

              {resolved.isUnstitched ? (
                <>
                  {!!base.selectedUnstitchedSize && (
                    <Text style={styles.meta}>
                      Size: <Text style={styles.metaStrong}>{base.selectedUnstitchedSize}</Text>
                    </Text>
                  )}

                  {!!base.pricePerMeterPkr && (
                    <Text style={styles.meta}>
                      Cost per Meter:{" "}
                      <Text style={styles.metaStrong}>
                        {base.currency} {base.pricePerMeterPkr}
                      </Text>
                    </Text>
                  )}

                  {!!base.selectedFabricLengthM && (
                    <Text style={styles.meta}>
                      Total Fabric Length:{" "}
                      <Text style={styles.metaStrong}>{base.selectedFabricLengthM} meter(s)</Text>
                    </Text>
                  )}
                <Text style={styles.meta}>
                  Total Fabric Cost:{" "}
                  <Text style={styles.metaStrong}>
                    {base.currency} {Math.round(base.fabricCostPkr || 0)}
                  </Text>
                </Text>
                </>
              ) : (
                <Text style={styles.meta}>
                  Total Product Cost:{" "}
                  <Text style={styles.metaStrong}>
                    {base.currency} {resolved.totalProductCostPkr || 0}
                  </Text>
                </Text>
              )}

              {!!base.dyeHex && resolved.hasDyeing ? (
                <View style={styles.dyePreviewWrap}>
                  <Text style={styles.meta}>Selected Colour</Text>
                  <View style={[styles.dyeSwatch, { backgroundColor: base.dyeHex }]} />
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

          <Text style={styles.meta}>
            Exports:{" "}
            <Text style={styles.metaStrong}>{resolved.exportsEnabled ? "Yes" : "No"}</Text>
          </Text>

          {resolved.exportsEnabled && exportRegionList.length ? (
            <Text style={styles.meta}>
              Export Regions: <Text style={styles.metaStrong}>{joinRegions(exportRegionList)}</Text>
            </Text>
          ) : null}
        </View>

        {resolved.hasTailoring && resolved.hasStyleSelected ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Selected Tailoring Style</Text>

            {!!base.selectedTailoringStyleImage ? (
              <View style={styles.tailoringImageWrap}>
                <Image
                  source={{ uri: base.selectedTailoringStyleImage }}
                  style={styles.tailoringImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <Text style={styles.meta}>
              Style:{" "}
              <Text style={styles.metaStrong}>
                {base.selectedTailoringStyleTitle || "Selected style"}
              </Text>
            </Text>

            {base.selectedNeckVariation === "no change in selected style" ? (
              <Text style={styles.meta}>
                <Text style={styles.metaStrong}>No change in selected style</Text>
              </Text>
            ) : (
              <>
                {!!base.selectedNeckVariation && (
                  <Text style={styles.meta}>
                    Neck:{" "}
                    <Text style={styles.metaStrong}>
                      {cleanVariationLabel(base.selectedNeckVariation, "neck")}
                    </Text>
                  </Text>
                )}

                {!!base.selectedSleeveVariation && (
                  <Text style={styles.meta}>
                    Sleeve:{" "}
                    <Text style={styles.metaStrong}>
                      {cleanVariationLabel(base.selectedSleeveVariation, "sleeve")}
                    </Text>
                  </Text>
                )}

                {!!base.selectedTrouserVariation && (
                  <Text style={styles.meta}>
                    Trouser:{" "}
                    <Text style={styles.metaStrong}>{base.selectedTrouserVariation}</Text>
                  </Text>
                )}
              </>
            )}

            {base.styleExtraCostPkr > 0 ? (
              <Text style={styles.meta}>
                Selected Style Extra:{" "}
                <Text style={styles.metaStrong}>
                  {base.currency} {base.styleExtraCostPkr}
                </Text>
              </Text>
            ) : null}

            {!!base.customTailoringNote && (
              <Text style={styles.meta}>
                Additional Instructions:{" "}
                <Text style={styles.metaStrong}>{base.customTailoringNote}</Text>
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Destination</Text>

          <Text style={styles.fieldLabel}>Delivery Type</Text>
          <View style={styles.choiceRow}>
            <Pressable
              onPress={() => {
                setDestinationType("inland");
                setExportRegion("");
                setCountry("Pakistan");
              }}
              style={[styles.choicePill, destinationType === "inland" ? styles.choicePillOn : null]}
            >
              <Text
                style={[
                  styles.choiceText,
                  destinationType === "inland" ? styles.choiceTextOn : null,
                ]}
              >
                Inland
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!resolved.exportsEnabled) return;
                setDestinationType("export");
              }}
              style={[
                styles.choicePill,
                destinationType === "export" ? styles.choicePillOn : null,
                !resolved.exportsEnabled ? styles.disabledBtn : null,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  destinationType === "export" ? styles.choiceTextOn : null,
                ]}
              >
                Export
              </Text>
            </Pressable>
          </View>

          {!resolved.exportsEnabled ? (
            <Text style={styles.helper}>This vendor does not offer export.</Text>
          ) : null}

          {destinationType === "export" ? (
            <>
              <Text style={styles.fieldLabel}>Import / Region</Text>
              <Text style={styles.helper}>Select region for courier calculation.</Text>

              <View style={styles.pillsWrap}>
                {exportRegionList.map((region) => {
                  const isOn = exportRegion === region;

                  return (
                    <Pressable
                      key={region}
                      onPress={() => setExportRegion(region)}
                      style={[styles.pill, isOn ? styles.choicePillOn : null]}
                    >
                      <Text style={isOn ? styles.choiceTextOn : styles.pillText}>{region}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={styles.fieldLabel}>Courier</Text>
          <Text style={styles.helper}>{courierSummary}</Text>
          {!!base.weightKg && <Text style={styles.helper}>Weight used: {base.weightKg} kg</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>

          {resolved.isUnstitched && !!base.pricePerMeterPkr ? (
            <Text style={styles.meta}>
              Fabric Cost per Meter:{" "}
              <Text style={styles.metaStrong}>
                {base.currency} {base.pricePerMeterPkr}
              </Text>
            </Text>
          ) : null}

          {resolved.isUnstitched && !!base.selectedFabricLengthM ? (
            <Text style={styles.meta}>
              Total Fabric Length:{" "}
              <Text style={styles.metaStrong}>{base.selectedFabricLengthM} meter(s)</Text>
            </Text>
          ) : null}

          {resolved.isUnstitched ? (
            <Text style={styles.meta}>
              Total Fabric Cost:{" "}
              <Text style={styles.metaStrong}>
                {base.currency} {base.fabricCostPkr || 0}
              </Text>
            </Text>
          ) : null}

          {resolved.hasDyeing ? (
            <Text style={styles.meta}>
              Dyeing:{" "}
              <Text style={styles.metaStrong}>
                {base.currency} {base.dyeingCostPkr}
              </Text>
            </Text>
          ) : null}

          {resolved.hasTailoring ? (
            <Text style={styles.meta}>
              Tailoring:{" "}
              <Text style={styles.metaStrong}>
                {base.currency} {Math.round(base.tailoringCostPkr)}
                {base.tailoringTurnaroundDays ? ` • ${base.tailoringTurnaroundDays} days` : ""}
              </Text>
            </Text>
          ) : null}

          {base.styleExtraCostPkr > 0 ? (
            <Text style={styles.meta}>
              Selected Style Extra:{" "}
              <Text style={styles.metaStrong}>
                {base.currency} {Math.round(base.styleExtraCostPkr)}
              </Text>
            </Text>
          ) : null}

          <Text style={styles.meta}>
            Subtotal Before Delivery:{" "}
            <Text style={styles.metaStrong}>
              {base.currency} {Math.round(subtotalBeforeDeliveryPkr)}
            </Text>
          </Text>

          <Text style={styles.meta}>
            Delivery:{" "}
            <Text style={styles.metaStrong}>
              {base.currency} {deliveryCostPkr}
            </Text>
          </Text>

          <View style={styles.divider} />

          <Text style={styles.meta}>
            Grand Total:{" "}
            <Text style={styles.totalStrong}>
              {base.currency} {grandTotalPkr}
            </Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery details</Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="e.g., Arif Nawaz Khan"
            style={styles.input}
            placeholderTextColor={stylesVars.placeholder}
          />

          <Text style={styles.fieldLabel}>Mobile</Text>
          <TextInput
            value={buyerMobile}
            onChangeText={setBuyerMobile}
            placeholder="e.g., 03XXXXXXXXX"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor={stylesVars.placeholder}
          />

          <Text style={styles.fieldLabel}>Delivery Address</Text>
          <TextInput
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="House / Street / Area"
            style={[styles.input, styles.multiline]}
            multiline
            placeholderTextColor={stylesVars.placeholder}
          />

          <Text style={styles.fieldLabel}>City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder={destinationType === "inland" ? "e.g., Islamabad" : "e.g., London"}
            style={styles.input}
            placeholderTextColor={stylesVars.placeholder}
          />

          <Text style={styles.fieldLabel}>Postal Code (optional)</Text>
          <TextInput
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder={destinationType === "inland" ? "e.g., 44000" : "e.g., SW1A 1AA"}
            style={styles.input}
            placeholderTextColor={stylesVars.placeholder}
          />

          <Text style={styles.fieldLabel}>Country</Text>
          <TextInput
            value={destinationType === "inland" ? "Pakistan" : country}
            onChangeText={setCountry}
            placeholder="e.g., Pakistan"
            editable={destinationType !== "inland"}
            style={[
              styles.input,
              destinationType === "inland" ? styles.disabledInput : null,
            ]}
            placeholderTextColor={stylesVars.placeholder}
          />

          {destinationType === "inland" ? (
            <Text style={styles.helper}>Country is fixed as Pakistan for inland orders.</Text>
          ) : null}

          {!!fullAddressPreview && (
            <>
              <Text style={styles.fieldLabel}>Address Preview</Text>
              <Text style={styles.previewText}>{fullAddressPreview}</Text>
            </>
          )}

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions"
            style={[styles.input, styles.multiline]}
            multiline
            placeholderTextColor={stylesVars.placeholder}
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
              pressed && canContinue && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>Continue to Payment</Text>
          </Pressable>

          {!canContinue ? (
            <Text style={styles.helper}>
              Fill name, mobile, address, city, and destination details to continue.
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  scroll: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  container: {
    padding: 16,
    gap: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: stylesVars.text,
  },

  loadingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
  },

  productRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  imageBox: {
    width: 86,
    height: 86,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
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
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  productMetaWrap: {
    flex: 1,
    gap: 6,
  },

  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
  },

  meta: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  metaStrong: {
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: "700",
  },

  totalStrong: {
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
  },

  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  pill: {
    borderWidth: 1,
    borderColor: "#D7E3FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
  },

  pillText: {
    fontSize: 12,
    color: stylesVars.blue,
    fontWeight: "700",
  },

  choiceRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  choicePill: {
    borderWidth: 1,
    borderColor: "#D7E3FF",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
  },

  choicePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  choiceText: {
    fontSize: 12,
    color: stylesVars.blue,
    fontWeight: "700",
  },

  choiceTextOn: {
    fontSize: 12,
    color: stylesVars.white,
    fontWeight: "700",
  },

  vendorBannerWrap: {
    width: "100%",
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#F1F5F9",
  },

  vendorBanner: {
    width: "100%",
    height: "100%",
  },

  tailoringImageWrap: {
    width: "100%",
    height: 220,
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
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: stylesVars.white,
  },

  multiline: {
    minHeight: 44,
    textAlignVertical: "top",
  },

  primaryBtn: {
    minHeight: 48,
    backgroundColor: stylesVars.blue,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#D7E3FF",
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    marginTop: 2,
  },

  secondaryText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  disabledBtn: {
    opacity: 0.55,
  },

  disabledInput: {
    backgroundColor: "#F8FAFC",
    color: stylesVars.mutedText,
  },

  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  previewText: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: "#F8FAFC",
  },

  backBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  backText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  dyePreviewWrap: {
    marginTop: 8,
  },

  dyeSwatch: {
    marginTop: 8,
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  bottomSpacer: {
    height: 16,
  },

  pressed: {
    opacity: 0.82,
  },
});