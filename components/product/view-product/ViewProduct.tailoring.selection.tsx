import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  firstResolvedPresetImageUrl,
  normalizeStyleOptions,
  safeInt0,
  TailoringStylePreset,
} from "./ViewProduct.tailoring.helpers";

export type TailoringSelection = {
  presetId: string | null;
  title?: string;
  imageUrl?: string;
  extraCostPkr?: number;
  neck?: string;
  sleeve?: string;
  trouser?: string;
  note?: string;
};

type Props = {
  styles: any;
  stylesVars: any;

  tailoringEligible: boolean;
  tailoringCostPkr: number;
  tailoringIncludesTrouser: boolean;

  tailoringStylePresets: TailoringStylePreset[];
  hasTailoringStylePresets: boolean;

  buyerWantsTailoring: boolean;
  setBuyerWantsTailoring: (next: boolean) => void;

  onChange: (selection: TailoringSelection | null) => void;

  resolvePublicUrl: (path: string | null | undefined) => string | null;
};

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const v = String(raw ?? "").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
}

function resolvePresetImageUrls(
  preset: TailoringStylePreset | null | undefined,
  resolvePublicUrl: (path: string | null | undefined) => string | null,
) {
  if (!preset) return [];

  const p: any = preset as any;

  const rawCandidates = [
    ...(Array.isArray(p?.images) ? p.images : []),
    ...(Array.isArray(p?.image_urls) ? p.image_urls : []),
    ...(Array.isArray(p?.imagePaths) ? p.imagePaths : []),
    ...(Array.isArray(p?.image_paths) ? p.image_paths : []),
    ...(Array.isArray(p?.media?.images) ? p.media.images : []),
  ];

  const resolvedFromArrays = rawCandidates
  .map((item) => {
    if (typeof item === "string") {
      const s = item.trim();
      if (!s) return null;
      return resolvePublicUrl(s) || s;
    }

    if (item && typeof item === "object") {
      const obj = item as any;
      const raw =
        String(obj?.url ?? obj?.uri ?? obj?.path ?? "").trim();

      if (!raw) return null;
      return resolvePublicUrl(raw) || raw;
    }

    return null;
  })
  .filter(Boolean) as string[];

  const fallback = firstResolvedPresetImageUrl(preset, resolvePublicUrl);

  return uniqueNonEmpty([...resolvedFromArrays, fallback]);
}

