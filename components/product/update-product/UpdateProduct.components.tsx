import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps, ReactNode } from "react";
import {
  Image,
  Keyboard,
  Pressable,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { roundMeter, safeText } from "./UpdateProduct.helpers";
import type { ProductRow } from "./UpdateProduct.helpers";
import { styles, stylesVars } from "./UpdateProduct.styles";

type ProductPreviewSectionProps = {
  selected: ProductRow | null;
  previewImageUrl: string | null;
  usesVariantInventory: boolean;
  stitchedVariantInventoryTotalQty: number;
  stitchedVariantInventoryStyleCount: number;
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
  saveWarning?: string;
  onCancel: () => void;
  onSave: () => void;
};

type UpdateProductIconName = ComponentProps<typeof MaterialIcons>["name"];

type UpdateProductActionButtonProps = {
  label: string;
  icon?: UpdateProductIconName;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "small" | "medium";
  style?: StyleProp<ViewStyle>;
};

type UpdateProductSectionCardProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
  tight?: boolean;
};

type UpdateProductNoticeProps = {
  title?: string;
  children: ReactNode;
  tone?: "info" | "warning" | "danger" | "success";
};

type UpdateProductEmptyStateProps = {
  title: string;
  message?: string;
  action?: ReactNode;
};

function actionIconColor(
  variant: NonNullable<UpdateProductActionButtonProps["variant"]>,
) {
  if (variant === "primary") return stylesVars.white;
  if (variant === "danger") return stylesVars.danger;
  if (variant === "ghost") return stylesVars.text;
  return stylesVars.blue;
}

function actionTextStyle(
  variant: NonNullable<UpdateProductActionButtonProps["variant"]>,
) {
  if (variant === "primary") return styles.actionTextPrimary;
  if (variant === "danger") return styles.actionTextDanger;
  if (variant === "ghost") return styles.actionTextGhost;
  return styles.actionTextSecondary;
}

function actionVariantStyle(
  variant: NonNullable<UpdateProductActionButtonProps["variant"]>,
) {
  if (variant === "primary") return styles.actionButtonPrimary;
  if (variant === "danger") return styles.actionButtonDanger;
  if (variant === "ghost") return styles.actionButtonGhost;
  return styles.actionButtonSecondary;
}

export function UpdateProductActionButton({
  label,
  icon,
  onPress,
  disabled,
  variant = "secondary",
  size = "small",
  style,
}: UpdateProductActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        size === "small" ? styles.actionButtonSmall : styles.actionButtonMedium,
        actionVariantStyle(variant),
        disabled ? styles.actionButtonDisabled : null,
        style,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.actionButtonContent}>
        {icon ? (
          <MaterialIcons
            name={icon}
            size={size === "small" ? 17 : 18}
            color={actionIconColor(variant)}
          />
        ) : null}
        <Text style={actionTextStyle(variant)}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function UpdateProductSectionCard({
  title,
  subtitle,
  badge,
  actions,
  children,
  tight,
}: UpdateProductSectionCardProps) {
  return (
    <View style={[styles.card, tight ? styles.cardTight : null]}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          ) : null}
        </View>

        {badge ? (
          <View style={styles.statusPill}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={styles.statusPillText}
            >
              {badge}
            </Text>
          </View>
        ) : null}

        {actions}
      </View>

      {children}
    </View>
  );
}

export function UpdateProductNotice({
  title,
  children,
  tone = "info",
}: UpdateProductNoticeProps) {
  return (
    <View
      style={[
        styles.notice,
        tone === "warning" ? styles.noticeWarning : null,
        tone === "danger" ? styles.noticeDanger : null,
        tone === "success" ? styles.noticeSuccess : null,
      ]}
    >
      {title ? <Text style={styles.noticeTitle}>{title}</Text> : null}
      {typeof children === "string" ? (
        <Text style={styles.noticeText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function UpdateProductEmptyState({
  title,
  message,
  action,
}: UpdateProductEmptyStateProps) {
  return (
    <View style={styles.emptyStateBox}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {message ? <Text style={styles.emptyStateText}>{message}</Text> : null}
      {action}
    </View>
  );
}

export function UpdateProductHeader({
  hasVendor,
  onClose,
}: UpdateProductHeaderProps) {
  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Update Product</Text>

        <UpdateProductActionButton
          label="Close"
          icon="close"
          onPress={onClose}
          variant="secondary"
        />
      </View>

      {!hasVendor ? (
        <UpdateProductNotice title="Vendor not loaded" tone="warning">
          Open from vendor profile.
        </UpdateProductNotice>
      ) : null}
    </>
  );
}

export function UpdateProductBottomBar({
  visible,
  canSave,
  saving,
  saveWarning,
  onCancel,
  onSave,
}: UpdateProductBottomBarProps) {
  if (!visible) return null;

  function handleCancel() {
    Keyboard.dismiss();
    onCancel();
  }

  function handleSave() {
    Keyboard.dismiss();
    onSave();
  }

  return (
    <View style={styles.bottomBar}>
      {saveWarning ? (
        <View style={styles.bottomAlert}>
          <Text style={styles.bottomAlertText}>{saveWarning}</Text>
        </View>
      ) : null}

      <View style={styles.bottomButtonRow}>
        <Pressable
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed ? styles.pressed : null,
          ]}
          onPress={handleCancel}
          disabled={saving}
        >
          <View style={styles.actionButtonContent}>
            <MaterialIcons name="close" size={18} color={stylesVars.text} />
            <Text style={styles.cancelText}>Cancel</Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave || saving ? styles.saveBtnDisabled : null,
            pressed ? styles.pressed : null,
          ]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <View style={styles.actionButtonContent}>
            <MaterialIcons
              name={saving ? "hourglass-empty" : "check"}
              size={18}
              color={stylesVars.white}
            />
            <Text style={styles.saveText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function ProductPreviewSection({
  selected,
  previewImageUrl,
  usesVariantInventory,
  stitchedVariantInventoryTotalQty,
  stitchedVariantInventoryStyleCount,
  isUnstitched,
  onBack,
}: ProductPreviewSectionProps) {
  if (!selected) {
    return (
      <UpdateProductSectionCard title="No product selected">
        <UpdateProductEmptyState
          title="Open an item from Products"
          action={
            <UpdateProductActionButton
              label="Back to Products"
              icon="arrow-back"
              onPress={onBack}
              variant="secondary"
              style={{ alignSelf: "flex-start" }}
            />
          }
        />
      </UpdateProductSectionCard>
    );
  }

  return (
    <UpdateProductSectionCard title="Product Preview">
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
                ? `Total stock ${stitchedVariantInventoryTotalQty} in ${stitchedVariantInventoryStyleCount} styles`
                : isUnstitched
                  ? `Total inventory: ${roundMeter(
                      Math.max(0, Number(selected.inventory_qty ?? 0)),
                    )} m`
                  : `Total inventory: ${Math.max(
                      0,
                      Number(selected.inventory_qty ?? 0),
                    )}`}
            </Text>
          ) : null}
        </View>
      </View>
    </UpdateProductSectionCard>
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
