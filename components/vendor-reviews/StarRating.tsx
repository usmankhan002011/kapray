import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  rating: number | null | undefined;
  size?: number;
  showValue?: boolean;
};

export default function StarRating({
  rating,
  size = 14,
  showValue = false,
}: Props) {
  const safeRating = useMemo(() => {
    const n = Number(rating ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(5, n));
  }, [rating]);

  const fullStars = Math.round(safeRating);

  return (
    <View style={styles.row}>
      <Text style={[styles.stars, { fontSize: size }]}>
        {Array.from({ length: 5 }, (_, i) => (i < fullStars ? "★" : "☆")).join(
          " ",
        )}
      </Text>

      {showValue ? (
        <Text style={styles.valueText}>{safeRating.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stars: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  valueText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
});
