import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type VendorCourierRow = {
  id: string;
  name: string;
  vendor_rating?: number | null; // vendor-maintained
  scope?: "local" | "international" | "both" | null;
};

export default function CourierListModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    vendorId?: string;
    returnTo?: string;
    selectedCourierId?: string;
  }>();

  const returnTo = useMemo(() => (params.returnTo ? String(params.returnTo) : ""), [params.returnTo]);
  const selectedId = useMemo(
    () => (params.selectedCourierId ? String(params.selectedCourierId) : ""),
    [params.selectedCourierId]
  );

  // Vendor-managed only; later: fetch by vendorId from Supabase vendor_couriers
  const [couriers] = useState<VendorCourierRow[]>([]);

  const onSelect = (c: VendorCourierRow) => {
    if (returnTo) {
      router.replace({
        pathname: returnTo as any,
        params: { selectedCourierId: c.id }
      });
      return;
    }
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vendor Couriers</Text>

      <Text style={styles.subtitle}>
        Vendor-managed only. Courier rating is assigned by vendor. Rates will be applied at checkout from vendor
        rate cards.
      </Text>

      {couriers.length === 0 ? (
        <Text style={styles.empty}>No couriers available for this vendor.</Text>
      ) : (
        <View style={styles.list}>
          {couriers.map((c) => {
            const isSelected = selectedId === c.id;
            return (
              <Pressable key={c.id} onPress={() => onSelect(c)} style={styles.row}>
                <Text style={[styles.name, isSelected ? styles.selected : null]}>{c.name}</Text>
                <Text style={styles.meta}>
                  Rating: {c.vendor_rating ?? "—"} | Scope: {c.scope ?? "—"}
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
