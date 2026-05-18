import React, { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import ExactMeasurementsSheet, {
  ExactMeasurementSheetRow,
} from "./exact-measurements-sheet";
import {
  printExactMeasurements,
  shareExactMeasurements,
} from "./exact-measurements-export";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  rows: ExactMeasurementSheetRow[];
  inferredSize?: string;
  unit?: string;
  fabricLengthM?: number;
  fabricCostPkr?: number;
  showGuideImage?: boolean;

  orderNo?: string;
  productName?: string;
  buyerName?: string;
  vendorName?: string;
  productCode?: string;
  productCategory?: string;
  note?: string;
};

const colors = {
  border: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  white: "#FFFFFF",
  muted: "#64748B",
};

export default function ExactMeasurementsModal({
  visible,
  onClose,
  title = "Exact Measurements",
  rows,
  inferredSize,
  unit,
  fabricLengthM,
  fabricCostPkr,
  showGuideImage = true,
  orderNo,
  productName,
  buyerName,
  vendorName,
  productCode,
  productCategory,
  note,
}: Props) {
  const [busy, setBusy] = useState<"" | "print" | "share">("");

  const handlePrint = async () => {
    try {
      setBusy("print");
      await printExactMeasurements({
        title,
        rows,
        inferredSize,
        unit,
        fabricLengthM,
        fabricCostPkr,
        showGuideImage,
        orderNo,
        productName,
        buyerName,
        vendorName,
        productCode,
        productCategory,
        note,
      });
    } catch (e: any) {
      Alert.alert(
        "Print failed",
        e?.message ?? "Could not print measurements.",
      );
    } finally {
      setBusy("");
    }
  };

  const handleShare = async () => {
    try {
      setBusy("share");
      await shareExactMeasurements({
        title,
        rows,
        inferredSize,
        unit,
        fabricLengthM,
        fabricCostPkr,
        showGuideImage,
        orderNo,
        productName,
        buyerName,
        vendorName,
        productCode,
        productCategory,
        note,
      });
    } catch (e: any) {
      Alert.alert(
        "Share failed",
        e?.message ?? "Could not share measurements.",
      );
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handlePrint}
              disabled={!!busy}
              style={[styles.actionBtn, busy ? styles.disabledBtn : null]}
            >
              <Text style={styles.actionText}>
                {busy === "print" ? "Printing..." : "Print"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              disabled={!!busy}
              style={[styles.actionBtn, busy ? styles.disabledBtn : null]}
            >
              <Text style={styles.actionText}>
                {busy === "share" ? "Sharing..." : "WhatsApp / Share"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <ExactMeasurementsSheet
              rows={rows}
              inferredSize={inferredSize}
              unit={unit}
              fabricLengthM={fabricLengthM}
              fabricCostPkr={fabricCostPkr}
              showGuideImage={showGuideImage}
              compact
              orderNo={orderNo}
              buyerName={buyerName}
              vendorName={vendorName}
              productName={productName}
              productCode={productCode}
              productCategory={productCategory}
              note={note}
            />
          </View>

          <View style={styles.footerHintWrap}>
            <Text style={styles.footerHint}>
              You can print or share this measurements sheet as a PDF.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  card: {
    width: "100%",
    height: "88%",
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },

  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    paddingRight: 12,
  },

  closeBtn: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },

  actionBtn: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },

  disabledBtn: {
    opacity: 0.55,
  },

  body: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.white,
  },

  footerHintWrap: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },

  footerHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    fontWeight: "500",
  },
});
