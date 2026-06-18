import React, { useRef } from "react";
import {
  Alert,
  type TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { useAutoFocus } from "@/components/product/useAutoFocus";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductInput,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export default function Q01Title() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const { draft, setTitle } = useProductDraft() as any;
  const initialTitle = String(draft?.title ?? "");
  const titleTextRef = useRef(initialTitle);
  const disabledHint = !vendorId ? "Vendor not loaded." : "";

  useAutoFocus(inputRef);

  function saveTitle() {
    const nextTitle = String(titleTextRef.current ?? "").trim();
    if (!nextTitle) {
      Alert.alert("Title required", "Please enter a product title.");
      return null;
    }

    setTitle?.(nextTitle);
    return nextTitle;
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (!saveTitle()) return;

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q02-category" as any);
  }

  function onClose() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  return (
    <AddProductScreen
      title="Product Title"
      onBack={onClose}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!vendorId}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <AddProductField
          label="Product title"
          required
          hint="Use the name buyers will see on product cards and search results."
          style={{ marginTop: 0 }}
        >
          <AddProductInput
            ref={inputRef}
            defaultValue={initialTitle}
            textValueRef={titleTextRef}
            placeholder="e.g., Bridal heavy embroidered lehenga"
            autoCorrect={false}
            spellCheck={false}
            maxLength={80}
            returnKeyType="next"
            onBlur={() => {
              const nextTitle = String(titleTextRef.current ?? "").trim();
              if (nextTitle) setTitle?.(nextTitle);
            }}
            onSubmitEditing={onContinue}
          />
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}
