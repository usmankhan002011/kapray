import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import BuyerRatingPicker from "@/components/buyer/BuyerRatingPicker";
import { buyerReviewStyles as styles } from "@/components/buyer/buyerReviewStyles";
import { BUYER_COLORS } from "@/constants/buyer";
import { submitVendorReview } from "@/services/buyer/vendorReview";
import { errorMessage, toOptionalNumber } from "@/utils/buyer";

type Params = {
  orderId?: string;
  vendorId?: string;
};

export default function ReviewVendorModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const orderId = useMemo(
    () => toOptionalNumber(params.orderId),
    [params.orderId],
  );
  const vendorId = useMemo(
    () => toOptionalNumber(params.vendorId),
    [params.vendorId],
  );
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const canSubmit = Boolean(
    orderId && vendorId && rating >= 1 && rating <= 5 && !saving,
  );

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
      const status = await submitVendorReview({
        orderId,
        vendorId,
        rating,
        comment,
      });

      switch (status) {
        case "requires_sign_in":
          Alert.alert(
            "Sign in required",
            "Please sign in to submit your vendor review.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Sign in", onPress: goToBuyerSignIn },
            ],
          );
          break;
        case "order_not_found":
          Alert.alert("Not found", "Order could not be found.");
          break;
        case "vendor_mismatch":
          Alert.alert(
            "Mismatch",
            "This order does not belong to the selected vendor.",
          );
          break;
        case "order_not_delivered":
          Alert.alert(
            "Unavailable",
            "You can rate the vendor only after delivery.",
          );
          break;
        case "not_order_owner":
          Alert.alert(
            "Not allowed",
            "You can only review your own delivered order.",
          );
          break;
        case "already_reviewed":
          Alert.alert(
            "Already reviewed",
            "You have already submitted a review for this order.",
            [{ text: "OK", onPress: () => router.back() }],
          );
          break;
        case "submitted":
          Alert.alert("Thank you", "Your review has been submitted.", [
            { text: "OK", onPress: () => router.back() },
          ]);
      }
    } catch (error) {
      Alert.alert("Error", errorMessage(error, "Could not submit review."));
    } finally {
      setSaving(false);
    }
  };

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
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
          <Text style={styles.title}>Rate Vendor</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.meta}>You can review only delivered orders.</Text>
          <BuyerRatingPicker rating={rating} onChange={setRating} />
          <Text style={styles.label}>Comment</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a short comment (optional)"
            placeholderTextColor={BUYER_COLORS.placeholder}
            multiline
            style={styles.input}
            textAlignVertical="top"
            maxLength={500}
          />
          <Pressable
            onPress={canSubmit ? submitReview : undefined}
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit && styles.disabledBtn,
              pressed && canSubmit && styles.pressed,
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
