import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import { roundMeter, safeText } from "./UpdateProduct.helpers";
import type { ProductRow } from "./UpdateProduct.helpers";
import { styles } from "./UpdateProduct.styles";

type ProductPreviewSectionProps = {
  selected: ProductRow | null;
  previewImageUrl: string | null;
  usesVariantInventory: boolean;
  stitchedVariantInventoryTotalQty: number;
  isUnstitched: boolean;
  onBack: () => void;
};

type SelectionPillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

type UpdateProductHeaderProps = {
  hasVendor: boolean;
  onClose: () => void;
};

type UpdateProductBottomBarProps = {
  visible: boolean;
  canSave: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};


export function UpdateProductHeader({
  hasVendor,
  onClose,
}: UpdateProductHeaderProps) {
  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Update Product</Text>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.linkBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.linkText}>Close</Text>
        </Pressable>
      </View>

      {!hasVendor ? (
        <Text style={styles.warn}>
          Vendor not loaded. Please ensure vendorSlice has vendor.id (bigint).
        </Text>
      ) : null}
    </>
  );
}

export function UpdateProductBottomBar({
  visible,
  canSave,
  saving,
  onCancel,
  onSave,
}: UpdateProductBottomBarProps) {
  if (!visible) return null;

  return (
    <View style={styles.bottomBar}>
      <Pressable
        style={({ pressed }) => [
          styles.cancelBtn,
          pressed ? styles.pressed : null,
        ]}
        onPress={onCancel}
        disabled={saving}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          !canSave || saving ? styles.saveBtnDisabled : null,
          pressed ? styles.pressed : null,
        ]}
        onPress={onSave}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveText}>
          {saving ? "Saving…" : "Save Changes"}
        </Text>
      </Pressable>
    </View>
  );
}

export function ProductPreviewSection({
  selected,
  previewImageUrl,
  usesVariantInventory,
  stitchedVariantInventoryTotalQty,
  isUnstitched,
  onBack,
}: ProductPreviewSectionProps) {
  if (!selected) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>No product selected</Text>
        <Text style={styles.empty}>
          Open this screen from Products → Edit so the product can load
          directly.
        </Text>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.smallBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.smallBtnText}>Back to Products</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Product Preview</Text>

      <View style={styles.previewBox}>
        {previewImageUrl ? (
          <Image source={{ uri: previewImageUrl }} style={styles.previewImage} />
        ) : (
          <View style={styles.previewImageFallback}>
            <Text style={styles.previewImageFallbackText}>No Image</Text>
          </View>
        )}

        <View style={styles.previewInfo}>
          <Text style={styles.selectedCode}>
            {safeText(selected.product_code)}
          </Text>

          <Text style={styles.selectedTitle} numberOfLines={2}>
            {safeText(selected.title)}
          </Text>

          {!Boolean(selected.made_on_order) ? (
            <Text style={styles.inventoryAlertText}>
              {usesVariantInventory
                ? `Style Inventory: ${stitchedVariantInventoryTotalQty}`
                : isUnstitched
                  ? `Fabric stock: ${roundMeter(
                      Math.max(0, Number(selected.inventory_qty ?? 0)),
                    )} m`
                  : `Inventory Qty: ${Math.max(
                    0,
                    Number(selected.inventory_qty ?? 0),
                  )}`}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function SelectionPill({
  label,
  selected,
  onPress,
  disabled,
}: SelectionPillProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.optionPill,
        selected ? styles.optionPillOn : null,
        disabled ? styles.optionPillDisabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.optionPillText,
          selected ? styles.optionPillTextOn : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
