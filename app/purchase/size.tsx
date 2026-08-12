import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
import { generateDyePalette } from "@/utils/kapray/dyePalette";
import { decodeDeliveryPolicyParam } from "@/utils/kapray/deliveryPolicy";
import ExactMeasurementsModal from "../(tabs)/flow/purchase/exact-measurements-modal";
import type { ExactMeasurementSheetRow } from "../(tabs)/flow/purchase/exact-measurements-sheet";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

type Unit = "cm" | "in";

type DyeSplit = {
  id: string;
  lengthText: string;
  dyeShadeId: string;
  dyeHex: string;
  dyeLabel: string;
};

type CleanDyeSplit = {
  length_m: number;
  dye_shade_id: string;
  dye_hex: string;
  dye_label: string;
  dyeing_cost_pkr: number;
};

const DYE_SPLIT_TOLERANCE_M = 0.01;
const FABRIC_STOCK_EPSILON_M = 0.05;
const SIZE_SELECT_NAV_DELAY_MS = 120;
const UNSTITCHED_SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const stylesVars = {
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  borderSoft: apColors.borderSoft,
  blue: apColors.blue,
  blueSoft: apColors.blueSoft,
  text: apColors.text,
  subText: apColors.subText,
  mutedText: apColors.muted,
  placeholder: "#94A3B8",
  danger: apColors.danger,
  warning: apColors.warning,
  white: apColors.white,
  green: apColors.success,
  greenSoft: apColors.successSoft,
};

