import React, { useMemo } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { READY_STANDARD_SIZES } from "@/data/kapray/productPieces";
import {
  buildReadyVariantDisplayName,
  normalizeReadyVariantImages,
  ReadyVariant,
  ReadyVariantSize,
} from "@/utils/kapray/productVariants";
import { apColors, apStyles } from "@/components/product/addProductStyles";

type Props = {
  variant: ReadyVariant;
  basePrice: number;
  onChange: (next: ReadyVariant) => void;
  onRemove?: () => void;
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function sanitizeIntText(v: string) {
  return v.replace(/[^\d]/g, "");
}

export default function ReadyVariantEditor({
  variant,
  basePrice,
  onChange,
  onRemove,
}: Props) {
  const finalPrice = useMemo(() => {
    return Number(basePrice || 0) + Number(variant.additional_price_pkr || 0);
  }, [basePrice, variant.additional_price_pkr]);

  const images = normalizeReadyVariantImages(variant.images);

  function updateName(name: string) {
    onChange({
      ...variant,
      name,
      display_name: buildReadyVariantDisplayName(variant.variant_no, name),
    });
  }

  function updateExtra(v: string) {
    onChange({
      ...variant,
      additional_price_pkr: Number(sanitizeIntText(v) || 0),
    });
  }

  function toggleSize(size: string) {
    const exists = (variant.sizes || []).some((s) => s.size === size);
    let sizes: ReadyVariantSize[];

    if (exists) {
      sizes = variant.sizes.filter((s) => s.size !== size);
    } else {
      sizes = [...(variant.sizes || []), { size, qty: 0 }];
    }

    onChange({ ...variant, sizes });
  }

  function updateQty(size: string, qtyText: string) {
    const qty = Number(sanitizeIntText(qtyText) || 0);
    const sizes = (variant.sizes || []).map((s) =>
      s.size === size ? { ...s, qty } : s,
    );
    onChange({ ...variant, sizes });
  }

  async function pickVariantImages() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });

    if (res.canceled) return;

    const existing = normalizeReadyVariantImages(variant.images);
    const seen = new Set(existing.map((x) => x.uri));
    const next = [...existing];

    for (const a of res.assets) {
      const uri = safeStr(a?.uri);
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);

      next.push({
        uri,
        width: a.width,
        height: a.height,
        fileName: (a as any)?.fileName ?? null,
        mimeType: (a as any)?.mimeType ?? null,
        fileSize: (a as any)?.fileSize ?? null,
        path: null,
        url: null,
      });
    }

    onChange({
      ...variant,
      images: next,
    });
  }

  function removeVariantImage(uri: string) {
    onChange({
      ...variant,
      images: normalizeReadyVariantImages(variant.images).filter(
        (x) => safeStr(x.uri) !== uri,
      ),
    });
  }

  function makeVariantPrimaryImage(index: number) {
    const next = [...normalizeReadyVariantImages(variant.images)];
    if (index <= 0 || index >= next.length) return;

    const selected = next.splice(index, 1)[0];
    next.unshift(selected);

    onChange({
      ...variant,
      images: next,
    });
  }

  return (
    <View style={[apStyles.card, { gap: 12 }]}>
      <View style={apStyles.headerRow}>
        <Text style={apStyles.title}>{variant.label}</Text>

        {onRemove ? (
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [
              apStyles.linkBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={apStyles.linkText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={apStyles.label}>Color / design name *</Text>
      <TextInput
        value={variant.name}
        onChangeText={updateName}
        placeholder="e.g., Black, Ivory Gold, Design A"
        placeholderTextColor={apColors.muted}
        style={apStyles.input}
      />

      <Text style={apStyles.label}>Additional price, if any</Text>
      <TextInput
        value={String(variant.additional_price_pkr || "")}
        onChangeText={updateExtra}
        placeholder="0"
        placeholderTextColor={apColors.muted}
        style={apStyles.input}
        keyboardType="number-pad"
      />

      <Text style={apStyles.metaHint}>
        Final price: Rs {finalPrice.toLocaleString()}
      </Text>

      <Text style={apStyles.label}>Variant images *</Text>

      <Pressable
        onPress={pickVariantImages}
        style={({ pressed }) => [
          apStyles.primaryBtn,
          { marginTop: 8 },
          pressed ? apStyles.pressed : null,
        ]}
      >
        <Text style={apStyles.primaryText}>
          Pick Variant Images {images.length ? `(${images.length})` : ""}
        </Text>
      </Pressable>

      {images.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, gap: 10 }}
        >
          {images.map((img, imgIdx) => {
            const uri = safeStr(img.uri);
            if (!uri) return null;

            const isPrimary = imgIdx === 0;

            return (
              <View
                key={`${variant.id}-${uri}-${imgIdx}`}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: apColors.borderSoft,
                  backgroundColor: "#f3f4f6",
                }}
              >
                <Image source={{ uri }} style={{ width: 76, height: 76 }} />

                {isPrimary ? (
                  <View
                    style={{
                      position: "absolute",
                      left: 6,
                      bottom: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 10,
                      backgroundColor: "rgba(11,47,107,0.88)",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}
                    >
                      Banner
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => makeVariantPrimaryImage(imgIdx)}
                    style={({ pressed }) => [
                      {
                        position: "absolute",
                        left: 6,
                        bottom: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 10,
                        backgroundColor: "rgba(0,0,0,0.55)",
                      },
                      pressed ? apStyles.pressed : null,
                    ]}
                    hitSlop={10}
                  >
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}
                    >
                      Make Banner
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => removeVariantImage(uri)}
                  style={({ pressed }) => [
                    {
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
                    pressed ? apStyles.pressed : null,
                  ]}
                  hitSlop={10}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={[apStyles.metaHint, { marginTop: 8 }]}>
          No variant images selected yet.
        </Text>
      )}

      <Text style={apStyles.label}>Available sizes and quantity *</Text>

      {READY_STANDARD_SIZES.map((size) => {
        const selected = (variant.sizes || []).find((s) => s.size === size);

        return (
          <View key={size} style={{ gap: 8, marginBottom: 8 }}>
            <Pressable
              onPress={() => toggleSize(size)}
              style={[
                apStyles.secondaryBtn,
                selected ? { borderColor: apColors.blue } : null,
              ]}
            >
              <Text style={apStyles.secondaryText}>
                {selected ? "✓ " : ""}
                {size}
              </Text>
            </Pressable>

            {selected ? (
              <TextInput
                value={String(selected.qty || "")}
                onChangeText={(t) => updateQty(size, t)}
                placeholder={`Qty for ${size}`}
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="number-pad"
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
