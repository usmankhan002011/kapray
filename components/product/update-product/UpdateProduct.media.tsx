import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ProductRow } from "./UpdateProduct.helpers";
import { styles, stylesVars } from "./UpdateProduct.styles";

type MediaSectionProps = {
  selected: ProductRow | null;
  savingMedia: boolean;
  imageUrls: string[];
  videoUrls: string[];
  thumbUrls: string[];
  videoThumbs: Record<string, string>;
  moreDescription: string;
  onMoreDescriptionChange: (value: string) => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onRemoveImage: (index: number) => void;
  onRemoveVideo: (index: number) => void;
};

export function MediaSection({
  selected,
  savingMedia,
  imageUrls,
  videoUrls,
  thumbUrls,
  videoThumbs,
  moreDescription,
  onMoreDescriptionChange,
  onAddImage,
  onAddVideo,
  onRemoveImage,
  onRemoveVideo,
}: MediaSectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Media</Text>

        {selected ? (
          <View style={styles.mediaActionRow}>
            <Pressable
              onPress={onAddImage}
              disabled={savingMedia}
              style={({ pressed }) => [
                styles.smallBtn,
                savingMedia ? styles.smallBtnDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.smallBtnText}>+ Add Image</Text>
            </Pressable>

            <Pressable
              onPress={onAddVideo}
              disabled={savingMedia}
              style={({ pressed }) => [
                styles.smallBtn,
                savingMedia ? styles.smallBtnDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.smallBtnText}>+ Add Video</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!selected ? (
        <Text style={styles.empty}>Select a product above to edit media.</Text>
      ) : (
        <>
          {savingMedia ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Updating media…</Text>
            </View>
          ) : null}

          <Text style={styles.metaSmall}>Images</Text>
          {imageUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.thumbRow}>
                {imageUrls.map((u, idx) => (
                  <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                    <Image source={{ uri: u }} style={styles.thumb} />
                    <Pressable
                      onPress={() => onRemoveImage(idx)}
                      disabled={savingMedia}
                      style={({ pressed }) => [
                        styles.thumbX,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={styles.thumbXText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.emptyInline}>—</Text>
          )}

          <Text style={[styles.metaSmall, { marginTop: 12 }]}>Videos</Text>
          {videoUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.thumbRow}>
                {videoUrls.map((u, idx) => {
                  const t = thumbUrls[idx] ?? null;
                  const fallback = videoThumbs[u] ?? null;

                  return (
                    <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                      {t ? (
                        <Image source={{ uri: t }} style={styles.thumb} />
                      ) : fallback ? (
                        <Image source={{ uri: fallback }} style={styles.thumb} />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.videoPlaceholderText}>
                            Video {idx + 1}
                          </Text>
                        </View>
                      )}

                      <View style={styles.playBadge}>
                        <Text style={styles.playBadgeText}>▶</Text>
                      </View>

                      <Pressable
                        onPress={() => onRemoveVideo(idx)}
                        disabled={savingMedia}
                        style={({ pressed }) => [
                          styles.thumbX,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text style={styles.thumbXText}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.emptyInline}>—</Text>
          )}

          <Text style={styles.label}>More Description</Text>
          <TextInput
            value={moreDescription}
            onChangeText={onMoreDescriptionChange}
            placeholder="Add more details: work, fabric, lining, measurements, delivery notes, etc."
            placeholderTextColor={stylesVars.placeholder}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            maxLength={1200}
          />
        </>
      )}
    </View>
  );
}