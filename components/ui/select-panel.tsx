import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type SelectOption = {
  key: string;
  label: string;
  icon?: string; // URL
};

interface SelectPanelProps {
  options: SelectOption[];
  singleSelect?: boolean;
  onSelect: (selected: string[] | string) => void;
  selected?: string[] | string;
}

export const SelectPanel: React.FC<SelectPanelProps> = ({
  options,
  singleSelect = false,
  onSelect,
  selected,
}) => {
  const [internalSelected, setInternalSelected] = useState<string[] | string>(
    selected || (singleSelect ? "" : []),
  );

  const handlePress = (key: string) => {
    if (singleSelect) {
      setInternalSelected(key);
      onSelect(key);
    } else {
      let selArr = Array.isArray(internalSelected) ? [...internalSelected] : [];
      if (selArr.includes(key)) {
        selArr = selArr.filter((k) => k !== key);
      } else {
        selArr.push(key);
      }
      setInternalSelected(selArr);
      onSelect(selArr);
    }
  };

  const isSelected = (key: string) => {
    if (singleSelect) {
      return internalSelected === key;
    }
    return Array.isArray(internalSelected) && internalSelected.includes(key);
  };

  return (
    <View style={styles.panel}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.option, isSelected(opt.key) && styles.selected]}
          onPress={() => handlePress(opt.key)}
          activeOpacity={0.8}
        >
          {opt.icon && (
            <Ionicons
              name={opt.icon}
              size={24}
              color={isSelected(opt.key) ? "#fff" : "#888"}
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            style={[styles.label, isSelected(opt.key) && styles.selectedLabel]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 16,
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    margin: 6,
    minWidth: 110,
    minHeight: 48,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  selected: {
    backgroundColor: "#d7263d",
  },
  label: {
    fontSize: 16,
    color: "#444",
    fontWeight: "500",
  },
  selectedLabel: {
    color: "#fff",
    fontWeight: "bold",
  },
});
