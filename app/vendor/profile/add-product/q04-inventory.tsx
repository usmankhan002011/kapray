import React, { useMemo, useRef } from "react";
import { Alert, type TextInput } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductInput,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function roundMeter(n: number) {
  return Math.round(n * 100) / 100;
}

function inferCategoryFromDraft(draft: any): ProductCategory {
  const spec = draft?.spec ?? {};
  const price = draft?.price ?? {};
  const fromSpec = safeStr((spec as any)?.product_category ?? "");
  if (
    fromSpec === "unstitched_plain" ||
    fromSpec === "unstitched_dyeing" ||
    fromSpec === "unstitched_dyeing_tailoring" ||
    fromSpec === "stitched_ready"
  ) {
    return fromSpec as ProductCategory;
  }

  const mode = safeStr(price?.mode ?? "");
  if (mode === "stitched_total") return "stitched_ready";

  const dye = Boolean(spec?.dyeing_enabled);
  const tail = Boolean(spec?.tailoring_enabled);

  if (tail) return "unstitched_dyeing_tailoring";
  if (dye) return "unstitched_dyeing";
  return "unstitched_plain";
}

export default function Q04Inventory() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setInventoryQty } = ctx;

  const madeOnOrder = Boolean((draft?.spec as any)?.made_on_order ?? false);
  const category = inferCategoryFromDraft(draft);
  const isUnstitched = category !== "stitched_ready";

  const initialQtyText = useMemo(() => {
    if (madeOnOrder) return "0";
    const existingQty = Number(draft?.inventory_qty);
    return Number.isFinite(existingQty) && existingQty > 0
      ? String(roundMeter(existingQty))
      : "";
  }, [draft?.inventory_qty, madeOnOrder]);
  const qtyTextRef = useRef(initialQtyText);

  const canContinue = useMemo(() => {
    return Boolean(vendorId);
  }, [vendorId]);
  const disabledHint = !vendorId ? "Vendor not loaded." : "";

  useFocusEffect(
    React.useCallback(() => {
      if (madeOnOrder) return;
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [madeOnOrder])
  );

  function nextRouteAfterInventory() {
    if (category === "stitched_ready") return "/vendor/profile/add-product/q05a-stitched-total-cost";
    return "/vendor/profile/add-product/q05b-unstitched-cost-per-meter";
  }

  function patchSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        spec: { ...(prev?.spec ?? {}), ...patch },
      }));
    }
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (!madeOnOrder) {
      const cleanedQty = sanitizeNumber(qtyTextRef.current);
      const q = Number(cleanedQty);
      if (!cleanedQty || !Number.isFinite(q) || q < 0) {
        Alert.alert(
          "Invalid quantity",
          isUnstitched
            ? "Please enter valid available fabric length in meters."
            : "Please enter a valid inventory quantity (0 or more).",
        );
        return;
      }
      const nextQty = isUnstitched ? roundMeter(q) : Math.trunc(q);
      setInventoryQty?.(nextQty);
      if (isUnstitched) {
        patchSpec({
          inventory_unit: "m",
          inventory_length_m: nextQty,
        });
      }
    } else {
      setInventoryQty?.(0);
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push(nextRouteAfterInventory() as any);
  }

  return (
    <AddProductScreen
      title="Inventory"
      onBack={() => router.back()}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <AddProductField
          label={
            isUnstitched
              ? "Available fabric length (meters)"
              : "Inventory quantity"
          }
          required
          hint={
            madeOnOrder
              ? "Made on order. Inventory will be set as 0."
              : isUnstitched
                ? "Enter total fabric available in meters."
                : "Enter how many pieces are available."
          }
          style={{ marginTop: 0 }}
        >
          <AddProductInput
            ref={inputRef}
            defaultValue={madeOnOrder ? "0" : initialQtyText}
            placeholder="e.g., 10"
            style={madeOnOrder ? { opacity: 0.55 } : null}
            textValueRef={qtyTextRef}
            sanitizeText={sanitizeNumber}
            keyboardType={isUnstitched ? "decimal-pad" : "number-pad"}
            maxLength={10}
            commitMode="change"
            commitDelayMs={0}
            editable={!madeOnOrder}
            returnKeyType="done"
          />
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}
