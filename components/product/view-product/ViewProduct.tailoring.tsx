import React from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { firstResolvedPresetImageUrl, safeInt0, TailoringStylePreset } from "./ViewProduct.tailoring.helpers";

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

  selectedTailoringStyleId: string;
  setSelectedTailoringStyleId: (next: string) => void;

  selectedPreset: TailoringStylePreset | null;

  activeNeckOptions: string[];
  activeSleeveOptions: string[];
  activeTrouserOptions: string[];

  selectedNeckStyle: string;
  setSelectedNeckStyle: (next: string) => void;

  selectedSleeveStyle: string;
  setSelectedSleeveStyle: (next: string) => void;

  selectedTrouserStyle: string;
  setSelectedTrouserStyle: (next: string) => void;

  customTailoringNote: string;
  setCustomTailoringNote: (next: string) => void;

  resolvePublicUrl: (path: string | null | undefined) => string | null;
};

export default function ViewProductTailoringSection({
  styles,
  stylesVars,
  tailoringEligible,
  tailoringCostPkr,
  tailoringIncludesTrouser,
  tailoringStylePresets,
  hasTailoringStylePresets,
  buyerWantsTailoring,
  setBuyerWantsTailoring,
  selectedTailoringStyleId,
  setSelectedTailoringStyleId,
  selectedPreset,
  activeNeckOptions,
  activeSleeveOptions,
  activeTrouserOptions,
  selectedNeckStyle,
  setSelectedNeckStyle,
  selectedSleeveStyle,
  setSelectedSleeveStyle,
  selectedTrouserStyle,
  setSelectedTrouserStyle,
  customTailoringNote,
  setCustomTailoringNote,
  resolvePublicUrl,
}: Props) {
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
            minHeight: 34,
            paddingVertical: 7,
            paddingHorizontal: 10,
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
              fontSize: 12,
              fontWeight: "700",
              color: selected ? "#FFFFFF" : stylesVars.blue,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>Do you want stitching?</Text>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <SelectPill
          label={`Yes${tailoringEligible ? ` • +PKR ${tailoringCostPkr}` : ""}`}
          selected={buyerWantsTailoring}
          disabled={!tailoringEligible}
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
        />

        <SelectPill
          label="No"
          selected={!buyerWantsTailoring}
          onPress={() => setBuyerWantsTailoring(false)}
        />
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
              <Text style={styles.label}>Select a tailoring style</Text>
              <Text style={styles.meta}>
                Choose one style card first. Then select only the allowed variations inside
                that chosen style. Trouser variation appears only where trouser is included.
              </Text>

              <View style={{ marginTop: 10, gap: 12 }}>
                {tailoringStylePresets.map((preset) => {
                  const imageUrl = firstResolvedPresetImageUrl(preset, resolvePublicUrl);
                  const isSelected = selectedTailoringStyleId === preset.id;
                  const extraCost = safeInt0(preset.extra_cost_pkr);

                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => setSelectedTailoringStyleId(preset.id)}
                      style={({ pressed }) => [
                        {
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: isSelected ? stylesVars.blue : "#D7E3FF",
                          backgroundColor: isSelected ? "#F3F8FF" : "#FFFFFF",
                          overflow: "hidden",
                        },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={{ width: "100%", height: 180, backgroundColor: "#EEF2F7" }}
                          resizeMode="cover"
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

                      <View style={{ padding: 12 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              color: stylesVars.text,
                              flex: 1,
                            }}
                          >
                            {preset.title || "Untitled style"}
                          </Text>

                          {isSelected ? (
                            <View
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 999,
                                backgroundColor: stylesVars.blue,
                              }}
                            >
                              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>
                                Selected
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {preset.note ? (
                          <Text style={[styles.meta, { marginTop: 6 }]}>{preset.note}</Text>
                        ) : null}

                        <View style={{ marginTop: 8, gap: 4 }}>
                          {preset.default_neck ? (
                            <Text style={styles.meta}>
                              Neck: <Text style={styles.specValue}>{preset.default_neck}</Text>
                            </Text>
                          ) : null}
                          {preset.default_sleeve ? (
                            <Text style={styles.meta}>
                              Sleeve:{" "}
                              <Text style={styles.specValue}>{preset.default_sleeve}</Text>
                            </Text>
                          ) : null}
                          {tailoringIncludesTrouser && preset.default_trouser ? (
                            <Text style={styles.meta}>
                              Trouser:{" "}
                              <Text style={styles.specValue}>{preset.default_trouser}</Text>
                            </Text>
                          ) : null}
                        </View>

                        {extraCost > 0 ? (
                          <Text style={[styles.meta, { marginTop: 8 }]}>
                            Extra for this style:{" "}
                            <Text style={styles.specValue}>PKR {extraCost}</Text>
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {selectedPreset ? (
                <View
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#D7E3FF",
                  }}
                >
                  <Text style={styles.label}>Selected style variations</Text>

                  <Text style={[styles.meta, { marginTop: 4 }]}>
                    You selected:{" "}
                    <Text style={styles.specValue}>
                      {selectedPreset.title || "Untitled style"}
                    </Text>
                  </Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {activeNeckOptions.map((item) => (
                      <SelectPill
                        key={`neck-${item}`}
                        label={item}
                        selected={selectedNeckStyle === item}
                        onPress={() => setSelectedNeckStyle(item)}
                      />
                    ))}
                  </View>
                  <Text style={[styles.meta, { marginTop: 6 }]}>
                    Neck: <Text style={styles.specValue}>{selectedNeckStyle || "Not selected"}</Text>
                  </Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {activeSleeveOptions.map((item) => (
                      <SelectPill
                        key={`sleeve-${item}`}
                        label={item}
                        selected={selectedSleeveStyle === item}
                        onPress={() => setSelectedSleeveStyle(item)}
                      />
                    ))}
                  </View>
                  <Text style={[styles.meta, { marginTop: 6 }]}>
                    Sleeve:{" "}
                    <Text style={styles.specValue}>{selectedSleeveStyle || "Not selected"}</Text>
                  </Text>

                  {tailoringIncludesTrouser ? (
                    <>
                      <Text style={[styles.meta, { marginTop: 12 }]}>
                        Trouser applies to this product because trouser is included.
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 8,
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
                      <Text style={[styles.meta, { marginTop: 6 }]}>
                        Trouser:{" "}
                        <Text style={styles.specValue}>
                          {selectedTrouserStyle || "Not selected"}
                        </Text>
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.meta, { marginTop: 12 }]}>
                      Trouser variation is not applicable because this product does not include
                      trouser.
                    </Text>
                  )}

                  {selectedPreset.allow_custom_note ? (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.label}>Additional note for vendor</Text>
                      <TextInput
                        value={customTailoringNote}
                        onChangeText={setCustomTailoringNote}
                        placeholder="Optional instruction for this selected style"
                        placeholderTextColor="#94A3B8"
                        multiline
                        style={{
                          marginTop: 8,
                          minHeight: 90,
                          borderWidth: 1,
                          borderColor: "#D7E3FF",
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          color: stylesVars.text,
                          backgroundColor: "#FFFFFF",
                          textAlignVertical: "top",
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.meta, { marginTop: 10 }]}>
                  Select one style card to continue.
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.meta, { marginTop: 6 }]}>
              Tailoring style cards are not available for this product yet.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}