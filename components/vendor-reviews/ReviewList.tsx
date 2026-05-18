import React from "react";
import { StyleSheet, Text, View } from "react-native";
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
  return d.toLocaleDateString();
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
            <StarRating rating={item.rating} size={14} />
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>

          <Text style={styles.buyerLabel}>Buyer</Text>

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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  date: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  buyerLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  comment: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#475569",
  },
  replyBox: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  replyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  replyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#475569",
  },
  empty: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
});
