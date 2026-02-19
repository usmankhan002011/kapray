import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type VendorTailorRow = {
  id: string;
  name: string;
  vendor_rating?: number | null; // 1..5 (vendor-maintained)
  stitching_cost?: number | null;
  dyeing_cost?: number | null;
  supports_dyeing?: boolean | null;
  currency?: string | null;
  turnaround_days?: number | null;
};

export default function TailorListModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    vendorId?: string;
    returnTo?: string;
    selectedTailorId?: string;
  }>();

  const returnTo = useMemo(() => (params.returnTo ? String(params.returnTo) : ""), [params.returnTo]);
  const selectedId = useMemo(
    () => (params.selectedTailorId ? String(params.selectedTailorId) : ""),
    [params.selectedTailorId]
  );

  // Vendor-managed only; later: fetch by vendorId from Supabase vendor_tailors
  const [tailors] = useState<VendorTailorRow[]>([]);

  const onSelect = (t: VendorTailorRow) => {
    if (returnTo) {
      router.replace({
        pathname: returnTo as any,
        params: { selectedTailorId: t.id }
      });
      return;
    }
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vendor Tailors</Text>

      <Text style={styles.subtitle}>
        Vendor-managed only. Rating and costs are maintained by the vendor.
      </Text>

      {tailors.length === 0 ? (
        <Text style={styles.empty}>No tailors available for this vendor.</Text>
      ) : (
        <View style={styles.list}>
          {tailors.map((t) => {
            const isSelected = selectedId === t.id;
            const cur = t.currency ?? "";
            return (
              <Pressable key={t.id} onPress={() => onSelect(t)} style={styles.row}>
                <Text style={[styles.name, isSelected ? styles.selected : null]}>{t.name}</Text>
                <Text style={styles.meta}>
                  Rating: {t.vendor_rating ?? "—"} | Stitch: {t.stitching_cost ?? "—"} {cur} | Dye:{" "}
                  {t.dyeing_cost ?? "—"} {cur}
                </Text>
                <Text style={styles.meta}>
                  Dyeing: {t.supports_dyeing ? "Yes" : "No"} | TAT: {t.turnaround_days ?? "—"} days
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Close</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, opacity: 0.85, lineHeight: 18 },
  empty: { fontSize: 14, opacity: 0.85, lineHeight: 18, marginTop: 8 },
  list: { gap: 12, marginTop: 6 },
  row: { gap: 6 },
  name: { fontSize: 16, fontWeight: "600" },
  selected: { textDecorationLine: "underline" },
  meta: { fontSize: 13, opacity: 0.85, lineHeight: 18 },
  link: { fontSize: 16, textDecorationLine: "underline", marginTop: 10 }
});
