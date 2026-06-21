import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import {
  UpdateProductActionButton,
  UpdateProductEmptyState,
} from "./UpdateProduct.components";
import {
  resolveVariantImageUrls,
  variantDisplayTitle,
  type EditableReadyVariant,
  type NewMadeOrderVariantDraft,
  type NewReadyVariantDraft,
} from "./UpdateProduct.helpers";
import { styles, stylesVars } from "./UpdateProduct.styles";

type StitchedVariantInventorySectionProps = {
  variants: EditableReadyVariant[];
  resolvePublicUrl: (path: string | null | undefined) => string | null;
  onAdditionalPriceChangeText: (variantId: string, value: string) => void;
  onSizeQtyChange: (variantId: string, size: string, value: string) => void;
};

type ExistingMadeOrderVariantListProps = {
  variants: any[];
};

type AddReadyVariantButtonProps = {
  onPress: () => void;
};

type AddMadeOrderVariantButtonProps = {
  onPress: () => void;
};

type ReadyVariantDraftCardProps = {
  variant: NewReadyVariantDraft;
  index: number;
  existingVariantCount: number;
  onDiscard: (index: number) => void;
  onNameChange: (index: number, value: string) => void;
  onAdditionalPriceChangeText: (index: number, value: string) => void;
  onPickImages: (index: number) => void;
  onRemoveImage: (index: number, imageIndex: number) => void;
  onSizeQtyChange: (index: number, size: string, value: string) => void;
};

type MadeOrderVariantDraftCardProps = {
  variant: NewMadeOrderVariantDraft;
  index: number;
  existingVariantCount: number;
  onDiscard: (index: number) => void;
  onNameChange: (index: number, value: string) => void;
  onAdditionalPriceChangeText: (index: number, value: string) => void;
  onEstimatedDaysChangeText: (index: number, value: string) => void;
  onPickImages: (index: number) => void;
  onRemoveImage: (index: number, imageIndex: number) => void;
};

export function ExistingMadeOrderVariantList({
  variants,
}: ExistingMadeOrderVariantListProps) {
  if (!variants.length) {
    return <UpdateProductEmptyState title="No saved styles" />;
  }

  return (
    <View style={styles.readonlyListBox}>
      <Text style={styles.appendTitle}>Saved styles</Text>
      {variants.map((variant, index) => (
        <Text key={`old-made-${index}`} style={styles.readonlyValue}>
          {variantDisplayTitle(variant, index + 1)}
        </Text>
      ))}
    </View>
  );
}

export function AddReadyVariantButton({ onPress }: AddReadyVariantButtonProps) {
  return (
    <UpdateProductActionButton
      label="Add new Styles"
      icon="add"
      onPress={onPress}
      size="medium"
      style={styles.addFullBtn}
    />
  );
}

export function AddMadeOrderVariantButton({
  onPress,
}: AddMadeOrderVariantButtonProps) {
  return (
    <UpdateProductActionButton
      label="Add Style"
      icon="add"
      onPress={onPress}
      size="medium"
      style={styles.addFullBtn}
    />
  );
}

