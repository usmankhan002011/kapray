import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
import { flattenWorkSubTypeNames } from "@/data/workSubTypes";
import { useAppSelector } from "@/store/hooks";
import { supabase } from "@/utils/supabase/client";

const TABLE_FABRIC_TYPES = "fabric_types";
const TABLE_WORK_TYPES = "work_types";
const TABLE_WORK_DENSITIES = "work_densities";
const TABLE_ORIGIN_CITIES = "origin_cities";
const TABLE_WEAR_STATES = "wear_states";

type NameRow = { id: any; name: string };
type FilterIconName = React.ComponentProps<typeof MaterialIcons>["name"];

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  stitched_ready: "Ready-to-Wear",
  stitched_made_order: "Made-on-Order",
  unstitched: "Unstitched",
};

function productCategorySummary(productCategoryIds: string[]) {
  if (!Array.isArray(productCategoryIds) || !productCategoryIds.length) {
    return "All";
  }

  const names = productCategoryIds
    .map((id) => PRODUCT_CATEGORY_LABELS[String(id).trim()] ?? "")
    .filter(Boolean);

  return names.length ? names.join(", ") : "All";
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function formatPKR(n: number) {
  return `PKR ${Math.round(n).toLocaleString()}`;
}

function buildNameMap(rows: NameRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows ?? []) {
    const id = safeStr((r as any).id);
    const name = safeStr((r as any).name);
    if (id && name) m.set(id, name);
  }
  return m;
}

function idsToNames(ids: string[], map: Map<string, string>): string[] {
  if (!Array.isArray(ids) || !ids.length) return [];
  return ids
    .map((id) => map.get(String(id)) ?? "")
    .map((x) => safeStr(x))
    .filter(Boolean);
}

function summary(names: string[]) {
  if (!names.length) return "Any";
  return names.join(", ");
}

function priceSummary(minCostPkr: number | null, maxCostPkr: number | null) {
  if (minCostPkr === null && maxCostPkr === null) return "Any";
  if (minCostPkr !== null && maxCostPkr === null) {
    return `${formatPKR(minCostPkr)}+`;
  }
  if (minCostPkr === null && maxCostPkr !== null) {
    return `Up to ${formatPKR(maxCostPkr)}`;
  }
  return `${formatPKR(minCostPkr as number)} - ${formatPKR(maxCostPkr as number)}`;
}

function FilterRow({
  label,
  value,
  icon,
  active,
  onPress,
}: {
  label: string;
  value: string;
  icon: FilterIconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        active ? styles.rowActive : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, active ? styles.iconBoxActive : null]}>
        <MaterialIcons
          name={icon}
          size={18}
          color={active ? stylesVars.blue : stylesVars.subText}
        />
      </View>

      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[styles.value, active ? styles.valueActive : null]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={22}
        color={active ? stylesVars.blue : stylesVars.subText}
      />
    </Pressable>
  );
}

