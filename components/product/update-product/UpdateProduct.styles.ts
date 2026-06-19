import { StyleSheet } from "react-native";

export const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  white: "#FFFFFF",
  black: "#000000",
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 110,
    backgroundColor: stylesVars.bg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  linkBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  linkText: {
    color: stylesVars.blue,
    fontSize: 14,
    fontWeight: "700",
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
    marginBottom: 2,
    flex: 1,
  },

  selectedBox: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    padding: 14,
  },

  selectedCode: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  selectedTitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.text,
  },

  smallBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  smallBtnDisabled: {
    opacity: 0.6,
  },

  smallBtnText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  label: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.text,
    letterSpacing: 0.2,
  },

  inventoryLabel: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "900",
    color: stylesVars.danger,
    letterSpacing: 0.2,
  },

  inventoryInput: {
    color: stylesVars.danger,
    fontSize: 18,
    fontWeight: "900",
  },

  inventoryAlertText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: stylesVars.danger,
    fontWeight: "900",
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    backgroundColor: stylesVars.white,
  },

  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },

  readonlyField: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
  },

  readonlyValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.text,
  },

  madeOnOrderPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  madeOnOrderText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  metaLine: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  metaStrong: {
    color: stylesVars.blue,
    fontWeight: "700",
  },

  metaSmall: {
    marginTop: 10,
    color: stylesVars.text,
    fontWeight: "700",
    fontSize: 13,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },

  loadingText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  thumbRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },

  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
  },

  thumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
  },

  thumbX: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: stylesVars.dangerSoft,
    borderColor: stylesVars.dangerBorder,
    borderWidth: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  thumbXText: {
    color: stylesVars.danger,
    fontWeight: "700",
    fontSize: 12,
  },

  videoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
  },

  videoPlaceholderText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  playBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: stylesVars.overlayDark,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  playBadgeText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 12,
  },

  bottomBar: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    backgroundColor: stylesVars.white,
  },

  cancelBtn: {
    flex: 0.8,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.white,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: stylesVars.text,
    fontSize: 14,
    fontWeight: "800",
  },

  saveBtn: {
    flex: 1,
    marginTop: 0,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
  },

  saveBtnDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
  },

  warn: {
    marginTop: 10,
    color: stylesVars.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  empty: {
    marginTop: 10,
    color: stylesVars.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  emptyInline: {
    marginTop: 8,
    color: stylesVars.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },

  inlineToggleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  inlineTogglePill: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  inlineTogglePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  inlineTogglePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  inlineTogglePillTextOn: {
    color: stylesVars.white,
  },

  optionWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  optionPillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  optionPillDisabled: {
    opacity: 0.5,
  },

  optionPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  optionPillTextOn: {
    color: stylesVars.white,
  },

  variantInventoryBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
  },

  variantInventoryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.blue,
  },

  variantCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.white,
    borderRadius: 12,
    padding: 10,
  },

  variantCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.text,
  },

  variantGuideImage: {
    marginTop: 10,
    width: 92,
    height: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#F1F5F9",
  },

  variantSizeGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  variantSizeCell: {
    width: 84,
  },

  variantSizeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: stylesVars.mutedText,
  },

  variantQtyInput: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 18,
    color: stylesVars.danger,
    fontWeight: "900",
    backgroundColor: stylesVars.white,
  },

  mediaActionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  previewBox: {
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    padding: 12,
  },

  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },

  previewImageFallback: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: "center",
    justifyContent: "center",
  },

  previewImageFallbackText: {
    color: stylesVars.mutedText,
    fontSize: 10,
    fontWeight: "700",
  },

  previewInfo: {
    flex: 1,
    justifyContent: "center",
  },

  appendBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
  },

  appendTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.blue,
  },

  appendCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.white,
    borderRadius: 12,
    padding: 10,
  },

  readonlyListBox: {
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.white,
    borderRadius: 12,
    padding: 10,
  },

  addFullBtn: {
    marginTop: 12,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  addFullBtnText: {
    color: stylesVars.blue,
    fontSize: 13,
    fontWeight: "800",
  },

  textAreaSmall: {
    minHeight: 74,
    paddingTop: 12,
  },

  draftHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  discardDraftBtn: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: stylesVars.dangerSoft,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  discardDraftText: {
    color: stylesVars.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.82,
  },
});
