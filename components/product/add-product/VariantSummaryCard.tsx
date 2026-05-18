import React from "react";
import { Text, View } from "react-native";
import {
  getReadyVariantFinalPrice,
  ReadyVariant,
} from "@/utils/kapray/productVariants";
import { apColors, apStyles } from "@/components/product/addProductStyles";

type Props = {
  variant: ReadyVariant;
  basePrice: number;
};

export default function VariantSummaryCard({ variant, basePrice }: Props) {
  const totalQty = (variant.sizes || []).reduce(
    (sum, row) => sum + Number(row.qty || 0),
    0,
  );
  const finalPrice = getReadyVariantFinalPrice(basePrice, variant);

  return (
    <View style={[apStyles.card, { gap: 8 }]}>
      <Text style={apStyles.label}>{variant.display_name}</Text>
      <Text style={{ color: apColors.text }}>
        Price: Rs {finalPrice.toLocaleString()}
      </Text>
      <Text style={{ color: apColors.muted }}>Stock: {totalQty}</Text>
      <Text style={{ color: apColors.muted }}>
        Sizes:{" "}
        {(variant.sizes || []).map((s) => `${s.size} (${s.qty})`).join(", ") ||
          "None"}
      </Text>
    </View>
  );
}
