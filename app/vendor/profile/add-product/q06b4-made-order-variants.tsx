// app/vendor/profile/add-product/q06b4-made-order-variants.tsx
import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import MadeOrderVariantEditor from "@/components/product/add-product/MadeOrderVariantEditor";
import {
  makeMadeOrderVariant,
  normalizeMadeOrderVariants,
  validateMadeOrderVariants,
  type MadeOrderVariant,
} from "@/utils/kapray/productVariants";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function resequenceMadeOrderVariants(variants: MadeOrderVariant[]) {
  return variants.map((variant, index) => {
    const variantNo = index + 1;
    const name = safeStr(variant.name);

    return {
      ...variant,
      id: safeStr(variant.id) || `made-order-variant-${variantNo}`,
      variant_no: variantNo,
      label: name ? `${name}` : `Variant ${variantNo}`,
      display_name: name ? `${name}` : `Variant ${variantNo}`,
      additional_price_pkr: Math.max(
        0,
        Math.trunc(Number(variant.additional_price_pkr || 0)),
      ),
      estimated_days: Math.max(
        0,
        Math.trunc(Number(variant.estimated_days || 0)),
      ),
      image_paths: Array.isArray(variant.image_paths)
        ? variant.image_paths
        : [],
      images: Array.isArray(variant.images) ? variant.images : [],
    };
  });
}

export default function Q06B4MadeOrderVariants() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setInventoryQty } = ctx;

  const productCategory = safeStr((draft?.spec as any)?.product_category ?? "");
  const madeOnOrder = Boolean((draft?.spec as any)?.made_on_order ?? false);

  const variants = useMemo(
    () =>
      resequenceMadeOrderVariants(
        normalizeMadeOrderVariants((draft?.price as any)?.made_order_variants),
      ),
    [draft?.price],
  );

  // Important: when the draft has no saved made-order variants yet, we still
  // render one editable seed variant. All update/add/remove handlers must use
  // this same source array, otherwise typing into the first empty field maps
  // over [] and immediately resets the TextInput value.
  const editableVariants = useMemo(
    () => (variants.length ? variants : [makeMadeOrderVariant(1)]),
    [variants],
  );

  const canContinue = Boolean(vendorId);

  function patchSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        spec: { ...(prev?.spec ?? {}), ...patch },
      }));
      return;
    }

    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

  function patchPrice(patch: any) {
    if (typeof ctx.setPrice === "function") {
      ctx.setPrice((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        price: { ...(prev?.price ?? {}), ...patch },
      }));
      return;
    }

    draft.price = { ...(draft?.price ?? {}), ...patch };
  }

  function persistVariants(nextVariants: MadeOrderVariant[]) {
    const cleanVariants = resequenceMadeOrderVariants(nextVariants);

    patchSpec({
      made_on_order: true,
      variant_mode: "made_order_variants",
    });

    patchPrice({
      mode: "stitched_total",
      made_order_variants: cleanVariants,
    });

    setInventoryQty?.(0);
  }

  function addVariant() {
    const next = [
      ...editableVariants,
      makeMadeOrderVariant(editableVariants.length + 1),
    ];
    persistVariants(next);
  }

  function updateVariant(index: number, nextVariant: MadeOrderVariant) {
    const next = editableVariants.map((variant, i) =>
      i === index ? nextVariant : variant,
    );
    persistVariants(next);
  }

  function removeVariant(index: number) {
    if (editableVariants.length <= 1) {
      Alert.alert(
        "One variant required",
        "Please keep at least one made-on-order variant.",
      );
      return;
    }

    const next = editableVariants.filter((_, i) => i !== index);
    persistVariants(next);
  }

  function goNext() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    if (productCategory !== "stitched_ready" || !madeOnOrder) {
      Alert.alert(
        "Wrong product flow",
        "Made-on-order variants are only for stitched products marked as made on order.",
      );
      return;
    }

    const finalVariants = resequenceMadeOrderVariants(editableVariants);
    const error = validateMadeOrderVariants(finalVariants);

    if (error) {
      Alert.alert("Incomplete variants", error);
      return;
    }

    persistVariants(finalVariants);

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q11-description" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Made-on-order variants</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              apStyles.linkBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>VARIANT DETAILS</Text>
          <Text style={apStyles.metaHint}>
            Add colors or designs that buyers can order. No sizes, quantities,
            or inventory are used here. Buyer sizing is collected during
            purchase.
          </Text>

          <View
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: apColors.borderSoft,
              borderRadius: 14,
              padding: 12,
              backgroundColor: "#F8FAFC",
            }}
          >
            <Text style={{ color: apColors.text, fontWeight: "900" }}>
              Inventory will be saved as 0
            </Text>
            <Text style={[apStyles.metaHint, { marginTop: 4 }]}>
              These are made after order confirmation, so stock is not deducted
              by variant.
            </Text>
          </View>
        </View>

        {editableVariants.map((variant, index) => (
          <MadeOrderVariantEditor
            key={`${safeStr(variant.id) || "made-order-variant"}-${index}`}
            variant={variant}
            index={index}
            canRemove={editableVariants.length > 1}
            onChange={(next) => updateVariant(index, next)}
            onRemove={() => removeVariant(index)}
          />
        ))}

        <Pressable
          onPress={addVariant}
          style={({ pressed }) => [
            apStyles.secondaryBtn,
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text style={apStyles.secondaryText}>+ Add Variant</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            apStyles.primaryBtn,
            !canContinue ? apStyles.primaryBtnDisabled : null,
            pressed ? apStyles.pressed : null,
          ]}
          onPress={goNext}
          disabled={!canContinue}
        >
          <Text style={apStyles.primaryText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
