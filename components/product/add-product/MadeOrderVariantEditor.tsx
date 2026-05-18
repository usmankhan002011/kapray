// components/product/add-product/MadeOrderVariantEditor.tsx
import React, { useMemo } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import {
  buildMadeOrderVariantDisplayName,
  type MadeOrderVariant,
  type MadeOrderVariantImage,
} from "@/utils/kapray/productVariants";

type Props = {
  variant: MadeOrderVariant;
  index?: number;
  canRemove?: boolean;
  onChange: (next: MadeOrderVariant) => void;
  onRemove?: () => void;
};

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function safeInt(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function sanitizeNumberText(v: string) {
  return String(v ?? "").replace(/[^0-9]/g, "");
}

function normalizeImages(v: unknown): MadeOrderVariantImage[] {
  const arr = Array.isArray(v) ? v : [];
  const seen = new Set<string>();
  const out: MadeOrderVariantImage[] = [];

  for (const item of arr) {
    const obj = (item ?? {}) as any;
    const uri = safeStr(obj?.uri ?? obj?.url ?? obj?.path ?? "");
    if (!uri || seen.has(uri)) continue;

    seen.add(uri);
    out.push({
      uri,
      width: Number.isFinite(Number(obj?.width))
        ? Number(obj.width)
        : undefined,
      height: Number.isFinite(Number(obj?.height))
        ? Number(obj.height)
        : undefined,
      fileName: obj?.fileName ?? null,
      mimeType: obj?.mimeType ?? null,
      fileSize: Number.isFinite(Number(obj?.fileSize))
        ? Number(obj.fileSize)
        : null,
      path: safeStr(obj?.path ?? "") || null,
      url: safeStr(obj?.url ?? "") || null,
    });
  }

  return out;
}

function firstRenderableUri(img: MadeOrderVariantImage) {
  return safeStr(img?.uri ?? img?.url ?? img?.path ?? "");
}

export default function MadeOrderVariantEditor({
  variant,
  index = 0,
  canRemove = true,
  onChange,
  onRemove,
}: Props) {
  const variantNo = safeInt(variant?.variant_no) || index + 1;
  const label = safeStr(variant?.label) || `Variant ${variantNo}`;
  const name = safeStr(variant?.name);
  const images = useMemo(() => normalizeImages(variant?.images), [variant]);

  const displayName = safeStr(variant?.display_name) || name;

  function patch(patchValue: Partial<MadeOrderVariant>) {
    const nextName =
      patchValue.name !== undefined ? safeStr(patchValue.name) : name;
    const nextVariantNo =
      patchValue.variant_no !== undefined
        ? safeInt(patchValue.variant_no) || variantNo
        : variantNo;

    onChange({
      ...variant,
      id: safeStr(variant?.id) || `made-order-variant-${nextVariantNo}`,
      variant_no: nextVariantNo,
      label: safeStr(variant?.label) || `Variant ${nextVariantNo}`,
      name: nextName,
      display_name: nextName
        ? buildMadeOrderVariantDisplayName(nextVariantNo, nextName)
        : "",
      additional_price_pkr: safeInt(
        patchValue.additional_price_pkr !== undefined
          ? patchValue.additional_price_pkr
          : variant?.additional_price_pkr,
      ),
      estimated_days: safeInt(
        patchValue.estimated_days !== undefined
          ? patchValue.estimated_days
          : variant?.estimated_days,
      ),
      image_paths: Array.isArray(variant?.image_paths)
        ? variant.image_paths
        : [],
      images,
      ...patchValue,
    });
  }

  async function pickImages() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo access to add variant images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (result.canceled) return;

      const picked: MadeOrderVariantImage[] = (result.assets ?? [])
        .map((asset: any) => ({
          uri: safeStr(asset?.uri),
          width: Number.isFinite(Number(asset?.width))
            ? Number(asset.width)
            : undefined,
          height: Number.isFinite(Number(asset?.height))
            ? Number(asset.height)
            : undefined,
          fileName: asset?.fileName ?? null,
          mimeType: asset?.mimeType ?? "image/jpeg",
          fileSize: Number.isFinite(Number(asset?.fileSize))
            ? Number(asset.fileSize)
            : null,
          path: null,
          url: null,
        }))
        .filter((asset) => !!asset.uri);

      const seen = new Set<string>();
      const merged = [...images, ...picked].filter((img) => {
        const uri = firstRenderableUri(img);
        if (!uri || seen.has(uri)) return false;
        seen.add(uri);
        return true;
      });

      patch({ images: merged });
    } catch (err: any) {
      Alert.alert(
        "Image picker error",
        err?.message || "Could not pick images.",
      );
    }
  }

  function removeImage(uri: string) {
    const clean = safeStr(uri);
    if (!clean) return;
    patch({
      images: images.filter((img) => firstRenderableUri(img) !== clean),
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.variantTitle}>{label}</Text>
          {displayName ? (
            <Text style={styles.variantSubtitle}>{displayName}</Text>
          ) : null}
        </View>

        {canRemove && onRemove ? (
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [
              styles.removeBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={apStyles.label}>COLOR / DESIGN NAME *</Text>
        <TextInput
          value={name}
          onChangeText={(text) => patch({ name: text })}
          placeholder="e.g., Black, Ivory Gold, Maroon Design"
          placeholderTextColor={apColors.muted}
          style={styles.input}
          maxLength={60}
        />
      </View>

      <View style={styles.twoColRow}>
        <View style={styles.twoColItem}>
          <Text style={apStyles.label}>ADDITIONAL PRICE</Text>
          <TextInput
            value={String(safeInt(variant?.additional_price_pkr) || 0)}
            onChangeText={(text) =>
              patch({ additional_price_pkr: safeInt(sanitizeNumberText(text)) })
            }
            placeholder="0"
            placeholderTextColor={apColors.muted}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={10}
          />
          <Text style={styles.helper}>PKR added to base price.</Text>
        </View>

        <View style={styles.twoColItem}>
          <Text style={apStyles.label}>ESTIMATED DAYS *</Text>
          <TextInput
            value={String(safeInt(variant?.estimated_days) || 0)}
            onChangeText={(text) =>
              patch({ estimated_days: safeInt(sanitizeNumberText(text)) })
            }
            placeholder="e.g., 7"
            placeholderTextColor={apColors.muted}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Text style={styles.helper}>Making time for this variant.</Text>
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={apStyles.label}>VARIANT IMAGES *</Text>

        <Pressable
          onPress={pickImages}
          style={({ pressed }) => [
            apStyles.secondaryBtn,
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text style={apStyles.secondaryText}>
            Upload Images {images.length ? `(${images.length})` : ""}
          </Text>
        </Pressable>

        {images.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageRow}
          >
            {images.map((img, imageIndex) => {
              const uri = firstRenderableUri(img);
              if (!uri) return null;

              return (
                <View key={`${uri}-${imageIndex}`} style={styles.thumbWrap}>
                  <Image
                    source={{ uri }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />

                  <Pressable
                    onPress={() => removeImage(uri)}
                    style={({ pressed }) => [
                      styles.removeImageBtn,
                      pressed ? apStyles.pressed : null,
                    ]}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyImageBox}>
            <Text style={styles.emptyImageText}>
              No variant images selected
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  variantTitle: {
    color: apColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  variantSubtitle: {
    marginTop: 2,
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  removeBtn: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeText: {
    color: "#B91C1C",
    fontWeight: "900",
    fontSize: 12,
  },
  fieldBlock: {
    gap: 8,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  twoColItem: {
    flex: 1,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: apColors.text,
    fontWeight: "800",
  },
  helper: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  imageRow: {
    paddingTop: 10,
    gap: 10,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    backgroundColor: "#F3F4F6",
  },
  thumb: {
    width: 84,
    height: 84,
  },
  removeImageBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.78)",
  },
  removeImageText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900",
  },
  emptyImageBox: {
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImageText: {
    color: apColors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
});
