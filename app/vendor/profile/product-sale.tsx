import React, { useCallback, useEffect, useMemo, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import {
  apColors,
  apFontFamily,
  apInputTextStyle,
  apRadii,
} from "@/components/product/addProductStyles";
import { useAppSelector } from "@/store/hooks";
import { supabase } from "@/utils/supabase/client";
import {
  applyProductSale,
  endProductSale,
  formatPkr,
  getActiveProductSale,
  getProductSaleReferenceCost,
} from "@/utils/kapray/productSale";

const PRODUCTS_TABLE = "products";

type ProductRow = {
  id: number;
  vendor_id: number;
  product_code: string | null;
  title: string | null;
  price: any;
  updated_at?: string | null;
};

function safeInt(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeText(v: unknown) {
  const s = String(v ?? "").trim();
  return s || "-";
}

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export default function ProductSaleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId?: string;
    product_id?: string;
  }>();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.id ?? null) ??
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);
  const productId = safeInt(
    (params as any)?.productId ?? (params as any)?.product_id,
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [saleCostText, setSaleCostText] = useState("");

  const saleInfo = useMemo(
    () => getActiveProductSale(product?.price),
    [product?.price],
  );

  const reference = useMemo(
    () => getProductSaleReferenceCost(product?.price),
    [product?.price],
  );

  const previousLabel = reference
    ? `${formatPkr(reference.previousCostPkr)}${reference.unitSuffix}`
    : "-";
  const currentLabel = reference
    ? `${formatPkr(reference.currentCostPkr)}${reference.unitSuffix}`
    : "-";

  const newSaleCost = Number(sanitizeNumber(saleCostText) || "0");
  const newSaleLabel = reference
    ? `${formatPkr(newSaleCost)}${reference.unitSuffix}`
    : "-";
  const newDiscountPercent =
    reference && Number.isFinite(newSaleCost) && newSaleCost > 0
      ? Math.max(
          1,
          Math.min(
            99,
            Math.round(
              ((reference.previousCostPkr - newSaleCost) /
                reference.previousCostPkr) *
                100,
            ),
          ),
        )
      : 0;
  const canSave =
    Boolean(product && vendorId && productId && reference) &&
    Number.isFinite(newSaleCost) &&
    newSaleCost > 0 &&
    reference != null &&
    newSaleCost < reference.previousCostPkr &&
    !saving;

  const loadProduct = useCallback(async () => {
    if (!vendorId || !productId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select("id, vendor_id, product_code, title, price, updated_at")
        .eq("id", productId)
        .eq("vendor_id", vendorId)
        .single();

      if (error) {
        Alert.alert("Load error", error.message);
        setProduct(null);
        return;
      }

      const row = data as unknown as ProductRow;
      setProduct(row);

      const activeSale = getActiveProductSale(row?.price);
      setSaleCostText(activeSale ? String(Math.round(activeSale.currentCostPkr)) : "");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load product.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId, vendorId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  function confirmSaveSale() {
    if (!product || !vendorId || !productId || !reference) return;

    const cleaned = Number(sanitizeNumber(saleCostText) || "0");
    if (!Number.isFinite(cleaned) || cleaned <= 0) {
      Alert.alert("Invalid price", "Enter a valid sale price.");
      return;
    }

    if (cleaned >= reference.previousCostPkr) {
      Alert.alert(
        "Sale price too high",
        "New sale price must be lower than the previous price.",
      );
      return;
    }

    const cleanSaleLabel = `${formatPkr(cleaned)}${reference.unitSuffix}`;
    const discountPercent = Math.max(
      1,
      Math.min(
        99,
        Math.round(
          ((reference.previousCostPkr - cleaned) /
            reference.previousCostPkr) *
            100,
        ),
      ),
    );

    Alert.alert(
      "Confirm Sale Price?",
      [
        `Product: ${safeText(product.product_code)}`,
        `Previous price: ${previousLabel}`,
        `New sale price: ${cleanSaleLabel}`,
        `Discount: -${discountPercent}%`,
      ].join("\n"),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Sale",
          style: "destructive",
          onPress: () => {
            void saveSale(cleaned);
          },
        },
      ],
    );
  }

  async function saveSale(cleaned: number) {
    if (!product || !vendorId || !productId || !reference) return;

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const nextPrice = applyProductSale(product.price, cleaned, now);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update({
          price: nextPrice,
          updated_at: now,
        })
        .eq("id", productId)
        .eq("vendor_id", vendorId)
        .select("id, vendor_id, product_code, title, price, updated_at")
        .single();

      if (error) {
        Alert.alert("Sale not saved", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProduct(updated);
      const updatedSale = getActiveProductSale(updated.price);
      setSaleCostText(
        updatedSale ? String(Math.round(updatedSale.currentCostPkr)) : "",
      );

      Alert.alert("Sale saved", "Product price has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save sale.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmEndSale() {
    if (!product || !vendorId || !productId || !saleInfo) return;

    Alert.alert(
      "End sale?",
      "This will restore the previous price on this product.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Sale",
          style: "destructive",
          onPress: () => {
            void endSale();
          },
        },
      ],
    );
  }

  async function endSale() {
    if (!product || !vendorId || !productId) return;

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const nextPrice = endProductSale(product.price, now);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update({
          price: nextPrice,
          updated_at: now,
        })
        .eq("id", productId)
        .eq("vendor_id", vendorId)
        .select("id, vendor_id, product_code, title, price, updated_at")
        .single();

      if (error) {
        Alert.alert("Sale not ended", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProduct(updated);
      setSaleCostText("");

      Alert.alert("Sale ended", "Previous product price has been restored.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not end sale.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Product Sale</Text>
          <Text style={styles.subtitle}>Reduce price for buyer display</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sale screen"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <MaterialIcons name="close" size={18} color={stylesVars.blue} />
        </Pressable>
      </View>

      {!vendorId || !productId ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Product not loaded</Text>
          <Text style={styles.noticeText}>Open Sale from your product list.</Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      ) : product ? (
        <>
          <View style={styles.card}>
            <Text style={styles.productCode}>{safeText(product.product_code)}</Text>
            <Text style={styles.productTitle}>{safeText(product.title)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Previous Cost</Text>
            <Text style={styles.previousPrice}>{previousLabel}</Text>

            <Text style={styles.label}>Current Cost</Text>
            <Text style={saleInfo ? styles.salePrice : styles.currentPrice}>
              {currentLabel}
            </Text>

            {saleInfo ? (
              <View style={styles.discountPill}>
                <Text style={styles.discountText}>
                  -{saleInfo.discountPercent}%
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>New Sale Cost</Text>
            <FastNumberInput
              value={saleCostText}
              onChangeText={(value) => setSaleCostText(sanitizeNumber(value))}
              placeholder="e.g., 8000"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              keyboardType="decimal-pad"
              maxLength={12}
            />

            {canSave ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewPrice}>{newSaleLabel}</Text>
                <View style={styles.previewPill}>
                  <Text style={styles.previewPillText}>
                    -{newDiscountPercent}%
                  </Text>
                </View>
              </View>
            ) : null}

            {reference ? (
              <Text style={styles.hint}>
                Enter a price below {previousLabel}.
              </Text>
            ) : (
              <Text style={styles.hint}>
                This product does not have an editable price.
              </Text>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save product sale"
            disabled={!canSave}
            onPress={confirmSaveSale}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canSave ? styles.disabled : null,
              pressed && canSave ? styles.pressed : null,
            ]}
          >
            <View style={styles.btnContent}>
              <MaterialIcons
                name={saving ? "hourglass-empty" : "local-offer"}
                size={18}
                color={stylesVars.white}
              />
              <Text style={styles.primaryText}>
                {saving ? "Saving..." : saleInfo ? "Update Sale" : "Start Sale"}
              </Text>
            </View>
          </Pressable>

          {saleInfo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End product sale"
              disabled={saving}
              onPress={confirmEndSale}
              style={({ pressed }) => [
                styles.secondaryBtn,
                saving ? styles.disabled : null,
                pressed && !saving ? styles.pressed : null,
              ]}
            >
              <Text style={styles.secondaryText}>End Sale</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Product not found</Text>
          <Text style={styles.noticeText}>Return to Products and try again.</Text>
        </View>
      )}
    </ScrollView>
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
  white: apColors.white,
};

const styles = StyleSheet.create({
  content: {
    minHeight: "100%",
    padding: 16,
    paddingBottom: 96,
    backgroundColor: stylesVars.bg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontFamily: apFontFamily,
    fontSize: 20,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  subtitle: {
    marginTop: 2,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: stylesVars.mutedText,
    letterSpacing: 0,
  },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    marginTop: 14,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 16,
  },

  productCode: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  productTitle: {
    marginTop: 5,
    fontFamily: apFontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  label: {
    marginTop: 10,
    fontFamily: apFontFamily,
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.mutedText,
    letterSpacing: 0,
  },

  previousPrice: {
    marginTop: 5,
    fontFamily: apFontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: stylesVars.mutedText,
    textDecorationLine: "line-through",
    letterSpacing: 0,
  },

  currentPrice: {
    marginTop: 5,
    fontFamily: apFontFamily,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  salePrice: {
    marginTop: 5,
    fontFamily: apFontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: stylesVars.danger,
    letterSpacing: 0,
  },

  discountPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder,
    backgroundColor: stylesVars.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  discountText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.danger,
    letterSpacing: 0,
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: apRadii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    ...apInputTextStyle,
    color: stylesVars.text,
    backgroundColor: stylesVars.white,
  },

  previewBox: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  previewPrice: {
    flexShrink: 1,
    fontFamily: apFontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: stylesVars.danger,
    letterSpacing: 0,
  },

  previewPill: {
    minHeight: 26,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder,
    backgroundColor: stylesVars.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  previewPillText: {
    fontFamily: apFontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    color: stylesVars.danger,
    letterSpacing: 0,
  },

  hint: {
    marginTop: 8,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: stylesVars.mutedText,
    letterSpacing: 0,
  },

  notice: {
    marginTop: 14,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    padding: 14,
  },

  noticeTitle: {
    fontFamily: apFontFamily,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  noticeText: {
    marginTop: 4,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: stylesVars.mutedText,
    letterSpacing: 0,
  },

  loadingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 16,
  },

  loadingText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: stylesVars.mutedText,
    letterSpacing: 0,
  },

  primaryBtn: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  secondaryBtn: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder,
    backgroundColor: stylesVars.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryText: {
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "900",
    color: stylesVars.white,
    letterSpacing: 0,
  },

  secondaryText: {
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "900",
    color: stylesVars.danger,
    letterSpacing: 0,
  },

  disabled: {
    opacity: 0.55,
  },

  pressed: {
    opacity: 0.82,
  },
});
