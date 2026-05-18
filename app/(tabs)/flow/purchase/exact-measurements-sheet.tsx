import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type ExactMeasurementSheetRow = {
  order: number;
  label: string;
  value: string;
};

const GUIDE_HEIGHT = 320;

type Props = {
  showGuideImage?: boolean;
  rows: ExactMeasurementSheetRow[];
  inferredSize?: string;
  unit?: string;
  fabricLengthM?: number;
  fabricCostPkr?: number;
  compact?: boolean;

  orderNo?: string;
  buyerName?: string;
  vendorName?: string;
  productName?: string;
  productCode?: string;
  productCategory?: string;
  note?: string;
};

const colors = {
  bg: "#FFFFFF",
  border: "#E5E7EB",
  text: "#0F172A",
  subText: "#475569",
  muted: "#64748B",
  soft: "#F8FAFC",
  greenSoft: "#ECFDF5",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  white: "#FFFFFF",
};

function hasPositive(n?: number) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function safeText(v?: string) {
  return String(v ?? "").trim();
}

export default function ExactMeasurementsSheet({
  showGuideImage = true,
  rows,
  inferredSize,
  unit,
  fabricLengthM,
  fabricCostPkr,
  compact = false,
  orderNo,
  buyerName,
  vendorName,
  productName,
  productCode,
  productCategory,
  note,
}: Props) {
  const [guideOpen, setGuideOpen] = useState(false);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.order - b.order),
    [rows],
  );

  const chunkedRows = useMemo(() => {
    const chunks: ExactMeasurementSheetRow[][] = [];
    for (let i = 0; i < sortedRows.length; i += 2) {
      chunks.push(sortedRows.slice(i, i + 2));
    }
    return chunks;
  }, [sortedRows]);

  const hasMeta =
    !!safeText(orderNo) ||
    !!safeText(buyerName) ||
    !!safeText(vendorName) ||
    !!safeText(productName) ||
    !!safeText(productCode) ||
    !!safeText(productCategory) ||
    !!safeText(inferredSize) ||
    !!safeText(unit) ||
    hasPositive(fabricLengthM) ||
    hasPositive(fabricCostPkr) ||
    !!safeText(note);

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={compact ? styles.contentCompact : styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
      >
        {hasMeta ? (
          <View style={styles.metaCard}>
            {!!safeText(orderNo) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Order No: <Text style={styles.metaStrong}>{orderNo}</Text>
                </Text>
              </View>
            )}

            {!!safeText(buyerName) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Buyer: <Text style={styles.metaStrong}>{buyerName}</Text>
                </Text>
              </View>
            )}

            {!!safeText(vendorName) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Vendor: <Text style={styles.metaStrong}>{vendorName}</Text>
                </Text>
              </View>
            )}

            {!!safeText(productName) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Product: <Text style={styles.metaStrong}>{productName}</Text>
                </Text>
              </View>
            )}

            {!!safeText(productCode) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Product code:{" "}
                  <Text style={styles.metaStrong}>{productCode}</Text>
                </Text>
              </View>
            )}

            {!!safeText(productCategory) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Category:{" "}
                  <Text style={styles.metaStrong}>{productCategory}</Text>
                </Text>
              </View>
            )}

            {!!safeText(inferredSize) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Nearest size:{" "}
                  <Text style={styles.metaStrong}>{inferredSize}</Text>
                </Text>
              </View>
            )}

            {!!safeText(unit) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Unit: <Text style={styles.metaStrong}>{unit}</Text>
                </Text>
              </View>
            )}

            {hasPositive(fabricLengthM) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Fabric length:{" "}
                  <Text style={styles.metaStrong}>{fabricLengthM} m</Text>
                </Text>
              </View>
            )}

            {hasPositive(fabricCostPkr) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLine}>
                  Fabric cost:{" "}
                  <Text style={styles.metaStrong}>PKR {fabricCostPkr}</Text>
                </Text>
              </View>
            )}

            {!!safeText(note) && (
              <View style={[styles.metaItem, styles.metaItemFull]}>
                <Text style={styles.metaLine}>
                  Note: <Text style={styles.metaStrong}>{note}</Text>
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {showGuideImage && (
          <View style={styles.imageCard}>
            <View style={styles.imageHeader}>
              <Text style={styles.imageTitle}>Measurement Guide</Text>

              <Pressable
                onPress={() => setGuideOpen(true)}
                style={styles.zoomBtn}
              >
                <Text style={styles.zoomBtnText}>Zoom</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setGuideOpen(true)}>
              <Image
                source={require("../../../../assets/body measurement chart.jpg")}
                style={[styles.guideImage, compact && styles.guideImageCompact]}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        )}

        <View style={styles.tableWrap}>
          <View style={[styles.gridRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableHeaderText, styles.labelCol]}>
              Dimension
            </Text>
            <Text style={[styles.tableHeaderText, styles.valueCol]}>Value</Text>
            <Text style={[styles.tableHeaderText, styles.labelCol]}>
              Dimension
            </Text>
            <Text style={[styles.tableHeaderText, styles.valueCol]}>Value</Text>
          </View>

          {chunkedRows.length ? (
            chunkedRows.map((pair, index) => {
              const first = pair[0];
              const second = pair[1];

              return (
                <View
                  key={`pair-${index}`}
                  style={[
                    styles.gridRow,
                    index === chunkedRows.length - 1
                      ? styles.tableRowLast
                      : null,
                  ]}
                >
                  <Text style={[styles.tableCellLabel, styles.labelCol]}>
                    {first?.label ?? ""}
                  </Text>
                  <Text style={[styles.tableCellValue, styles.valueCol]}>
                    {first?.value ?? ""}
                  </Text>
                  <Text style={[styles.tableCellLabel, styles.labelCol]}>
                    {second?.label ?? ""}
                  </Text>
                  <Text style={[styles.tableCellValue, styles.valueCol]}>
                    {second?.value ?? ""}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No dimensions available.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={guideOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setGuideOpen(false)}
      >
        <View style={styles.zoomBackdrop}>
          <View style={styles.zoomCard}>
            <View style={styles.zoomHeader}>
              <Text style={styles.zoomTitle}>Measurement Guide</Text>

              <Pressable
                onPress={() => setGuideOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.zoomScrollContent}
            >
              <ScrollView
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.zoomScrollContent}
              >
                <Image
                  source={require("../../../../assets/body measurement chart.jpg")}
                  style={styles.zoomGuideImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    padding: 14,
    gap: 10,
    paddingBottom: 20,
  },

  contentCompact: {
    padding: 12,
    gap: 8,
    paddingBottom: 20,
  },

  metaCard: {
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.greenSoft,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
    columnGap: 10,
  },

  metaItem: {
    width: "47%",
  },

  metaItemFull: {
    width: "100%",
  },

  metaLine: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.subText,
    fontWeight: "500",
  },

  metaStrong: {
    color: colors.text,
    fontWeight: "700",
  },

  imageCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.bg,
    overflow: "hidden",
    padding: 8,
  },

  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  imageTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },

  zoomBtn: {
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

  zoomBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },

  guideImage: {
    width: "100%",
    height: GUIDE_HEIGHT,
  },

  guideImageCompact: {
    height: 240,
  },

  tableWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },

  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableRowLast: {
    borderBottomWidth: 0,
  },

  tableHeaderRow: {
    backgroundColor: colors.soft,
  },

  labelCol: {
    flex: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  valueCol: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  tableHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
  },

  tableCellLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.subText,
    fontWeight: "600",
  },

  tableCellValue: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.text,
    fontWeight: "700",
  },

  emptyState: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  emptyText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },

  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  zoomCard: {
    width: "100%",
    height: "88%",
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: "hidden",
  },

  zoomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },

  zoomTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
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

  closeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },

  zoomScrollContent: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  zoomGuideImage: {
    width: 1200,
    height: 1600,
  },
});
