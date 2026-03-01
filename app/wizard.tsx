import { getDressTypes } from "@/utils/supabase/dressType";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SelectOption } from "../components/ui/select-panel";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/store/hooks";
import { setDressTypeIds } from "@/store/filtersSlice";

type Props = {
  onClose?: () => void;
};

export default function Wizard({ onClose }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
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

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);

  function toggleSelected(typeKey: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) next.delete(typeKey);
      else next.add(typeKey);
      return Array.from(next);
    });
  }

  const DuolingoSelectPanel: React.FC<{
    options: SelectOption[];
    selectedKeys: Set<string>;
    onToggle: (selected: string) => void;
  }> = ({ options, selectedKeys, onToggle }) => (
    <View style={styles.duoPanel}>
      {options.map((opt) => {
        const isSelected = selectedKeys.has(opt.key);

        return (
          <Pressable
            key={opt.key}
            style={[styles.duoOption, isSelected && styles.duoSelected]}
            onPress={() => onToggle(opt.key)}
          >
            <View style={styles.iconWrap}>
              {opt.icon ? (
                <Image
                  source={{ uri: opt.icon }}
                  style={styles.iconImg}
                  resizeMode="cover"
                />
              ) : null}
            </View>

            <Text style={[styles.duoLabel, isSelected && styles.duoSelectedLabel]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Select Dress Type</Text>

      <DuolingoSelectPanel
        options={dressTypeOptions}
        selectedKeys={selectedSet}
        onToggle={(typeKey) => {
          toggleSelected(typeKey);
        }}
      />

      <Pressable
        style={[styles.primaryBtn, selectedTypes.length === 0 && styles.disabledBtn]}
        disabled={selectedTypes.length === 0}
        onPress={() => {
          dispatch(setDressTypeIds(selectedTypes));

          if (onClose) onClose();
          router.replace("/results");
        }}
      >
        <Text style={styles.primaryText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 320,
    paddingBottom: 16
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#d7263d"
  },
  duoPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center"
  },
  duoOption: {
    width: "43%",
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff"
  },
  duoSelected: {
    borderColor: "#d7263d",
    borderWidth: 2
  },
  iconWrap: {
    width: "100%",
    aspectRatio: 3.9 / 4,
    marginBottom: 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center"
  },
  iconImg: {
    width: "100%",
    height: "100%"
  },
  duoLabel: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: "#111"
  },
  duoSelectedLabel: {
    color: "#d7263d",
    fontWeight: "800"
  },

  primaryBtn: {
    marginTop: 16,
    marginHorizontal: 12,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  disabledBtn: { opacity: 0.45 }
});