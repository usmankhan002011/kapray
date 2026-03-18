// app/vendor-search.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setVendorIds } from "@/store/filtersSlice";

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

        <Pressable onPress={apply} style={({ pressed }) => [styles.applyBtn, pressed ? styles.pressed : null]}>
          <Text style={styles.applyText}>✅ Apply</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search vendor / shop / city…"
          placeholderTextColor={stylesVars.placeholder}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable onPress={clear} style={({ pressed }) => [styles.clearBtn, pressed ? styles.pressed : null]}>
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
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const id = String(item.id);
            const on = selected.has(id);

            return (
              <Pressable onPress={() => toggle(id)} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
                <View style={styles.rowLeft}>
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

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
  black: "#000000"
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  topRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  link: {
    fontSize: 14,
    color: stylesVars.blue,
    fontWeight: "700"
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
    paddingHorizontal: 10
  },

  applyBtn: {
    minHeight: 40,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  applyText: {
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.blue
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },

  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    backgroundColor: stylesVars.white
  },

  clearBtn: {
    minHeight: 40,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: stylesVars.cardBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: "center",
    justifyContent: "center"
  },

  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.text
  },

  meta: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  metaStrong: {
    color: stylesVars.text,
    fontWeight: "700"
  },

  listContent: {
    padding: 16,
    paddingTop: 10
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12
  },

  rowLeft: {
    flex: 1
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text
  },

  rowSub: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.mutedText,
    marginTop: 3
  },

  tick: {
    fontSize: 18,
    fontWeight: "700"
  },

  sep: {
    height: 1,
    backgroundColor: stylesVars.border
  },

  center: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center"
  },

  muted: {
    fontSize: 14,
    color: stylesVars.mutedText,
    fontWeight: "500",
    marginTop: 8
  },

  pressed: {
    opacity: 0.82
  }
});