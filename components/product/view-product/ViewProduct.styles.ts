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
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
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

    linkBtnInline: {
      marginTop: 10,
      alignSelf: "flex-start",
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
      fontSize: 13,
      fontWeight: "700",
    },

    loadingRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    loadingText: {
      fontSize: 12,
      color: stylesVars.mutedText,
      fontWeight: "600",
    },

    warn: {
      marginTop: 10,
      color: stylesVars.mutedText,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "500",
    },

    card: {
      marginTop: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      padding: 14,
    },

    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: stylesVars.text,
      marginBottom: 2,
    },

    meta: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 16,
      color: stylesVars.mutedText,
      fontWeight: "400",
    },

    compactBlock: {
      marginTop: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      padding: 14,
    },

    compactLine: {
      fontSize: 13,
      fontWeight: "500",
      color: stylesVars.text,
      lineHeight: 18,
      marginTop: 3,
    },

    metaLine: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: "400",
      color: stylesVars.mutedText,
    },

    label: {
      fontSize: 13,
      fontWeight: "400",
      color: stylesVars.mutedText,
      letterSpacing: 0.2,
    },

    mediaBlock: {
      marginTop: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      overflow: "hidden",
    },

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
      borderRadius: 999,
      backgroundColor: stylesVars.blue,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroOpenViewerText: {
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 11,
    },

    thumbRow: {
      flexDirection: "row",
      gap: 10,
      padding: 10,
    },

    thumbWrap: {
      width: 84,
      height: 84,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
    },

    thumbOn: {
      borderColor: stylesVars.blue,
      borderWidth: 2,
    },

    thumb: {
      width: "100%",
      height: "100%",
      backgroundColor: "#F1F5F9",
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
      fontSize: 11,
    },

    playBadge: {
      position: "absolute",
      right: 6,
      bottom: 6,
      width: 26,
      height: 26,
      borderRadius: 999,
      backgroundColor: stylesVars.overlayDark,
      alignItems: "center",
      justifyContent: "center",
    },

    playBadgeText: {
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 11,
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
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.35)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
    },

    videoControlText: {
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 18,
    },

    specTitle: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "500",
      color: stylesVars.text,
    },

    specRow: {
      marginTop: 8,
    },

    specLabel: {
      fontSize: 12,
      fontWeight: "400",
      color: stylesVars.mutedText,
    },

    specValue: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: stylesVars.text,
      fontWeight: "500",
    },

    moreDescText: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: "500",
      color: stylesVars.subText,
      lineHeight: 19,
    },

    fabVendor: {
      position: "absolute",
      top: 56,
      right: 14,
      zIndex: 30,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: stylesVars.dangerSoft,
      borderWidth: 1,
      borderColor: stylesVars.dangerBorder,
    },

    fabVendorText: {
      color: stylesVars.danger,
      fontWeight: "700",
      fontSize: 12,
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
    },

    footerTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: stylesVars.text,
    },

    footerSub: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "500",
      color: stylesVars.mutedText,
    },

    footerBtn: {
      minHeight: 48,
      backgroundColor: stylesVars.blue,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },

    footerBtnDisabled: {
      opacity: 0.6,
    },

    footerBtnText: {
      color: stylesVars.white,
      fontWeight: "700",
      fontSize: 13,
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
      borderRadius: 999,
      backgroundColor: stylesVars.overlaySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    closeText: {
      color: stylesVars.white,
      fontSize: 20,
      fontWeight: "900",
    },

    indexCaption: {
      position: "absolute",
      bottom: 34,
      alignSelf: "center",
      backgroundColor: stylesVars.overlaySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },

    indexText: {
      color: stylesVars.white,
      fontSize: 13,
      fontWeight: "800",
    },

    pressed: {
      opacity: 0.82,
    },
  });

  return { stylesVars, styles };
}