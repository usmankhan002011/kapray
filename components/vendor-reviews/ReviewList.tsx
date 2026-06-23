import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
import StarRating from "./StarRating";

export type ReviewListItem = {
  id: number;
  created_at: string;
  rating: number;
  comment: string | null;
  vendor_reply?: string | null;
};

type Props = {
  reviews: ReviewListItem[];
  emptyText?: string;
  showVendorReply?: boolean;
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ReviewList({
  reviews,
  emptyText = "No comments yet.",
  showVendorReply = true,
}: Props) {
  if (!reviews.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {reviews.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.ratingWrap}>
              <StarRating rating={item.rating} size={14} />
            </View>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>

          <Text style={styles.comment}>
            {String(item.comment ?? "").trim() || "—"}
          </Text>

          {showVendorReply && String(item.vendor_reply ?? "").trim() ? (
            <View style={styles.replyBox}>
              <Text style={styles.replyTitle}>Vendor reply</Text>
              <Text style={styles.replyText}>
                {String(item.vendor_reply).trim()}
              </Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    gap: 12,
  },
  card: {
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
  },
  ratingWrap: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: apColors.muted,
    letterSpacing: 0,
    flexShrink: 0,
  },
  comment: {
    fontFamily: apFontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: apColors.subText,
    letterSpacing: 0,
  },
  replyBox: {
    borderRadius: apRadii.control,
    backgroundColor: apColors.bg,
    borderWidth: 1,
    borderColor: apColors.border,
    padding: 12,
    gap: 6,
  },
  replyTitle: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    color: apColors.text,
    letterSpacing: 0,
  },
  replyText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: apColors.subText,
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
