import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import FastNumberInput from "@/components/product/add-product/FastNumberInput";

import { SelectionPill } from "./UpdateProduct.components";
import {
  normalizeStringList,
  type NewTailoringStyleDraft,
} from "./UpdateProduct.helpers";
import { styles, stylesVars } from "./UpdateProduct.styles";

type TailoringStyleOptionField =
  | "neck_styles"
  | "sleeve_styles"
  | "trouser_styles";

type TailoringStyleDraftCardProps = {
  style: NewTailoringStyleDraft;
  index: number;
  existingStyleCount: number;
  newStyleCount: number;
  blouseNeckOptions: string[];
  sleeveOptions: string[];
  trouserOptions: string[];
  onDiscard: (index: number) => void;
  onTitleChange: (index: number, value: string) => void;
  onNoteChange: (index: number, value: string) => void;
  onExtraCostChangeText: (index: number, value: string) => void;
  onToggleOption: (
    index: number,
    field: TailoringStyleOptionField,
    value: string,
  ) => void;
  onPickImages: (index: number) => void;
};

export function TailoringStyleDraftCard({
  style,
  index,
  existingStyleCount,
  newStyleCount,
  blouseNeckOptions,
  sleeveOptions,
  trouserOptions,
  onDiscard,
  onTitleChange,
  onNoteChange,
  onExtraCostChangeText,
  onToggleOption,
  onPickImages,
}: TailoringStyleDraftCardProps) {
  const canDiscard = existingStyleCount > 0 || newStyleCount > 1;

  return (
    <View style={styles.appendCard}>
      <View style={styles.draftHeaderRow}>
        <Text style={styles.variantCardTitle}>
          New Style Card {existingStyleCount + index + 1}
        </Text>

        {canDiscard ? (
          <Pressable
            onPress={() => onDiscard(index)}
            style={({ pressed }) => [
              styles.discardDraftBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.discardDraftText}>Discard</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.label}>Style title *</Text>
      <TextInput
        value={style.title}
        onChangeText={(value) => onTitleChange(index, value)}
        placeholder="e.g., Boat neck blouse with cigarette trouser"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        maxLength={100}
      />

      <Text style={styles.label}>Note</Text>
      <TextInput
        value={style.note}
        onChangeText={(value) => onNoteChange(index, value)}
        placeholder="Short buyer-facing note"
        placeholderTextColor={stylesVars.placeholder}
        style={[styles.input, styles.textAreaSmall]}
        multiline
        textAlignVertical="top"
        maxLength={300}
      />

      <Text style={styles.label}>Extra Cost (PKR)</Text>
      <FastNumberInput
        value={String(style.extra_cost_pkr ?? 0)}
        onChangeText={(value) => onExtraCostChangeText(index, value)}
        placeholder="0"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={8}
      />

      <Text style={styles.label}>Neck Options for this Style</Text>
      {blouseNeckOptions.length ? (
        <View style={styles.optionWrap}>
          {blouseNeckOptions.map((item) => (
            <SelectionPill
              key={`new-style-${index}-neck-${item}`}
              label={item}
              selected={normalizeStringList(style.neck_styles).includes(item)}
              onPress={() => onToggleOption(index, "neck_styles", item)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyInline}>
          No neck styles found in vendor profile.
        </Text>
      )}

      <Text style={styles.label}>Sleeve Options for this Style</Text>
      {sleeveOptions.length ? (
        <View style={styles.optionWrap}>
          {sleeveOptions.map((item) => (
            <SelectionPill
              key={`new-style-${index}-sleeve-${item}`}
              label={item}
              selected={normalizeStringList(style.sleeve_styles).includes(item)}
              onPress={() => onToggleOption(index, "sleeve_styles", item)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyInline}>
          No sleeve styles found in vendor profile.
        </Text>
      )}

      <Text style={styles.label}>Trouser Options for this Style</Text>
      {trouserOptions.length ? (
        <View style={styles.optionWrap}>
          {trouserOptions.map((item) => (
            <SelectionPill
              key={`new-style-${index}-trouser-${item}`}
              label={item}
              selected={normalizeStringList(style.trouser_styles).includes(
                item,
              )}
              onPress={() => onToggleOption(index, "trouser_styles", item)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyInline}>
          No trouser styles found in vendor profile.
        </Text>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.label}>Reference Images *</Text>
        <Pressable
          onPress={() => onPickImages(index)}
          style={({ pressed }) => [
            styles.smallBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.smallBtnText}>+ Add Images</Text>
        </Pressable>
      </View>

      {style.images.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.thumbRow}>
            {style.images.map((img, imgIndex) => (
              <View key={`${img.uri}-${imgIndex}`} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text style={styles.emptyInline}>No images selected yet.</Text>
      )}
    </View>
  );
}
