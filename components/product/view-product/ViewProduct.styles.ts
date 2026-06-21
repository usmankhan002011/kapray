import { StyleSheet } from "react-native";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

export const stylesVars = {
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  borderSoft: apColors.borderSoft,
  blue: apColors.blue,
  blueSoft: apColors.blueSoft,
  text: apColors.text,
  subText: apColors.subText,
  mutedText: apColors.muted,
  placeholder: "#94A3B8",
  danger: apColors.danger,
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: apColors.white,
  black: "#000000",
};

export function makeViewProductStyles(width: number, FOOTER_H: number) {
  const styles = StyleSheet.create({
    content: {
      padding: 16,
      backgroundColor: stylesVars.bg,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    title: {
      fontFamily: apFontFamily,
      fontSize: 18,
      fontWeight: "700",
      color: stylesVars.text,
      letterSpacing: 0,
    },

    linkBtn: {
      minHeight: 40,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: apRadii.control,
      backgroundColor: stylesVars.blueSoft,
      borderWidth: 1,
      borderColor: "#D7E3FF",
      alignItems: "center",
      justifyContent: "center",
    },

    linkBtnInline: {
      marginTop: 10,
      alignSelf: "flex-start",
      minHeight: 40,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: apRadii.control,
      backgroundColor: stylesVars.blueSoft,
      borderWidth: 1,
      borderColor: "#D7E3FF",
      alignItems: "center",
      justifyContent: "center",
    },

    linkText: {
      fontFamily: apFontFamily,
      color: stylesVars.blue,
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0,
    },

    loadingRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: apRadii.control,
      borderWidth: 1,
      borderColor: "#D7E3FF",
      backgroundColor: stylesVars.blueSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    loadingText: {
      fontFamily: apFontFamily,
      fontSize: 12,
      color: stylesVars.mutedText,
      fontWeight: "600",
      letterSpacing: 0,
    },

    warn: {
      marginTop: 10,
      borderRadius: apRadii.control,
      borderWidth: 1,
      borderColor: stylesVars.dangerBorder,
      backgroundColor: stylesVars.dangerSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: stylesVars.danger,
      fontFamily: apFontFamily,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      letterSpacing: 0,
    },

    card: {
      marginTop: 12,
      borderRadius: apRadii.card,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      padding: 14,
    },

    sectionTitle: {
      fontFamily: apFontFamily,
      fontSize: 13,
      fontWeight: "700",
      color: stylesVars.text,
      marginBottom: 2,
      letterSpacing: 0,
    },

    meta: {
      marginTop: 6,
      fontFamily: apFontFamily,
      fontSize: 11,
      lineHeight: 16,
      color: stylesVars.mutedText,
      fontWeight: "400",
      letterSpacing: 0,
    },

    compactBlock: {
      marginTop: 12,
      borderRadius: apRadii.card,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      padding: 14,
    },

    compactLine: {
      fontFamily: apFontFamily,
      fontSize: 13,
      fontWeight: "500",
      color: stylesVars.text,
      lineHeight: 18,
      marginTop: 3,
      letterSpacing: 0,
    },

    summaryHeader: {
      gap: 8,
    },

    summaryTitle: {
      fontFamily: apFontFamily,
      color: stylesVars.text,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: "800",
      letterSpacing: 0,
    },

    summaryCategoryLine: {
      fontFamily: apFontFamily,
      color: stylesVars.blue,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      letterSpacing: 0,
    },

    summaryGrid: {
      marginTop: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    summaryItem: {
      flexGrow: 1,
      flexBasis: "47%",
      minHeight: 58,
      borderRadius: apRadii.control,
      borderWidth: 1,
      borderColor: stylesVars.borderSoft,
      backgroundColor: stylesVars.bg,
      paddingHorizontal: 10,
      paddingVertical: 8,
      justifyContent: "center",
    },

    summaryLabel: {
      fontFamily: apFontFamily,
      color: stylesVars.mutedText,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "700",
      letterSpacing: 0,
    },

    summaryValue: {
      marginTop: 3,
      fontFamily: apFontFamily,
      color: stylesVars.text,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "800",
      letterSpacing: 0,
    },

    summaryNote: {
      marginTop: 10,
      fontFamily: apFontFamily,
      color: stylesVars.mutedText,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
      letterSpacing: 0,
    },

    metaLine: {
      marginTop: 6,
      fontFamily: apFontFamily,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: "400",
      color: stylesVars.mutedText,
      letterSpacing: 0,
    },

    label: {
      fontFamily: apFontFamily,
      fontSize: 13,
      fontWeight: "400",
      color: stylesVars.mutedText,
      letterSpacing: 0,
    },

    dataRow: {
      marginTop: 8,
      gap: 3,
    },

    dataLabel: {
      fontFamily: apFontFamily,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
      color: stylesVars.blue,
      letterSpacing: 0,
    },

    dataValue: {
      fontFamily: apFontFamily,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500",
      color: stylesVars.text,
      letterSpacing: 0,
    },

    dataMuted: {
      fontFamily: apFontFamily,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "500",
      color: stylesVars.mutedText,
      letterSpacing: 0,
    },

    dataGroup: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: stylesVars.borderSoft,
      paddingTop: 10,
      gap: 8,
    },

    actionPill: {
      minHeight: 42,
      borderRadius: apRadii.pill,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: "#D7E3FF",
      backgroundColor: stylesVars.white,
      alignItems: "center",
      justifyContent: "center",
    },

    actionPillOn: {
      borderColor: stylesVars.blue,
      backgroundColor: stylesVars.blue,
    },

    actionPillDisabled: {
      opacity: 0.5,
    },

    actionPillText: {
      fontFamily: apFontFamily,
      fontSize: 12,
      fontWeight: "900",
      color: stylesVars.blue,
      letterSpacing: 0,
    },

    actionPillTextOn: {
      color: stylesVars.white,
    },

    actionLink: {
      minHeight: 36,
      paddingVertical: 8,
      paddingRight: 8,
      justifyContent: "center",
    },

    actionLinkText: {
      fontFamily: apFontFamily,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "800",
      color: stylesVars.blue,
      letterSpacing: 0,
    },

    emptyState: {
      marginTop: 10,
      borderRadius: apRadii.card,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.white,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyKicker: {
      fontFamily: apFontFamily,
      color: stylesVars.blue,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      letterSpacing: 0,
    },

    emptyTitle: {
      marginTop: 5,
      fontFamily: apFontFamily,
      color: stylesVars.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: 0,
    },

    emptyText: {
      marginTop: 4,
      fontFamily: apFontFamily,
      color: stylesVars.mutedText,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: "500",
      textAlign: "center",
      letterSpacing: 0,
    },

    loadingBox: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: apRadii.control,
      borderWidth: 1,
      borderColor: "#D7E3FF",
      backgroundColor: stylesVars.blueSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    warningBox: {
      marginTop: 10,
      borderRadius: apRadii.control,
      borderWidth: 1,
      borderColor: stylesVars.dangerBorder,
      backgroundColor: stylesVars.dangerSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    warningText: {
      fontFamily: apFontFamily,
      color: stylesVars.danger,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      letterSpacing: 0,
    },

    mediaBlock: {
      marginTop: 14,
      borderRadius: apRadii.card,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      overflow: "hidden",
    },

    // Legacy-style horizontal media row used by Images and Videos cards.
    hRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingTop: 10,
      paddingRight: 2,
      paddingBottom: 2,
    },

    imageHeroWrap: {
      marginTop: 10,
      width: "100%",
      height: 250,
      borderRadius: apRadii.card,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: "#F1F5F9",
    },

    imageHero: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      backgroundColor: "#F1F5F9",
    },

    imageHeroBannerTag: {
      position: "absolute",
      left: 10,
      top: 10,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: apRadii.pill,
      backgroundColor: "rgba(0,0,0,0.58)",
    },

    imageHeroCount: {
      position: "absolute",
      right: 10,
      bottom: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: apRadii.pill,
      backgroundColor: "rgba(0,0,0,0.45)",
    },

    // Kept for backward compatibility with the previous unified media block.
    heroWrap: {
      width: "100%",
      backgroundColor: stylesVars.cardBg,
    },

    heroImage: {
      width: "100%",
      height: 230,
      resizeMode: "cover",
      backgroundColor: "#F1F5F9",
    },

    heroVideoBox: {
      width: "100%",
      height: 230,
      backgroundColor: stylesVars.black,
    },

    heroVideo: {
      width: "100%",
      height: "100%",
    },

    heroCover: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },

    heroOpenViewerBtn: {
      position: "absolute",
      right: 10,
      bottom: 10,
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: apRadii.pill,
      backgroundColor: stylesVars.blue,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroOpenViewerText: {
      fontFamily: apFontFamily,
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 11,
      letterSpacing: 0,
    },

    thumbRow: {
      flexDirection: "row",
      gap: 10,
      padding: 10,
    },

    thumbWrap: {
      width: 88,
      height: 88,
      borderRadius: apRadii.control,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
    },

    thumbOn: {
      borderColor: stylesVars.blue,
      borderWidth: 2,
    },

    videoThumbOn: {
      borderColor: stylesVars.blue,
      borderWidth: 2,
    },

    thumb: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      backgroundColor: "#F1F5F9",
    },

    bannerTag: {
      position: "absolute",
      left: 6,
      top: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: apRadii.pill,
      backgroundColor: "rgba(0,0,0,0.58)",
    },

    bannerTagText: {
      fontFamily: apFontFamily,
      color: stylesVars.white,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0,
    },

    videoPage: {
      paddingTop: 10,
      paddingRight: 10,
    },

    videoBox: {
      height: 230,
      borderRadius: apRadii.card,
      overflow: "hidden",
      backgroundColor: stylesVars.black,
      borderWidth: 1,
      borderColor: stylesVars.border,
    },

    video: {
      width: "100%",
      height: "100%",
      backgroundColor: stylesVars.black,
    },

    videoPagerCover: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      backgroundColor: stylesVars.black,
    },

    videoPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: stylesVars.blueSoft,
      paddingHorizontal: 6,
    },

    videoPlaceholderLarge: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: stylesVars.blueSoft,
      paddingHorizontal: 12,
    },

    videoPlaceholderText: {
      fontFamily: apFontFamily,
      color: stylesVars.blue,
      fontWeight: "700",
      fontSize: 11,
      textAlign: "center",
      letterSpacing: 0,
    },

    mediaEmptyBox: {
      marginTop: 10,
      minHeight: 118,
      borderRadius: apRadii.card,
      borderWidth: 1,
      borderColor: "#D7E3FF",
      backgroundColor: stylesVars.blueSoft,
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
    },

    mediaEmptyKicker: {
      fontFamily: apFontFamily,
      color: stylesVars.blue,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      letterSpacing: 0,
    },

    mediaEmptyTitle: {
      marginTop: 5,
      fontFamily: apFontFamily,
      color: stylesVars.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: 0,
    },

    mediaEmptyText: {
      marginTop: 4,
      fontFamily: apFontFamily,
      color: stylesVars.mutedText,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: "500",
      textAlign: "center",
      letterSpacing: 0,
    },

    playBadge: {
      position: "absolute",
      right: 6,
      bottom: 6,
      width: 26,
      height: 26,
      borderRadius: apRadii.pill,
      backgroundColor: stylesVars.overlayDark,
      alignItems: "center",
      justifyContent: "center",
    },

    playBadgeText: {
      fontFamily: apFontFamily,
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 11,
      letterSpacing: 0,
    },

    videoControlsOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },

    videoControlPill: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: apRadii.pill,
      backgroundColor: "rgba(0,0,0,0.35)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
    },

    videoControlText: {
      fontFamily: apFontFamily,
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 18,
      letterSpacing: 0,
    },

    empty: {
      marginTop: 8,
      fontFamily: apFontFamily,
      color: stylesVars.placeholder,
      fontSize: 13,
      fontWeight: "500",
      letterSpacing: 0,
    },

    specTitle: {
      marginTop: 8,
      fontFamily: apFontFamily,
      fontSize: 12,
      fontWeight: "500",
      color: stylesVars.text,
      letterSpacing: 0,
    },

    specRow: {
      marginTop: 8,
    },

    specLabel: {
      fontFamily: apFontFamily,
      fontSize: 12,
      fontWeight: "700",
      color: stylesVars.mutedText,
      letterSpacing: 0,
    },

    specValue: {
      marginTop: 3,
      fontFamily: apFontFamily,
      fontSize: 12,
      lineHeight: 17,
      color: stylesVars.text,
      fontWeight: "500",
      letterSpacing: 0,
    },

    specPlainValue: {
      marginTop: 4,
    },

    moreDescText: {
      marginTop: 6,
      fontFamily: apFontFamily,
      fontSize: 13,
      fontWeight: "500",
      color: stylesVars.subText,
      lineHeight: 19,
      letterSpacing: 0,
    },

    fabVendor: {
      position: "absolute",
      top: 56,
      right: 14,
      zIndex: 30,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: apRadii.pill,
      backgroundColor: stylesVars.blueSoft,
      borderWidth: 1,
      borderColor: "#D7E3FF",
    },

    fabVendorText: {
      fontFamily: apFontFamily,
      color: stylesVars.blue,
      fontWeight: "700",
      fontSize: 12,
      letterSpacing: 0,
    },

    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: FOOTER_H,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 18,
      backgroundColor: stylesVars.cardBg,
      borderTopWidth: 1,
      borderTopColor: stylesVars.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: stylesVars.black,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 10,
    },

    footerTitle: {
      fontFamily: apFontFamily,
      fontSize: 13,
      fontWeight: "700",
      color: stylesVars.text,
      letterSpacing: 0,
    },

    footerSub: {
      marginTop: 4,
      fontFamily: apFontFamily,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "500",
      color: stylesVars.mutedText,
      letterSpacing: 0,
    },

    footerBtn: {
      minHeight: 48,
      backgroundColor: stylesVars.blue,
      borderRadius: apRadii.control,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },

    footerBtnDisabled: {
      opacity: 0.6,
    },

    footerBtnText: {
      fontFamily: apFontFamily,
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 13,
      letterSpacing: 0,
    },

    viewerContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },

    viewerPage: {
      width,
      height: "100%",
      backgroundColor: stylesVars.black,
    },

    viewerImage: {
      width,
      height: "100%",
      resizeMode: "contain",
    },

    viewerVideo: {
      width: "100%",
      height: "100%",
    },

    viewerCover: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      resizeMode: "contain",
      backgroundColor: stylesVars.black,
    },

    closeButton: {
      position: "absolute",
      top: 40,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: apRadii.pill,
      backgroundColor: stylesVars.overlaySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    closeText: {
      fontFamily: apFontFamily,
      color: stylesVars.white,
      fontSize: 20,
      fontWeight: "900",
      letterSpacing: 0,
    },

    indexCaption: {
      position: "absolute",
      bottom: 34,
      alignSelf: "center",
      backgroundColor: stylesVars.overlaySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: apRadii.pill,
    },

    indexText: {
      fontFamily: apFontFamily,
      color: stylesVars.white,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0,
    },

    pressed: {
      opacity: 0.82,
    },
  });

  return { stylesVars, styles };
}
