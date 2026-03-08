import { StyleSheet } from "react-native";

export const stylesVars = {
  bg: "#F5F7FB",
  cardBg: "#FFFFFF",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",
  blue: "#3e6292",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5"
};

export function makeViewProductStyles(width: number, FOOTER_H: number) {
  const styles = StyleSheet.create({
    content: { padding: 16, backgroundColor: stylesVars.bg },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    title: { fontSize: 18, fontWeight: "900", color: stylesVars.blue },

    linkBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: stylesVars.blueSoft,
      borderWidth: 1,
      borderColor: stylesVars.border
    },
    linkBtnInline: {
      marginTop: 10,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: stylesVars.blueSoft,
      borderWidth: 1,
      borderColor: stylesVars.border
    },
    linkText: { color: stylesVars.blue, fontWeight: "900" },

    loadingRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    loadingText: { fontSize: 12, color: stylesVars.subText, fontWeight: "800" },

    warn: { marginTop: 10, color: stylesVars.subText },

    card: {
      marginTop: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      padding: 14
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: stylesVars.blue,
      letterSpacing: 0.3
    },

    meta: {
      marginTop: 6,
      fontSize: 12,
      color: stylesVars.subText,
      fontWeight: "800"
    },

    compactBlock: {
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.cardBg,
      padding: 12
    },
    compactLine: {
      fontSize: 12,
      fontWeight: "800",
      color: stylesVars.text,
      lineHeight: 16,
      marginTop: 4
    },
    metaLine: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "800",
      color: stylesVars.subText
    },

    label: {
      fontSize: 12,
      fontWeight: "900",
      color: stylesVars.blue,
      letterSpacing: 0.2
    },

    mediaBlock: {
      marginTop: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: "#fff",
      overflow: "hidden"
    },
    heroWrap: { width: "100%", backgroundColor: "#fff" },
    heroImage: { width: "100%", height: 230, resizeMode: "cover", backgroundColor: "#f3f3f3" },

    heroVideoBox: {
      width: "100%",
      height: 230,
      backgroundColor: "#000"
    },
    heroVideo: { width: "100%", height: "100%" },
    heroCover: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      resizeMode: "cover"
    },

    heroOpenViewerBtn: {
      position: "absolute",
      right: 10,
      bottom: 10,
      backgroundColor: "rgba(11,47,107,0.92)",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)"
    },
    heroOpenViewerText: { color: "#fff", fontWeight: "900", fontSize: 12 },

    thumbRow: { flexDirection: "row", gap: 10, padding: 10 },
    thumbWrap: {
      width: 84,
      height: 84,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: stylesVars.borderSoft,
      backgroundColor: "#fff"
    },
    thumbOn: {
      borderColor: stylesVars.blue,
      borderWidth: 2
    },
    thumb: { width: "100%", height: "100%", backgroundColor: "#f3f3f3" },

    videoPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F1F5FF"
    },
    videoPlaceholderText: {
      color: stylesVars.blue,
      fontWeight: "900",
      fontSize: 12
    },
    playBadge: {
      position: "absolute",
      right: 6,
      bottom: 6,
      backgroundColor: "rgba(11,47,107,0.92)",
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center"
    },
    playBadgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },

    videoControlsOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center"
    },
    videoControlPill: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.35)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)"
    },
    videoControlText: { color: "#fff", fontWeight: "900", fontSize: 18 },

    specTitle: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "900",
      color: stylesVars.blue,
      letterSpacing: 0.3
    },
    chipsWrap: {
      marginTop: 8,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: stylesVars.blueSoft,
      borderWidth: 1,
      borderColor: stylesVars.border
    },
    chipText: {
      color: stylesVars.blue,
      fontWeight: "900",
      fontSize: 12,
      maxWidth: 220
    },

    moreDescText: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: "800",
      color: stylesVars.text,
      opacity: 0.9,
      lineHeight: 18
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
      borderColor: stylesVars.dangerBorder
    },
    fabVendorText: { color: stylesVars.danger, fontWeight: "900" },

    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: FOOTER_H,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 18,
      backgroundColor: "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor: stylesVars.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    footerTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.text },
    footerSub: { marginTop: 4, fontSize: 12, fontWeight: "800", color: stylesVars.subText },

    footerBtn: {
      backgroundColor: stylesVars.blue,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center"
    },
    footerBtnDisabled: { opacity: 0.5 },
    footerBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },

    viewerContainer: {
      flex: 1,
      backgroundColor: "#000",
      justifyContent: "center"
    },
    viewerPage: { width, height: "100%", backgroundColor: "#000" },
    viewerImage: { width, height: "100%", resizeMode: "contain" },
    viewerVideo: { width: "100%", height: "100%" },
    viewerCover: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      resizeMode: "contain",
      backgroundColor: "#000"
    },

    closeButton: {
      position: "absolute",
      top: 40,
      right: 20,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 20,
      padding: 8
    },
    closeText: { color: "#fff", fontSize: 20, fontWeight: "900" },

    indexCaption: { position: "absolute", bottom: 40, alignSelf: "center" },
    indexText: { color: "#fff", fontSize: 14, fontWeight: "900" },

    pressed: { opacity: 0.75 }
  });

  return { stylesVars, styles };
}