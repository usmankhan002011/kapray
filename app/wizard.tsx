import { getDressTypes, DressTypeItem } from "@/utils/supabase/dressType";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SelectOption } from "@/components/ui/select-panel";
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

const FOOTER_HEIGHT = 96;

function formatDressLabel(name: string) {
  return name
    .replace(/_/g, " ")
    .replace(/\band\b/gi, "&")
    .replace(/\bfarchi\b/gi, "Farshi")
    .replace(/\s+set\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Wizard({ onClose }: Props) {
  const dispatch = useAppDispatch();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dressTypes, setDressTypes] = useState<DressTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDressTypes = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const types = await getDressTypes();
      setDressTypes(types ?? []);
    } catch (error: any) {
      setDressTypes([]);
      setLoadError(error?.message ?? "Failed to load dress types");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDressTypes();
  }, [loadDressTypes]);

  const selectedSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);

  const dressTypeOptions = useMemo<SelectOption[]>(() => {
    return dressTypes.map((type) => ({
      key: String(type.id),
      label: formatDressLabel(String(type.name)),
      icon: String(type.code)
    }));
  }, [dressTypes]);

  const dressTypeMap = useMemo(() => {
    return new Map(dressTypes.map((item) => [String(item.id), item]));
  }, [dressTypes]);

  const selectionLabel = useMemo(() => {
    if (selectedTypes.length === 0) return "No dress type selected";
    if (selectedTypes.length === 1) return "1 dress type selected";
    return `${selectedTypes.length} dress types selected`;
  }, [selectedTypes.length]);

  function toggleSelected(typeKey: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) next.delete(typeKey);
      else next.add(typeKey);
      return Array.from(next);
    });
  }

  const renderSkeletons = () => {
    return (
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={`skeleton-${index}`} style={styles.card}>
            <View style={[styles.imageWrap, styles.skeletonBlock]} />
            <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
            <View style={[styles.skeletonLine, styles.skeletonLineNarrow]} />
          </View>
        ))}
      </View>
    );
  };

  const renderErrorState = () => {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>Unable to load dress types</Text>
        <Text style={styles.stateText}>
          Please try again to continue with dress type selection.
        </Text>

        <Pressable style={styles.retryBtn} onPress={loadDressTypes}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>No dress types available</Text>
        <Text style={styles.stateText}>
          Dress types are not available right now. Please try again shortly.
        </Text>
      </View>
    );
  };

  const renderGrid = () => {
    return (
      <View style={styles.grid}>
        {dressTypeOptions.map((opt) => {
          const isSelected = selectedSet.has(opt.key);
          const item = dressTypeMap.get(opt.key);
          const localImage = item ? DRESS_TYPE_LOCAL_IMAGES[item.code] : null;

          return (
            <Pressable
              key={opt.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => toggleSelected(opt.key)}
              style={({ pressed }) => [
                styles.card,
                isSelected && styles.cardSelected,
                pressed && styles.cardPressed
              ]}
            >
              <View style={styles.imageWrap}>
                {localImage ? (
                  <Image
                    source={localImage}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>Image unavailable</Text>
                  </View>
                )}

                <View style={styles.imageOverlay} />

                {isSelected ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>✓</Text>
                  </View>
                ) : null}

                <View style={styles.labelOverlay}>
                  <Text
                    style={[
                      styles.cardLabel,
                      isSelected && styles.cardLabelSelected
                    ]}
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Select Dress Type</Text>
          <Text style={styles.subHeading}>
            Choose one or more dress types to continue
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{selectionLabel}</Text>
          </View>
        </View>

        {loading
          ? renderSkeletons()
          : loadError
            ? renderErrorState()
            : dressTypeOptions.length === 0
              ? renderEmptyState()
              : renderGrid()}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            selectedTypes.length === 0 && styles.disabledBtn,
            pressed && selectedTypes.length > 0 && styles.primaryBtnPressed
          ]}
          disabled={selectedTypes.length === 0}
          onPress={() => {
            dispatch(setDressTypeIds(selectedTypes));

            if (onClose) {
              onClose();
            }
          }}
        >
          <Text style={styles.primaryText}>
            {selectedTypes.length > 0
              ? `Continue (${selectedTypes.length})`
              : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const stylesVars = {
  pageBg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  blueBorder: "#93C5FD",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(15, 23, 42, 0.12)",
  skeleton: "#E2E8F0",
  skeletonSoft: "#F1F5F9",
  success: "#1D4ED8"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: stylesVars.pageBg
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: FOOTER_HEIGHT + 20
  },

  header: {
    marginBottom: 18,
    alignItems: "center"
  },

  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: stylesVars.text,
    textAlign: "center"
  },

  subHeading: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: stylesVars.subText,
    textAlign: "center"
  },

  countPill: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.blueBorder
  },

  countPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: stylesVars.blue
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16
  },

  card: {
    width: "48%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 10,
    shadowColor: stylesVars.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },

  cardPressed: {
    transform: [{ scale: 0.98 }]
  },

  cardSelected: {
    borderWidth: 2,
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft,
    shadowColor: stylesVars.blue,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5
  },

  imageWrap: {
    width: "100%",
    aspectRatio: 3 / 4.3,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: stylesVars.skeletonSoft,
    justifyContent: "flex-end"
  },

  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },

  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12
  },

  imageFallbackText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: stylesVars.mutedText,
    textAlign: "center"
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: stylesVars.overlay
  },

  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.success,
    borderWidth: 2,
    borderColor: stylesVars.white
  },

  badgeText: {
    color: stylesVars.white,
    fontSize: 14,
    fontWeight: "800"
  },
  labelOverlay: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.98)"
  },

  cardLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
    color: stylesVars.text
  },

  cardLabelSelected: {
    color: stylesVars.blue
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "rgba(248,250,252,0.97)",
    borderTopWidth: 1,
    borderTopColor: stylesVars.border
  },

  primaryBtn: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
    shadowColor: stylesVars.blue,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },

  primaryBtnPressed: {
    transform: [{ scale: 0.99 }]
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "800",
    fontSize: 15
  },

  disabledBtn: {
    opacity: 0.55
  },

  stateCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.borderStrong,
    backgroundColor: stylesVars.cardBg,
    padding: 20,
    alignItems: "center"
  },

  stateTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: stylesVars.text,
    textAlign: "center"
  },

  stateText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: stylesVars.subText,
    textAlign: "center"
  },

  retryBtn: {
    marginTop: 14,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.blueBorder
  },

  retryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue
  },

  skeletonBlock: {
    backgroundColor: stylesVars.skeleton
  },

  skeletonLine: {
    borderRadius: 999,
    backgroundColor: stylesVars.skeleton,
    marginTop: 10,
    alignSelf: "center"
  },

  skeletonLineWide: {
    width: "74%",
    height: 12
  },

  skeletonLineNarrow: {
    width: "52%",
    height: 10,
    marginTop: 8
  }
});