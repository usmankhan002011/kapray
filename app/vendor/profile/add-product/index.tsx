// app/vendor/profile/add-product/index.tsx
import React, { useMemo, useRef } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles } from "@/components/product/addProductStyles";
import { useAutoFocus } from "@/components/product/useAutoFocus";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export default function AddProductIndex() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const { draft, setTitle } = useProductDraft() as any;

  const title = String(draft?.title ?? "");

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    return Boolean(title.trim());
  }, [vendorId, title]);

  // ✅ Clean reusable autofocus
  useAutoFocus(inputRef);

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a product title.");
      return;
    }

    // ✅ If coming from Review (or any returnTo), go back there after saving
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q02-category" as any);
  }

  function onClose() {
    // ✅ If coming from Review (or any returnTo), close returns to Review
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Title</Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Product title *</Text>

          <TextInput
            ref={inputRef}
            value={title}
            onChangeText={(t) => setTitle?.(t)}
            placeholder="e.g., Bridal heavy embroidered lehenga"
            style={apStyles.input}
            maxLength={80}
            returnKeyType="done"
          />

          <Pressable
            style={({ pressed }) => [
              apStyles.primaryBtn,
              !canContinue ? apStyles.primaryBtnDisabled : null,
              pressed ? apStyles.pressed : null
            ]}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text style={apStyles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}