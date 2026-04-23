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
  white: "#FFFFFF",
};

export const apSpacing = {
  pagePad: 16,
  blockGap: 12,
};

export const authStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: apColors.bg,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: apSpacing.pagePad,
    paddingTop: apSpacing.pagePad,
    paddingBottom: 24,
    backgroundColor: apColors.bg,
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 18,
    marginBottom: apSpacing.blockGap,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: apColors.text,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    color: apColors.muted,
    lineHeight: 20,
  },

  label: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "700",
    color: apColors.text,
    letterSpacing: 0.2,
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
    backgroundColor: apColors.white,
  },

  primaryBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: apColors.blue,
  },

  primaryBtnDisabled: {
    opacity: 0.6,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  secondaryBtn: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryText: {
    color: apColors.blue,
    fontWeight: "700",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: apColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: apColors.border,
    padding: 18,
  },
});
