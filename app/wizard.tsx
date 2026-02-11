import { getDressTypes } from "@/utils/supabase/dressType";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SelectOption } from "../components/ui/select-panel";

const dressTypeOptions: SelectOption[] = [];

const subTypeOptions: { [key: string]: SelectOption[] } = {
  lehenga: [
    { key: "bridal", label: "Bridal", icon: "diamond" },
    { key: "party", label: "Party", icon: "star" },
  ],
  sherwani: [
    { key: "classic", label: "Classic", icon: "ribbon" },
    { key: "designer", label: "Designer", icon: "color-wand" },
  ],
  gown: [
    { key: "walima", label: "Walima", icon: "rose" },
    { key: "evening", label: "Evening", icon: "moon" },
  ],
  gharara: [
    { key: "mehndi", label: "Mehndi", icon: "leaf" },
    { key: "wedding", label: "Wedding", icon: "heart" },
  ],
  sari: [
    { key: "banarasi", label: "Banarasi", icon: "flower" },
    { key: "cotton", label: "Cotton", icon: "cloud" },
  ],
};

export const Wizard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSubType, setSelectedSubType] = useState<string>("");
  const [dressTypeOptions, setDressTypeOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    // Load the true dress types
    async function fetchDressTypes() {
      getDressTypes().then((types) => {
        setDressTypeOptions(
          types.map((type) => ({
            key: type.name.toLowerCase(),
            label: type.name,
            icon: type.iconURL,
          })),
        );
      });
    }

    fetchDressTypes();
  }, []);

  // Custom Duolingo-style select panel
  const DuolingoSelectPanel: React.FC<{
    options: SelectOption[];
    singleSelect?: boolean;
    selected: string;
    onSelect: (selected: string) => void;
  }> = ({ options, singleSelect = true, selected, onSelect }) => (
    <View style={styles.duoPanel}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          style={[styles.duoOption, selected === opt.key && styles.duoSelected]}
          onPress={() => onSelect(opt.key)}
        >
          <React.Fragment>
            {/* Remote image */}
            <View
              style={{
                width: "100%",
                height: 200,
                marginBottom: 8,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "#eee",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={{ uri: opt.icon }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 12,
                }}
                resizeMode="cover"
              />
            </View>
          </React.Fragment>

          <Text
            style={[
              styles.duoLabel,
              selected === opt.key && styles.duoSelectedLabel,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={{ minWidth: 320 }}>
      {step === 1 && (
        <>
          <Text style={styles.heading}>Select Dress Type</Text>
          <DuolingoSelectPanel
            options={dressTypeOptions}
            singleSelect
            selected={selectedType}
            onSelect={(type) => {
              setSelectedType(type);
              setStep(2);
            }}
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.skipButton} onPress={() => setStep(2)}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </>
      )}
      {step === 2 && (selectedType || true) && (
        <>
          <Text style={styles.heading}>Select Sub Type</Text>
          <DuolingoSelectPanel
            options={subTypeOptions[selectedType] || []}
            singleSelect
            selected={selectedSubType}
            onSelect={(subType) => {
              setSelectedSubType(subType);
              onClose();
            }}
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.skipButton} onPress={onClose}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={() => setStep(1)}>
              <Text style={styles.closeText}>Back</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#d7263d",
  },
  duoPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 32,
  },
  duoOption: {
    width: "40%",
    height: 200,
    backgroundColor: "transparent",
    borderRadius: 24,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 2,
    borderColor: "#f2f2f2",
    transition: "border-color 0.2s",
  },
  duoSelected: {
    backgroundColor: "#d7263d",
    borderColor: "#d7263d",
  },
  duoLabel: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
    textAlign: "center",
  },
  duoSelectedLabel: {
    color: "#fff",
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  closeButton: {
    backgroundColor: "#222",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  closeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  skipButton: {
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginRight: 8,
  },
  skipText: {
    color: "#d7263d",
    fontWeight: "bold",
  },
});
