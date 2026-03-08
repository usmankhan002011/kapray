import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MultiSlider from "@ptomasroos/react-native-multi-slider";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCostRange, setCostRange } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import { supabase } from "@/utils/supabase/client";

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

  const [bucketKey, setBucketKey] = useState<string>("any"); // ✅ ANY default

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
            max: Number(r.max_pkr)
          }))
          .filter((b) => b.max > b.min);

        setBuckets(built);

        const globalMin = 0;
        const globalMax = built.length
          ? Math.max(...built.map((b) => b.max))
          : 0;

        setDomain({ min: globalMin, max: globalMax });

        // ✅ LAND ON ANY
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

  // ✅ ANY pressed
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
          maxCostPkr: range[1]
        })
      );
    }

    if (fromResultsFilters) router.back();
    else router.replace("/results");
  };

  return (
    <StandardFilterDisplay
      title="Cost Range"
      onBack={() => router.back()}
      onAny={onSelectAny}
      onNext={onNext}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : (
            <>
              {/* ANY */}
              <Pressable
                onPress={onSelectAny}
                style={[
                  styles.anyPill,
                  bucketKey === "any" && styles.anyActive
                ]}
              >
                <Text
                  style={[
                    styles.anyText,
                    bucketKey === "any" && styles.anyTextActive
                  ]}
                >
                  Any
                </Text>
              </Pressable>

              {/* Buckets */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.bucketScroll}
              >
                {buckets.map((b) => {
                  const active = b.key === bucketKey;
                  return (
                    <Pressable
                      key={b.key}
                      onPress={() => onSelectBucket(b.key)}
                      style={[
                        styles.bucketPill,
                        active && styles.bucketActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.bucketText,
                          active && styles.bucketTextActive
                        ]}
                      >
                        {b.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Minimal instruction */}
              {bucketKey !== "any" && (
                <Text style={styles.hint}>
                  Select bucket. Adjust range below.
                </Text>
              )}

              {/* Slider only if bucket selected */}
              {bucketKey !== "any" && (
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
                      customMarkerLeft={(e) => (
                        <Marker pressed={!!e?.pressed} />
                      )}
                      customMarkerRight={(e) => (
                        <Marker pressed={!!e?.pressed} />
                      )}
                      onValuesChange={(v) =>
                        setRange(v as [number, number])
                      }
                      onValuesChangeFinish={(v) => {
                        const low = clamp(
                          roundToStep(v[0], step),
                          fineDomain.min,
                          fineDomain.max
                        );
                        const high = clamp(
                          roundToStep(v[1], step),
                          fineDomain.min,
                          fineDomain.max
                        );
                        setRange([
                          Math.min(low, high),
                          Math.max(low, high)
                        ]);
                      }}
                    />
                  </View>

                  <View style={styles.pills}>
                    <Text style={styles.value}>
                      {formatPKR(range[0])} – {formatPKR(range[1])}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingTop: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)"
  },
  loadingText: { fontSize: 13, color: "#6B7280" },

  anyPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignSelf: "flex-start",
    marginBottom: 12
  },
  anyActive: {
    backgroundColor: "#111",
    borderColor: "#111"
  },
  anyText: { fontWeight: "900", fontSize: 13 },
  anyTextActive: { color: "#fff" },

  bucketScroll: { paddingBottom: 10 },
  bucketPill: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8
  },
  bucketActive: {
    backgroundColor: "#991B1B",
    borderColor: "#991B1B"
  },
  bucketText: { fontWeight: "900", fontSize: 12, color: "#7F1D1D" },
  bucketTextActive: { color: "#fff" },

  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 10
  },

  sliderWrap: { marginTop: 8 },

  markerOuter: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center"
  },
  markerOuterPressed: { elevation: 6 },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#111"
  },

  pills: { marginTop: 14 },
  value: { fontSize: 15, fontWeight: "800" }
});