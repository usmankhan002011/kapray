import { Text, TextInput, View } from "react-native";

import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import { UpdateProductNotice } from "./UpdateProduct.components";
import { categoryLabel } from "./UpdateProduct.helpers";
import type { ProductCategory } from "./UpdateProduct.helpers";
import { styles, stylesVars } from "./UpdateProduct.styles";

type DressTypeFieldProps = {
  priceMode: "stitched_total" | "unstitched_per_meter";
  madeOnOrder: boolean;
  editedProductCategory: ProductCategory | null;
  currentProductCategory: ProductCategory | null;
};

type InventoryStockFieldProps = {
  isUnstitched: boolean;
  value: string;
  onChangeText: (value: string) => void;
};

type StitchedPricingFieldsProps = {
  madeOnOrder: boolean;
  priceTotal: number;
  availableSizes: string[];
  onPriceTotalChangeText: (value: string) => void;
  onAvailableSizesChangeText: (value: string) => void;
};

export function DressTypeField({
  priceMode,
  madeOnOrder,
  editedProductCategory,
  currentProductCategory,
}: DressTypeFieldProps) {
  return (
    <>
      <Text style={styles.label}>Dress Type</Text>

      <View style={styles.readonlyField}>
        <Text style={styles.readonlyValue}>
          {priceMode === "unstitched_per_meter"
            ? categoryLabel(editedProductCategory)
            : madeOnOrder
              ? "Stitched / Made on order"
              : "Stitched / Ready-to-wear"}
        </Text>
        {currentProductCategory &&
        currentProductCategory !== editedProductCategory ? (
          <Text style={styles.hint}>
            Saved: {categoryLabel(currentProductCategory)}
          </Text>
        ) : null}
      </View>
    </>
  );
}

export function InventoryStockField({
  isUnstitched,
  value,
  onChangeText,
}: InventoryStockFieldProps) {
  return (
    <>
      <Text style={isUnstitched ? styles.inventoryLabel : styles.label}>
        {isUnstitched
          ? "Available fabric length (meters) *"
          : "Inventory quantity *"}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={isUnstitched ? "e.g., 20" : "e.g., 5"}
        placeholderTextColor={stylesVars.placeholder}
        style={[styles.input, isUnstitched ? styles.inventoryInput : null]}
        keyboardType={isUnstitched ? "decimal-pad" : "number-pad"}
        maxLength={10}
      />
    </>
  );
}

export function StitchedPricingFields({
  madeOnOrder,
  priceTotal,
  availableSizes,
  onPriceTotalChangeText,
  onAvailableSizesChangeText,
}: StitchedPricingFieldsProps) {
  return (
    <>
      <Text style={[styles.label, styles.priceLabel]}>
        {madeOnOrder ? "Cost From (PKR) *" : "Total Cost (PKR) *"}
      </Text>
      <FastNumberInput
        value={String(priceTotal ?? "")}
        onChangeText={onPriceTotalChangeText}
        placeholder="e.g., 25000"
        placeholderTextColor={stylesVars.placeholder}
        style={[styles.input, styles.priceInput]}
        keyboardType="decimal-pad"
        maxLength={12}
      />

      {madeOnOrder ? (
        <>
          <Text style={styles.label}>Sizes</Text>
          <TextInput
            value={(availableSizes ?? []).join(", ")}
            onChangeText={onAvailableSizesChangeText}
            placeholder="e.g., XS, S, M, L, XL, XXL, All"
            placeholderTextColor={stylesVars.placeholder}
            style={styles.input}
            maxLength={80}
          />
        </>
      ) : null}
    </>
  );
}

export function OutOfStockNotice() {
  return (
    <UpdateProductNotice title="Out of stock" tone="danger">
      Stock 0 hides product.
    </UpdateProductNotice>
  );
}
