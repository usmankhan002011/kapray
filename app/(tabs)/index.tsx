import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Wizard from "../wizard";
import ResultsScreen from "../results";
import { useAppSelector } from "@/store/hooks";

export default function HomeScreen() {
  const [wizardVisible, setWizardVisible] = useState(false);

  const filters = useAppSelector((s: any) => s.filters);
  const hasDressTypeSelection = useMemo(() => {
    const ids = filters?.dressTypeIds;
    return Array.isArray(ids) && ids.length > 0;
  }, [filters?.dressTypeIds]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kapray</Text>

        <TouchableOpacity
          onPress={() => setWizardVisible(true)}
          style={styles.searchButton}
        >
          <Ionicons name="search" size={28} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {!hasDressTypeSelection ? (
        <View style={styles.infoWrap}>
          <Text style={styles.infoText}>Use search to select filters.</Text>
        </View>
      ) : (
        <View style={styles.resultsWrap}>
          <ResultsScreen />
        </View>
      )}

      <Modal
        visible={wizardVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWizardVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Wizard onClose={() => setWizardVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const stylesVars = {
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
  black: "#000000"
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg,
    paddingTop: 40
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: stylesVars.text
  },

  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  infoWrap: {
    paddingHorizontal: 16,
    paddingTop: 8
  },

  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  resultsWrap: {
    flex: 1
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center"
  },

  modalContent: {
    width: "100%",
    height: "100%",
    backgroundColor: stylesVars.cardBg,
    borderRadius: 18,
    padding: 24,
    alignItems: "center"
  },

  closeButton: {
    marginTop: 24,
    minHeight: 48,
    backgroundColor: stylesVars.blue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  }
});