import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  title: string;
  onBack?: () => void;
  onAny?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
};

export default function StandardFilterDisplay({
  title,
  onBack,
  onAny,
  onNext,
  children
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text onPress={onBack} style={styles.action}>
          Back
        </Text>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <Text onPress={onNext} style={styles.action}>
          Next
        </Text>
      </View>

      <View style={styles.anyRow}>
        <Text onPress={onAny} style={styles.anyText}>
          Any
        </Text>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  blue: "#2563EB",
  text: "#0F172A",
  mutedText: "#64748B",
  white: "#FFFFFF"
};

export const optionStyles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
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
    fontSize: 15,
    color: stylesVars.text,
    fontWeight: "600"
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: stylesVars.bg
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },

  action: {
    fontSize: 14,
    fontWeight: "600",
    color: stylesVars.blue
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
    paddingHorizontal: 10
  },

  anyRow: {
    marginTop: 12,
    marginBottom: 8
  },

  anyText: {
    fontSize: 14,
    fontWeight: "600",
    color: stylesVars.mutedText
  },

  content: {
    flex: 1
  }
});