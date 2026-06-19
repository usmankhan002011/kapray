import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
import {
  UpdateProductActionButton,
  UpdateProductEmptyState,
  UpdateProductSectionCard,
} from "./UpdateProduct.components";
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
    <UpdateProductSectionCard
      title="Media"
      subtitle="Images, videos, and extra buyer-facing detail."
      actions={
        selected ? (
          <View style={styles.mediaActionRow}>
            <UpdateProductActionButton
              label="Image"
              icon="add-photo-alternate"
              onPress={onAddImage}
              disabled={savingMedia}
            />

            <UpdateProductActionButton
              label="Video"
              icon="video-library"
              onPress={onAddVideo}
              disabled={savingMedia}
            />
          </View>
        ) : null
      }
    >
      {!selected ? (
        <UpdateProductEmptyState
          title="No media loaded"
          message="Select a product above to edit images, videos, and descriptions."
        />
      ) : (
        <>
          {savingMedia ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Updating media...</Text>
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
                      accessibilityRole="button"
                      accessibilityLabel="Remove image"
                      onPress={() => onRemoveImage(idx)}
                      disabled={savingMedia}
                      style={({ pressed }) => [
                        styles.thumbX,
                        savingMedia ? styles.actionButtonDisabled : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={stylesVars.danger}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <UpdateProductEmptyState
              title="No images yet"
              message="Add product photos so buyers can inspect the outfit."
            />
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
                        <Text style={styles.playBadgeText}>{">"}</Text>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove video"
                        onPress={() => onRemoveVideo(idx)}
                        disabled={savingMedia}
                        style={({ pressed }) => [
                          styles.thumbX,
                          savingMedia ? styles.actionButtonDisabled : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <MaterialIcons
                          name="close"
                          size={16}
                          color={stylesVars.danger}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <UpdateProductEmptyState
              title="No videos yet"
              message="Optional videos can show movement, fabric weight, or detailing."
            />
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
    </UpdateProductSectionCard>
  );
}
