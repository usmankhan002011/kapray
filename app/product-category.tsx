import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearProductCategory,
  toggleProductCategory,
} from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

type ProductCategoryId =
  | "stitched_ready"
  | "stitched_made_order"
  | "unstitched";

type ProductCategoryItem = {
  id: ProductCategoryId;
  name: string;
  caption: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
};

type DisplayItem =
  | {
      id: "all";
      name: string;
      caption: string;
      icon: React.ComponentProps<typeof MaterialIcons>["name"];
      isAll: true;
    }
  | (ProductCategoryItem & { isAll?: false });

const PRODUCT_CATEGORIES: ProductCategoryItem[] = [
  {
    id: "stitched_ready",
    name: "Ready-to-Wear",
    caption: "Ready stock",
    icon: "checkroom",
  },
  {
    id: "stitched_made_order",
    name: "Made-on-Order",
    caption: "Made after order",
    icon: "straighten",
  },
  {
    id: "unstitched",
    name: "Unstitched",
    caption: "Fabric",
    icon: "texture",
  },
];

const DISPLAY_ITEMS: DisplayItem[] = [
  {
    id: "all",
    name: "All",
    caption: "All categories",
    icon: "apps",
    isAll: true,
  },
  ...PRODUCT_CATEGORIES,
];

const GRID_GAP = 10;
const H_PADDING = 16;

function normalizeSelected(v: any): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  }

  const single = String(v ?? "").trim();
  if (!single || single === "all") return [];
  return [single];
}

export default function ProductCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selectedIds = useAppSelector((s: any) =>
    normalizeSelected(
      s.filters?.productCategoryIds ?? s.filters?.productCategory,
    ),
  );

  const selectedSet = useMemo(
    () => new Set<string>(selectedIds),
    [selectedIds],
  );
  const isAllSelected = selectedSet.size === 0;

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

  const goBackTarget = () => {
    fromResultsFilters
      ? router.replace("/flow/results-filters" as any)
      : router.replace("/(tabs)" as any);
  };

  const goNextTarget = () => {
    fromResultsFilters
      ? router.replace("/flow/results-filters" as any)
      : router.replace("/fabric" as any);
  };

  return (
    <StandardFilterDisplay
      title="Category"
      onBack={goBackTarget}
      onAny={() => dispatch(clearProductCategory())}
      onNext={goNextTarget}
    >
      <FlatList
        data={DISPLAY_ITEMS}
        keyExtractor={(i) => i.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        renderItem={({ item }) => {
          const isOn = item.isAll ? isAllSelected : selectedSet.has(item.id);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardSelected : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => {
                if (item.isAll) {
                  dispatch(clearProductCategory());
                  return;
                }

                dispatch(toggleProductCategory(item.id));
              }}
            >
              <View style={[styles.iconBox, isOn ? styles.iconBoxOn : null]}>
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={isOn ? apColors.blue : apColors.subText}
                />
              </View>

              <Text
                style={[styles.label, isOn ? styles.labelOn : null]}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              <Text style={styles.caption} numberOfLines={2}>
                {item.caption}
              </Text>

              {isOn ? (
                <View style={styles.check}>
                  <MaterialIcons name="check" size={14} color={apColors.white} />
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
  },

  columnWrap: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  card: {
    flex: 1,
    minHeight: 136,
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: apRadii.card,
    padding: 12,
    backgroundColor: apColors.white,
  },

  cardSelected: {
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  iconBoxOn: {
    borderColor: "#D7E3FF",
    backgroundColor: apColors.white,
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    fontFamily: apFontFamily,
    color: apColors.text,
  },

  labelOn: {
    color: apColors.blue,
  },

  caption: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    fontFamily: apFontFamily,
    color: apColors.muted,
  },

  check: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 22,
    height: 22,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.82,
  },
});
