import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

const MODALS = [
  "fabric_modal",
  "color_modal",
  "work_modal",
  "work-density_modal",
  "origin-city_modal",
  "wear-state_modal",
] as const;

type ModalName = (typeof MODALS)[number];

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

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

export default function Q11Description() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = pickFirstString((params as any)?.returnTo) ?? "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const { draft } = useProductDraft() as any;
  const modalReturnTo = "/vendor/profile/add-product/q11-description";

  function goPickModal(name: ModalName) {
    const encoded = encodeURIComponent(modalReturnTo);
    router.push(
      `/vendor/profile/(product-modals)/${name}?returnTo=${encoded}` as any,
    );
  }

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function fabricSummary() {
    const names = (draft?.spec as any)?.fabricTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft?.spec?.fabricTypeIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function colorSummary() {
    const names = (draft?.spec as any)?.colorShadeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft?.spec?.colorShadeIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function workSummary() {
    const subNames = (draft?.spec as any)?.workSubTypeNames as
      | any[]
      | undefined;
    if (Array.isArray(subNames) && subNames.length) {
      return formatPicked(subNames, "Any");
    }

    const names = (draft?.spec as any)?.workTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");

    const list = (draft?.spec?.workTypeIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function densitySummary() {
    const names = (draft?.spec as any)?.workDensityNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft?.spec?.workDensityIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function originSummary() {
    const names = (draft?.spec as any)?.originCityNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft?.spec?.originCityIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function wearStateSummary() {
    const names = (draft?.spec as any)?.wearStateNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "None");
    const list = (draft?.spec?.wearStateIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "None";
  }

  const fabricValue = fabricSummary();
  const colorValue = colorSummary();
  const workValue = workSummary();
  const densityValue = densitySummary();
  const originValue = originSummary();
  const wearValue = wearStateSummary();
  const detailItems: Array<{
    label: string;
    value: string;
    modal: ModalName;
  }> = [
    { label: "Fabric", value: fabricValue, modal: "fabric_modal" },
    { label: "Color", value: colorValue, modal: "color_modal" },
    { label: "Work", value: workValue, modal: "work_modal" },
    { label: "Density", value: densityValue, modal: "work-density_modal" },
    { label: "Origin", value: originValue, modal: "origin-city_modal" },
    { label: "Includes", value: wearValue, modal: "wear-state_modal" },
  ];

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);
  const disabledHint = !vendorId ? "Vendor not loaded." : "";

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q12-more-description" as any);
  }

  return (
    <AddProductScreen
      title="Description"
      onBack={closeScreen}
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
          label="Details"
          style={{ marginTop: 0 }}
        >
          <View style={styles.list}>
            {detailItems.map((item) => {
              const selected = item.value !== "Any";

              return (
                <Pressable
                  key={item.modal}
                  style={({ pressed }) => [
                    styles.pickRow,
                    selected ? styles.pickRowOn : null,
                    pressed ? apStyles.pressed : null,
                  ]}
                  onPress={() => goPickModal(item.modal)}
                >
                  <View style={styles.pickTextBlock}>
                    <Text
                      numberOfLines={1}
                      style={styles.pickTitle}
                    >
                      {item.label}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.pickValue,
                        selected ? styles.pickValueOn : null,
                      ]}
                    >
                      {item.value}
                    </Text>
                  </View>

                  <Text style={styles.pickAction}>Edit</Text>
                </Pressable>
              );
            })}
          </View>
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 12,
    gap: 10,
  },

  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: apColors.white,
    borderWidth: 1,
    borderColor: apColors.border,
  },

  pickRowOn: {
    backgroundColor: "#F8FAFF",
    borderColor: "#D7E3FF",
  },

  pickTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  pickTitle: {
    color: apColors.text,
    fontWeight: "800",
    fontSize: 13,
  },

  pickValue: {
    marginTop: 4,
    color: apColors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  pickValueOn: {
    color: apColors.subText,
  },

  pickAction: {
    color: apColors.blue,
    fontSize: 12,
    fontWeight: "800",
  },
});
