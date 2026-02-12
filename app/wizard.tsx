import { getDressTypes } from "@/utils/supabase/dressType";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SelectOption } from "../components/ui/select-panel";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/store/hooks";
import { setDressTypeId } from "@/store/filtersSlice";

export default function Wizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [selectedType, setSelectedType] = useState<string>("");
  const [dressTypeOptions, setDressTypeOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    let alive = true;

    getDressTypes()
      .then((types) => {
        if (!alive) return;

        setDressTypeOptions(
          (types ?? []).map((type: any) => {
            const key = String(type.id);
            const name = String(type.name ?? "");

            return {
              key,
              label: name,
              icon: type?.iconURL
            };
          })
        );
      })
      .catch(() => {
        if (!alive) return;
        setDressTypeOptions([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const DuolingoSelectPanel: React.FC<{
    options: SelectOption[];
    selected: string;
    onSelect: (selected: string) => void;
  }> = ({ options, selected, onSelect }) => (
    <View style={styles.duoPanel}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          style={[styles.duoOption, selected === opt.key && styles.duoSelected]}
          onPress={() => onSelect(opt.key)}
        >
          <View
            style={{
              width: "100%",
              height: 200,
              marginBottom: 8,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#eee",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {opt.icon ? (
              <Image
                source={{ uri: opt.icon }}
                style={{ width: "100%", height: 200, borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : null}
          </View>

          <Text
            style={[
              styles.duoLabel,
              selected === opt.key && styles.duoSelectedLabel
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
      <Text style={styles.heading}>Select Dress Type</Text>

      <DuolingoSelectPanel
        options={dressTypeOptions}
        selected={selectedType}
        onSelect={(typeKey) => {
          setSelectedType(typeKey);

          const idNum = Number(typeKey);
          dispatch(setDressTypeId(Number.isNaN(idNum) ? null : idNum));

          onClose();
          router.push("/fabric");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#d7263d"
  },
  duoPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 32
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
    borderColor: "#f2f2f2"
  },
  duoSelected: {
    backgroundColor: "#d7263d",
    borderColor: "#d7263d"
  },
  duoLabel: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
    textAlign: "center"
  },
  duoSelectedLabel: {
    color: "#fff",
    fontWeight: "bold"
  }
});
