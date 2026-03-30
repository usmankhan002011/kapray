import { StyleSheet } from "react-native";

export const purchaseUi = StyleSheet.create({
  selectChip: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  selectChipOn: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
  },

  selectChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  selectChipTextOn: {
    color: "#FFFFFF",
  },

  selectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500",
  },
});
