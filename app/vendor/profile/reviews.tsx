import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";
import ReviewList, {
  ReviewListItem,
} from "@/components/vendor-reviews/ReviewList";
import ReviewSummaryCard from "@/components/vendor-reviews/ReviewSummaryCard";

type VendorReviewSummaryRow = {
  vendor_id: number;
  average_rating: number;
  review_count: number;
  rating_5_count: number;
  rating_4_count: number;
  rating_3_count: number;
  rating_2_count: number;
  rating_1_count: number;
};

export default function VendorReviewsScreen() {
  const router = useRouter();

  const selectedVendor = useAppSelector((s) => s.vendor) as
    | { id?: number | null }
    | null
    | undefined;

  const vendorId = selectedVendor?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<VendorReviewSummaryRow | null>(null);
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);

  const fetchReviews = useCallback(async () => {
    if (!vendorId) return;

    try {
      setLoading(true);

      const [
        { data: summaryData, error: summaryError },
        { data: reviewData, error: reviewError },
      ] = await Promise.all([
        (supabase as any)
          .from("vendor_review_summary")
          .select("*")
          .eq("vendor_id", vendorId)
          .maybeSingle(),
        (supabase as any)
          .from("vendor_reviews")
          .select("id, created_at, rating, comment, vendor_reply")
          .eq("vendor_id", vendorId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }),
      ]);

      if (summaryError) {
        Alert.alert("Error", summaryError.message);
        return;
      }

      if (reviewError) {
        Alert.alert("Error", reviewError.message);
        return;
      }

      setSummary((summaryData as VendorReviewSummaryRow | null) ?? null);
      setReviews((reviewData as ReviewListItem[] | null) ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (!vendorId) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text
            style={styles.backBtn}
            onPress={() => router.replace("/vendor/profile/settings")}
          >
            ← Back
          </Text>
          <Text style={styles.title}>Vendor Reviews</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.empty}>No vendor selected.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Text
          style={styles.backBtn}
          onPress={() => router.replace("/vendor/profile/settings")}
        >
          ← Back
        </Text>
        <Text style={styles.title}>Vendor Reviews</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : null}

      <ReviewSummaryCard
        title="Overall Rating"
        averageRating={summary?.average_rating ?? null}
        reviewCount={summary?.review_count ?? 0}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rating Breakdown</Text>

        <Text style={styles.meta}>5 star: {summary?.rating_5_count ?? 0}</Text>
        <Text style={styles.meta}>4 star: {summary?.rating_4_count ?? 0}</Text>
        <Text style={styles.meta}>3 star: {summary?.rating_3_count ?? 0}</Text>
        <Text style={styles.meta}>2 star: {summary?.rating_2_count ?? 0}</Text>
        <Text style={styles.meta}>1 star: {summary?.rating_1_count ?? 0}</Text>
      </View>

      <Text style={styles.section}>Recent Comments</Text>
      <ReviewList
        reviews={reviews}
        emptyText="No reviews yet."
        showVendorReply
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  backBtn: {
    minHeight: 40,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D7E3FF",
    textAlignVertical: "center",
    overflow: "hidden",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  section: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500",
  },
  empty: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
});
