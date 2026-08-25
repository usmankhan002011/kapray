import { Pressable, Text, View } from "react-native";
import { BUYER_RATING_VALUES } from "@/constants/buyer";
import StarRating from "@/components/vendor-reviews/StarRating";
import { buyerReviewStyles as styles } from "./buyerReviewStyles";

type Props = {
  rating: number;
  onChange: (rating: number) => void;
};

export default function BuyerRatingPicker({ rating, onChange }: Props) {
  return (
    <View style={styles.starPickerWrap}>
      <Text style={styles.label}>Your rating</Text>
      <View style={styles.starRow}>
        {BUYER_RATING_VALUES.map((value) => {
          const selected = value <= rating;
          return (
            <Pressable
              key={value}
              onPress={() => onChange(value)}
              style={({ pressed }) => [
                styles.starBtn,
                selected && styles.starBtnOn,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.starBtnText, selected && styles.starBtnTextOn]}
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
}
