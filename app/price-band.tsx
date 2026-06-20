import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MultiSlider from "@ptomasroos/react-native-multi-slider";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCostRange, setCostRange } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import { supabase } from "@/utils/supabase/client";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

const TABLE_PRICE_BUCKETS = "price_buckets";

function formatPKR(n: number) {
  return `PKR ${Math.round(n).toLocaleString()}`;
}

function Marker({ pressed }: { pressed?: boolean }) {
  return (
    <View style={[styles.markerOuter, pressed && styles.markerOuterPressed]}>
      <View style={styles.markerInner} />
    </View>
  );
}

function roundToStep(n: number, step: number) {
  if (!Number.isFinite(n) || !Number.isFinite(step) || step <= 0) return n;
  return Math.round(n / step) * step;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

type Bucket = { key: string; label: string; min: number; max: number };

export default function PriceBand() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const minCostPkr = useAppSelector((s: any) => s.filters?.minCostPkr ?? null);
  const maxCostPkr = useAppSelector((s: any) => s.filters?.maxCostPkr ?? null);

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState({ min: 0, max: 0 });
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [bucketKey, setBucketKey] = useState<string>("any");
  const [fineDomain, setFineDomain] = useState({ min: 0, max: 0 });
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [sliderWidth, setSliderWidth] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const { data } = await supabase
          .from(TABLE_PRICE_BUCKETS)
          .select("id, label, min_pkr, max_pkr, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (!alive) return;

        const rows = (data ?? []) as any[];

        const built: Bucket[] = rows
          .map((r) => ({
            key: String(r.id),
            label: String(r.label),
            min: Number(r.min_pkr),
            max: Number(r.max_pkr),
          }))
          .filter((b) => b.max > b.min);

        setBuckets(built);

        const globalMin = 0;
        const globalMax = built.length
          ? Math.max(...built.map((b) => b.max))
          : 0;

        setDomain({ min: globalMin, max: globalMax });
        setBucketKey("any");
        setFineDomain({ min: globalMin, max: globalMax });
        setRange([globalMin, globalMax]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const ready = !loading && domain.max > domain.min;

  const step = useMemo(() => {
    const span = fineDomain.max - fineDomain.min;
    if (span <= 0) return 1;
    if (span <= 10000) return 500;
    if (span <= 50000) return 1000;
    if (span <= 200000) return 2000;
    if (span <= 500000) return 5000;
    return 10000;
  }, [fineDomain]);

  const onSelectAny = () => {
    setBucketKey("any");
    setFineDomain({ min: domain.min, max: domain.max });
    setRange([domain.min, domain.max]);
    dispatch(clearCostRange());
  };

  const onSelectBucket = (key: string) => {
    const b = buckets.find((x) => x.key === key);
    if (!b) return;

    setBucketKey(key);
    setFineDomain({ min: b.min, max: b.max });
    setRange([b.min, b.max]);
  };

  const onNext = () => {
    if (!ready) {
      router.replace("/results");
      return;
    }

    if (bucketKey === "any") {
      dispatch(clearCostRange());
    } else {
      dispatch(
        setCostRange({
          minCostPkr: range[0],
          maxCostPkr: range[1],
        }),
      );
    }

    if (fromResultsFilters) router.back();
    else router.replace("/results");
  };

  return (
    <StandardFilterDisplay
      title="Price"
      onBack={() => router.back()}
      onAny={onSelectAny}
      onNext={onNext}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <>
              <Pressable
                onPress={onSelectAny}
                style={({ pressed }) => [
                  styles.anyPill,
                  bucketKey === "any" ? styles.pillActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    bucketKey === "any" ? styles.pillTextActive : null,
                  ]}
                >
                  Any
                </Text>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bucketScroll}
              >
                {buckets.map((b) => {
                  const active = b.key === bucketKey;
                  return (
                    <Pressable
                      key={b.key}
                      onPress={() => onSelectBucket(b.key)}
                      style={({ pressed }) => [
                        styles.bucketPill,
                        active ? styles.pillActive : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          active ? styles.pillTextActive : null,
                        ]}
                      >
                        {b.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {bucketKey !== "any" ? (
                <>
                  <View
                    style={styles.sliderWrap}
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      if (w !== sliderWidth) setSliderWidth(w);
                    }}
                  >
                    <MultiSlider
                      values={[range[0], range[1]]}
                      min={fineDomain.min}
                      max={fineDomain.max}
                      step={1}
                      sliderLength={sliderWidth}
                      allowOverlap={false}
                      selectedStyle={styles.sliderSelected}
                      unselectedStyle={styles.sliderUnselected}
                      customMarkerLeft={(e) => (
                        <Marker pressed={!!e?.pressed} />
                      )}
                      customMarkerRight={(e) => (
                        <Marker pressed={!!e?.pressed} />
                      )}
                      onValuesChange={(v) => setRange(v as [number, number])}
                      onValuesChangeFinish={(v) => {
                        const low = clamp(
                          roundToStep(v[0], step),
                          fineDomain.min,
                          fineDomain.max,
                        );
                        const high = clamp(
                          roundToStep(v[1], step),
                          fineDomain.min,
                          fineDomain.max,
                        );
                        setRange([Math.min(low, high), Math.max(low, high)]);
                      }}
                    />
                  </View>

                  <Text style={styles.value}>
                    {formatPKR(range[0])} - {formatPKR(range[1])}
                  </Text>
                </>
              ) : null}
            </>
          )}
        </View>
      </View>
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: apColors.white,
    borderRadius: apRadii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: apColors.border,
  },

  loadingText: {
    fontSize: 13,
    color: apColors.muted,
    fontWeight: "600",
    fontFamily: apFontFamily,
  },

  anyPill: {
    borderRadius: apRadii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.white,
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  bucketScroll: {
    paddingBottom: 10,
  },

  bucketPill: {
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.white,
    borderRadius: apRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },

  pillActive: {
    backgroundColor: apColors.blue,
    borderColor: apColors.blue,
  },

  pillText: {
    fontWeight: "800",
    fontSize: 12,
    color: apColors.blue,
    fontFamily: apFontFamily,
  },

  pillTextActive: {
    color: apColors.white,
  },

  sliderWrap: {
    marginTop: 8,
  },

  sliderSelected: {
    backgroundColor: apColors.blue,
  },

  sliderUnselected: {
    backgroundColor: apColors.border,
  },

  markerOuter: {
    width: 28,
    height: 28,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.white,
    borderWidth: 1.5,
    borderColor: apColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  markerOuterPressed: {
    elevation: 6,
  },

  markerInner: {
    width: 8,
    height: 8,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.blue,
  },

  value: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: apFontFamily,
    color: apColors.text,
  },

  pressed: {
    opacity: 0.82,
  },
});
