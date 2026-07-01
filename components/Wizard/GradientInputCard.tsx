// File: components/stupid/GradientInputCard.tsx

import React, { forwardRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import {
  apColors,
  apInputTextStyle,
  apRadii,
} from "@/components/product/addProductStyles";
import {
  AppTextInput,
  type AppTextInputProps,
} from "@/components/ui/AppTextInput";

interface GradientInputCardProps extends AppTextInputProps {
  children?: React.ReactNode;
}

const GradientInputCard = forwardRef<TextInput, GradientInputCardProps>(
  ({ children, style, ...textInputProps }, ref) => {
    return (
      <View style={styles.card}>
        <AppTextInput
          ref={ref}
          {...textInputProps}
          placeholderTextColor={apColors.muted}
          style={[styles.input, style]}
        />

        {children}
      </View>
    );
  },
);

GradientInputCard.displayName = "GradientInputCard";

export default GradientInputCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: apColors.card,
    borderRadius: apRadii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: apColors.border,
  },

  input: {
    minHeight: 42,
    fontSize: 15,
    color: apColors.text,
    ...apInputTextStyle,
  },
});
