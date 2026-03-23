import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (data: {
    neck?: string;
    sleeve?: string;
    trouser?: string;
  }) => void;

  options: {
    neck: string[];
    sleeve: string[];
    trouser: string[];
  };

  selected: {
    neck?: string;
    sleeve?: string;
    trouser?: string;
  };
};

export default function TailoringStylePickerModal({
  visible,
  onClose,
  onApply,
  options,
  selected,
}: Props) {
  const [neck, setNeck] = React.useState<string | undefined>(selected?.neck);
  const [sleeve, setSleeve] = React.useState<string | undefined>(
    selected?.sleeve
  );
  const [trouser, setTrouser] = React.useState<string | undefined>(
    selected?.trouser
  );

  React.useEffect(() => {
    if (visible) {
      setNeck(selected?.neck);
      setSleeve(selected?.sleeve);
      setTrouser(selected?.trouser);
    }
  }, [visible]);

  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const Section = ({
    title,
    data,
    value,
    setter,
  }: {
    title: string;
    data: string[];
    value?: string;
    setter: (v: string) => void;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.rowWrap}>
        {data.map((item) => (
          <Chip
            key={item}
            label={item}
            active={value === item}
            onPress={() => setter(item)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Pick Styles</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Section
              title="Neck"
              data={options.neck}
              value={neck}
              setter={setNeck}
            />

            <Section
              title="Sleeve"
              data={options.sleeve}
              value={sleeve}
              setter={setSleeve}
            />

            <Section
              title="Trouser"
              data={options.trouser}
              value={trouser}
              setter={setTrouser}
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Close</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                onApply({ neck, sleeve, trouser })
              }
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  section: {
    marginTop: 6,
    gap: 6,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#EEF4FF",
  },

  chipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },

  chipTextActive: {
    color: "#FFFFFF",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  btnPrimary: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },

  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  btnSecondary: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },

  btnSecondaryText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },
});