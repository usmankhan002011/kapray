import React, { useMemo } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";
import {
  apColors,
  apFontFamily,
  apStyles,
} from "@/components/product/addProductStyles";

type SelectedDressType = {
  key: string;
  label: string;
  code: string;
};

const DRESS_TYPE_LOCAL_IMAGES: Record<string, any> = {
  lehnga_set: require("@/assets/dress-types-images/LEHNGA_SET.png"),
  maxi_gown: require("@/assets/dress-types-images/MAXI_GOWN.png"),
  peshwas_frock: require("@/assets/dress-types-images/PESHWAS_FROCK.png"),
  saree: require("@/assets/dress-types-images/SAREE.png"),
  sharara: require("@/assets/dress-types-images/SHARARA.png"),
  shirt_and_bottom_set: require("@/assets/dress-types-images/SHIRT_AND_BOTTOM_SET.png"),
  dupatta: require("@/assets/dress-types-images/DUPATTA.png"),
  farchi_lehnga: require("@/assets/dress-types-images/FARCHI_LEHNGA.png"),
  gharara: require("@/assets/dress-types-images/GHARARA.png"),
  blouse: require("@/assets/dress-types-images/BLOUSE.png"),
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function selectedDressTypes(draft: any): SelectedDressType[] {
  const names = (draft?.spec as any)?.dressTypeNames as any[] | undefined;
  const codes = (draft?.spec as any)?.dressTypeCodes as any[] | undefined;
  const ids = (draft?.spec?.dressTypeIds ?? []).map((x: any) => String(x));

  return ids.map((id: string, index: number) => {
    const label = safeStr(Array.isArray(names) ? names[index] : "");
    const code = safeStr(Array.isArray(codes) ? codes[index] : "");

    return {
      key: id || `${label}-${index}`,
      label: label || `Dress type ${index + 1}`,
      code,
    };
  });
}

export default function AddProductDressType() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const { draft } = useProductDraft() as any;
  const pickedDressTypes = selectedDressTypes(draft);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    return (draft?.spec?.dressTypeIds ?? []).length >= 1;
  }, [vendorId, draft]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : !canContinue
      ? "Select at least one dress type."
      : "";

  function openDressTypeModal() {
    const screenPath = "/vendor/profile/add-product";
    const modalReturnTo = returnTo
      ? `${screenPath}?returnTo=${encodeURIComponent(returnTo)}`
      : screenPath;
    const encoded = encodeURIComponent(modalReturnTo);

    router.push(
      `/vendor/profile/(product-modals)/dress-type_modal?returnTo=${encoded}` as any,
    );
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if ((draft?.spec?.dressTypeIds ?? []).length < 1) {
      Alert.alert("Dress type required", "Please select at least one dress type.");
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q01-title" as any);
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
      title="Dress type"
      onBack={onClose}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <AddProductField
          label="Selected dress type"
          required
          style={{ marginTop: 0 }}
        >
          {pickedDressTypes.length ? (
            <View style={styles.selectedList}>
              {pickedDressTypes.map((item) => {
                const localImage = item.code
                  ? DRESS_TYPE_LOCAL_IMAGES[item.code]
                  : null;

                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    onPress={openDressTypeModal}
                    style={({ pressed }) => [
                      styles.selectedRow,
                      pressed ? apStyles.pressed : null,
                    ]}
                  >
                    {localImage ? (
                      <View style={styles.silhouetteWrap}>
                        <Image
                          source={localImage}
                          style={styles.silhouette}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}

                    <Text style={styles.selectedName} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={openDressTypeModal}
              style={({ pressed }) => [
                styles.emptySelect,
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text style={styles.emptySelectText}>Select dress type</Text>
            </Pressable>
          )}

          {pickedDressTypes.length ? (
            <Pressable
              accessibilityRole="button"
              onPress={openDressTypeModal}
              style={({ pressed }) => [
                styles.changeButton,
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </Pressable>
          ) : null}
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  selectedList: {
    marginTop: 10,
    gap: 8,
  },
  selectedRow: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  silhouetteWrap: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  silhouette: {
    width: 26,
    height: 26,
  },
  selectedName: {
    flex: 1,
    color: apColors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    fontFamily: apFontFamily,
  },
  emptySelect: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptySelectText: {
    color: apColors.blue,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: apFontFamily,
  },
  changeButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  changeButtonText: {
    color: apColors.blue,
    fontSize: 13,
    fontWeight: "800",
    fontFamily: apFontFamily,
  },
});