export function StitchedVariantInventorySection({
  variants,
  resolvePublicUrl,
  onAdditionalPriceChangeText,
  onSizeQtyChange,
}: StitchedVariantInventorySectionProps) {
  if (!variants.length) return null;

  return (
    <View style={styles.variantInventoryBox}>
      <Text style={styles.variantInventoryTitle}>Edit Styles</Text>

      {variants.map((variant) => {
        const variantImageUrls = resolveVariantImageUrls(
          variant,
          resolvePublicUrl,
        );
        const variantTotalQty = variant.sizes.reduce(
          (sum, row) => sum + Number(row.qty || 0),
          0,
        );
        const variantUsedSizes = variant.sizes.filter(
          (row) => Number(row.qty || 0) > 0,
        ).length;

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
              <Text style={styles.emptyInline}>No image</Text>
            )}

            <Text style={styles.label}>Additional Cost (PKR)</Text>
            <FastNumberInput
              value={String(variant.additional_price_pkr ?? 0)}
              onChangeText={(value) =>
                onAdditionalPriceChangeText(variant.id, value)
              }
              placeholder="0"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={8}
            />

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

            <Text style={styles.variantCardMeta}>
              Stock: {variantTotalQty} | Sizes: {variantUsedSizes}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function ReadyVariantDraftCard({
  variant,
  index,
  existingVariantCount,
  onDiscard,
  onNameChange,
  onAdditionalPriceChangeText,
  onPickImages,
  onRemoveImage,
  onSizeQtyChange,
}: ReadyVariantDraftCardProps) {
  return (
    <View style={styles.appendCard}>
      <View style={styles.draftHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.variantCardTitle}>
            New Style {existingVariantCount + index + 1}
          </Text>
        </View>

        <UpdateProductActionButton
          label="Discard"
          icon="delete-outline"
          onPress={() => onDiscard(index)}
          variant="danger"
        />
      </View>

      <Text style={styles.label}>Style name *</Text>
      <TextInput
        value={variant.name}
        onChangeText={(value) => onNameChange(index, value)}
        placeholder="e.g., Black embroidered"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        maxLength={80}
      />

      <Text style={styles.label}>Additional Cost (PKR)</Text>
      <FastNumberInput
        value={String(variant.additional_price_pkr ?? 0)}
        onChangeText={(value) => onAdditionalPriceChangeText(index, value)}
        placeholder="0"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={8}
      />

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.label}>Style Images</Text>
        <UpdateProductActionButton
          label="Images"
          icon="add-photo-alternate"
          onPress={() => onPickImages(index)}
        />
      </View>

      {(variant.images ?? []).length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.thumbRow}>
            {(variant.images ?? []).map((img, imgIndex) => (
              <View key={`${img.uri}-${imgIndex}`} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove style image"
                  onPress={() => onRemoveImage(index, imgIndex)}
                  style={({ pressed }) => [
                    styles.thumbX,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <MaterialIcons
                    name="close"
                    size={16}
                    color={stylesVars.danger}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <UpdateProductEmptyState title="No images selected" />
      )}

      <Text style={styles.label}>Stock by size *</Text>
      <View style={styles.variantSizeGrid}>
        {variant.sizes.map((row) => (
          <View
            key={`new-ready-${index}-${row.size}`}
            style={styles.variantSizeCell}
          >
            <Text style={styles.variantSizeLabel}>{row.size}</Text>
            <FastNumberInput
              value={String(row.qty ?? 0)}
              onChangeText={(value) => onSizeQtyChange(index, row.size, value)}
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
}

export function MadeOrderVariantDraftCard({
  variant,
  index,
  existingVariantCount,
  onDiscard,
  onNameChange,
  onAdditionalPriceChangeText,
  onEstimatedDaysChangeText,
  onPickImages,
  onRemoveImage,
}: MadeOrderVariantDraftCardProps) {
  return (
    <View style={styles.appendCard}>
      <View style={styles.draftHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.variantCardTitle}>
            New Style {existingVariantCount + index + 1}
          </Text>
        </View>

        <UpdateProductActionButton
          label="Discard"
          icon="delete-outline"
          onPress={() => onDiscard(index)}
          variant="danger"
        />
      </View>

      <Text style={styles.label}>Style name *</Text>
      <TextInput
        value={variant.name}
        onChangeText={(value) => onNameChange(index, value)}
        placeholder="e.g., Maroon bridal style"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        maxLength={80}
      />

      <Text style={styles.label}>Additional Cost (PKR)</Text>
      <FastNumberInput
        value={String(variant.additional_price_pkr ?? 0)}
        onChangeText={(value) => onAdditionalPriceChangeText(index, value)}
        placeholder="0"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={8}
      />

      <Text style={styles.label}>Estimated Days</Text>
      <FastNumberInput
        value={String(variant.estimated_days ?? 0)}
        onChangeText={(value) => onEstimatedDaysChangeText(index, value)}
        placeholder="e.g., 7"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={3}
      />

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.label}>Style Images</Text>
        <UpdateProductActionButton
          label="Images"
          icon="add-photo-alternate"
          onPress={() => onPickImages(index)}
        />
      </View>

      {(variant.images ?? []).length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.thumbRow}>
            {(variant.images ?? []).map((img, imgIndex) => (
              <View key={`${img.uri}-${imgIndex}`} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove style image"
                  onPress={() => onRemoveImage(index, imgIndex)}
                  style={({ pressed }) => [
                    styles.thumbX,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <MaterialIcons
                    name="close"
                    size={16}
                    color={stylesVars.danger}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <UpdateProductEmptyState title="No images selected" />
      )}
    </View>
  );
}
