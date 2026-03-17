import { getDressTypes, DressTypeItem } from "@/utils/supabase/dressType";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SelectOption } from "@/components/ui/select-panel";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/store/hooks";
import { setDressTypeIds } from "@/store/filtersSlice";

type Props = {
  onClose?: () => void;
};

const DRESS_TYPE_LOCAL_IMAGES: Record<string, any> = {
  lehnga_set: require("@/assets/dress-types-images/LEHNGA_SET.png"),
  maxi_gown: require("@/assets/dress-types-images/MAXI_GOWN.png"),
  peshwas_frock: require("@/assets/dress-types-images/PESHWAS_FROCK.png"),
  saree: require("@/assets/dress-types-images/SAREE.png"),
  sharara: require("@/assets/dress-types-images/SHARARA.png"),
  shirt_and_bottom_set: require("@/assets/dress-types-images/SHIRT_AND_BOTTOM_SET.png"),
  dupatta: require("@/assets/dress-types-images/DUPATTA.png"),
  farchi_lehnga: require("@/assets/dress-types-images/FARCHI_LEHNGA.png"),
  gharara: require("@/assets/dress-types-images/GHARARA.png"),
  blouse: require("@/assets/dress-types-images/BLOUSE.png")
};

export default function Wizard({ onClose }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dressTypes, setDressTypes] = useState<DressTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setLoadError(null);

    getDressTypes()
      .then((types) => {
        if (!alive) return;
        setDressTypes(types ?? []);
      })
      .catch((error: any) => {
        if (!alive) return;
        setDressTypes([]);
        setLoadError(error?.message ?? "Failed to load dress types");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);

  const dressTypeOptions = useMemo<SelectOption[]>(() => {
    return dressTypes.map((type) => ({
      key: String(type.id),
      label: String(type.name),
      icon: String(type.code)
    }));
  }, [dressTypes]);

  const dressTypeMap = useMemo(() => {
    return new Map(dressTypes.map((item) => [String(item.id), item]));
  }, [dressTypes]);

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
        const item = dressTypeMap.get(opt.key);
        const localImage = item ? DRESS_TYPE_LOCAL_IMAGES[item.code] : null;

        return (
          <Pressable
            key={opt.key}
            style={[styles.duoOption, isSelected && styles.duoSelected]}
            onPress={() => onToggle(opt.key)}
          >
            <View style={styles.iconWrap}>
              {localImage ? (
                <Image
                  source={localImage}
                  style={styles.iconImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.iconFallback}>
                  <Text style={styles.iconFallbackText}>No Image</Text>
                </View>
              )}
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

      {loading ? <Text style={styles.infoText}>Loading...</Text> : null}
      {loadError ? <Text style={styles.infoText}>{loadError}</Text> : null}

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

          if (onClose) {
            onClose();
            return;
          }

          router.replace("/results");
        }}
      >
        <Text style={styles.primaryText}>Continue</Text>
      </Pressable>
    </ScrollView>
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
    minWidth: 320,
    paddingBottom: 16,
    backgroundColor: stylesVars.cardBg
  },

  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: stylesVars.text
  },

  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center"
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg
  },

  duoSelected: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft
  },

  iconWrap: {
    width: "100%",
    aspectRatio: 3 / 4.6,
    marginBottom: 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center"
  },

  iconImg: {
    width: "100%",
    height: "100%"
  },

  iconFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },

  iconFallbackText: {
    fontSize: 12,
    fontWeight: "600",
    color: stylesVars.mutedText
  },

  duoLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    color: stylesVars.text
  },

  duoSelectedLabel: {
    color: stylesVars.blue
  },

  primaryBtn: {
    marginTop: 16,
    marginHorizontal: 12,
    minHeight: 48,
    backgroundColor: stylesVars.blue,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14
  },

  disabledBtn: {
    opacity: 0.6
  }
});