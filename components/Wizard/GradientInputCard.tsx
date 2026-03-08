// File: components/stupid/GradientInputCard.tsx

import React, { forwardRef, useEffect } from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";

interface GradientInputCardProps extends TextInputProps {
  children?: React.ReactNode;
}

const GradientInputCard = forwardRef<TextInput, GradientInputCardProps>(
  ({ children, style, ...textInputProps }, ref) => {
    // Auto-focus on mount to open keyboard
    useEffect(() => {
      const timeout = setTimeout(() => {
        ref && "current" in ref && ref.current?.focus();
      }, 32);

      return () => clearTimeout(timeout);
    }, [ref]);

    return (
      <View style={styles.card}>
        <TextInput
          ref={ref}
          {...textInputProps}
          placeholderTextColor="#94A3B8"
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    elevation: 2,
  },

  input: {
    height: 35,
    fontSize: 17,
    color: "#0F172A",
    fontWeight: "500",
  },
});
