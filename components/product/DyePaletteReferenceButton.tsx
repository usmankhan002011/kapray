import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  generateDyePalette,
  type DyeShade,
} from "@/utils/kapray/dyePalette";

type DyePaletteReferenceSplit = {
  length_m?: number | string | null;
  dye_shade_id?: string | null;
  dye_hex?: string | null;
  dye_label?: string | null;
};

type Props = {
  dyeSplits?: DyePaletteReferenceSplit[];
  dyeShadeId?: string | null;
  dyeHex?: string | null;
  dyeLabel?: string | null;
};

type NormalizedSelection = {
  key: string;
  lengthText: string;
  shadeId: string;
  hex: string;
  label: string;
};

const colors = {
  overlay: "rgba(15,23,42,0.5)",
  card: "#FFFFFF",
  border: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  mutedText: "#64748B",
  white: "#FFFFFF",
};

function cleanText(v: unknown) {
  return (v == null ? "" : String(v)).trim();
}

function cleanHex(v: unknown) {
  const s = cleanText(v).toUpperCase();
  return /^#[0-9A-F]{6}$/.test(s) ? s : "";
}

function safePositiveNumber(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function getShadeCode(id: string) {
  const match = /^shade_(\d+)_(\d+)$/i.exec(id);
  if (!match) return "";
  const column = String(Number(match[1]) + 1).padStart(2, "0");
  const row = String(Number(match[2]) + 1).padStart(2, "0");
  return `Dye-C${column}-R${row}`;
}

function getShadeIdFromCode(code: string) {
  const match = /^Dye-C(\d+)-R(\d+)$/i.exec(cleanText(code));
  if (!match) return "";
  const column = Number(match[1]) - 1;
  const row = Number(match[2]) - 1;
  if (column < 0 || row < 0) return "";
  return `shade_${column}_${row}`;
}

function getShadePosition(id: string) {
  const match = /^shade_(\d+)_(\d+)$/i.exec(id);
  if (!match) return { column: 0, row: 0 };
  return { column: Number(match[1]), row: Number(match[2]) };
}

function getShadeColumnIndex(id: string) {
  return getShadePosition(id).column;
}

function getShadeRowIndex(id: string) {
  return getShadePosition(id).row;
}

function buildSelections(
  splits: DyePaletteReferenceSplit[] | undefined,
  dyeShadeId: string | null | undefined,
  dyeHex: string | null | undefined,
  dyeLabel: string | null | undefined,
): NormalizedSelection[] {
  const source =
    Array.isArray(splits) && splits.length
      ? splits
      : [
          {
            length_m: null,
            dye_shade_id: dyeShadeId,
            dye_hex: dyeHex,
            dye_label: dyeLabel,
          },
        ];

  return source
    .map((row, index) => {
      const label = cleanText(row?.dye_label);
      const shadeId =
        cleanText(row?.dye_shade_id) || getShadeIdFromCode(label);
      const hex = cleanHex(row?.dye_hex);
      const lengthM = safePositiveNumber(row?.length_m);

      return {
        key: `${shadeId || hex || label || "dye"}-${index}`,
        lengthText: lengthM ? `${lengthM} m` : "",
        shadeId,
        hex,
        label: label || getShadeCode(shadeId),
      };
    })
    .filter((row) => row.shadeId || row.hex || row.label);
}

export default function DyePaletteReferenceButton({
  dyeSplits,
  dyeShadeId,
  dyeHex,
  dyeLabel,
}: Props) {
  const [visible, setVisible] = useState(false);

  const paletteShades = useMemo(() => generateDyePalette(), []);

  const paletteHexById = useMemo(
    () => new Map(paletteShades.map((shade) => [shade.id, shade.hex])),
    [paletteShades],
  );

  const selections = useMemo(
    () =>
      buildSelections(dyeSplits, dyeShadeId, dyeHex, dyeLabel).map((row) => ({
        ...row,
        hex: row.hex || paletteHexById.get(row.shadeId) || "",
      })),
    [dyeHex, dyeLabel, dyeShadeId, dyeSplits, paletteHexById],
  );

  const shadeColumns = useMemo(() => {
    const columns: DyeShade[][] = [];

    paletteShades.forEach((shade) => {
      const column = getShadeColumnIndex(shade.id);
      if (!columns[column]) columns[column] = [];
      columns[column].push(shade);
    });

    columns.forEach((column) => {
      column.sort((a, b) => getShadeRowIndex(a.id) - getShadeRowIndex(b.id));
    });

    return columns;
  }, [paletteShades]);

  const selectedShadeIds = useMemo(
    () => new Set(selections.map((row) => row.shadeId).filter(Boolean)),
    [selections],
  );

  const selectedHexes = useMemo(
    () => new Set(selections.map((row) => row.hex).filter(Boolean)),
    [selections],
  );

  if (!selections.length) return null;

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="View dye palette"
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.iconButtonPressed,
        ]}
      >
        <MaterialIcons name="palette" size={18} color={colors.blue} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dye palette</Text>
              <Pressable
                onPress={() => setVisible(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close dye palette"
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.selectedList}>
              {selections.map((row) => (
                <View key={row.key} style={styles.selectedRow}>
                  <View
                    style={[
                      styles.selectedSwatch,
                      { backgroundColor: row.hex || colors.white },
                    ]}
                  />
                  <View style={styles.selectedTextWrap}>
                    <Text style={styles.selectedCode} numberOfLines={1}>
                      {row.label || "Selected dye"}
                    </Text>
                    {!!row.lengthText && (
                      <Text style={styles.selectedLength}>
                        {row.lengthText}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.paletteFrame}>
              <View style={styles.rowLabels}>
                <Text style={styles.axisLabel}>R</Text>
                {(shadeColumns[0] ?? []).map((shade, rowIndex) => (
                  <Text key={`row_${shade.id}`} style={styles.rowLabel}>
                    {String(rowIndex + 1).padStart(2, "0")}
                  </Text>
                ))}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.paletteScroll}
                contentContainerStyle={styles.paletteGrid}
              >
                {shadeColumns.map((column, columnIndex) => (
                  <View key={`column_${columnIndex}`}>
                    <Text style={styles.columnLabel}>
                      C{String(columnIndex + 1).padStart(2, "0")}
                    </Text>
                    <View style={styles.paletteColumn}>
                      {column.map((shade) => {
                        const isSelected =
                          selectedShadeIds.has(shade.id) ||
                          selectedHexes.has(cleanHex(shade.hex));

                        return (
                          <View
                            key={shade.id}
                            style={[
                              styles.paletteSwatch,
                              { backgroundColor: shade.hex },
                              isSelected && styles.paletteSwatchSelected,
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  iconButtonPressed: {
    opacity: 0.75,
  },

  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: colors.overlay,
  },

  modalCard: {
    maxHeight: "86%",
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 14,
    gap: 12,
  },

  modalHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  selectedList: {
    gap: 8,
  },

  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  selectedSwatch: {
    width: 52,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  selectedTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  selectedCode: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: colors.text,
  },

  selectedLength: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: colors.mutedText,
  },

  paletteFrame: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  rowLabels: {
    flexShrink: 0,
    alignItems: "center",
  },

  axisLabel: {
    height: 18,
    fontSize: 9,
    color: colors.mutedText,
    fontWeight: "900",
    textAlign: "center",
  },

  rowLabel: {
    width: 20,
    height: 28,
    fontSize: 8,
    lineHeight: 28,
    color: colors.mutedText,
    fontWeight: "800",
    textAlign: "center",
  },

  paletteScroll: {
    flex: 1,
  },

  paletteGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  columnLabel: {
    height: 18,
    fontSize: 9,
    color: colors.mutedText,
    fontWeight: "900",
    textAlign: "center",
  },

  paletteColumn: {
    borderRadius: 9,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
  },

  paletteSwatch: {
    width: 32,
    height: 28,
    borderWidth: 0,
    borderColor: colors.white,
  },

  paletteSwatchSelected: {
    borderWidth: 3,
    borderColor: colors.blue,
  },
});
