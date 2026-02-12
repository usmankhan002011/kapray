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

export const optionStyles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  label: {
    fontSize: 16,
    color: "#111"
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  action: {
    fontSize: 16,
    color: "#111"
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    paddingHorizontal: 10
  },
  anyRow: {
    marginTop: 12,
    marginBottom: 6
  },
  anyText: {
    fontSize: 14,
    color: "#111"
  },
  content: {
    flex: 1
  }
});
