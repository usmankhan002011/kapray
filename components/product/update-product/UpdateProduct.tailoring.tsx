import type { ReactNode } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";

import FastNumberInput from "@/components/product/add-product/FastNumberInput";

import { SelectionPill } from "./UpdateProduct.components";
import {
  UpdateProductActionButton,
  UpdateProductEmptyState,
  UpdateProductNotice,
} from "./UpdateProduct.components";
import {
  normalizeStringList,
  safeText,
  type NewTailoringStyleDraft,
  type ProductTailoringSelections,
} from "./UpdateProduct.helpers";
import { styles, stylesVars } from "./UpdateProduct.styles";

type ProductTailoringSelectionGroup = keyof ProductTailoringSelections;

type TailoringStyleOptionField =
  | "neck_styles"
  | "sleeve_styles"
  | "trouser_styles";

type TailoringBaseOptionSelectorsProps = {
  blouseNeckOptions: string[];
  sleeveOptions: string[];
  trouserOptions: string[];
  selectedTailoringStyles: ProductTailoringSelections;
  hasAnyVendorStyleOptions: boolean;
  onToggleStyle: (group: ProductTailoringSelectionGroup, value: string) => void;
};

type ExistingTailoringStyleListProps = {
  stylesList: Array<{ title?: unknown }>;
};

type AddTailoringStyleButtonProps = {
  onPress: () => void;
};

type TailoringStyleCardsBoxProps = {
  children: ReactNode;
};

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

function OptionEmptyState({ title }: { title: string }) {
  return <UpdateProductEmptyState title={title} />;
}

export function ExistingTailoringStyleList({
  stylesList,
}: ExistingTailoringStyleListProps) {
  if (!stylesList.length) return null;
  const hasSingleStyle = stylesList.length === 1;

  return (
    <View style={styles.readonlyListBox}>
      <Text style={styles.appendTitle}>
        {hasSingleStyle ? "Saved design" : "Saved styles"}
      </Text>
      {stylesList.map((style, index) => (
        <Text key={`old-style-${index}`} style={styles.readonlyValue}>
          {hasSingleStyle
            ? safeText(style?.title)
            : `${index + 1}. ${safeText(style?.title)}`}
        </Text>
      ))}
    </View>
  );
}

export function AddTailoringStyleButton({
  onPress,
}: AddTailoringStyleButtonProps) {
  return (
    <UpdateProductActionButton
      label="Add Style"
      icon="add"
      onPress={onPress}
      size="medium"
      style={styles.addFullBtn}
    />
  );
}

export function TailoringStyleCardsBox({
  children,
}: TailoringStyleCardsBoxProps) {
  return (
    <View style={styles.appendBox}>
      <Text style={styles.appendTitle}>Styles</Text>

      {children}
    </View>
  );
}

export function TailoringBaseOptionSelectors({
  blouseNeckOptions,
  sleeveOptions,
  trouserOptions,
  selectedTailoringStyles,
  hasAnyVendorStyleOptions,
  onToggleStyle,
}: TailoringBaseOptionSelectorsProps) {
  return (
    <>
      <Text style={styles.label}>Neck</Text>
      {blouseNeckOptions.length ? (
        <View style={styles.optionWrap}>
          {blouseNeckOptions.map((item) => (
            <SelectionPill
              key={`neck-${item}`}
              label={item}
              selected={selectedTailoringStyles.blouse_neck.includes(item)}
              onPress={() => onToggleStyle("blouse_neck", item)}
            />
          ))}
        </View>
      ) : (
        <OptionEmptyState title="No neck styles found" />
      )}

      <Text style={styles.label}>Sleeve</Text>
      {sleeveOptions.length ? (
        <View style={styles.optionWrap}>
          {sleeveOptions.map((item) => (
            <SelectionPill
              key={`sleeve-${item}`}
              label={item}
              selected={selectedTailoringStyles.sleeves.includes(item)}
              onPress={() => onToggleStyle("sleeves", item)}
            />
          ))}
        </View>
      ) : (
        <OptionEmptyState title="No sleeve styles found" />
      )}

      <Text style={styles.label}>Trouser</Text>
      {trouserOptions.length ? (
        <View style={styles.optionWrap}>
          {trouserOptions.map((item) => (
            <SelectionPill
              key={`trouser-${item}`}
              label={item}
              selected={selectedTailoringStyles.trouser.includes(item)}
              onPress={() => onToggleStyle("trouser", item)}
            />
          ))}
        </View>
      ) : (
        <OptionEmptyState title="No trouser styles found" />
      )}

      {!hasAnyVendorStyleOptions ? (
        <UpdateProductNotice title="Tailoring options missing" tone="warning">
          Add in vendor profile.
        </UpdateProductNotice>
      ) : null}
    </>
  );
}

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
        <View style={styles.sectionHeaderText}>
          <Text style={styles.variantCardTitle}>
            New Style {existingStyleCount + index + 1}
          </Text>
        </View>

        {canDiscard ? (
          <UpdateProductActionButton
            label="Discard"
            icon="delete-outline"
            onPress={() => onDiscard(index)}
            variant="danger"
          />
        ) : null}
      </View>

      <Text style={styles.label}>Style title *</Text>
      <TextInput
        value={style.title}
        onChangeText={(value) => onTitleChange(index, value)}
        placeholder="e.g., Boat neck blouse"
        placeholderTextColor={stylesVars.placeholder}
        style={styles.input}
        maxLength={100}
      />

      <Text style={styles.label}>Note</Text>
      <TextInput
        value={style.note}
        onChangeText={(value) => onNoteChange(index, value)}
        placeholder="Short note"
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
        commitMode="change"
        keyboardType="number-pad"
        maxLength={8}
      />

      <Text style={styles.label}>Neck</Text>
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
        <OptionEmptyState title="No neck styles found" />
      )}

      <Text style={styles.label}>Sleeve</Text>
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
        <OptionEmptyState title="No sleeve styles found" />
      )}

      <Text style={styles.label}>Trouser</Text>
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
        <OptionEmptyState title="No trouser styles found" />
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.label}>Images *</Text>
        <UpdateProductActionButton
          label="Images"
          icon="add-photo-alternate"
          onPress={() => onPickImages(index)}
        />
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
        <UpdateProductEmptyState title="No images selected" />
      )}
    </View>
  );
}
