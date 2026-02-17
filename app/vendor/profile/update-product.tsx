// app/vendor/profile/update-product.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";

const PRODUCTS_TABLE = "products";

const MODAL_ORDER = [
  "dress-type",
  "fabric",
  "color",
  "work",
  "work-density",
  "origin-city",
  "wear-state"
] as const;

type ModalName = (typeof MODAL_ORDER)[number];

type ProductRow = {
  id: string;
  vendor_id: number;
  product_code: string | null;
  title: string | null;
  inventory_qty: number | null;
  spec: any;
  price: any;
  media: any;
  created_at?: string | null;
  updated_at?: string | null;
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function safeJson(v: any) {
  if (v && typeof v === "object") return v;
  return {};
}

function normalizeIdArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function safeNumOrZero(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

export default function UpdateProductScreen() {
  const router = useRouter();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => {
    return products.find((p) => p.id === selectedId) ?? null;
  }, [products, selectedId]);

  // Editable fields (local state, independent of Add Product draft)
  const [title, setTitle] = useState("");
  const [inventoryQty, setInventoryQty] = useState<number>(0);

  const [priceMode, setPriceMode] = useState<"stitched_total" | "unstitched_per_meter">(
    "stitched_total"
  );
  const [priceTotal, setPriceTotal] = useState<number>(0);
  const [pricePerMeter, setPricePerMeter] = useState<number>(0);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  // spec selections (ids)
  const [dressTypeIds, setDressTypeIds] = useState<number[]>([]);
  const [fabricTypeIds, setFabricTypeIds] = useState<string[]>([]);
  const [colorShadeIds, setColorShadeIds] = useState<string[]>([]);
  const [workTypeIds, setWorkTypeIds] = useState<string[]>([]);
  const [workDensityIds, setWorkDensityIds] = useState<string[]>([]);
  const [originCityIds, setOriginCityIds] = useState<string[]>([]);
  const [wearStateIds, setWearStateIds] = useState<string[]>([]);

  async function fetchProducts() {
    if (!vendorId) {
      Alert.alert("Vendor missing", "Please ensure vendor.id is loaded.");
      return;
    }

    try {
      setLoadingList(true);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select("id, vendor_id, product_code, title, inventory_qty, spec, price, media, created_at, updated_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      setProducts((data as any) ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load products.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // When selecting a product, hydrate editor state from its DB fields
  useEffect(() => {
    if (!selected) return;

    setTitle(safeText(selected.title));
    setInventoryQty(safeNumOrZero(selected.inventory_qty));

    const price = safeJson(selected.price);
    const mode =
      price?.mode === "unstitched_per_meter" ? "unstitched_per_meter" : "stitched_total";
    setPriceMode(mode);

    setPriceTotal(safeNumOrZero(price?.cost_pkr_total));
    setPricePerMeter(safeNumOrZero(price?.cost_pkr_per_meter));
    setAvailableSizes(
      Array.isArray(price?.available_sizes)
        ? price.available_sizes.map((x: any) => String(x).trim()).filter(Boolean)
        : []
    );

    const spec = safeJson(selected.spec);

    setDressTypeIds(
      Array.isArray(spec?.dressTypeIds)
        ? spec.dressTypeIds.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n))
        : []
    );

    setFabricTypeIds(normalizeIdArray(spec?.fabricTypeIds));
    setColorShadeIds(normalizeIdArray(spec?.colorShadeIds));
    setWorkTypeIds(normalizeIdArray(spec?.workTypeIds));
    setWorkDensityIds(normalizeIdArray(spec?.workDensityIds));
    setOriginCityIds(normalizeIdArray(spec?.originCityIds));
    setWearStateIds(normalizeIdArray(spec?.wearStateIds));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const code = String(p.product_code ?? "").toLowerCase();
      const t = String(p.title ?? "").toLowerCase();
      return code.includes(q) || t.includes(q);
    });
  }, [products, query]);

  function pushModalGuided(name: ModalName) {
    router.push(
      `/vendor/profile/(product-modals)/${name}_modal?guided=1&step=${name}` as any
    );
  }

  function goPickModal(name: ModalName) {
    pushModalGuided(name);
  }

  const mediaCounts = useMemo(() => {
    const m = safeJson(selected?.media);
    const images = Array.isArray(m?.images) ? m.images.length : 0;
    const videos = Array.isArray(m?.videos) ? m.videos.length : 0;
    return { images, videos };
  }, [selected]);

  const canSave = useMemo(() => {
    if (!vendorId) return false;
    if (!selectedId) return false;
    if (!title.trim()) return false;

    if (priceMode === "unstitched_per_meter") {
      const n = Number(pricePerMeter ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    } else {
      const n = Number(priceTotal ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    }

    if ((dressTypeIds ?? []).length < 1) return false;

    return true;
  }, [vendorId, selectedId, title, priceMode, pricePerMeter, priceTotal, dressTypeIds]);

  function summaryLine(label: string, value: string) {
    return (
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    );
  }

  async function saveUpdate() {
    if (saving) return;

    if (!canSave) {
      Alert.alert("Incomplete", "Please select a product and fill required fields.");
      return;
    }

    if (!vendorId || !selectedId) {
      Alert.alert("Missing", "Vendor or product is missing.");
      return;
    }

    try {
      setSaving(true);

      const spec = {
        ...(safeJson(selected?.spec) ?? {}),
        dressTypeIds: (dressTypeIds ?? []).map((x) => Number(x)).filter((n) => Number.isFinite(n)),
        fabricTypeIds: fabricTypeIds ?? [],
        colorShadeIds: colorShadeIds ?? [],
        workTypeIds: workTypeIds ?? [],
        workDensityIds: workDensityIds ?? [],
        originCityIds: originCityIds ?? [],
        wearStateIds: wearStateIds ?? []
      };

      const price =
        priceMode === "unstitched_per_meter"
          ? {
              mode: "unstitched_per_meter",
              cost_pkr_per_meter: Number(pricePerMeter ?? 0)
            }
          : {
              mode: "stitched_total",
              cost_pkr_total: Number(priceTotal ?? 0),
              available_sizes: (availableSizes ?? []).filter(Boolean)
            };

      const updatePayload = {
        title: title.trim(),
        inventory_qty: Number(inventoryQty ?? 0),
        spec,
        price,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select("id, vendor_id, product_code, title, inventory_qty, spec, price, media, created_at, updated_at")
        .single();

      if (error) {
        Alert.alert("Update failed", error.message);
        return;
      }

      const updated = data as any as ProductRow;

      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

      Alert.alert("Updated", `Saved changes for ${safeText(updated.product_code)}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Update Product</Text>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.linkText}>Close</Text>
        </Pressable>
      </View>

      {!vendorId ? (
        <Text style={styles.warn}>
          Vendor not loaded. Please ensure vendorSlice has vendor.id (bigint).
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pick a product</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by product code or title..."
          placeholderTextColor={stylesVars.placeholder}
          style={styles.input}
          maxLength={80}
        />

        <View style={styles.topActionsRow}>
          <Text
            style={[styles.refresh, loadingList && styles.disabledText]}
            onPress={loadingList ? undefined : fetchProducts}
          >
            {loadingList ? "Loading..." : "Refresh"}
          </Text>
        </View>

        {loadingList ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading products…</Text>
          </View>
        ) : filtered.length ? (
          <View style={styles.list}>
            {filtered.slice(0, 30).map((p) => {
              const isOn = p.id === selectedId;
              const code = safeText(p.product_code);
              const t = safeText(p.title);

              return (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [
                    styles.item,
                    isOn ? styles.itemOn : null,
                    pressed ? styles.pressed : null
                  ]}
                  onPress={() => setSelectedId(p.id)}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemCode}>{code}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {t}
                    </Text>
                  </View>

                  <Text style={styles.itemArrow}>{isOn ? "✓" : "›"}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>No products found.</Text>
        )}

        {filtered.length > 30 ? (
          <Text style={styles.hint}>Showing first 30 matches. Refine your search.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Edit details</Text>

        {!selected ? (
          <Text style={styles.empty}>Select a product above to edit.</Text>
        ) : (
          <>
            <Text style={styles.metaLine}>
              Selected:{" "}
              <Text style={styles.metaStrong}>{safeText(selected.product_code)}</Text>
            </Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Bridal heavy embroidered lehenga"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              maxLength={80}
            />

            <Text style={styles.label}>Inventory Quantity *</Text>
            <TextInput
              value={String(inventoryQty ?? 0)}
              onChangeText={(t) => setInventoryQty(Number(sanitizeNumber(t) || "0"))}
              placeholder="e.g., 10"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text style={styles.label}>Cost Mode *</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setPriceMode("stitched_total")}
                style={({ pressed }) => [
                  styles.segment,
                  priceMode === "stitched_total" ? styles.segmentOn : null,
                  pressed ? styles.pressed : null
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    priceMode === "stitched_total" ? styles.segmentTextOn : null
                  ]}
                >
                  Stitched / Ready-to-wear
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPriceMode("unstitched_per_meter")}
                style={({ pressed }) => [
                  styles.segment,
                  priceMode === "unstitched_per_meter" ? styles.segmentOn : null,
                  pressed ? styles.pressed : null
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    priceMode === "unstitched_per_meter" ? styles.segmentTextOn : null
                  ]}
                >
                  Unstitched (PKR/meter)
                </Text>
              </Pressable>
            </View>

            {priceMode === "stitched_total" ? (
              <>
                <Text style={styles.label}>Total Cost (PKR) *</Text>
                <TextInput
                  value={String(priceTotal ?? "")}
                  onChangeText={(t) => setPriceTotal(Number(sanitizeNumber(t) || "0"))}
                  placeholder="e.g., 25000"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  maxLength={12}
                />

                <Text style={styles.label}>Available Sizes (comma separated)</Text>
                <TextInput
                  value={(availableSizes ?? []).join(", ")}
                  onChangeText={(t) =>
                    setAvailableSizes(
                      t
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="e.g., XS, S, M, L"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  maxLength={80}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Cost per Meter (PKR) *</Text>
                <TextInput
                  value={String(pricePerMeter ?? "")}
                  onChangeText={(t) =>
                    setPricePerMeter(Number(sanitizeNumber(t) || "0"))
                  }
                  placeholder="e.g., 1800"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  maxLength={12}
                />
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Selections</Text>

        {!selected ? (
          <Text style={styles.empty}>Select a product above to edit selections.</Text>
        ) : (
          <>
            <View style={styles.btnRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => goPickModal("dress-type")}
                disabled={saving}
              >
                <Text style={styles.pickText}>Dress Type *</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => goPickModal("fabric")}
                disabled={saving}
              >
                <Text style={styles.pickText}>Fabric</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => goPickModal("color")}
                disabled={saving}
              >
                <Text style={styles.pickText}>Color</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => goPickModal("work")}
                disabled={saving}
              >
                <Text style={styles.pickText}>Work</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => goPickModal("work-density")}
                disabled={saving}
              >
                <Text style={styles.pickText}>Density</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => goPickModal("origin-city")}
                disabled={saving}
              >
                <Text style={styles.pickText}>Origin</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => goPickModal("wear-state")}
                disabled={saving}
              >
                <Text style={styles.pickText}>Wear State</Text>
              </Pressable>
            </View>

            <View style={styles.summaryBox}>
              {summaryLine(
                "Dress Type",
                dressTypeIds.length ? `${dressTypeIds.length} selected` : "Not set"
              )}
              {summaryLine(
                "Fabric",
                fabricTypeIds.length ? `${fabricTypeIds.length} selected` : "Any"
              )}
              {summaryLine(
                "Color",
                colorShadeIds.length ? `${colorShadeIds.length} selected` : "Any"
              )}
              {summaryLine(
                "Work",
                workTypeIds.length ? `${workTypeIds.length} selected` : "Any"
              )}
              {summaryLine(
                "Density",
                workDensityIds.length ? `${workDensityIds.length} selected` : "Any"
              )}
              {summaryLine(
                "Origin",
                originCityIds.length ? `${originCityIds.length} selected` : "Any"
              )}
              {summaryLine(
                "Wear State",
                wearStateIds.length ? `${wearStateIds.length} selected` : "Any"
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Media (read-only in v1)</Text>

        {!selected ? (
          <Text style={styles.empty}>Select a product above to view media counts.</Text>
        ) : (
          <View style={styles.summaryBox}>
            {summaryLine("Images", String(mediaCounts.images))}
            {summaryLine("Videos", String(mediaCounts.videos))}
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          !canSave || saving ? styles.saveBtnDisabled : null,
          pressed ? styles.pressed : null
        ]}
        onPress={saveUpdate}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving…" : "Save Changes"}</Text>
      </Pressable>

      {!vendorId ? (
        <Text style={styles.warn}>
          Vendor not loaded. Please ensure vendorSlice has vendor.id (bigint).
        </Text>
      ) : null}
    </ScrollView>
  );
}

const stylesVars = {
  bg: "#F5F7FB",
  cardBg: "#FFFFFF",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",
  blue: "#0B2F6B",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A",
  placeholder: "#94A3B8"
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: stylesVars.bg },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
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

  label: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.2
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    backgroundColor: "#fff"
  },

  metaLine: { marginTop: 8, color: stylesVars.subText, fontWeight: "800" },
  metaStrong: { color: stylesVars.blue, fontWeight: "900" },

  topActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  refresh: { fontSize: 14, fontWeight: "900", color: "#005ea6" },
  disabledText: { opacity: 0.6 },

  list: { gap: 10, marginTop: 12 },

  item: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  itemOn: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft
  },

  itemLeft: { flex: 1, paddingRight: 10 },
  itemCode: { fontSize: 12, fontWeight: "900", color: stylesVars.blue },
  itemTitle: { marginTop: 2, fontSize: 13, fontWeight: "800", color: "#111" },
  itemArrow: { fontSize: 18, fontWeight: "900", color: stylesVars.subText },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10
  },
  loadingText: { color: stylesVars.subText, fontWeight: "800" },

  hint: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },

  segmentRow: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" },
  segment: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  segmentOn: {
    backgroundColor: stylesVars.blueSoft,
    borderColor: stylesVars.blue
  },
  segmentText: { color: stylesVars.text, fontWeight: "900", fontSize: 12 },
  segmentTextOn: { color: stylesVars.blue },

  btnRow: { marginTop: 12, gap: 10 },

  pickBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  pickText: { color: stylesVars.blue, fontWeight: "900", fontSize: 13 },

  summaryBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 12,
    backgroundColor: "#F8FAFF"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8
  },
  summaryLabel: { fontSize: 12, fontWeight: "900", color: stylesVars.blue },
  summaryValue: {
    fontSize: 12,
    color: stylesVars.text,
    opacity: 0.9,
    flex: 1,
    textAlign: "right"
  },

  saveBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: stylesVars.blue
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  warn: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },
  empty: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },

  pressed: { opacity: 0.75 }
});
