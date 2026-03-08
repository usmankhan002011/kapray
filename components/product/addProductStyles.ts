import { StyleSheet } from "react-native";

export const apColors = {
  bg: "#ffffff",
  card: "#ffffff",

  blue: "#0B2F6B",
  blueSoft: "#EAF2FF",
  blueLabel: "#1E4C9A",

  text: "#111111",
  muted: "#60708A",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",

  danger: "#B42318",
  white: "#ffffff"
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
    justifyContent: "space-between"
  },

  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 14,
    marginBottom: apSpacing.blockGap
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: apColors.blue
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: apColors.muted,
    lineHeight: 18
  },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: apColors.blueLabel,
    letterSpacing: 0.2
  },

  metaHint: {
    marginTop: 10,
    color: apColors.muted,
    fontWeight: "800",
    fontSize: 12
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: apColors.border
  },

  linkText: {
    color: apColors.blue,
    fontWeight: "900"
  },

  warn: {
    marginTop: 10,
    color: apColors.muted,
    fontWeight: "800"
  },

  btnStack: {
    marginTop: 14,
    gap: 10
  },

  primaryBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: apColors.blue
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: apColors.blue,
    alignItems: "center"
  },
  secondaryText: { color: apColors.blue, fontWeight: "900", fontSize: 15 },

  dangerBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: apColors.border,
    alignItems: "center"
  },
  dangerText: { color: apColors.danger, fontWeight: "900", fontSize: 14 },

  // ✅ REQUIRED (fixes your red-line errors)
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: {
    color: apColors.muted,
    fontWeight: "800"
  },

  // ✅ Categories one-below-another (vertical)
  segmentRow: {
    flexDirection: "column",
    gap: 10,
    marginTop: 12
  },

  segment: {
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff"
  },

  segmentOn: {
    backgroundColor: apColors.blueSoft,
    borderColor: apColors.blue
  },

  segmentDisabled: { opacity: 0.45 },

  segmentText: {
    color: apColors.text,
    fontWeight: "900",
    fontSize: 13
  },

  segmentTextOn: { color: apColors.blue },

  segmentTextDisabled: { color: apColors.text },

  pressed: { opacity: 0.75 }
});