export default function ViewProductTailoringSelection({
  styles,
  stylesVars,
  tailoringEligible,
  tailoringCostPkr,
  tailoringIncludesTrouser,
  tailoringStylePresets,
  hasTailoringStylePresets,
  buyerWantsTailoring,
  setBuyerWantsTailoring,
  onChange,
  resolvePublicUrl,
}: Props) {
  const { width } = useWindowDimensions();
  const mediaViewerRef = useRef<FlatList<string>>(null);

  const [selectedTailoringStyleId, setSelectedTailoringStyleId] = useState("");
  const [selectedNeckStyle, setSelectedNeckStyle] = useState("");
  const [selectedSleeveStyle, setSelectedSleeveStyle] = useState("");
  const [selectedTrouserStyle, setSelectedTrouserStyle] = useState("");
  const [customTailoringNote, setCustomTailoringNote] = useState("");
  const [previewPresetId, setPreviewPresetId] = useState("");
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [buyerWantsStyleVariations, setBuyerWantsStyleVariations] = useState<boolean | null>(
    null,
  );

  const selectedPreset = useMemo<TailoringStylePreset | null>(() => {
    return tailoringStylePresets.find((p) => p.id === selectedTailoringStyleId) ?? null;
  }, [selectedTailoringStyleId, tailoringStylePresets]);

  const previewPreset = useMemo<TailoringStylePreset | null>(() => {
    return tailoringStylePresets.find((p) => p.id === previewPresetId) ?? null;
  }, [previewPresetId, tailoringStylePresets]);

  const activeNeckOptions = useMemo(() => {
    if (!selectedPreset) return [];
    const arr = normalizeStyleOptions(selectedPreset.allowed_neck_variations);
    const withDefault = selectedPreset.default_neck
      ? normalizeStyleOptions([...arr, selectedPreset.default_neck])
      : arr;
    return withDefault;
  }, [selectedPreset]);

  const activeSleeveOptions = useMemo(() => {
    if (!selectedPreset) return [];
    const arr = normalizeStyleOptions(selectedPreset.allowed_sleeve_variations);
    const withDefault = selectedPreset.default_sleeve
      ? normalizeStyleOptions([...arr, selectedPreset.default_sleeve])
      : arr;
    return withDefault;
  }, [selectedPreset]);

  const activeTrouserOptions = useMemo(() => {
    if (!selectedPreset || !tailoringIncludesTrouser) return [];
    const arr = normalizeStyleOptions(selectedPreset.allowed_trouser_variations);
    const withDefault = selectedPreset.default_trouser
      ? normalizeStyleOptions([...arr, selectedPreset.default_trouser])
      : arr;
    return withDefault;
  }, [selectedPreset, tailoringIncludesTrouser]);

  const resolvedSelectedPresetImage = useMemo(() => {
    const arr = resolvePresetImageUrls(selectedPreset, resolvePublicUrl);
    return arr[0] || null;
  }, [resolvePublicUrl, selectedPreset]);

  const previewPresetImages = useMemo(() => {
    return resolvePresetImageUrls(previewPreset, resolvePublicUrl);
  }, [previewPreset, resolvePublicUrl]);

  useEffect(() => {
    if (!tailoringEligible || !buyerWantsTailoring) {
      setSelectedTailoringStyleId("");
      setSelectedNeckStyle("");
      setSelectedSleeveStyle("");
      setSelectedTrouserStyle("");
      setCustomTailoringNote("");
      setPreviewPresetId("");
      setPreviewImageIndex(0);
      setBuyerWantsStyleVariations(null);
      onChange(null);
    }
  }, [buyerWantsTailoring, onChange, tailoringEligible]);

  useEffect(() => {
    if (!selectedPreset) {
      setSelectedNeckStyle("");
      setSelectedSleeveStyle("");
      setSelectedTrouserStyle("");
      setBuyerWantsStyleVariations(null);
      return;
    }

    setSelectedNeckStyle(selectedPreset.default_neck || "");
    setSelectedSleeveStyle(selectedPreset.default_sleeve || "");
    setSelectedTrouserStyle(tailoringIncludesTrouser ? selectedPreset.default_trouser || "" : "");
    setBuyerWantsStyleVariations(null);
  }, [selectedPreset, tailoringIncludesTrouser]);

  useEffect(() => {
    if (!tailoringEligible || !buyerWantsTailoring || !selectedPreset) {
      onChange(null);
      return;
    }

    onChange({
      presetId: selectedPreset.id || null,
      title: selectedPreset.title || "",
      imageUrl: resolvedSelectedPresetImage || "",
      extraCostPkr: safeInt0(selectedPreset.extra_cost_pkr),
      neck:
        buyerWantsStyleVariations === false
          ? "no change in selected style"
          : selectedNeckStyle || "",
      sleeve:
        buyerWantsStyleVariations === false
          ? "no change in selected style"
          : selectedSleeveStyle || "",
      trouser: tailoringIncludesTrouser
        ? buyerWantsStyleVariations === false
          ? "no change in selected style"
          : selectedTrouserStyle || ""
        : "",
      note: customTailoringNote.trim(),
    });
  }, [
    buyerWantsTailoring,
    buyerWantsStyleVariations,
    customTailoringNote,
    onChange,
    resolvedSelectedPresetImage,
    selectedNeckStyle,
    selectedPreset,
    selectedSleeveStyle,
    selectedTrouserStyle,
    tailoringEligible,
    tailoringIncludesTrouser,
  ]);

  useEffect(() => {
    if (!previewPresetId) {
      setPreviewImageIndex(0);
      return;
    }
    setPreviewImageIndex(0);
  }, [previewPresetId]);

  useEffect(() => {
    if (!previewPreset || !previewPresetImages.length) return;

    const safeIdx = Math.max(0, Math.min(previewImageIndex, previewPresetImages.length - 1));
    const t = setTimeout(() => {
      try {
        mediaViewerRef.current?.scrollToIndex({ index: safeIdx, animated: false });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [previewImageIndex, previewPreset, previewPresetImages.length]);

  const SelectPill = ({
    label,
    selected,
    disabled,
    onPress,
  }: {
    label: string;
    selected: boolean;
    disabled?: boolean;
    onPress: () => void;
  }) => {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.linkBtnInline,
          {
            minHeight: 24,
            paddingVertical: 4,
            paddingHorizontal: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: selected ? stylesVars.blue : "#D7E3FF",
            backgroundColor: selected ? stylesVars.blue : "#EEF4FF",
            opacity: disabled ? 0.5 : 1,
          },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text
          style={[
            styles.linkText,
            {
              fontSize: 10,
              fontWeight: "700",
              color: selected ? "#FFFFFF" : stylesVars.blue,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.label, { color: stylesVars.blue }]}>Do you want stitching?</Text>
      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => {
              if (!tailoringEligible) {
                Alert.alert(
                  "Stitching not available",
                  "This product is not eligible for stitching.",
                );
                return;
              }
              setBuyerWantsTailoring(true);
            }}
            style={({ pressed }) => [
              {
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: buyerWantsTailoring ? stylesVars.blue : "#D7E3FF",
                backgroundColor: buyerWantsTailoring ? stylesVars.blue : "#EEF4FF",
                opacity: tailoringEligible ? 1 : 0.5,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: buyerWantsTailoring ? "#FFFFFF" : stylesVars.blue,
              }}
            >
              Yes{tailoringEligible ? ` • +PKR ${tailoringCostPkr}` : ""}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setBuyerWantsTailoring(false)}
            style={({ pressed }) => [
              {
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: !buyerWantsTailoring ? stylesVars.blue : "#D7E3FF",
                backgroundColor: !buyerWantsTailoring ? stylesVars.blue : "#EEF4FF",
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: !buyerWantsTailoring ? "#FFFFFF" : stylesVars.blue,
              }}
            >
              No
            </Text>
          </Pressable>
        </View>
      </View>
      {!tailoringEligible ? (
        <Text style={[styles.meta, { marginTop: 6 }]}>
          Stitching is not available for this product.
        </Text>
      ) : null}

      {buyerWantsTailoring && tailoringEligible ? (
        <View style={{ marginTop: 12 }}>
          {hasTailoringStylePresets ? (
            <>
              <Text style={[styles.label, { color: stylesVars.blue }]}>
                Select a tailoring style
              </Text>

              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  rowGap: 12,
                }}
              >
                {tailoringStylePresets.map((preset) => {
                  const presetImages = resolvePresetImageUrls(preset, resolvePublicUrl);
                  const imageUrl = presetImages[0] || null;
                  const isSelected = selectedTailoringStyleId === preset.id;
                  const extraCost = safeInt0(preset.extra_cost_pkr);

                  return (
                    <View
                      key={preset.id}
                      style={{
                        width: "48.2%",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: isSelected ? stylesVars.blue : "#D7E3FF",
                        backgroundColor: isSelected ? "#DCEBFF" : "#FFFFFF",
                        overflow: "hidden",
                      }}
                    >
                      <Pressable
                        onPress={() => setSelectedTailoringStyleId(preset.id)}
                        style={({ pressed }) => [pressed ? styles.pressed : null]}
                      >
                        {imageUrl ? (
                          <Image
                            source={{ uri: imageUrl }}
                            style={{ width: "100%", height: 180, backgroundColor: "#EEF2F7" }}
                            resizeMode="contain"
                          />
                        ) : (
                          <View
                            style={{
                              width: "100%",
                              height: 120,
                              backgroundColor: "#EEF2F7",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={styles.meta}>No image</Text>
                          </View>
                        )}
                      </Pressable>

                      <View
                        style={{
                          padding: 10,
                          minHeight: 124,
                          justifyContent: "space-between",
                        }}
                      >
                        <View>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color: stylesVars.text,
                                flex: 1,
                              }}
                              numberOfLines={2}
                            >
                              {preset.title || "Untitled style"}
                            </Text>
                          </View>

                          {preset.note ? (
                            <Text style={[styles.meta, { marginTop: 6 }]} numberOfLines={2}>
                              {preset.note}
                            </Text>
                          ) : null}

                          {extraCost > 0 ? (
                            <Text style={[styles.meta, { marginTop: 8 }]} numberOfLines={2}>
                              Additional tailoring cost for this style:{" "}
                              <Text style={styles.specValue}>PKR {extraCost}</Text>
                            </Text>
                          ) : null}
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          <Pressable
                            onPress={() => setSelectedTailoringStyleId(preset.id)}
                            style={({ pressed }) => [
                              {
                                flex: 1,
                                minHeight: 28,
                                paddingHorizontal: 6,
                                paddingVertical: 5,
                                borderRadius: 10,
                                backgroundColor: stylesVars.blue,
                                alignItems: "center",
                                justifyContent: "center",
                              },
                              pressed ? styles.pressed : null,
                            ]}
                          >
                            <Text
                              style={{
                                color: "#FFFFFF",
                                fontSize: 10,
                                fontWeight: "700",
                              }}
                              numberOfLines={1}
                            >
                              Select
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              setPreviewImageIndex(0);
                              setPreviewPresetId(preset.id || "");
                            }}
                            style={({ pressed }) => [
                              {
                                flex: 1,
                                minHeight: 28,
                                paddingHorizontal: 6,
                                paddingVertical: 5,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: "#D7E3FF",
                                backgroundColor: "#FFFFFF",
                                alignItems: "center",
                                justifyContent: "center",
                              },
                              pressed ? styles.pressed : null,
                            ]}
                          >
                            <Text
                              style={{
                                color: stylesVars.text,
                                fontSize: 10,
                                fontWeight: "700",
                              }}
                              numberOfLines={1}
                            >
                              View Card
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {selectedPreset ? (
                <View
                  style={{
                    marginTop: 10,
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#D7E3FF",
                  }}
                >
                  <Text style={[styles.label, { color: stylesVars.blue }]}>
                    Do you want style variations?
                  </Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    <SelectPill
                      label="Yes"
                      selected={buyerWantsStyleVariations === true}
                      onPress={() => setBuyerWantsStyleVariations(true)}
                    />

                    <SelectPill
                      label="No"
                      selected={buyerWantsStyleVariations === false}
                      onPress={() => setBuyerWantsStyleVariations(false)}
                    />
                  </View>

                  {buyerWantsStyleVariations === true ? (
                    <>
                      <Text style={[styles.label, { color: stylesVars.blue, marginTop: 10 }]}>
                        Select style variations
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
                        <View style={{ width: "48.5%" }}>
                          <Text
                            style={[
                              styles.meta,
                              { marginTop: 0, fontSize: 11, color: stylesVars.blue },
                            ]}
                          >
                            Neck variations
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 3,
                              marginTop: 4,
                            }}
                          >
                            {activeNeckOptions.map((item) => (
                              <SelectPill
                                key={`neck-${item}`}
                                label={item}
                                selected={selectedNeckStyle === item}
                                onPress={() => setSelectedNeckStyle(item)}
                              />
                            ))}
                          </View>
                        </View>

                        <View style={{ width: "48.5%" }}>
                          <Text
                            style={[
                              styles.meta,
                              { marginTop: 0, fontSize: 11, color: stylesVars.blue },
                            ]}
                          >
                            Sleeve variations
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 3,
                              marginTop: 4,
                            }}
                          >
                            {activeSleeveOptions.map((item) => (
                              <SelectPill
                                key={`sleeve-${item}`}
                                label={item}
                                selected={selectedSleeveStyle === item}
                                onPress={() => setSelectedSleeveStyle(item)}
                              />
                            ))}
                          </View>
                        </View>
                      </View>

                      {tailoringIncludesTrouser ? (
                        <View style={{ marginTop: 6 }}>
                          <Text
                            style={[
                              styles.meta,
                              { marginTop: 0, fontSize: 11, color: stylesVars.blue },
                            ]}
                          >
                            Trouser variations
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 3,
                              marginTop: 4,
                            }}
                          >
                            {activeTrouserOptions.map((item) => (
                              <SelectPill
                                key={`trouser-${item}`}
                                label={item}
                                selected={selectedTrouserStyle === item}
                                onPress={() => setSelectedTrouserStyle(item)}
                              />
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : null}

                  {buyerWantsStyleVariations === false ? (
                    <Text style={[styles.meta, { marginTop: 10 }]}>
                      No change in the selected style.
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.meta, { marginTop: 10 }]}>
                  Select one style card to continue.
                </Text>
              )}

              {selectedPreset ? (
                <View
                  style={{
                    marginTop: 10,
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#D7E3FF",
                  }}
                >
                  <Text style={[styles.label, { color: stylesVars.blue }]}>
                    Additional note for vendor
                  </Text>

                  <TextInput
                    value={customTailoringNote}
                    onChangeText={setCustomTailoringNote}
                    placeholder="Optional instruction for this selected style"
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={{
                      marginTop: 5,
                      minHeight: 64,
                      borderWidth: 1,
                      borderColor: "#D7E3FF",
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      color: stylesVars.text,
                      backgroundColor: "#FFFFFF",
                      textAlignVertical: "top",
                    }}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[styles.meta, { marginTop: 6 }]}>
              Tailoring style cards are not available for this product yet.
            </Text>
          )}
        </View>
      ) : null}

      <Modal
        visible={Boolean(previewPreset)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPresetId("")}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.55)",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              maxHeight: "88%",
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
            }}
          >
            <ScrollView
              style={{ maxHeight: "100%" }}
              contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {previewPresetImages.length ? (
                <>
                  <FlatList
                    ref={mediaViewerRef}
                    data={previewPresetImages}
                    horizontal
                    pagingEnabled
                    keyExtractor={(item, index) => `${item}-${index}`}
                    getItemLayout={(_, index) => ({
                      length: width - 36,
                      offset: (width - 36) * index,
                      index,
                    })}
                    initialScrollIndex={Math.max(
                      0,
                      Math.min(previewImageIndex, Math.max(0, previewPresetImages.length - 1)),
                    )}
                    onScrollToIndexFailed={() => {
                      // ignore
                    }}
                    onMomentumScrollEnd={(e) => {
                      const next = Math.round(e.nativeEvent.contentOffset.x / (width - 36)) || 0;
                      setPreviewImageIndex(next);
                    }}
                    initialNumToRender={1}
                    maxToRenderPerBatch={1}
                    windowSize={3}
                    removeClippedSubviews
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <Image
                        source={{ uri: item }}
                        style={{ width: width - 36, height: 320, backgroundColor: "#EEF2F7" }}
                        resizeMode="contain"
                      />
                    )}
                  />

                  {previewPresetImages.length > 1 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingHorizontal: 12,
                        paddingTop: 10,
                        gap: 8,
                      }}
                    >
                      {previewPresetImages.map((item, index) => {
                        const isActive = index === previewImageIndex;
                        return (
                          <Pressable
                            key={`${item}-${index}-thumb`}
                            onPress={() => {
                              setPreviewImageIndex(index);
                              try {
                                mediaViewerRef.current?.scrollToIndex({ index, animated: true });
                              } catch {
                                // ignore
                              }
                            }}
                            style={({ pressed }) => [
                              {
                                width: 58,
                                height: 58,
                                borderRadius: 10,
                                overflow: "hidden",
                                borderWidth: 2,
                                borderColor: isActive ? stylesVars.blue : "#D7E3FF",
                                backgroundColor: "#EEF2F7",
                              },
                              pressed ? styles.pressed : null,
                            ]}
                          >
                            <Image
                              source={{ uri: item }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                </>
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 180,
                    backgroundColor: "#EEF2F7",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={styles.meta}>No image</Text>
                </View>
              )}

              <View style={{ padding: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: "700",
                      color: stylesVars.text,
                    }}
                  >
                    {previewPreset?.title || "Untitled style"}
                  </Text>

                  <Pressable
                    onPress={() => setPreviewPresetId("")}
                    style={({ pressed }) => [
                      {
                        minHeight: 34,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#D7E3FF",
                        backgroundColor: "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: stylesVars.text }}>
                      Close
                    </Text>
                  </Pressable>
                </View>

                {previewPresetImages.length ? (
                  <Text style={[styles.meta, { marginTop: 8 }]}>
                    {previewImageIndex + 1} / {previewPresetImages.length}
                  </Text>
                ) : null}

                {previewPreset?.note ? (
                  <Text style={[styles.meta, { marginTop: 8 }]}>{previewPreset.note}</Text>
                ) : null}

                <View style={{ marginTop: 10, gap: 5 }}>
                  {tailoringIncludesTrouser && previewPreset?.default_trouser ? (
                    <Text style={styles.meta}>
                      Trouser:{" "}
                      <Text style={styles.specValue}>{previewPreset.default_trouser}</Text>
                    </Text>
                  ) : null}

                  {safeInt0(previewPreset?.extra_cost_pkr) > 0 ? (
                    <Text style={styles.meta}>
                      Additional tailoring cost for this style:{" "}
                      <Text style={styles.specValue}>
                        PKR {safeInt0(previewPreset?.extra_cost_pkr)}
                      </Text>
                    </Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <Pressable
                    onPress={() => {
                      setSelectedTailoringStyleId(previewPreset?.id || "");
                      setPreviewPresetId("");
                    }}
                    style={({ pressed }) => [
                      {
                        minHeight: 34,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: stylesVars.blue,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
                      Select
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}