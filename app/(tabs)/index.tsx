import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Wizard from "../wizard";

export default function HomeScreen() {
  const [wizardVisible, setWizardVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header with search button */}
      <View style={styles.header}>
        <Text style={styles.title}>Kapray</Text>
        <TouchableOpacity
          onPress={() => setWizardVisible(true)}
          style={styles.searchButton}
        >
          <Ionicons name="search" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text>Use search to select filters.</Text>
      </View>

      {/* Wizard Modal */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    paddingTop: 40
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222"
  },
  searchButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#e0e0e0"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  closeButton: {
    marginTop: 24,
    backgroundColor: "#222",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8
  }
});
