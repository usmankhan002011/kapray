// app/vendor/profile/add-product/q06b4-made-order-variants.tsx
import React, { useMemo } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles } from "@/components/product/addProductStyles";
import MadeOrderVariantEditor from "@/components/product/add-product/MadeOrderVariantEditor";
import {
  makeMadeOrderVariant,
  normalizeMadeOrderVariants,
  validateMadeOrderVariants,
  type MadeOrderVariant,
} from "@/utils/kapray/productVariants";
import {
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function makeEditableMadeOrderVariant(variantNo: number): MadeOrderVariant {
  return {
    ...makeMadeOrderVariant(variantNo),
    variant_no: variantNo,
    label: `Style ${variantNo}`,
    display_name: "",
    name: "",
  } as MadeOrderVariant;
}

function resequenceMadeOrderVariants(variants: MadeOrderVariant[]) {
  return variants.map((variant, index) => {
    const variantNo = index + 1;
    const name = safeStr(variant.name);

    return {
      ...variant,
      id: safeStr(variant.id) || `made-order-variant-${variantNo}`,
      variant_no: variantNo,
      label: `Style ${variantNo}`,
      display_name: name,
      name,
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

  // Important: when the draft has no saved made-order styles yet, render one
  // editable seed style. Do not let makeMadeOrderVariant's default display_name
  // duplicate the visible label in MadeOrderVariantEditor.
  const editableVariants = useMemo(
    () => (variants.length ? variants : [makeEditableMadeOrderVariant(1)]),
    [variants],
  );

  const disabledHint = useMemo(() => {
    if (!vendorId) return "Vendor not loaded.";
    if (productCategory !== "stitched_ready" || !madeOnOrder) {
      return "Made-on-order styles are only for made-on-order stitched products.";
    }
    return (
      validateMadeOrderVariants(resequenceMadeOrderVariants(editableVariants)) ||
      ""
    );
  }, [editableVariants, madeOnOrder, productCategory, vendorId]);
  const canContinue = !disabledHint;

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
    const nextVariantNo = editableVariants.length + 1;
    const next = [
      ...editableVariants,
      makeEditableMadeOrderVariant(nextVariantNo),
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
        "One style required",
        "Please keep at least one made-on-order style.",
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
        "Made-on-order styles are only for stitched products marked as made on order.",
      );
      return;
    }

    const finalVariants = resequenceMadeOrderVariants(editableVariants);
    const error = validateMadeOrderVariants(finalVariants);

    if (error) {
      Alert.alert("Incomplete styles", error);
      return;
    }

    persistVariants(finalVariants);

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/review" as any);
  }

  return (
    <AddProductScreen
      title="Made-on-order styles"
      onBack={() => router.back()}
      footer={
        <AddProductFooter
          onPrimaryPress={goNext}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Add product styles</Text>

          <Text style={apStyles.metaHint}>
            Add styles when this made-on-order stitched product can be made in
            different colours, styles, or designs within the same product.
          </Text>

          <Text style={[apStyles.metaHint, { marginTop: 8 }]}>
            Each style may have its own name, reference images, additional
            price, and estimated making time. Buyers will choose one of these
            styles before providing their sizing details.
          </Text>
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
          <Text style={apStyles.secondaryText}>+ Add Style</Text>
        </Pressable>
    </AddProductScreen>
  );
}
