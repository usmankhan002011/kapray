import React from "react";
import { StyleSheet, Text, View } from "react-native";
import StarRating from "./StarRating";

type Props = {
  averageRating: number | null | undefined;
  reviewCount: number | null | undefined;
  title?: string;
};

export default function ReviewSummaryCard({
  averageRating,
  reviewCount,
  title = "Ratings & Reviews",
}: Props) {
  const avg = Number(averageRating ?? 0);
  const count = Number(reviewCount ?? 0);

  const hasReviews = count > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {hasReviews ? (
        <>
          <View style={styles.topRow}>
            <Text style={styles.bigValue}>{avg.toFixed(1)}</Text>
            <StarRating rating={avg} showValue={false} size={16} />
          </View>

          <Text style={styles.meta}>
            {count} review{count === 1 ? "" : "s"}
          </Text>
        </>
      ) : (
        <Text style={styles.empty}>No reviews yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  topRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bigValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  meta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  empty: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
});