export default function ResultsFiltersModal() {
  const router = useRouter();

  const filters = useAppSelector((s: any) => s.filters);

  const legacyProductCategory = String(
    filters?.productCategory ?? "all",
  ).trim();
  const productCategoryIds: string[] = Array.isArray(
    filters?.productCategoryIds,
  )
    ? filters.productCategoryIds
    : legacyProductCategory && legacyProductCategory !== "all"
      ? [legacyProductCategory]
      : [];

  const fabricTypeIds: string[] = filters?.fabricTypeIds ?? [];
  const colorShadeIds: string[] = filters?.colorShadeIds ?? [];
  const workTypeIds: string[] = filters?.workTypeIds ?? [];
  const workSubTypeMap = filters?.workSubTypeMap ?? {};
  const workDensityIds: string[] = filters?.workDensityIds ?? [];
  const originCityIds: string[] = filters?.originCityIds ?? [];
  const wearStateIds: string[] = filters?.wearStateIds ?? [];

  const minCostPkr: number | null = filters?.minCostPkr ?? null;
  const maxCostPkr: number | null = filters?.maxCostPkr ?? null;

  const [fabricTypes, setFabricTypes] = useState<NameRow[]>([]);
  const [workTypes, setWorkTypes] = useState<NameRow[]>([]);
  const [workDensities, setWorkDensities] = useState<NameRow[]>([]);
  const [originCities, setOriginCities] = useState<NameRow[]>([]);
  const [wearStates, setWearStates] = useState<NameRow[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [fabricRes, workRes, densityRes, originRes, wearRes] =
          await Promise.all([
            supabase
              .from(TABLE_FABRIC_TYPES)
              .select("id, name")
              .order("sort_order", { ascending: true }),
            supabase
              .from(TABLE_WORK_TYPES)
              .select("id, name")
              .order("name", { ascending: true }),
            supabase
              .from(TABLE_WORK_DENSITIES)
              .select("id, name")
              .order("name", { ascending: true }),
            supabase
              .from(TABLE_ORIGIN_CITIES)
              .select("id, name")
              .order("name", { ascending: true }),
            supabase
              .from(TABLE_WEAR_STATES)
              .select("id, name")
              .order("name", { ascending: true }),
          ]);

        if (!alive) return;

        setFabricTypes(((fabricRes as any).data as any) ?? []);
        setWorkTypes(((workRes as any).data as any) ?? []);
        setWorkDensities(((densityRes as any).data as any) ?? []);
        setOriginCities(((originRes as any).data as any) ?? []);
        setWearStates(((wearRes as any).data as any) ?? []);
      } catch {
        if (!alive) return;
        setFabricTypes([]);
        setWorkTypes([]);
        setWorkDensities([]);
        setOriginCities([]);
        setWearStates([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const fabricMap = useMemo(() => buildNameMap(fabricTypes), [fabricTypes]);
  const workMap = useMemo(() => buildNameMap(workTypes), [workTypes]);
  const densityMap = useMemo(
    () => buildNameMap(workDensities),
    [workDensities],
  );
  const originMap = useMemo(() => buildNameMap(originCities), [originCities]);
  const wearMap = useMemo(() => buildNameMap(wearStates), [wearStates]);

  const fabricNames = idsToNames(fabricTypeIds, fabricMap);
  const workNames = idsToNames(workTypeIds, workMap);
  const densityNames = idsToNames(workDensityIds, densityMap);
  const originNames = idsToNames(originCityIds, originMap);
  const wearNames = idsToNames(wearStateIds, wearMap);

  const colorNames = (colorShadeIds ?? []).map(safeStr).filter(Boolean);
  const workSubTypeNames = flattenWorkSubTypeNames(workSubTypeMap);
  const priceValue = priceSummary(minCostPkr, maxCostPkr);
  const hasPrice = minCostPkr !== null || maxCostPkr !== null;

  function go(path: string) {
    router.push({
      pathname: path as any,
      params: { from: "results-filters" },
    } as any);
  }

  const closeToResults = useCallback(() => {
    router.replace("/(tabs)/flow/results" as any);
    return true;
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      closeToResults,
    );
    return () => sub.remove();
  }, [closeToResults]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Filters</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          style={({ pressed }) => [
            styles.closeBtn,
            pressed ? styles.pressed : null,
          ]}
          onPress={closeToResults}
        >
          <MaterialIcons name="close" size={18} color={stylesVars.blue} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        <FilterRow
          label="Category"
          value={productCategorySummary(productCategoryIds)}
          icon="category"
          active={productCategoryIds.length > 0}
          onPress={() => go("/product-category")}
        />

        <FilterRow
          label="Fabric"
          value={summary(fabricNames)}
          icon="texture"
          active={fabricTypeIds.length > 0}
          onPress={() => go("/fabric")}
        />

        <FilterRow
          label="Color"
          value={summary(colorNames)}
          icon="palette"
          active={colorNames.length > 0}
          onPress={() => go("/color")}
        />

        <FilterRow
          label="Work"
          value={
            workSubTypeNames.length
              ? summary(workSubTypeNames)
              : summary(workNames)
          }
          icon="build"
          active={workTypeIds.length > 0 || workSubTypeNames.length > 0}
          onPress={() => go("/work")}
        />

        <FilterRow
          label="Density"
          value={summary(densityNames)}
          icon="grain"
          active={workDensityIds.length > 0}
          onPress={() => go("/work-density")}
        />

        <FilterRow
          label="Origin"
          value={summary(originNames)}
          icon="place"
          active={originCityIds.length > 0}
          onPress={() => go("/origin-city")}
        />

        <FilterRow
          label="Includes"
          value={summary(wearNames)}
          icon="check-circle-outline"
          active={wearStateIds.length > 0}
          onPress={() => go("/wear-state")}
        />

        <FilterRow
          label="Price"
          value={priceValue}
          icon="attach-money"
          active={hasPrice}
          onPress={() => go("/price-band")}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apply filters"
          onPress={closeToResults}
          style={({ pressed }) => [
            styles.applyBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
  white: apColors.white,
  black: "#000000",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: apFontFamily,
    color: stylesVars.text,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.white,
    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    paddingBottom: 12,
  },

  scroll: {
    flex: 1,
  },

  row: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: stylesVars.cardBg,
  },

  rowActive: {
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.white,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.white,
    alignItems: "center",
    justifyContent: "center",
  },

  iconBoxActive: {
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
  },

  left: {
    flex: 1,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: apFontFamily,
    color: stylesVars.text,
  },

  value: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    fontFamily: apFontFamily,
  },

  valueActive: {
    color: stylesVars.blue,
    fontWeight: "600",
  },

  pressed: {
    opacity: 0.82,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: stylesVars.bg,
  },

  applyBtn: {
    minHeight: 48,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  applyText: {
    color: stylesVars.white,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: apFontFamily,
  },
});
