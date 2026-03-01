// app/tailors/components/TailoringCheckoutBlock.tsx
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type StitchingChoice = "yes" | "no" | "";

type Props = {
  /**
   * If eligible=false => render NOTHING.
   * (Rule: if vendor does not offer tailoring, hide the whole “Do you want stitching?” UI.)
   */
  eligible: boolean;

  /** PKR only */
  costPkr: number;

  /** Turnaround days (vendor-set per product) */
  turnaroundDays: number;

  /** Buyer choice */
  value: StitchingChoice;

  /** Update buyer choice */
  onChange: (next: StitchingChoice) => void;

  /** Optional: disable toggle during loading/submitting */
  disabled?: boolean;
};

const clampPkr = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
};

const clampDays = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
};

export default function TailoringCheckoutBlock(props: Props) {
  const eligible = !!props.eligible;

  // ✅ Rule: if not eligible, hide everything (no extra lines in parent screens)
  if (!eligible) return null;

  const cost = useMemo(() => clampPkr(props.costPkr), [props.costPkr]);
  const days = useMemo(() => clampDays(props.turnaroundDays), [props.turnaroundDays]);
  const value: StitchingChoice = props.value ?? "";

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Stitching</Text>

      <Text style={styles.line}>
        Stitching available • {days ? `${days} days` : "— days"} • +PKR {cost}
      </Text>

      <Text style={styles.question}>Do you want stitching?</Text>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => props.onChange("yes")}
          disabled={props.disabled}
          style={({ pressed }) => [
            styles.toggleBtn,
            value === "yes" ? styles.toggleOn : null,
            pressed ? styles.pressed : null,
            props.disabled ? styles.disabled : null
          ]}
        >
          <Text style={[styles.toggleText, value === "yes" ? styles.toggleTextOn : null]}>Yes</Text>
        </Pressable>

        <Pressable
          onPress={() => props.onChange("no")}
          disabled={props.disabled}
          style={({ pressed }) => [
            styles.toggleBtn,
            value === "no" ? styles.toggleOn : null,
            pressed ? styles.pressed : null,
            props.disabled ? styles.disabled : null
          ]}
        >
          <Text style={[styles.toggleText, value === "no" ? styles.toggleTextOn : null]}>No</Text>
        </Pressable>
      </View>

      <Text style={styles.note}>Note: Tailoring applies to unstitched cloth only.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 8
  },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#111" },

  line: { fontSize: 12, fontWeight: "800", color: "#374151" },

  question: { marginTop: 6, fontSize: 12, fontWeight: "900", color: "#111" },

  toggleRow: { flexDirection: "row", gap: 10, marginTop: 6, flexWrap: "wrap" },
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

  note: { marginTop: 6, fontSize: 11, fontWeight: "700", color: "#6B7280" },

  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 }
});