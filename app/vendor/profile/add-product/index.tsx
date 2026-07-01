import React, { useMemo } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductScreen,
  AddProductSecondaryButton,
} from "@/components/product/add-product/AddProductWizard";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function formatPicked(list: any, emptyLabel: string) {
  const arr = Array.isArray(list) ? list : [];
  const cleaned = arr.map((x) => safeStr(x)).filter(Boolean);
  if (!cleaned.length) return emptyLabel;
  return cleaned.join(", ");
}

function dressTypeSummary(draft: any) {
  const names = (draft?.spec as any)?.dressTypeNames as any[] | undefined;
  if (Array.isArray(names) && names.length) {
    return formatPicked(names, "Not set");
  }

  const ids = (draft?.spec?.dressTypeIds ?? []).map((x: any) => String(x));
  if (!ids.length) return "Select dress type";
  return `${ids.length} selected`;
}

export default function AddProductDressType() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const { draft } = useProductDraft() as any;
  const dressTypeValue = dressTypeSummary(draft);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    return (draft?.spec?.dressTypeIds ?? []).length >= 1;
  }, [vendorId, draft]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : !canContinue
      ? "Select at least one dress type."
      : "";

  function openDressTypeModal() {
    const screenPath = "/vendor/profile/add-product";
    const modalReturnTo = returnTo
      ? `${screenPath}?returnTo=${encodeURIComponent(returnTo)}`
      : screenPath;
    const encoded = encodeURIComponent(modalReturnTo);

    router.push(
      `/vendor/profile/(product-modals)/dress-type_modal?returnTo=${encoded}` as any,
    );
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if ((draft?.spec?.dressTypeIds ?? []).length < 1) {
      Alert.alert("Dress type required", "Please select at least one dress type.");
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q01-title" as any);
  }

  function onClose() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  return (
    <AddProductScreen
      title="Dress type"
      onBack={onClose}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <AddProductField label="Dress type" required style={{ marginTop: 0 }}>
          <AddProductSecondaryButton
            label={dressTypeValue}
            onPress={openDressTypeModal}
            style={{ marginTop: 10 }}
          />
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}
