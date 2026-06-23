import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {hasReviews ? (
          <Text style={styles.countText}>
            {count} review{count === 1 ? "" : "s"}
          </Text>
        ) : null}
      </View>

      {hasReviews ? (
        <>
          <View style={styles.topRow}>
            <Text style={styles.bigValue}>{avg.toFixed(1)}</Text>
            <View style={styles.ratingWrap}>
              <StarRating rating={avg} showValue={false} size={16} />
              <Text style={styles.meta}>Average</Text>
            </View>
          </View>
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
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 15,
    fontWeight: "800",
    color: apColors.text,
    letterSpacing: 0,
  },
  countText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: apColors.blue,
    letterSpacing: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bigValue: {
    fontFamily: apFontFamily,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "800",
    color: apColors.text,
    letterSpacing: 0,
  },
  ratingWrap: {
    flex: 1,
    gap: 4,
  },
  meta: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: apColors.muted,
    letterSpacing: 0,
  },
  empty: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: apColors.muted,
    letterSpacing: 0,
  },
});
