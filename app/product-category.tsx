import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearProductCategory,
  toggleProductCategory,
} from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

type ProductCategoryId =
  | "stitched_ready"
  | "stitched_made_order"
  | "unstitched";

type ProductCategoryItem = {
  id: ProductCategoryId;
  name: string;
  caption: string;
  emoji: string;
};

type DisplayItem =
  | {
      id: "all";
      name: string;
      caption: string;
      emoji: string;
      isAll: true;
    }
  | (ProductCategoryItem & { isAll?: false });

const PRODUCT_CATEGORIES: ProductCategoryItem[] = [
  {
    id: "stitched_ready",
    name: "Ready-to-Wear",
    caption: "Stock-based stitched products with standard sizes.",
    emoji: "👗",
  },
  {
    id: "stitched_made_order",
    name: "Made-on-Order",
    caption: "Stitched after order with custom or exact sizing.",
    emoji: "📏",
  },
  {
    id: "unstitched",
    name: "Unstitched",
    caption: "Fabric products with optional dyeing and tailoring.",
    emoji: "🧵",
  },
];

const DISPLAY_ITEMS: DisplayItem[] = [
  {
    id: "all",
    name: "All",
    caption: "Show all product categories.",
    emoji: "🛍️",
    isAll: true,
  },
  ...PRODUCT_CATEGORIES,
];

const GRID_GAP = 8;
const H_PADDING = 12;

function normalizeSelected(v: any): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  }

  // Backward compatibility with older single-select state.
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
      title="Product Category"
      onBack={goBackTarget}
      onAny={() => dispatch(clearProductCategory())}
      onNext={goNextTarget}
    >
      <Text style={styles.heading}>Select Product Category</Text>
      <Text style={styles.subheading}>
        Select one or more categories. Choose All to show every product type.
      </Text>

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
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                item.isAll ? styles.allCard : null,
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
              <View
                style={[styles.iconWrap, isOn ? styles.iconWrapSelected : null]}
              >
                <Text style={styles.bigIcon}>{item.emoji}</Text>
                <View
                  style={[styles.tickBubble, isOn ? styles.tickBubbleOn : null]}
                >
                  <Text
                    style={[styles.tickText, isOn ? styles.tickTextOn : null]}
                  >
                    {isOn ? "✓" : ""}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.label, isOn ? styles.labelSelected : null]}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              <Text style={styles.caption} numberOfLines={3}>
                {item.caption}
              </Text>
            </Pressable>
          );
        }}
      />
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#111827",
  },

  subheading: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 10,
  },

  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
    paddingTop: 2,
  },

  columnWrap: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  card: {
    flex: 1,
    minHeight: 158,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },

  allCard: {
    backgroundColor: "#F8FAFC",
  },

  cardSelected: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
  },

  pressed: {
    opacity: 0.82,
  },

  iconWrap: {
    width: "100%",
    height: 64,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },

  iconWrapSelected: {
    backgroundColor: "#EEF2FF",
  },

  bigIcon: {
    fontSize: 30,
  },

  tickBubble: {
    position: "absolute",
    right: 7,
    top: 7,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  tickBubbleOn: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },

  tickText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  tickTextOn: {
    color: "#FFFFFF",
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  labelSelected: {
    color: "#000000",
  },

  caption: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "500",
  },
});
