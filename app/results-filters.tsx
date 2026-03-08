// app/results-filters.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { supabase } from "@/utils/supabase/client";

const TABLE_FABRIC_TYPES = "fabric_types";
const TABLE_WORK_TYPES = "work_types";
const TABLE_WORK_DENSITIES = "work_densities";
const TABLE_ORIGIN_CITIES = "origin_cities";
const TABLE_WEAR_STATES = "wear_states";

type NameRow = { id: any; name: string };

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
  if (minCostPkr !== null && maxCostPkr === null) return `${formatPKR(minCostPkr)}+`;
  if (minCostPkr === null && maxCostPkr !== null) return `Up to ${formatPKR(maxCostPkr)}`;
  return `${formatPKR(minCostPkr as number)} – ${formatPKR(maxCostPkr as number)}`;
}

export default function ResultsFiltersModal() {
  const router = useRouter();

  const filters = useAppSelector((s: any) => s.filters);

  const fabricTypeIds: string[] = filters?.fabricTypeIds ?? [];
  const colorShadeIds: string[] = filters?.colorShadeIds ?? [];
  const workTypeIds: string[] = filters?.workTypeIds ?? [];
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
              .order("name", { ascending: true })
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
  const densityMap = useMemo(() => buildNameMap(workDensities), [workDensities]);
  const originMap = useMemo(() => buildNameMap(originCities), [originCities]);
  const wearMap = useMemo(() => buildNameMap(wearStates), [wearStates]);

  const fabricNames = idsToNames(fabricTypeIds, fabricMap);
  const workNames = idsToNames(workTypeIds, workMap);
  const densityNames = idsToNames(workDensityIds, densityMap);
  const originNames = idsToNames(originCityIds, originMap);
  const wearNames = idsToNames(wearStateIds, wearMap);

  const colorNames = (colorShadeIds ?? []).map(safeStr).filter(Boolean);

  const priceValue = priceSummary(minCostPkr, maxCostPkr);

  function go(path: string) {
    // No route params for price. This "from" param is only for back navigation behavior.
    router.push({ pathname: path as any, params: { from: "results-filters" } } as any);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Filters 🔍</Text>
        <Text style={styles.close} onPress={() => router.back()}>
          Close
        </Text>
      </View>

      {/* <Text style={styles.note}>Dress Type is fixed from the first screen.</Text> */}

      <Pressable style={styles.row} onPress={() => go("/fabric")}>
        <View style={styles.left}>
          <Text style={styles.label}>Fabric</Text>
          <Text style={styles.value} numberOfLines={2}>
            {summary(fabricNames)}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => go("/color")}>
        <View style={styles.left}>
          <Text style={styles.label}>Color</Text>
          <Text style={styles.value} numberOfLines={2}>
            {summary(colorNames)}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => go("/work")}>
        <View style={styles.left}>
          <Text style={styles.label}>Work</Text>
          <Text style={styles.value} numberOfLines={2}>
            {summary(workNames)}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => go("/work-density")}>
        <View style={styles.left}>
          <Text style={styles.label}>Work Density</Text>
          <Text style={styles.value} numberOfLines={2}>
            {summary(densityNames)}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => go("/origin-city")}>
        <View style={styles.left}>
          <Text style={styles.label}>Origin City</Text>
          <Text style={styles.value} numberOfLines={2}>
            {summary(originNames)}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => go("/wear-state")}>
        <View style={styles.left}>
          <Text style={styles.label}>Wear State</Text>
          <Text style={styles.value} numberOfLines={2}>
            {summary(wearNames)}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => go("/price-band")}>
        <View style={styles.left}>
          <Text style={styles.label}>Price</Text>
          <Text style={styles.value} numberOfLines={2}>
            {priceValue}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111" },
  close: { fontSize: 14, fontWeight: "900", color: "#005ea6" },

  note: { marginBottom: 12, color: "#666", fontSize: 12 },

  row: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  left: { flex: 1, paddingRight: 10 },
  label: { fontSize: 13, fontWeight: "900", color: "#111" },
  value: { marginTop: 4, fontSize: 12, color: "#666" },
  arrow: { fontSize: 22, fontWeight: "900", color: "#666" }
});