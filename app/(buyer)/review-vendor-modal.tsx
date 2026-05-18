import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import StarRating from "@/components/vendor-reviews/StarRating";

type Params = {
  orderId?: string;
  vendorId?: string;
};

function safeNum(v: unknown): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

export default function ReviewVendorModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const orderId = useMemo(() => safeNum(params.orderId), [params.orderId]);
  const vendorId = useMemo(() => safeNum(params.vendorId), [params.vendorId]);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return !!orderId && !!vendorId && rating >= 1 && rating <= 5 && !saving;
  }, [orderId, vendorId, rating, saving]);

  const goToBuyerSignIn = () => {
    router.push({
      pathname: "/(auth)/buyer/signin",
      params: {
        redirectTo: `/(buyer)/review-vendor-modal?orderId=${orderId}&vendorId=${vendorId}`,
      },
    });
  };

  const submitReview = async () => {
    if (!orderId || !vendorId) {
      Alert.alert("Missing data", "Order or vendor information is missing.");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        Alert.alert("Error", userError.message);
        return;
      }

      if (!user?.id) {
        Alert.alert(
          "Sign in required",
          "Please sign in to submit your vendor review.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Sign in", onPress: goToBuyerSignIn },
          ],
        );
        return;
      }

      const { data: orderRow, error: orderError } = await supabase
        .from("orders")
        .select("id, vendor_id, buyer_auth_user_id, status")
        .eq("id", orderId)
        .single();

      if (orderError) {
        Alert.alert("Error", orderError.message);
        return;
      }

      if (!orderRow) {
        Alert.alert("Not found", "Order could not be found.");
        return;
      }

      if (Number(orderRow.vendor_id) !== vendorId) {
        Alert.alert(
          "Mismatch",
          "This order does not belong to the selected vendor.",
        );
        return;
      }

      if (String(orderRow.status).trim().toLowerCase() !== "delivered") {
        Alert.alert(
          "Unavailable",
          "You can rate the vendor only after delivery.",
        );
        return;
      }

      if (
        orderRow.buyer_auth_user_id &&
        orderRow.buyer_auth_user_id !== user.id
      ) {
        Alert.alert(
          "Not allowed",
          "You can only review your own delivered order.",
        );
        return;
      }

      const { error: insertError } = await (supabase as any)
        .from("vendor_reviews")
        .insert({
          vendor_id: vendorId,
          buyer_user_id: user.id,
          order_id: orderId,
          rating,
          comment: String(comment ?? "").trim() || null,
          is_verified_purchase: true,
          is_public: true,
          is_hidden: false,
        });

      if (insertError) {
        const msg = String(insertError.message ?? "").toLowerCase();

        if (msg.includes("duplicate") || msg.includes("unique")) {
          Alert.alert(
            "Already reviewed",
            "You have already submitted a review for this order.",
            [
              {
                text: "OK",
                onPress: () => router.back(),
              },
            ],
          );
          return;
        }

        Alert.alert("Error", insertError.message);
        return;
      }

      Alert.alert("Thank you", "Your review has been submitted.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not submit review.");
    } finally {
      setSaving(false);
    }
  };

  const StarPicker = () => (
    <View style={styles.starPickerWrap}>
      <Text style={styles.label}>Your rating</Text>

      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = n <= rating;
          return (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              style={({ pressed }) => [
                styles.starBtn,
                selected ? styles.starBtnOn : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.starBtnText,
                  selected ? styles.starBtnTextOn : null,
                ]}
              >
                ★
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.previewRow}>
        <StarRating rating={rating} showValue />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>

          <Text style={styles.title}>Rate Vendor</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.meta}>You can review only delivered orders.</Text>

          <StarPicker />

          <Text style={styles.label}>Comment</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a short comment (optional)"
            placeholderTextColor="#94A3B8"
            multiline
            style={styles.input}
            textAlignVertical="top"
            maxLength={500}
          />

          <Pressable
            onPress={canSubmit ? submitReview : undefined}
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit ? styles.disabledBtn : null,
              pressed && canSubmit ? styles.pressed : null,
            ]}
          >
            <Text style={styles.submitBtnText}>
              {saving ? "Submitting..." : "Submit Review"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#F8FAFC",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },

  closeBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  closeBtnText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },

  title: {
    fontSize: 18,
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

  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500",
  },

  label: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  starPickerWrap: {
    marginTop: 6,
  },

  starRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },

  starBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  starBtnOn: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  starBtnText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2563EB",
  },

  starBtnTextOn: {
    color: "#FFFFFF",
  },

  previewRow: {
    marginTop: 12,
  },

  input: {
    marginTop: 10,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  submitBtn: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  disabledBtn: {
    opacity: 0.6,
  },

  pressed: {
    opacity: 0.82,
  },
});
