import React, { useMemo } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductPrimaryButton,
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

export default function Q09Images() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const { draft, setImages } = useProductDraft() as any;

  const pickedImages: any[] = Array.isArray(draft?.media?.images) ? draft.media.images : [];
  const imageCount = pickedImages.length;

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    return imageCount >= 1;
  }, [vendorId, imageCount]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : imageCount < 1
      ? "Pick at least one product image."
      : "";

  async function pickImages() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.9
    });

    if (res.canceled) return;

    setImages?.((prev: any[]) => {
      const p = Array.isArray(prev) ? prev : [];
      const seen = new Set(p.map((a) => a.uri));
      const next = [...p];
      for (const a of res.assets) {
        if (!seen.has(a.uri)) next.push(a);
      }
      return next;
    });
  }

  function removeImage(uri: string) {
    setImages?.((prev: any[]) => {
      const p = Array.isArray(prev) ? prev : [];
      return p.filter((a: any) => safeStr(a?.uri) !== uri);
    });
  }

  function makePrimary(index: number) {
    setImages?.((prev: any[]) => {
      const p = Array.isArray(prev) ? [...prev] : [];
      if (index <= 0 || index >= p.length) return p;

      const selected = p.splice(index, 1)[0];
      p.unshift(selected);
      return p;
    });
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }
    if (imageCount < 1) {
      Alert.alert("Images required", "Please pick at least 1 image.");
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q10-videos" as any);
  }

  return (
    <AddProductScreen
      title="Images"
      onBack={() => router.back()}
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
          label="Pick at least 1 image"
          required
          hint="First image will be used as Banner / Title Image."
          style={{ marginTop: 0 }}
        >
          <AddProductPrimaryButton
            label={`Pick Images ${imageCount ? `(${imageCount})` : ""}`}
            onPress={pickImages}
          />

          {pickedImages.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageStrip}
            >
              {pickedImages.map((a: any, idx: number) => {
                const uri = safeStr(a?.uri);
                if (!uri) return null;

                const isPrimary = idx === 0;

                return (
                  <View
                    key={`${uri}-${idx}`}
                    style={styles.imageTile}
                  >
                    <Image source={{ uri }} style={styles.imageThumb} />

                    {isPrimary ? (
                      <View style={styles.bannerBadge}>
                        <Text style={styles.tileText}>Banner</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => makePrimary(idx)}
                        style={({ pressed }) => [
                          styles.makeBannerBadge,
                          pressed ? apStyles.pressed : null
                        ]}
                        hitSlop={10}
                      >
                        <Text style={styles.tileText}>Make Banner</Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => removeImage(uri)}
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed ? apStyles.pressed : null
                      ]}
                      hitSlop={10}
                    >
                      <Text style={styles.removeText}>X</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={apStyles.metaHint}>No images selected yet.</Text>
          )}
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  imageStrip: {
    paddingTop: 10,
    gap: 10,
  },
  imageTile: {
    width: 84,
    height: 84,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    backgroundColor: "#f3f4f6",
  },
  imageThumb: {
    width: 84,
    height: 84,
  },
  bannerBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(11,47,107,0.88)",
  },
  makeBannerBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  tileText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 10,
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  removeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
});
