import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  apColors,
  apFontFamily,
  apRadii,
  apStyles,
} from "@/components/product/addProductStyles";

type Props = {
  title: string;
  onBack?: () => void;
  onAny?: () => void;
  onNext?: () => void;
  anyLabel?: string;
  nextLabel?: string;
  children: React.ReactNode;
};

export default function StandardFilterDisplay({
  title,
  onBack,
  onAny,
  onNext,
  anyLabel = "Any",
  nextLabel = "Next",
  children
}: Props) {
  return (
    <View style={apStyles.screen}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={({ pressed }) => [
            apStyles.iconBtn,
            pressed ? apStyles.pressed : null
          ]}
        >
          <MaterialIcons name="arrow-back" size={18} color={apColors.blue} />
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.headerSlot} />
      </View>

      <View style={styles.content}>{children}</View>

      <View style={apStyles.footer}>
        <View style={styles.footerRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onAny}
            style={({ pressed }) => [
              apStyles.secondaryBtn,
              styles.footerButton,
              pressed ? apStyles.pressed : null
            ]}
          >
            <Text style={apStyles.secondaryText}>{anyLabel}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            style={({ pressed }) => [
              apStyles.primaryBtn,
              styles.footerButton,
              styles.nextButton,
              pressed ? apStyles.pressed : null
            ]}
          >
            <Text style={apStyles.primaryText}>{nextLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const stylesVars = {
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  blue: apColors.blue,
  text: apColors.text,
  mutedText: apColors.muted,
  white: apColors.white
};

export const optionStyles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: apRadii.card,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    marginBottom: 10
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },

  label: {
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "700",
    fontFamily: apFontFamily
  }
});

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: stylesVars.bg
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: apFontFamily,
    color: stylesVars.text,
    paddingHorizontal: 10
  },

  headerSlot: {
    width: 40,
    height: 40
  },

  content: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  footerRow: {
    flexDirection: "row",
    gap: 10
  },

  footerButton: {
    flex: 1,
    marginTop: 0
  },

  nextButton: {
    marginTop: 0
  }
});
