// app/vendor-search.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setVendorIds } from "@/store/filtersSlice"; // <-- adjust import path if needed

const VENDOR_TABLE = "vendor";

type VendorRow = {
  id: number;
  name: string;
  shop_name?: string | null;
  location?: string | null;
};

function safe(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

export default function VendorSearchScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selectedFromRedux: string[] = useAppSelector((s: any) => s?.filters?.vendorIds ?? []);

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedFromRedux.map(String)));

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from(VENDOR_TABLE)
          .select("id, name, shop_name, location")
          .order("name", { ascending: true });

        if (!alive) return;

        if (error) {
          Alert.alert("Load error", error.message);
          setVendors([]);
          return;
        }

        setVendors(((data as any) ?? []) as VendorRow[]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vendors;

    return (vendors ?? []).filter((v) => {
      const a = String(v.name ?? "").toLowerCase();
      const b = String(v.shop_name ?? "").toLowerCase();
      const c = String(v.location ?? "").toLowerCase();
      return a.includes(term) || b.includes(term) || c.includes(term);
    });
  }, [vendors, q]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    const ids = Array.from(selected);
    dispatch(setVendorIds(ids));
    router.back();
  }

  function clear() {
    setSelected(new Set());
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.link} onPress={() => router.back()}>
          Back
        </Text>

        <Text style={styles.title} numberOfLines={1}>
          Vendors
        </Text>

        <Pressable onPress={apply} style={({ pressed }) => [styles.applyBtn, pressed ? { opacity: 0.7 } : null]}>
          <Text style={styles.applyText}>✅ Apply</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search vendor / shop / city…"
          placeholderTextColor="#9AA3AF"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable onPress={clear} style={({ pressed }) => [styles.clearBtn, pressed ? { opacity: 0.7 } : null]}>
          <Text style={styles.clearText}>🧹 Clear</Text>
        </Pressable>
      </View>

      <Text style={styles.meta}>
        Selected: <Text style={styles.metaStrong}>{selected.size}</Text>
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading vendors…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 10 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const id = String(item.id);
            const on = selected.has(id);

            return (
              <Pressable onPress={() => toggle(id)} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {safe(item.name)}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {safe(item.shop_name)} • {safe(item.location)}
                  </Text>
                </View>

                <Text style={styles.tick}>{on ? "✅" : "⬜️"}</Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No vendors found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  topRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  link: { fontSize: 16, color: "#111", fontWeight: "900" },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: "#111", paddingHorizontal: 10 },

  applyBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#EAF2FF",
    borderWidth: 1,
    borderColor: "#D9E2F2"
  },
  applyText: { fontSize: 13, fontWeight: "900", color: "#0B2F6B" },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", gap: 10, alignItems: "center" },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff"
  },
  clearBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)"
  },
  clearText: { fontSize: 13, fontWeight: "900", color: "#111" },

  meta: { paddingHorizontal: 16, paddingBottom: 6, fontSize: 12, color: "#60708A", fontWeight: "800" },
  metaStrong: { color: "#111", fontWeight: "900" },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  rowSub: { fontSize: 12, fontWeight: "700", color: "#60708A", marginTop: 3 },
  tick: { fontSize: 18, fontWeight: "900" },

  sep: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },
  center: { padding: 24, alignItems: "center", justifyContent: "center" },
  muted: { fontSize: 14, color: "#666", marginTop: 8 }
});
