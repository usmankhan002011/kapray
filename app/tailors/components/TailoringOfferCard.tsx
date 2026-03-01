// app/tailors/components/TailoringOfferCard.tsx
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  eligible: boolean;
  costPkr: number;
  turnaroundDays: number;
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

export default function TailoringOfferCard(props: Props) {
  const eligible = Boolean(props.eligible);

  // If not eligible → show nothing
  if (!eligible) return null;

  const costPkr = useMemo(() => safeInt(props.costPkr), [props.costPkr]);
  const turnaroundDays = useMemo(() => safeInt(props.turnaroundDays), [props.turnaroundDays]);

  const [choice, setChoice] = useState<"yes" | "no" | "">("");

  return (
    <View style={[styles.wrap, styles.wrapOn]}>
      <Text style={styles.title}>Stitching available</Text>

      <Text style={styles.question}>Do you want stitching?</Text>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setChoice("yes")}
          style={({ pressed }) => [
            styles.toggleBtn,
            choice === "yes" ? styles.toggleOn : null,
            pressed ? styles.pressed : null
          ]}
        >
          <Text style={[styles.toggleText, choice === "yes" ? styles.toggleTextOn : null]}>
            Yes
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setChoice("no")}
          style={({ pressed }) => [
            styles.toggleBtn,
            choice === "no" ? styles.toggleOn : null,
            pressed ? styles.pressed : null
          ]}
        >
          <Text style={[styles.toggleText, choice === "no" ? styles.toggleTextOn : null]}>
            No
          </Text>
        </Pressable>
      </View>

      {choice === "yes" ? (
        <View style={styles.row}>
          <Text style={styles.pill}>{turnaroundDays || "—"} days</Text>
          <Text style={styles.pill}>+PKR {costPkr || "—"}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12
  },
  wrapOn: {
    borderColor: "#D9E2F2",
    backgroundColor: "#EAF2FF"
  },

  title: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0B2F6B"
  },

  question: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "#111"
  },

  toggleRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 999,
    backgroundColor: "#fff"
  },
  toggleOn: { backgroundColor: "#111" },
  toggleText: { fontSize: 13, fontWeight: "900", color: "#111" },
  toggleTextOn: { color: "#fff" },

  row: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D9E2F2",
    backgroundColor: "#fff",
    fontSize: 12,
    fontWeight: "900",
    color: "#111"
  },

  pressed: { opacity: 0.8 }
});