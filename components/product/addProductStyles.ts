import { Platform, StyleSheet, type TextStyle } from "react-native";
import { appInputTextStyle } from "@/components/ui/AppTextInput";

export const apFontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const apRadii = {
  card: 8,
  control: 10,
  pill: 999,
};

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
  success: "#166534",
  successSoft: "#F0FDF4",
  warning: "#B45309",
  warningSoft: "#FFF7ED",
  white: "#FFFFFF"
};

export const apSpacing = {
  pagePad: 16,
  blockGap: 12
};

export const apInputTextStyle: TextStyle = {
  ...appInputTextStyle,
  textAlignVertical: "center"
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

  contentWithFooter: {
    paddingBottom: 116
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  progressWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },

  progressPill: {
    flexShrink: 1,
    minHeight: 23,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
    alignItems: "center",
    justifyContent: "center"
  },

  progressPillOn: {
    minHeight: 27,
    paddingHorizontal: 7
  },

  progressTextOn: {
    color: apColors.blue,
    fontSize: 11,
    fontWeight: "800"
  },

  progressText: {
    fontFamily: apFontFamily,
    fontSize: 9,
    fontWeight: "700",
    color: apColors.muted,
    letterSpacing: 0
  },

  card: {
    marginTop: 14,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 18,
    marginBottom: apSpacing.blockGap
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: apFontFamily,
    color: apColors.text
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: apFontFamily,
    color: apColors.text,
    lineHeight: 20
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: apFontFamily,
    color: apColors.muted,
    lineHeight: 20
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: apFontFamily,
    color: apColors.text,
    letterSpacing: 0
  },

  metaHint: {
    marginTop: 10,
    color: apColors.muted,
    fontWeight: "500",
    fontSize: 13,
    fontFamily: apFontFamily,
    lineHeight: 18
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    borderRadius: apRadii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    ...apInputTextStyle,
    color: apColors.text,
    backgroundColor: apColors.white
  },

  fieldBlock: {
    marginTop: 14
  },

  helperText: {
    marginTop: 6,
    color: apColors.subText,
    fontSize: 12,
    fontWeight: "500",
    fontFamily: apFontFamily,
    lineHeight: 16
  },

  linkBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.control,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  linkText: {
    color: apColors.blue,
    fontWeight: "700",
    fontFamily: apFontFamily,
    fontSize: 14
  },

  warn: {
    marginTop: 10,
    color: apColors.muted,
    fontWeight: "500",
    fontSize: 13,
    fontFamily: apFontFamily,
    lineHeight: 18
  },

  btnStack: {
    marginTop: 14,
    gap: 10
  },

  primaryBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: apRadii.control,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: apColors.blue
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
    fontFamily: apFontFamily,
    fontSize: 14
  },

  secondaryBtn: {
    minHeight: 48,
    borderRadius: apRadii.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: {
    color: apColors.blue,
    fontWeight: "700",
    fontFamily: apFontFamily,
    fontSize: 14
  },

  dangerBtn: {
    minHeight: 48,
    borderRadius: apRadii.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: apColors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  dangerText: {
    color: apColors.danger,
    fontWeight: "700",
    fontFamily: apFontFamily,
    fontSize: 14
  },

  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: {
    color: apColors.muted,
    fontWeight: "600",
    fontFamily: apFontFamily,
    fontSize: 13
  },

  segmentRow: {
    flexDirection: "column",
    gap: 10,
    marginTop: 12
  },

  subChoicePanel: {
    marginTop: -2,
    marginBottom: 2,
    marginLeft: 10,
    paddingLeft: 12,
    paddingVertical: 12,
    paddingRight: 10,
    borderLeftWidth: 2,
    borderLeftColor: apColors.blue,
    borderRadius: apRadii.card,
    backgroundColor: apColors.blueSoft
  },

  subChoiceStack: {
    gap: 10,
    marginTop: 10
  },

  segment: {
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: apRadii.control,
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
    fontFamily: apFontFamily,
    fontSize: 14
  },

  segmentTextOn: { color: apColors.blue },

  segmentTextDisabled: { color: apColors.text },

  footer: {
    borderTopWidth: 1,
    borderTopColor: apColors.border,
    backgroundColor: "rgba(248,250,252,0.98)",
    paddingHorizontal: apSpacing.pagePad,
    paddingTop: 10,
    paddingBottom: 16
  },

  footerKeyboardVisible: {
    paddingBottom: 34
  },

  footerHint: {
    marginBottom: 8,
    color: apColors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: apFontFamily
  },

  footerHintWarn: {
    color: apColors.warning
  },

  iconTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },

  iconBtn: {
    minHeight: 40,
    minWidth: 40,
    borderRadius: apRadii.control,
    backgroundColor: apColors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },

  sizeChip: {
    minHeight: 40,
    minWidth: 58,
    paddingHorizontal: 12,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
    alignItems: "center",
    justifyContent: "center"
  },

  sizeChipOn: {
    borderColor: apColors.blue,
    backgroundColor: apColors.blueSoft
  },

  sizeChipText: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: apFontFamily,
    color: apColors.text
  },

  sizeChipTextOn: {
    color: apColors.blue
  },

  notice: {
    marginTop: 12,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
    padding: 12
  },

  noticeWarning: {
    borderColor: "#FED7AA",
    backgroundColor: apColors.warningSoft
  },

  noticeSuccess: {
    borderColor: "#BBF7D0",
    backgroundColor: apColors.successSoft
  },

  noticeTitle: {
    color: apColors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    fontFamily: apFontFamily
  },

  noticeText: {
    marginTop: 4,
    color: apColors.subText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: apFontFamily
  },

  choiceDescription: {
    marginTop: 4,
    color: apColors.subText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    fontFamily: apFontFamily
  },

  pressed: { opacity: 0.82 }
});
