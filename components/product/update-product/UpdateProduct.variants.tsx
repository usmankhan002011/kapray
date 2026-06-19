import { Image, Text, View } from "react-native";

import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import {
  resolveVariantImageUrls,
  type EditableReadyVariant,
} from "./UpdateProduct.helpers";
import { styles, stylesVars } from "./UpdateProduct.styles";

type StitchedVariantInventorySectionProps = {
  variants: EditableReadyVariant[];
  resolvePublicUrl: (path: string | null | undefined) => string | null;
  onSizeQtyChange: (variantId: string, size: string, value: string) => void;
};

export function StitchedVariantInventorySection({
  variants,
  resolvePublicUrl,
  onSizeQtyChange,
}: StitchedVariantInventorySectionProps) {
  if (!variants.length) return null;

  return (
    <View style={styles.variantInventoryBox}>
      <Text style={styles.variantInventoryTitle}>Style Size Inventory</Text>
      <Text style={styles.hint}>
        Update stock for each ready-to-wear style size
      </Text>

      {variants.map((variant) => {
        const variantImageUrls = resolveVariantImageUrls(
          variant,
          resolvePublicUrl,
        );

        return (
          <View key={variant.id} style={styles.variantCard}>
            <Text style={styles.variantCardTitle}>{variant.label}</Text>

            {variantImageUrls[0] ? (
              <Image
                source={{ uri: variantImageUrls[0] }}
                style={styles.variantGuideImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.emptyInline}>No style image found.</Text>
            )}

            <View style={styles.variantSizeGrid}>
              {variant.sizes.map((row) => (
                <View
                  key={`${variant.id}-${row.size}`}
                  style={styles.variantSizeCell}
                >
                  <Text style={styles.variantSizeLabel}>{row.size}</Text>
                  <FastNumberInput
                    value={String(row.qty ?? 0)}
                    onChangeText={(t) =>
                      onSizeQtyChange(variant.id, row.size, t)
                    }
                    placeholder="0"
                    placeholderTextColor={stylesVars.placeholder}
                    style={styles.variantQtyInput}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
