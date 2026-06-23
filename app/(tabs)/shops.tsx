// app/(tabs)/shops.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setVendorIds } from "@/store/filtersSlice";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

const VENDOR_TABLE = "vendor";

type VendorRow = {
  id: number;
  name: string;
  shop_name?: string | null;
  location?: string | null;
};

function safe(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "-";
}

export default function VendorSearchScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selectedFromRedux: string[] = useAppSelector(
    (s: any) => s?.filters?.vendorIds ?? [],
  );

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedFromRedux.map(String)),
  );

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

  function openVendorProfile(id: string) {
    router.push({
      pathname: "/(buyer)/view-profile",
      params: { vendorId: id },
    } as any);
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

        <Pressable
          onPress={apply}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.actionText}>Apply</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search vendor / shop / city..."
          placeholderTextColor={stylesVars.placeholder}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          onPress={clear}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.actionText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.helperText}>Select vendors to filter products.</Text>
        <Text style={styles.meta}>
          <Text style={styles.metaStrong}>{selected.size}</Text> selected
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading vendors...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const id = String(item.id);
            const on = selected.has(id);
            const title = safe(item.shop_name || item.name);
            const subTitle = item.shop_name ? safe(item.name) : `Vendor #${id}`;

            return (
              <View style={[styles.vendorCard, on && styles.vendorCardSelected]}>
                <Pressable
                  onPress={() => openVendorProfile(id)}
                  style={({ pressed }) => [
                    styles.vendorInfo,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {subTitle}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {safe(item.location)}
                  </Text>
                  <Text style={styles.viewProfileText}>View</Text>
                </Pressable>

                <Pressable
                  onPress={() => toggle(id)}
                  style={({ pressed }) => [
                    styles.selectBtn,
                    on && styles.selectBtnOn,
                    pressed ? styles.pressed : null,
                  ]}
                  hitSlop={8}
                >
                  <Text style={[styles.selectText, on && styles.selectTextOn]}>
                    {on ? "Selected" : "Select"}
                  </Text>
                </Pressable>
              </View>
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
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: apColors.white,
  black: "#000000",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  topRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  link: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.blue,
    fontWeight: "800",
    letterSpacing: 0,
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: apFontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: stylesVars.text,
    paddingHorizontal: 10,
    letterSpacing: 0,
  },

  actionBtn: {
    minHeight: 40,
    borderRadius: apRadii.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: apRadii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: apFontFamily,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: stylesVars.white,
    letterSpacing: 0,
  },

  summaryRow: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  helperText: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.subText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  meta: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  metaStrong: {
    color: stylesVars.text,
    fontWeight: "800",
  },

  listContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 12,
  },

  vendorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    backgroundColor: stylesVars.cardBg,
    minWidth: 0,
  },

  vendorCardSelected: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft,
  },

  vendorInfo: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    fontFamily: apFontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  rowSub: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.mutedText,
    marginTop: 2,
    letterSpacing: 0,
  },

  viewProfileText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    color: stylesVars.blue,
    marginTop: 4,
    letterSpacing: 0,
  },

  selectBtn: {
    minHeight: 34,
    minWidth: 78,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  selectBtnOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  selectText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  selectTextOn: {
    color: stylesVars.white,
  },

  center: {
    margin: 16,
    padding: 18,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },

  muted: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "600",
    marginTop: 8,
    letterSpacing: 0,
  },

  pressed: {
    opacity: 0.82,
  },
});
