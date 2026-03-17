import { StyleSheet } from "react-native";

export const apColors = {
  bg: "#F8FAFC",
  card: "#FFFFFF",

  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  blueLabel: "#0F172A",

  text: "#0F172A",
  muted: "#64748B",
  subText: "#475569",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",

  danger: "#B42318",
  white: "#FFFFFF"
};

export const apSpacing = {
  pagePad: 16,
  blockGap: 12
};

export const apStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: apColors.bg
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: apSpacing.pagePad,
    paddingTop: apSpacing.pagePad,
    paddingBottom: 24,
    backgroundColor: apColors.bg
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 18,
    marginBottom: apSpacing.blockGap
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: apColors.text
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    color: apColors.muted,
    lineHeight: 20
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: apColors.text,
    letterSpacing: 0.2
  },

  metaHint: {
    marginTop: 10,
    color: apColors.muted,
    fontWeight: "500",
    fontSize: 13,
    lineHeight: 18
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: apColors.text,
    backgroundColor: apColors.white
  },

  linkBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  linkText: {
    color: apColors.blue,
    fontWeight: "700",
    fontSize: 14
  },

  warn: {
    marginTop: 10,
    color: apColors.muted,
    fontWeight: "500",
    fontSize: 13,
    lineHeight: 18
  },

  btnStack: {
    marginTop: 14,
    gap: 10
  },

  primaryBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: apColors.blue
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: { color: apColors.blue, fontWeight: "700", fontSize: 14 },

  dangerBtn: {
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: apColors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  dangerText: { color: apColors.danger, fontWeight: "700", fontSize: 14 },

  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: {
    color: apColors.muted,
    fontWeight: "600",
    fontSize: 13
  },

  segmentRow: {
    flexDirection: "column",
    gap: 10,
    marginTop: 12
  },

  segment: {
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff"
  },

  segmentOn: {
    backgroundColor: apColors.blueSoft,
    borderColor: apColors.blue
  },

  segmentDisabled: { opacity: 0.6 },

  segmentText: {
    color: apColors.text,
    fontWeight: "700",
    fontSize: 14
  },

  segmentTextOn: { color: apColors.blue },

  segmentTextDisabled: { color: apColors.text },

  pressed: { opacity: 0.82 }
});