function norm(v: unknown) {
  return v == null ? "" : String(v).trim();
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

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function roundMeter(n: number) {
  return Math.round(n * 100) / 100;
}

function getShadeColumnIndex(id: string) {
  const match = /^shade_(\d+)_\d+$/i.exec(id);
  return match ? Number(match[1]) : 0;
}

function getShadeCode(id: string) {
  const match = /^shade_(\d+)_(\d+)$/i.exec(id);
  if (!match) return "";
  const column = String(Number(match[1]) + 1).padStart(2, "0");
  const row = String(Number(match[2]) + 1).padStart(2, "0");
  return `Dye-C${column}-R${row}`;
}

function prettyCategory(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUnstitchedCategory(v: unknown) {
  const s = norm(v);
  return (
    s === "unstitched_plain" ||
    s === "unstitched_dyeing" ||
    s === "unstitched_dyeing_tailoring"
  );
}

function isTruthyParam(v: unknown) {
  const s = norm(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y" || s === "on";
}

function getFabricLengthFromSize(
  size: string,
  sizeMap: Record<string, unknown>,
) {
  if (!size) return 0;
  return safePositiveNumber(sizeMap?.[size]);
}

function hasEnoughFabricForLength(availableM: number, requiredM: number) {
  if (requiredM <= 0) return false;
  if (availableM <= 0) return false;
  return availableM + FABRIC_STOCK_EPSILON_M >= requiredM;
}

export default function SizeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    productId?: string;
    product_id?: string;
    productCode?: string;
    product_code?: string;
    productName?: string;
    product_category?: string;
    made_on_order?: string;
    selected_variant_made_on_order?: string;
    variant_mode?: string;

    price_per_meter_pkr?: string;
    available_fabric_m?: string;
    fabric_purchase_mode?: string;
    fabric_width_label?: string;
    stitched_total_pkr?: string;
    currency?: string;
    imageUrl?: string;

    size_length_m?: string;

    dyeing_available?: string;
    dyeing_selected?: string;
    dye_shade_id?: string;
    dye_hex?: string;
    dye_label?: string;
    dyeing_split_json?: string;
    dyeing_cost_pkr?: string;

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
    delivery_policy?: string;
    weight_kg?: string;
    weight_per_meter_kg?: string;
    package_cm?: string;

    selected_variant_id?: string;
    selected_variant_title?: string;
    selected_variant_size?: string;
    selected_variant_color?: string;
    selected_variant_price_pkr?: string;
    selected_variant_stock_qty?: string;
    selected_variant_base_cost_pkr?: string;
    selected_variant_additional_cost_pkr?: string;
    selected_variant_total_cost_pkr?: string;
    selected_variant_image_path?: string;
    selected_stitched_variant_id?: string;
    selected_stitched_size?: string;
    selected_stitched_label?: string;
    selected_stitched_sku?: string;
    selected_stitched_variant_snapshot?: string;
    bypass_size_step?: string;

    selectedSize?: string;
    selected_size?: string;
    selected_unstitched_size?: string;
    selected_fabric_length_m?: string;
    fabric_cost_pkr?: string;

    mode?: string;
    unit?: string;

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
  }>();

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [zoomColorHex, setZoomColorHex] = useState("");
  const [pendingStandardSize, setPendingStandardSize] = useState("");
  const [pendingExactOpen, setPendingExactOpen] = useState(false);
  const standardNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const exactNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dyePalette = useMemo(
    () =>
      generateDyePalette().map((shade) => ({
        id: String(shade.id),
        hex: String(shade.hex),
        label: getShadeCode(String(shade.id)),
      })),
    [],
  );

  const fallbackDyeOption = useMemo(
    () =>
      dyePalette[0] ?? {
        id: "shade_0_0",
        hex: "#F2BDBD",
        label: "Dye-C01-R01",
      },
    [dyePalette],
  );

  const dyePaletteColumns = useMemo(() => {
    const columns: Array<typeof dyePalette> = [];
    dyePalette.forEach((shade) => {
      const index = getShadeColumnIndex(shade.id);
      if (!columns[index]) columns[index] = [];
      columns[index].push(shade);
    });
    return columns.filter(Boolean);
  }, [dyePalette]);

  const [dyeSplits, setDyeSplits] = useState<DyeSplit[]>(() => {
    const existingSplits = safeJsonDecode<CleanDyeSplit[]>(
      params.dyeing_split_json,
      [],
    );
    if (Array.isArray(existingSplits) && existingSplits.length) {
      return existingSplits.map((row, index) => {
        const shadeId = safeDecode(row?.dye_shade_id) || fallbackDyeOption.id;
        return {
          id: `split_${index + 1}`,
          lengthText:
            safePositiveNumber(row?.length_m) > 0
              ? String(safePositiveNumber(row.length_m))
              : "",
          dyeShadeId: shadeId,
          dyeHex: safeDecode(row?.dye_hex) || fallbackDyeOption.hex,
          dyeLabel:
            safeDecode(row?.dye_label) || getShadeCode(shadeId) || "",
        };
      });
    }

    const shadeId = safeDecode(params.dye_shade_id) || fallbackDyeOption.id;
    return [
      {
        id: "split_1",
        lengthText: "",
        dyeShadeId: shadeId,
        dyeHex: safeDecode(params.dye_hex) || fallbackDyeOption.hex,
        dyeLabel:
          safeDecode(params.dye_label) || getShadeCode(shadeId) || "",
      },
    ];
  });

  const returnTo = useMemo(
    () => (params.returnTo ? String(params.returnTo) : "/purchase/place-order"),
    [params.returnTo],
  );

  const productId = useMemo(
    () => norm(params.productId ?? params.product_id),
    [params.productId, params.product_id],
  );

  const productCode = useMemo(
    () => norm(params.productCode ?? params.product_code),
    [params.productCode, params.product_code],
  );

  const productCategory = useMemo(
    () => norm(params.product_category),
    [params.product_category],
  );
  const isUnstitched = useMemo(
    () => isUnstitchedCategory(productCategory),
    [productCategory],
  );
  const isFabricByMeterPurchase = useMemo(
    () =>
      productCategory === "unstitched_plain" ||
      productCategory === "unstitched_dyeing" ||
      norm(params.fabric_purchase_mode) === "by_meter",
    [params.fabric_purchase_mode, productCategory],
  );
  const [fabricLengthText, setFabricLengthText] = useState(() => {
    const existing = safePositiveNumber(
      safeDecode(params.selected_fabric_length_m) ||
        params.selected_fabric_length_m,
    );
    return existing > 0 ? String(existing) : "";
  });
  const fabricLengthInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isFabricByMeterPurchase) return;

    const focusTimer = setTimeout(() => {
      fabricLengthInputRef.current?.focus();
    }, 250);

    return () => clearTimeout(focusTimer);
  }, [isFabricByMeterPurchase]);

  const selectedVariantSnapshot = useMemo(
    () => safeJsonDecode<any>(params.selected_stitched_variant_snapshot, null),
    [params.selected_stitched_variant_snapshot],
  );

  const isMadeOnOrder = useMemo(() => {
    if (productCategory !== "stitched_ready") return false;

    const snapshot = selectedVariantSnapshot ?? {};
    const rawVariant = snapshot?.rawVariant ?? {};

    return (
      isTruthyParam(params.made_on_order) ||
      isTruthyParam(params.selected_variant_made_on_order) ||
      norm(params.variant_mode) === "made_order_variants" ||
      Boolean(snapshot?.made_on_order) ||
      snapshot?.variant_mode === "made_order_variants" ||
      Boolean(rawVariant?.made_on_order) ||
      rawVariant?.variant_mode === "made_order_variants"
    );
  }, [
    params.made_on_order,
    params.selected_variant_made_on_order,
    params.variant_mode,
    productCategory,
    selectedVariantSnapshot,
  ]);

  const categoryDisplay = useMemo(
    () => (isMadeOnOrder ? "Made on order" : prettyCategory(productCategory)),
    [isMadeOnOrder, productCategory],
  );

  const pricePerMeterPkr = useMemo(
    () => safePositiveNumber(params.price_per_meter_pkr),
    [params.price_per_meter_pkr],
  );

  const availableFabricM = useMemo(
    () => safePositiveNumber(params.available_fabric_m),
    [params.available_fabric_m],
  );
  const fabricWidthLabel = useMemo(
    () => safeDecode(params.fabric_width_label),
    [params.fabric_width_label],
  );

  const selectedMeterLength = useMemo(() => {
    const n = Number(sanitizeNumber(fabricLengthText));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return roundMeter(n);
  }, [fabricLengthText]);

  const selectedMeterFabricCost = useMemo(
    () => Math.round(selectedMeterLength * pricePerMeterPkr),
    [pricePerMeterPkr, selectedMeterLength],
  );

  const dyeingSelected = useMemo(
    () => isTruthyParam(params.dyeing_selected),
    [params.dyeing_selected],
  );

  const dyeingRatePkr = useMemo(
    () => safePositiveNumber(safeDecode(params.dyeing_cost_pkr)),
    [params.dyeing_cost_pkr],
  );

  const selectedMeterDyeingCost = useMemo(
    () => Math.round(selectedMeterLength * dyeingRatePkr),
    [dyeingRatePkr, selectedMeterLength],
  );

  const requiresDyeSplits =
    isFabricByMeterPurchase &&
    productCategory === "unstitched_dyeing" &&
    dyeingSelected;

  const dyeSplitRows = useMemo<CleanDyeSplit[]>(
    () => {
      const lastIndex = dyeSplits.length - 1;
      const assignedBeforeLast = roundMeter(
        dyeSplits.reduce((sum, row, index) => {
          if (index === lastIndex) return sum;
          const n = Number(sanitizeNumber(row.lengthText));
          return sum + (Number.isFinite(n) && n > 0 ? n : 0);
        }, 0),
      );

      return dyeSplits.map((row, index) => {
        const rawLengthM =
          index === lastIndex
            ? Math.max(0, roundMeter(selectedMeterLength - assignedBeforeLast))
            : roundMeter(Number(sanitizeNumber(row.lengthText)));
        const safeLengthM =
          Number.isFinite(rawLengthM) && rawLengthM > 0 ? rawLengthM : 0;
        const dyeShadeId = row.dyeShadeId || fallbackDyeOption.id;
        const dyeHex = row.dyeHex || fallbackDyeOption.hex;
        const dyeLabel =
          row.dyeLabel || getShadeCode(dyeShadeId) || fallbackDyeOption.label;

        return {
          length_m: safeLengthM,
          dye_shade_id: dyeShadeId,
          dye_hex: dyeHex,
          dye_label: dyeLabel,
          dyeing_cost_pkr: Math.round(safeLengthM * dyeingRatePkr),
        };
      });
    },
    [dyeSplits, dyeingRatePkr, fallbackDyeOption, selectedMeterLength],
  );

  const dyeSplitTotalM = useMemo(
    () => roundMeter(dyeSplitRows.reduce((sum, row) => sum + row.length_m, 0)),
    [dyeSplitRows],
  );

  const dyeSplitTotalCostPkr = useMemo(
    () =>
      Math.round(
        dyeSplitRows.reduce((sum, row) => sum + row.dyeing_cost_pkr, 0),
      ),
    [dyeSplitRows],
  );

  const dyeSplitBalanceM = useMemo(
    () => roundMeter(selectedMeterLength - dyeSplitTotalM),
    [dyeSplitTotalM, selectedMeterLength],
  );

  const dyeSplitsValid =
    !requiresDyeSplits ||
    (selectedMeterLength > 0 &&
      dyeSplitRows.length > 0 &&
      dyeSplitRows.every(
        (row) => row.length_m > 0 && row.dye_shade_id && row.dye_hex,
      ) &&
      Math.abs(dyeSplitTotalM - selectedMeterLength) <=
        DYE_SPLIT_TOLERANCE_M);

  const meterDyeingCostPkr = requiresDyeSplits
    ? dyeSplitTotalCostPkr
    : selectedMeterDyeingCost;

  const routeShippingWeightKg = useMemo(
    () => safePositiveNumber(params.weight_kg),
    [params.weight_kg],
  );
  const weightPerMeterKg = useMemo(
    () => safePositiveNumber(params.weight_per_meter_kg),
    [params.weight_per_meter_kg],
  );
  const deliveryPolicy = useMemo(
    () => decodeDeliveryPolicyParam(params.delivery_policy),
    [params.delivery_policy],
  );
  const meterShippingLimits = deliveryPolicy.meter_shipping;

  const selectedMeterShippingWeightKg = useMemo(
    () => roundMeter(selectedMeterLength * weightPerMeterKg),
    [selectedMeterLength, weightPerMeterKg],
  );

  const meterLengthOverLimit =
    selectedMeterLength > meterShippingLimits.max_checkout_m;
  const meterWeightSoftWarning =
    selectedMeterShippingWeightKg > meterShippingLimits.soft_weight_warning_kg;
  const meterWeightOverLimit =
    selectedMeterShippingWeightKg > meterShippingLimits.max_checkout_weight_kg;

  const canContinueMeter =
    selectedMeterLength > 0 &&
    pricePerMeterPkr > 0 &&
    (availableFabricM <= 0 || selectedMeterLength <= availableFabricM) &&
    !meterLengthOverLimit &&
    !meterWeightOverLimit &&
    dyeSplitsValid;

  const dyeStageInstruction = useMemo(() => {
    if (!requiresDyeSplits) return "";
    if (selectedMeterLength <= 0) return "Add total fabric length.";
    if (dyeSplitBalanceM < -DYE_SPLIT_TOLERANCE_M) {
      return `Reduce colour lengths by ${Math.abs(dyeSplitBalanceM)} m. Last colour fills remaining length.`;
    }
    return "Select colours and enter lengths. Last colour fills remaining length.";
  }, [dyeSplitBalanceM, requiresDyeSplits, selectedMeterLength]);

  const stitchedTotalPkr = useMemo(
    () => safePositiveNumber(params.stitched_total_pkr),
    [params.stitched_total_pkr],
  );

  const sizeLengthMap = useMemo<Record<string, unknown>>(
    () => safeJsonDecode<Record<string, unknown>>(params.size_length_m, {}),
    [params.size_length_m],
  );

  const mappedUnstitchedSizeRows = useMemo(() => {
    return UNSTITCHED_SIZE_ORDER.map((size) => ({
      size,
      lengthM: getFabricLengthFromSize(size, sizeLengthMap),
    })).filter((row) => row.lengthM > 0);
  }, [sizeLengthMap]);

  const availableUnstitchedSizes = useMemo(
    () => mappedUnstitchedSizeRows.map((row) => row.size),
    [mappedUnstitchedSizeRows],
  );

  const selectableUnstitchedSizes = useMemo(
    () =>
      mappedUnstitchedSizeRows
        .filter((row) =>
          hasEnoughFabricForLength(availableFabricM, row.lengthM),
        )
        .map((row) => row.size),
    [availableFabricM, mappedUnstitchedSizeRows],
  );

  const hasAnySelectableUnstitchedSize = selectableUnstitchedSizes.length > 0;

  const sizeGuideRows = useMemo(
    () =>
      mappedUnstitchedSizeRows.map((row) => ({
        size: row.size,
        lengthM: row.lengthM,
      })),
    [mappedUnstitchedSizeRows],
  );

  const unit = useMemo<Unit>(() => {
    const u = norm(params.unit).toLowerCase();
    return u === "in" ? "in" : "cm";
  }, [params.unit]);

  const routeSelectedStandardSize = useMemo(
    () =>
      safeDecode(
        params.selected_unstitched_size ||
          params.selected_variant_size ||
          params.selected_stitched_size ||
          params.selected_size ||
          params.selectedSize,
      ),
    [
      params.selected_unstitched_size,
      params.selected_variant_size,
      params.selected_stitched_size,
      params.selected_size,
      params.selectedSize,
    ],
  );
  const selectedStandardSize =
    pendingStandardSize || routeSelectedStandardSize;

  useEffect(() => {
    return () => {
      if (standardNavTimerRef.current) {
        clearTimeout(standardNavTimerRef.current);
      }
      if (exactNavTimerRef.current) {
        clearTimeout(exactNavTimerRef.current);
      }
    };
  }, []);

  const selectedStandardFabricLength = useMemo(
    () =>
      safePositiveNumber(
        safeDecode(params.selected_fabric_length_m) ||
          params.selected_fabric_length_m,
      ),
    [params.selected_fabric_length_m],
  );

  const selectedStandardFabricCost = useMemo(
    () => safePositiveNumber(params.fabric_cost_pkr),
    [params.fabric_cost_pkr],
  );

  const exactValues = useMemo(
    () => [
      norm(params.m1),
      norm(params.m2),
      norm(params.m3),
      norm(params.m4),
      norm(params.m5),
      norm(params.m6),
      norm(params.m7),
      norm(params.m8),
      norm(params.m9),
      norm(params.m10),
      norm(params.m11),
      norm(params.m12),
      norm(params.m13),
      norm(params.m14),
      norm(params.m15),
      norm(params.m16),
      norm(params.m17),
    ],
    [
      params.m1,
      params.m2,
      params.m3,
      params.m4,
      params.m5,
      params.m6,
      params.m7,
      params.m8,
      params.m9,
      params.m10,
      params.m11,
      params.m12,
      params.m13,
      params.m14,
      params.m15,
      params.m16,
      params.m17,
    ],
  );

  const exactHasAny = useMemo(
    () => exactValues.some((x) => x.length > 0),
    [exactValues],
  );

  const customRows = useMemo(
    () =>
      [
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
      ].filter((row) => row.label && row.value),
    [
      params.custom_label_1,
      params.custom_label_2,
      params.custom_label_3,
      params.custom_label_4,
      params.custom_value_1,
      params.custom_value_2,
      params.custom_value_3,
      params.custom_value_4,
    ],
  );

  const exactEnteredCount = useMemo(
    () => exactValues.filter((x) => x.length > 0).length,
    [exactValues],
  );

  const dimensionRows = useMemo<ExactMeasurementSheetRow[]>(
    () =>
      [
        { order: 1, label: "1. Neck", value: norm(params.m1) },
        { order: 2, label: "2. Across front", value: norm(params.m2) },
        { order: 3, label: "3. Bust", value: norm(params.m3) },
        { order: 4, label: "4. Under bust", value: norm(params.m4) },
        { order: 5, label: "5. Waist", value: norm(params.m5) },
        { order: 6, label: "6. Hips", value: norm(params.m6) },
        { order: 7, label: "7. Thigh", value: norm(params.m7) },
        { order: 8, label: "8. Upper arm", value: norm(params.m8) },
        { order: 9, label: "9. Elbow", value: norm(params.m9) },
        { order: 10, label: "10. Wrist", value: norm(params.m10) },
        { order: 11, label: "11. Shoulder to waist", value: norm(params.m11) },
        { order: 12, label: "12. Shoulder to floor", value: norm(params.m12) },
        {
          order: 13,
          label: "13. Shoulder to shoulder",
          value: norm(params.m13),
        },
        { order: 14, label: "14. Back neck to waist", value: norm(params.m14) },
        { order: 15, label: "15. Across back", value: norm(params.m15) },
        { order: 16, label: "16. Inner arm length", value: norm(params.m16) },
        { order: 17, label: "17. Ankle", value: norm(params.m17) },
        ...customRows.map((row, index) => ({
          order: 100 + index,
          label: row.label,
          value: row.value,
        })),
      ].filter((row) => row.value),
    [
      params.m1,
      params.m2,
      params.m3,
      params.m4,
      params.m5,
      params.m6,
      params.m7,
      params.m8,
      params.m9,
      params.m10,
      params.m11,
      params.m12,
      params.m13,
      params.m14,
      params.m15,
      params.m16,
      params.m17,
      customRows,
    ],
  );

  const goPlaceOrder = (p: Record<string, string>) => {
    router.replace({
      pathname: returnTo as any,
      params: {
        ...(params as any),
        productId,
        productCode,
        product_category: productCategory,
        ...p,
      },
    });
  };

  const onSelectStandard = (size: string) => {
    const fabricLengthM = isUnstitched
      ? getFabricLengthFromSize(size, sizeLengthMap)
      : 0;
    if (
      isUnstitched &&
      !hasEnoughFabricForLength(availableFabricM, fabricLengthM)
    ) {
      return;
    }

    const fabricCostPkr = isUnstitched ? pricePerMeterPkr * fabricLengthM : 0;
    const shippingWeightKg =
      isUnstitched && fabricLengthM > 0 && weightPerMeterKg > 0
        ? roundMeter(fabricLengthM * weightPerMeterKg)
        : 0;
    const encodedSize = encodeURIComponent(size);
    setPendingStandardSize(size);

    const nextParams = {
      mode: "standard",
      selectedSize: encodedSize,
      selected_size: encodedSize,
      selected_variant_size: isUnstitched ? "" : encodedSize,
      selected_stitched_size: isUnstitched ? "" : encodedSize,
      selected_unstitched_size: isUnstitched ? encodedSize : "",
      selected_fabric_length_m:
        isUnstitched && fabricLengthM > 0
          ? encodeURIComponent(String(fabricLengthM))
          : "",
      fabric_cost_pkr:
        isUnstitched && fabricCostPkr > 0 ? String(fabricCostPkr) : "",
      weight_kg:
        isUnstitched && shippingWeightKg > 0
          ? String(shippingWeightKg)
          : norm(params.weight_kg),
      weight_per_meter_kg:
        isUnstitched && weightPerMeterKg > 0
          ? String(weightPerMeterKg)
          : norm(params.weight_per_meter_kg),
      package_cm: isUnstitched ? "" : norm(params.package_cm),

      m1: "",
      m2: "",
      m3: "",
      m4: "",
      m5: "",
      m6: "",
      m7: "",
      m8: "",
      m9: "",
      m10: "",
      m11: "",
      m12: "",
      m13: "",
      m14: "",
      m15: "",
      m16: "",
      m17: "",

      custom_label_1: "",
      custom_value_1: "",
      custom_label_2: "",
      custom_value_2: "",
      custom_label_3: "",
      custom_value_3: "",
      custom_label_4: "",
      custom_value_4: "",
    };

    if (standardNavTimerRef.current) {
      clearTimeout(standardNavTimerRef.current);
    }

    standardNavTimerRef.current = setTimeout(() => {
      goPlaceOrder(nextParams);
    }, SIZE_SELECT_NAV_DELAY_MS);
  };

  const onContinueMeter = () => {
    if (!canContinueMeter) return;

    const cleanDyeSplits = requiresDyeSplits
      ? dyeSplitRows.filter((row) => row.length_m > 0)
      : [];
    const firstDyeSplit = cleanDyeSplits[0] ?? null;

    goPlaceOrder({
      mode: "meter",
      selectedSize: "",
      selected_size: "",
      selected_variant_size: "",
      selected_stitched_size: "",
      selected_unstitched_size: "",
      selected_fabric_length_m: encodeURIComponent(String(selectedMeterLength)),
      fabric_cost_pkr: String(selectedMeterFabricCost),
      dyeing_split_json: cleanDyeSplits.length
        ? encodeURIComponent(JSON.stringify(cleanDyeSplits))
        : "",
      dye_shade_id: firstDyeSplit?.dye_shade_id
        ? encodeURIComponent(firstDyeSplit.dye_shade_id)
        : norm(params.dye_shade_id),
      dye_hex: firstDyeSplit?.dye_hex
        ? encodeURIComponent(firstDyeSplit.dye_hex)
        : norm(params.dye_hex),
      dye_label: firstDyeSplit?.dye_label
        ? encodeURIComponent(firstDyeSplit.dye_label)
        : firstDyeSplit?.dye_shade_id
          ? encodeURIComponent(getShadeCode(firstDyeSplit.dye_shade_id))
          : norm(params.dye_label),
      dyeing_cost_pkr: dyeingSelected
        ? encodeURIComponent(String(meterDyeingCostPkr))
        : norm(params.dyeing_cost_pkr),
      weight_kg:
        selectedMeterShippingWeightKg > 0
          ? String(selectedMeterShippingWeightKg)
          : routeShippingWeightKg > 0
            ? String(routeShippingWeightKg)
            : "",
      weight_per_meter_kg:
        weightPerMeterKg > 0 ? String(weightPerMeterKg) : "",
      package_cm: "",

      m1: "",
      m2: "",
      m3: "",
      m4: "",
      m5: "",
      m6: "",
      m7: "",
      m8: "",
      m9: "",
      m10: "",
      m11: "",
      m12: "",
      m13: "",
      m14: "",
      m15: "",
      m16: "",
      m17: "",

      custom_label_1: "",
      custom_value_1: "",
      custom_label_2: "",
      custom_value_2: "",
      custom_label_3: "",
      custom_value_3: "",
      custom_label_4: "",
      custom_value_4: "",
    });
  };

  const removeDyeSplit = (id: string) => {
    setDyeSplits((rows) =>
      rows.length > 1 ? rows.filter((row) => row.id !== id) : rows,
    );
  };

  const updateDyeSplitLength = (id: string, value: string) => {
    setDyeSplits((rows) =>
      rows.map((row) =>
        row.id === id ? { ...row, lengthText: sanitizeNumber(value) } : row,
      ),
    );
  };

  const toggleDyeSplitShade = (shade: {
    id: string;
    hex: string;
    label: string;
  }) => {
    setDyeSplits((rows) => {
      const existingIndex = rows.findIndex(
        (row) => row.dyeShadeId === shade.id,
      );
      if (existingIndex >= 0) {
        return rows.length > 1
          ? rows.filter((_, index) => index !== existingIndex)
          : rows;
      }

      const lastIndex = rows.length - 1;
      const assignedBeforeLast = roundMeter(
        rows.reduce((sum, row, index) => {
          if (index === lastIndex) return sum;
          const n = Number(sanitizeNumber(row.lengthText));
          return sum + (Number.isFinite(n) && n > 0 ? n : 0);
        }, 0),
      );
      const previousRemainingLength = Math.max(
        0,
        roundMeter(selectedMeterLength - assignedBeforeLast),
      );
      const rowsBeforeNewLast =
        rows.length > 1
          ? rows.map((row, index) =>
              index === lastIndex
                ? {
                    ...row,
                    lengthText:
                      previousRemainingLength > 0
                        ? String(previousRemainingLength)
                        : "",
                  }
                : row,
            )
          : rows.map((row) => ({ ...row, lengthText: "" }));

      return [
        ...rowsBeforeNewLast,
        {
          id: `split_${Date.now()}_${Math.round(Math.random() * 100000)}`,
          lengthText: "",
          dyeShadeId: shade.id,
          dyeHex: shade.hex,
          dyeLabel: shade.label || getShadeCode(shade.id),
        },
      ];
    });
  };

  const openExactMeasurements = () => {
    router.push({
      pathname: "/flow/purchase/exact-measurements" as any,
      params: {
        ...(params as any),
        returnTo: "/flow/purchase/size",
        nextAfterSave: returnTo,
        mode: "exact",
      },
    });
  };

  const onPressExactToggle = () => {
    setPendingExactOpen(true);

    if (exactNavTimerRef.current) {
      clearTimeout(exactNavTimerRef.current);
    }

    exactNavTimerRef.current = setTimeout(() => {
      setPendingExactOpen(false);
      openExactMeasurements();
    }, SIZE_SELECT_NAV_DELAY_MS);
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {requiresDyeSplits
            ? "Select dye colors and length"
            : isFabricByMeterPurchase
              ? "Select Fabric Length"
              : "Select Size"}
        </Text>

        {!!productCategory ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Category:{" "}
              <Text style={styles.summaryStrong}>{categoryDisplay}</Text>
            </Text>

            {isUnstitched ? (
              <>
                <Text style={styles.summaryText}>
                  Cost per meter:{" "}
                  <Text style={styles.summaryStrong}>
                    PKR {pricePerMeterPkr || 0} / meter
                  </Text>
                </Text>

                {fabricWidthLabel ? (
                  <Text style={styles.summaryText}>
                    Panna / عرض:{" "}
                    <Text style={styles.summaryStrong}>
                      {fabricWidthLabel}
                    </Text>
                  </Text>
                ) : null}

                {isFabricByMeterPurchase ? (
                  <Text style={styles.summaryText}>
                    Available fabric:{" "}
                    <Text style={styles.summaryStrong}>
                      {availableFabricM > 0 ? `${availableFabricM} m` : "Not available"}
                    </Text>
                  </Text>
                ) : availableUnstitchedSizes.length ? (
                  <Text style={styles.summaryText}>
                    Available sizes:{" "}
                    <Text style={styles.summaryStrong}>
                      {selectableUnstitchedSizes.length
                        ? selectableUnstitchedSizes.join(", ")
                        : "Not available"}
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.summaryText}>
                    Available sizes:{" "}
                    <Text style={styles.summaryStrong}>Not available</Text>
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.summaryText}>
                Product total:{" "}
                <Text style={styles.summaryStrong}>
                  PKR {stitchedTotalPkr || 0}
                </Text>
              </Text>
            )}
          </View>
        ) : null}

        {isFabricByMeterPurchase ? (
          <View style={styles.sectionCard}>
            <View style={styles.fabricLengthHeader}>
              <Text style={styles.sectionTitle}>
                {requiresDyeSplits ? "Total fabric length" : "Fabric length"}
              </Text>
              {sizeGuideRows.length ? (
                <Pressable
                  onPress={() => setSizeGuideOpen(true)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Size guide"
                >
                  <MaterialIcons
                    name="straighten"
                    size={18}
                    color={stylesVars.blue}
                  />
                </Pressable>
              ) : null}
            </View>
            <TextInput
              ref={fabricLengthInputRef}
              value={fabricLengthText}
              onChangeText={(next) => setFabricLengthText(sanitizeNumber(next))}
              placeholder="e.g., 2.5"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              keyboardType="decimal-pad"
              maxLength={8}
            />

            <View style={styles.costCard}>
              <Text style={styles.costLine}>
                Rate:{" "}
                <Text style={styles.costStrong}>
                  PKR {pricePerMeterPkr || 0} / meter
                </Text>
              </Text>
              <Text style={styles.costLine}>
                {requiresDyeSplits ? "Total fabric length" : "Fabric length"}:{" "}
                <Text style={styles.costStrong}>
                  {selectedMeterLength || 0} m
                </Text>
              </Text>
              <Text style={styles.costLine}>
                Total fabric cost:{" "}
                <Text style={styles.costStrong}>
                  PKR {selectedMeterFabricCost || 0}
                </Text>
              </Text>
              {dyeingSelected ? (
                <Text style={styles.costLine}>
                  Dyeing:{" "}
                  <Text style={styles.costStrong}>
                    PKR {meterDyeingCostPkr || 0}
                  </Text>
                </Text>
              ) : null}
              {weightPerMeterKg > 0 ? (
                <Text style={styles.costLine}>
                  Shipping weight:{" "}
                  <Text style={styles.costStrong}>
                    {selectedMeterShippingWeightKg || 0} kg
                  </Text>
                </Text>
              ) : null}
            </View>

            <Text style={styles.helper}>
              Retail checkout allows up to {meterShippingLimits.max_checkout_m} m per order. Shipping uses actual weight only.
            </Text>

            {availableFabricM > 0 && selectedMeterLength > availableFabricM ? (
              <Text style={styles.validation}>
                Enter fabric length within available stock.
              </Text>
            ) : null}

            {meterLengthOverLimit ? (
              <Text style={styles.validation}>
                Enter {meterShippingLimits.max_checkout_m} m or less for one retail order.
              </Text>
            ) : null}

            {meterWeightOverLimit ? (
              <Text style={styles.validation}>
                Shipping weight cannot exceed {meterShippingLimits.max_checkout_weight_kg} kg for meter checkout.
              </Text>
            ) : meterWeightSoftWarning ? (
              <Text style={styles.warningText}>
                This parcel is above {meterShippingLimits.soft_weight_warning_kg} kg. Courier may be expensive, but checkout can continue up to {meterShippingLimits.max_checkout_weight_kg} kg.
              </Text>
            ) : null}


            {requiresDyeSplits ? (
              <View style={styles.dyeSplitBox}>
                <View style={styles.dyeSplitHeaderRow}>
                  <Text style={styles.dyeSplitTitle}>Dye portions</Text>
                  <Text style={styles.dyeSplitMeta}>
                    {dyeSplitTotalM || 0} / {selectedMeterLength || 0} m
                  </Text>
                </View>

                <View style={styles.dyePalettePanel}>
                  <Text style={styles.dyePaletteTitle}>Colors</Text>
                  <View style={styles.dyePaletteGridFrame}>
                    <View style={styles.dyePaletteRowLabels}>
                      <Text style={styles.dyePaletteAxisLabel}>R</Text>
                      {(dyePaletteColumns[0] ?? []).map((shade, rowIndex) => (
                        <Text
                          key={`dye_row_${shade.id}`}
                          style={styles.dyePaletteRowLabel}
                        >
                          {String(rowIndex + 1).padStart(2, "0")}
                        </Text>
                      ))}
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.dyePaletteScroll}
                      contentContainerStyle={styles.dyePaletteGrid}
                    >
                      {dyePaletteColumns.map((column, columnIndex) => (
                        <View key={`dye_column_wrap_${columnIndex}`}>
                          <Text style={styles.dyePaletteColumnLabel}>
                            C{String(columnIndex + 1).padStart(2, "0")}
                          </Text>
                          <View
                            key={`dye_column_${columnIndex}`}
                            style={styles.dyePaletteColumn}
                          >
                            {column.map((shade) => {
                              const isOn = dyeSplits.some(
                                (row) => row.dyeShadeId === shade.id,
                              );

                              return (
                                <Pressable
                                  key={shade.id}
                                  onPress={() => toggleDyeSplitShade(shade)}
                                  style={[
                                    styles.dyePaletteSwatch,
                                    { backgroundColor: shade.hex },
                                    isOn ? styles.dyePaletteSwatchOn : null,
                                  ]}
                                />
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  <Text style={styles.dyeCaution}>
                    Custom dyed items are final sale. Shade may vary slightly due to fabric and dye batch.
                  </Text>
                </View>

                {dyeSplits.map((row, index) => {
                  const isRemainingRow = index === dyeSplits.length - 1;
                  const remainingLengthM = dyeSplitRows[index]?.length_m ?? 0;

                  return (
                    <View key={row.id} style={styles.dyeSplitRow}>
                      <TextInput
                        value={
                          isRemainingRow
                            ? remainingLengthM > 0
                              ? String(remainingLengthM)
                              : ""
                            : row.lengthText
                        }
                        onChangeText={(next) =>
                          updateDyeSplitLength(row.id, next)
                        }
                        placeholder={isRemainingRow ? "" : "Meters"}
                        placeholderTextColor={stylesVars.placeholder}
                        style={[
                          styles.input,
                          styles.dyeSplitLengthInput,
                          isRemainingRow ? styles.inputReadOnly : null,
                        ]}
                        keyboardType="decimal-pad"
                        maxLength={8}
                        editable={!isRemainingRow}
                      />

                      <Pressable
                        onPress={() => {
                          if (row.dyeHex) setZoomColorHex(row.dyeHex);
                        }}
                        style={styles.dyeSelectedColor}
                      >
                        <View
                          style={[
                            styles.dyeColorSwatch,
                            { backgroundColor: row.dyeHex || "#FFFFFF" },
                          ]}
                        />
                        <Text style={styles.dyeCodeText}>
                          {row.dyeLabel || getShadeCode(row.dyeShadeId)}
                        </Text>
                      </Pressable>

                      {dyeSplits.length > 1 ? (
                        <Pressable
                          onPress={() => removeDyeSplit(row.id)}
                          style={styles.dyeRemoveBtn}
                        >
                          <Text style={styles.dyeRemoveText}>Remove</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}

              </View>
            ) : null}

            {requiresDyeSplits && dyeStageInstruction ? (
              <Text style={styles.validation}>{dyeStageInstruction}</Text>
            ) : null}

            <Pressable
              onPress={onContinueMeter}
              disabled={!canContinueMeter}
              style={[
                styles.primaryInlineBtn,
                !canContinueMeter ? styles.disabledBtn : null,
              ]}
            >
              <Text style={styles.primaryInlineText}>Continue</Text>
            </Pressable>

            {selectedMeterLength <= 0 ? (
              <Text style={styles.bottomInstruction}>
                Fill fabric length to purchase.
              </Text>
            ) : null}
          </View>
        ) : (
          <>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => {}}
            style={[styles.toggleBtn, styles.toggleActive]}
          >
            <Text style={[styles.toggleText, styles.toggleTextActive]}>
              Standard
            </Text>
          </Pressable>

          <Pressable
            onPress={onPressExactToggle}
            style={[
              styles.toggleBtn,
              pendingExactOpen ? styles.toggleActive : null,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                pendingExactOpen ? styles.toggleTextActive : null,
              ]}
            >
              Exact
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Choose standard size</Text>

          <View style={styles.sizeGrid}>
            {(isUnstitched ? availableUnstitchedSizes : STANDARD_SIZES).map(
              (s) => {
                const isOn = selectedStandardSize === s;
                const disabled =
                  isUnstitched && !selectableUnstitchedSizes.includes(s);

                return (
                  <Pressable
                    key={s}
                    onPress={() => onSelectStandard(s)}
                    disabled={disabled}
                    style={[
                      styles.sizePill,
                      isOn ? styles.sizePillOn : null,
                      disabled ? styles.sizePillDisabled : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeText,
                        isOn ? styles.sizeTextOn : null,
                        disabled ? styles.sizeTextDisabled : null,
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          {isUnstitched && !availableUnstitchedSizes.length ? (
            <Text style={styles.validation}>
              Size-length map is missing for this unstitched product.
            </Text>
          ) : null}

          {isUnstitched &&
          availableUnstitchedSizes.length > 0 &&
          !hasAnySelectableUnstitchedSize ? (
            <Text style={styles.validation}>
              Available fabric is below the smallest offered size.
            </Text>
          ) : null}

          {isUnstitched &&
          !!selectedStandardSize &&
          selectedStandardFabricLength > 0 ? (
            <View style={styles.costCard}>
              <Text style={styles.costLine}>
                Cost per meter:{" "}
                <Text style={styles.costStrong}>
                  PKR {pricePerMeterPkr} / meter
                </Text>
              </Text>
              <Text style={styles.costLine}>
                Selected size:{" "}
                <Text style={styles.costStrong}>{selectedStandardSize}</Text>
              </Text>
              <Text style={styles.costLine}>
                Fabric length:{" "}
                <Text style={styles.costStrong}>
                  {selectedStandardFabricLength} meter(s)
                </Text>
              </Text>
              <Text style={styles.costLine}>
                Total fabric cost:{" "}
                <Text style={styles.costStrong}>
                  PKR {selectedStandardFabricCost}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>

        {exactHasAny ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Last saved exact measurements
            </Text>

            <View style={styles.exactSummaryCard}>
              <Text style={styles.resultLine}>
                Unit: <Text style={styles.resultStrong}>{unit}</Text>
              </Text>

              <Text style={styles.resultLine}>
                Entered main measurements:{" "}
                <Text style={styles.resultStrong}>
                  {exactEnteredCount} / 17
                </Text>
              </Text>

              <Text style={styles.resultLine}>
                Custom dimensions:{" "}
                <Text style={styles.resultStrong}>{customRows.length} / 4</Text>
              </Text>

              <Text style={styles.resultLine}>
                Estimated standard size:{" "}
                <Text style={styles.resultStrong}>
                  {safeDecode(
                    params.selected_unstitched_size ||
                      params.selected_variant_size ||
                      params.selected_stitched_size ||
                      params.selected_size ||
                      params.selectedSize,
                  ) || "—"}
                </Text>
              </Text>

              {isUnstitched ? (
                <>
                  <Text style={styles.resultLine}>
                    Fabric length:{" "}
                    <Text style={styles.resultStrong}>
                      {selectedStandardFabricLength || 0} m
                    </Text>
                  </Text>

                  <Text style={styles.resultLine}>
                    Fabric cost:{" "}
                    <Text style={styles.resultStrong}>
                      PKR {selectedStandardFabricCost || 0}
                    </Text>
                  </Text>
                </>
              ) : null}

              <View style={styles.exactActionsRow}>
                <Pressable
                  onPress={() => setSummaryOpen(true)}
                  style={styles.secondaryInlineBtn}
                >
                  <Text style={styles.secondaryInlineText}>
                    View exact measurements
                  </Text>
                </Pressable>

                <Pressable
                  onPress={openExactMeasurements}
                  style={styles.primaryInlineBtn}
                >
                  <Text style={styles.primaryInlineText}>Edit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
          </>
        )}

        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.link}>Close</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={sizeGuideOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSizeGuideOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Size guide for this product</Text>
              <Pressable
                onPress={() => setSizeGuideOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.link}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalList}
            >
              {sizeGuideRows.map((row) => (
                <View key={row.size} style={styles.guideRow}>
                  <View>
                    <Text style={styles.guideSize}>{row.size}</Text>
                    <Text style={styles.guideLength}>{row.lengthM} m</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!zoomColorHex}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomColorHex("")}
      >
        <Pressable
          onPress={() => setZoomColorHex("")}
          style={styles.modalOverlay}
        >
          <View style={styles.colorZoomCard}>
            <View
              style={[
                styles.colorZoomSwatch,
                { backgroundColor: zoomColorHex || "#FFFFFF" },
              ]}
            />
            <Text style={styles.link}>Close</Text>
          </View>
        </Pressable>
      </Modal>

      <ExactMeasurementsModal
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Exact Measurements"
        rows={dimensionRows}
        inferredSize={
          safeDecode(
            params.selected_unstitched_size ||
              params.selected_variant_size ||
              params.selected_stitched_size ||
              params.selected_size ||
              params.selectedSize,
          ) || ""
        }
        unit={unit}
        fabricLengthM={selectedStandardFabricLength}
        fabricCostPkr={selectedStandardFabricCost}
        showGuideImage
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  container: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
    backgroundColor: stylesVars.bg,
  },

  title: {
    fontFamily: apFontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    padding: 14,
    backgroundColor: stylesVars.cardBg,
    gap: 6,
  },

  summaryText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  summaryStrong: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
  },

  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },

  toggleBtn: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: apRadii.pill,
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleActive: {
    backgroundColor: stylesVars.blue,
    borderColor: stylesVars.blue,
  },

  toggleText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  toggleTextActive: {
    color: stylesVars.white,
  },

  sectionCard: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    padding: 14,
    backgroundColor: stylesVars.cardBg,
    gap: 10,
  },

  sectionTitle: {
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  fabricLengthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: apRadii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: stylesVars.white,
    color: stylesVars.text,
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0,
  },

  inputReadOnly: {
    backgroundColor: "#F1F5F9",
    color: stylesVars.mutedText,
  },

  helper: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },

  sizePill: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  sizePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  sizePillDisabled: {
    borderColor: stylesVars.border,
    backgroundColor: "#F1F5F9",
    opacity: 0.55,
  },

  sizeText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  sizeTextOn: {
    color: stylesVars.white,
  },

  sizeTextDisabled: {
    color: stylesVars.mutedText,
  },

  costCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: apRadii.card,
    padding: 12,
    backgroundColor: stylesVars.blueSoft,
    gap: 4,
  },

  costLine: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  costStrong: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
  },

  dyeSplitBox: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    padding: 12,
    backgroundColor: "#F8FAFC",
    gap: 10,
  },

  dyeSplitHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  dyeSplitTitle: {
    fontFamily: apFontFamily,
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
  },

  dyeSplitMeta: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
    letterSpacing: 0,
  },

  dyePalettePanel: {
    gap: 8,
  },

  dyePaletteTitle: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "800",
  },

  dyeCaution: {
    fontSize: 11,
    lineHeight: 16,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  dyePaletteGridFrame: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },

  dyePaletteScroll: {
    flex: 1,
  },

  dyePaletteGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },

  dyePaletteAxisLabel: {
    height: 18,
    fontSize: 9,
    color: stylesVars.mutedText,
    fontWeight: "900",
    textAlign: "center",
  },

  dyePaletteColumnLabel: {
    height: 18,
    fontSize: 9,
    color: stylesVars.mutedText,
    fontWeight: "900",
    textAlign: "center",
  },

  dyePaletteRowLabels: {
    alignItems: "center",
  },

  dyePaletteRowLabel: {
    width: 18,
    height: 26,
    fontSize: 8,
    lineHeight: 26,
    color: stylesVars.mutedText,
    fontWeight: "800",
    textAlign: "center",
  },

  dyePaletteSwatch: {
    width: 28,
    height: 26,
    borderWidth: 0,
  },

  dyePaletteSwatchOn: {
    borderWidth: 2,
    borderColor: stylesVars.blue,
  },

  dyePaletteColumn: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
  },

  dyeSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  dyeSplitLengthInput: {
    width: 96,
  },

  dyeSelectedColor: {
    minHeight: 60,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: stylesVars.white,
  },

  dyeCodeText: {
    flex: 1,
    fontSize: 10,
    color: stylesVars.text,
    fontWeight: "800",
  },

  dyeColorSwatch: {
    width: 58,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  dyeRemoveBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
  },

  dyeRemoveText: {
    fontSize: 12,
    color: stylesVars.danger,
    fontWeight: "800",
  },

  exactSummaryCard: {
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: apRadii.card,
    padding: 14,
    backgroundColor: stylesVars.greenSoft,
    gap: 6,
  },

  resultLine: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.subText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  resultStrong: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
  },

  exactActionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },

  primaryInlineBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledBtn: {
    opacity: 0.5,
  },

  primaryInlineText: {
    fontFamily: apFontFamily,
    color: stylesVars.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },

  secondaryInlineBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryInlineText: {
    fontFamily: apFontFamily,
    color: stylesVars.blue,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    maxHeight: "76%",
    borderRadius: apRadii.card,
    backgroundColor: stylesVars.cardBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
  },

  modalCloseBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScroll: {
    marginTop: 10,
  },

  modalList: {
    gap: 8,
    paddingBottom: 2,
  },

  colorZoomCard: {
    width: "82%",
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: stylesVars.cardBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 14,
    gap: 12,
    alignSelf: "center",
    alignItems: "center",
  },

  colorZoomSwatch: {
    width: "100%",
    aspectRatio: 1.35,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  guideRow: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 12,
    backgroundColor: stylesVars.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  guideSize: {
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.text,
  },

  guideLength: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: stylesVars.mutedText,
  },

  validation: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.danger,
    fontWeight: "500",
    letterSpacing: 0,
  },

  warningText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.warning,
    fontWeight: "700",
    letterSpacing: 0,
  },

  bottomInstruction: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.danger,
    fontWeight: "800",
    letterSpacing: 0,
  },

  closeBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.pill,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  link: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.blue,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
