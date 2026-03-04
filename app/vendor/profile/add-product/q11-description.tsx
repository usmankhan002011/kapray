import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";

const MODALS = [
  "dress-type_modal",
  "fabric_modal",
  "color_modal",
  "work_modal",
  "work-density_modal",
  "origin-city_modal",
  "wear-state_modal"
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

const stylesVars = {
  bg: "#F5F7FB",
  cardBg: "#FFFFFF",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",
  blue: "#0B2F6B",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A"
};

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

  // This screen’s route (origin screen for these modals)
  const modalReturnTo = "/vendor/profile/add-product/q11-description";

  function goPickModal(name: ModalName) {
    // DO NOT TOUCH: modal navigation is exactly kept as your existing file
    const encoded = encodeURIComponent(modalReturnTo);
    router.push(`/vendor/profile/(product-modals)/${name}?returnTo=${encoded}` as any);
  }

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function dressTypeSummary() {
    const names = (draft?.spec as any)?.dressTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Not set");
    const ids = (draft?.spec?.dressTypeIds ?? []).map((x: any) => String(x));
    if (!ids.length) return "Not set";
    return `${ids.length} selected`;
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
    if (!list.length) return "Any";

    const map: Record<string, string> = {
      red: "Red",
      green: "Green",
      yellow: "Yellow",
      blue: "Blue",
      golden: "Golden",
      silver: "Silver",
      white: "White",
      black: "Black"
    };

    const mapped = list.map((id) => map[String(id)] ?? String(id));
    return formatPicked(mapped, "Any");
  }

  function workSummary() {
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
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft?.spec?.wearStateIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  const dressTypeValue = dressTypeSummary();
  const fabricValue = fabricSummary();
  const colorValue = colorSummary();
  const workValue = workSummary();
  const densityValue = densitySummary();
  const originValue = originSummary();
  const wearValue = wearStateSummary();

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    return (draft?.spec?.dressTypeIds ?? []).length >= 1;
  }, [vendorId, draft]);

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

    router.push("/vendor/profile/add-product/q12-more-description" as any);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Description</Text>

        <Pressable
          onPress={closeScreen}
          style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.linkText}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Build Product Description</Text>

        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [styles.pickBtn, pressed ? styles.pressed : null]}
            onPress={() => goPickModal("dress-type_modal")}
          >
            <Text style={styles.pickTitle}>Dress Type *</Text>
            <Text style={styles.pickValue}>{dressTypeValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.pickBtn, pressed ? styles.pressed : null]}
            onPress={() => goPickModal("fabric_modal")}
          >
            <Text style={styles.pickTitle}>Fabric</Text>
            <Text style={styles.pickValue}>{fabricValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.pickBtn, pressed ? styles.pressed : null]}
            onPress={() => goPickModal("color_modal")}
          >
            <Text style={styles.pickTitle}>Color</Text>
            <Text style={styles.pickValue}>{colorValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.pickBtn, pressed ? styles.pressed : null]}
            onPress={() => goPickModal("work_modal")}
          >
            <Text style={styles.pickTitle}>Work</Text>
            <Text style={styles.pickValue}>{workValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.pickBtn, pressed ? styles.pressed : null]}
            onPress={() => goPickModal("work-density_modal")}
          >
            <Text style={styles.pickTitle}>Density</Text>
            <Text style={styles.pickValue}>{densityValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.pickBtn, pressed ? styles.pressed : null]}
            onPress={() => goPickModal("origin-city_modal")}
          >
            <Text style={styles.pickTitle}>Origin</Text>
            <Text style={styles.pickValue}>{originValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.pickBtn, pressed ? styles.pressed : null]}
            onPress={() => goPickModal("wear-state_modal")}
          >
            <Text style={styles.pickTitle}>Wear State</Text>
            <Text style={styles.pickValue}>{wearValue}</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            !canContinue ? styles.primaryBtnDisabled : null,
            pressed ? styles.pressed : null
          ]}
          onPress={onContinue}
          disabled={!canContinue}
        >
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: stylesVars.bg },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  linkText: { color: stylesVars.blue, fontWeight: "900" },

  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 14
  },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.blue },
  btnRow: { marginTop: 12, gap: 10 },

  pickBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  pickTitle: { color: stylesVars.blue, fontWeight: "900", fontSize: 13 },
  pickValue: { marginTop: 4, color: stylesVars.text, opacity: 0.8, fontSize: 12 },

  primaryBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: stylesVars.blue
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  pressed: { opacity: 0.75 }
});