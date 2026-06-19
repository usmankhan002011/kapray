import { Text, TextInput, View } from "react-native";

import FastNumberInput from "@/components/product/add-product/FastNumberInput";
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
            Current saved category: {categoryLabel(currentProductCategory)}
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
      <Text style={styles.hint}>
        {isUnstitched
          ? "Enter total fabric currently available in meters."
          : "Enter available pieces."}
      </Text>
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
      <Text style={styles.label}>
        {madeOnOrder ? "Cost From (PKR) *" : "Total Cost (PKR) *"}
      </Text>
      <FastNumberInput
        value={String(priceTotal ?? "")}
        onChangeText={onPriceTotalChangeText}
        placeholder="e.g., 25000"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        keyboardType="decimal-pad"
        maxLength={12}
      />

      <Text style={styles.label}>Available Sizes (comma separated)</Text>
      <TextInput
        value={(availableSizes ?? []).join(", ")}
        onChangeText={onAvailableSizesChangeText}
        placeholder="e.g., XS, S, M, L, XL, XXL, All"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        maxLength={80}
      />
    </>
  );
}

export function OutOfStockNotice() {
  return (
    <View
      style={{
        marginTop: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#FCA5A5",
        backgroundColor: "#FEE2E2",
        padding: 12,
      }}
    >
      <Text
        style={{
          color: "#B91C1C",
          fontWeight: "800",
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        Out of stock — update inventory to make this product visible again
      </Text>
    </View>
  );
}