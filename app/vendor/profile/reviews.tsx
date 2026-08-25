import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import ReviewList, {
  ReviewListItem,
} from "@/components/vendor-reviews/ReviewList";
import ReviewSummaryCard from "@/components/vendor-reviews/ReviewSummaryCard";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
import {
  getVendorReviews,
  getVendorReviewSummary,
} from "@/services/vendor/profile";

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
    | {
        id?: number | null;
        shop_name?: string | null;
        name?: string | null;
        owner_name?: string | null;
      }
    | null
    | undefined;

  const vendorId = selectedVendor?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<VendorReviewSummaryRow | null>(null);
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const reviewCount = summary?.review_count ?? 0;
  const shopLabel =
    selectedVendor?.shop_name ||
    selectedVendor?.name ||
    selectedVendor?.owner_name ||
    "Vendor";

  const ratingRows = useMemo(
    () => [
      { label: "5", count: summary?.rating_5_count ?? 0 },
      { label: "4", count: summary?.rating_4_count ?? 0 },
      { label: "3", count: summary?.rating_3_count ?? 0 },
      { label: "2", count: summary?.rating_2_count ?? 0 },
      { label: "1", count: summary?.rating_1_count ?? 0 },
    ],
    [summary],
  );

  const fetchReviews = useCallback(async () => {
    if (!vendorId) return;

    try {
      setLoading(true);

      const [
        { data: summaryData, error: summaryError },
        { data: reviewData, error: reviewError },
      ] = await Promise.all([
        getVendorReviewSummary(vendorId),
        getVendorReviews(vendorId),
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
        <Header
          onBack={() => router.replace("/vendor/profile/settings")}
          shopLabel="Vendor"
        />

        <View style={styles.card}>
          <Text style={styles.empty}>No vendor selected.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header
        onBack={() => router.replace("/vendor/profile/settings")}
        shopLabel={shopLabel}
      />

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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Breakdown</Text>
          <Text style={styles.meta}>{reviewCount} total</Text>
        </View>

        <View style={styles.breakdownList}>
          {ratingRows.map((row) => {
            const width =
              reviewCount > 0
                ? `${Math.round((row.count / reviewCount) * 100)}%`
                : "0%";

            return (
              <View key={row.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{row.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width }]} />
                </View>
                <Text style={styles.breakdownCount}>{row.count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.commentsHeader}>
        <Text style={styles.section}>Comments</Text>
        <Pressable
          onPress={fetchReviews}
          disabled={loading}
          style={({ pressed }) => [
            styles.actionBtn,
            loading && styles.actionBtnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.actionText}>
            {loading ? "Loading..." : "Refresh"}
          </Text>
        </Pressable>
      </View>

      <ReviewList
        reviews={reviews}
        emptyText="No reviews yet."
        showVendorReply
      />
    </ScrollView>
  );
}

function Header({
  onBack,
  shopLabel,
}: {
  onBack: () => void;
  shopLabel: string;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <Text style={styles.backBtnText}>Back</Text>
      </Pressable>

      <View style={styles.headerTextWrap}>
        <Text style={styles.title}>Reviews</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {shopLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: apColors.bg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    minWidth: 0,
  },
  backBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: apColors.blue,
    letterSpacing: 0,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: apFontFamily,
    fontSize: 18,
    fontWeight: "800",
    color: apColors.text,
    letterSpacing: 0,
  },
  subtitle: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: apColors.muted,
    fontWeight: "600",
    letterSpacing: 0,
  },
  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 12,
  },
  loadingText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: apColors.muted,
    fontWeight: "600",
    letterSpacing: 0,
  },
  section: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: apColors.text,
    letterSpacing: 0,
  },
  commentsHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    marginTop: 14,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: apColors.text,
    letterSpacing: 0,
  },
  meta: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: apColors.muted,
    fontWeight: "500",
    letterSpacing: 0,
  },
  breakdownList: {
    gap: 9,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  breakdownLabel: {
    width: 18,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: apColors.text,
    fontWeight: "800",
    letterSpacing: 0,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.blueSoft,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: apRadii.pill,
    backgroundColor: apColors.blue,
  },
  breakdownCount: {
    width: 28,
    textAlign: "right",
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: apColors.muted,
    fontWeight: "700",
    letterSpacing: 0,
  },
  actionBtn: {
    minHeight: 36,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: apColors.blue,
    fontWeight: "800",
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.82,
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
