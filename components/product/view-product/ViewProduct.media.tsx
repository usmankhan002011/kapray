import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

export type MediaItem =
  | { kind: "image"; url: string }
  | {
      kind: "video";
      url: string;
      thumbUrl?: string | null;
      bytes?: number | null;
    };

type ImageMediaItem = Extract<MediaItem, { kind: "image" }>;
type VideoMediaItem = Extract<MediaItem, { kind: "video" }>;

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

async function headContentLength(
  url: string,
  timeoutMs = 2500,
): Promise<number | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(t);

    const len =
      res.headers?.get?.("content-length") ??
      res.headers?.get?.("Content-Length");
    if (!len) return null;

    const n = Number(len);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

export function useProductMedia(params: {
  product: any;
  resolveManyPublic: (paths: any) => string[];
}) {
  const { product, resolveManyPublic } = params;

  const imageUrls = useMemo(() => {
    const media = (product as any)?.media ?? {};
    return resolveManyPublic(media?.images);
  }, [product, resolveManyPublic]);

  const thumbUrls = useMemo(() => {
    const media = (product as any)?.media ?? {};
    return resolveManyPublic(media?.thumbs);
  }, [product, resolveManyPublic]);

  const videoUrlsRaw = useMemo(() => {
    const media = (product as any)?.media ?? {};
    return resolveManyPublic(media?.videos);
  }, [product, resolveManyPublic]);

  // Sort videos by size (smallest first) using HEAD Content-Length (best-effort).
  const [videoSizes, setVideoSizes] = useState<Record<string, number>>({});
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const urls = Array.isArray(videoUrlsRaw) ? videoUrlsRaw : [];
      setVideoUrls(urls);

      if (!urls.length) {
        if (alive) setVideoSizes({});
        return;
      }

      const sizes: Record<string, number> = {};
      const CONCURRENCY = 2;
      let idx = 0;

      async function worker() {
        while (alive && idx < urls.length) {
          const i = idx++;
          const u = urls[i];
          const n = await headContentLength(u);
          if (typeof n === "number" && n > 0) sizes[u] = n;
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () =>
          worker(),
        ),
      );

      if (!alive) return;

      setVideoSizes(sizes);

      const sorted = [...urls].sort((a, b) => {
        const sa = sizes[a];
        const sb = sizes[b];
        const ha = Number.isFinite(sa);
        const hb = Number.isFinite(sb);
        if (ha && hb) return (sa as number) - (sb as number);
        if (ha && !hb) return -1;
        if (!ha && hb) return 1;
        return 0;
      });

      setVideoUrls(sorted);
    })();

    return () => {
      alive = false;
    };
  }, [videoUrlsRaw]);

  const mediaItems = useMemo<MediaItem[]>(() => {
    const imgs: MediaItem[] = imageUrls.map((u) => ({ kind: "image", url: u }));

    const vids: MediaItem[] = videoUrls.map((u) => {
      const rawIndex = videoUrlsRaw.indexOf(u);
      const thumbUrl = rawIndex >= 0 ? (thumbUrls[rawIndex] ?? null) : null;
      const bytes = videoSizes[u] ?? null;
      return { kind: "video", url: u, thumbUrl, bytes };
    });

    return [...imgs, ...vids];
  }, [imageUrls, videoUrls, videoUrlsRaw, thumbUrls, videoSizes]);

  useEffect(() => {
    imageUrls.forEach((u) => u && Image.prefetch(u));
    thumbUrls.forEach((u) => u && Image.prefetch(u));
  }, [imageUrls, thumbUrls]);

  return {
    imageUrls,
    thumbUrls,
    videoUrlsRaw,
    videoUrls,
    videoSizes,
    mediaItems,
  };
}

export function MediaBlock(props: {
  mediaItems: MediaItem[];
  selectedMediaIndex: number;
  setSelectedMediaIndex: (n: number) => void;

  mediaViewerVisible: boolean;
  setMediaViewerVisible: (b: boolean) => void;

  mediaViewerIndex: number;
  setMediaViewerIndex: (n: number) => void;

  activeVideoUrl: string;
  setActiveVideoUrl: (s: string) => void;

  videoCoverVisible: boolean;
  setVideoCoverVisible: (b: boolean) => void;

  videoControlsVisible: boolean;
  showControlsBriefly: () => void;
  onTogglePlayPause: () => void;

  width: number;

  styles: any;
}) {
  const {
    mediaItems,
    selectedMediaIndex,
    setSelectedMediaIndex,
    mediaViewerVisible,
    setMediaViewerVisible,
    mediaViewerIndex,
    setMediaViewerIndex,
    activeVideoUrl,
    setActiveVideoUrl,
    setVideoCoverVisible,
    width,
    styles,
  } = props;

  const imageItems = useMemo(
    () => mediaItems.filter((it): it is ImageMediaItem => it.kind === "image"),
    [mediaItems],
  );

  const videoItems = useMemo(
    () => mediaItems.filter((it): it is VideoMediaItem => it.kind === "video"),
    [mediaItems],
  );

  const imageViewerRef = useRef<FlatList<ImageMediaItem>>(null);
  const videoPagerRef = useRef<FlatList<VideoMediaItem>>(null);

  const videoPageWidth = Math.max(260, width - 60);

  const selectedVideoIndex = useMemo(() => {
    if (!videoItems.length) return 0;
    const idx = videoItems.findIndex((it) => it.url === activeVideoUrl);
    return idx >= 0 ? idx : 0;
  }, [activeVideoUrl, videoItems]);

  const selectedImageIndex = useMemo(() => {
    if (!imageItems.length) return 0;

    const selected = mediaItems[selectedMediaIndex];
    if (selected?.kind !== "image") return 0;

    const idx = imageItems.findIndex((it) => it.url === selected.url);
    return idx >= 0 ? idx : 0;
  }, [imageItems, mediaItems, selectedMediaIndex]);

  const selectedImage = useMemo(() => {
    if (!imageItems.length) return null;
    return imageItems[selectedImageIndex] ?? imageItems[0] ?? null;
  }, [imageItems, selectedImageIndex]);

  useEffect(() => {
    if (!videoItems.length) {
      if (activeVideoUrl) setActiveVideoUrl("");
      return;
    }

    if (
      !activeVideoUrl ||
      !videoItems.some((it) => it.url === activeVideoUrl)
    ) {
      setActiveVideoUrl(videoItems[0].url);
      setVideoCoverVisible(false);
    }
  }, [activeVideoUrl, setActiveVideoUrl, setVideoCoverVisible, videoItems]);

  const player = useVideoPlayer(activeVideoUrl || "");

  useEffect(() => {
    try {
      if (player) (player as any).loop = false;
    } catch {
      // ignore
    }
  }, [player]);

  // When user scrolls to another video, start that video automatically.
  // Native controls remain available on the active VideoView.
  useEffect(() => {
    if (!activeVideoUrl) return;

    const t = setTimeout(() => {
      try {
        (player as any)?.play?.();
      } catch {
        // ignore autoplay failures; user can still press native play.
      }
    }, 120);

    return () => clearTimeout(t);
  }, [activeVideoUrl, player]);

  useEffect(() => {
    if (!mediaViewerVisible) return;
    if (!imageItems.length) return;

    const t = setTimeout(() => {
      try {
        imageViewerRef.current?.scrollToIndex({
          index: Math.max(0, Math.min(mediaViewerIndex, imageItems.length - 1)),
          animated: false,
        });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [imageItems.length, mediaViewerIndex, mediaViewerVisible]);

  useEffect(() => {
    if (!videoItems.length) return;

    const t = setTimeout(() => {
      try {
        videoPagerRef.current?.scrollToIndex({
          index: selectedVideoIndex,
          animated: false,
        });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [selectedVideoIndex, videoItems.length]);

  async function openExternal(url: string) {
    const u = String(url || "").trim();
    if (!u) return;

    const ok = await Linking.canOpenURL(u);
    if (!ok) {
      Alert.alert("Cannot open", u);
      return;
    }
    Linking.openURL(u);
  }

  const openImageViewerAt = useCallback(
    (imageIdx: number) => {
      if (!imageItems.length) return;
      const safeIdx = Math.max(0, Math.min(imageIdx, imageItems.length - 1));
      const imageUrl = imageItems[safeIdx]?.url;
      const globalIdx = mediaItems.findIndex(
        (it) => it.kind === "image" && it.url === imageUrl,
      );

      setSelectedMediaIndex(globalIdx >= 0 ? globalIdx : safeIdx);
      setMediaViewerIndex(safeIdx);
      setMediaViewerVisible(true);
    },
    [
      imageItems,
      mediaItems,
      setMediaViewerIndex,
      setMediaViewerVisible,
      setSelectedMediaIndex,
    ],
  );

  const selectImageAt = useCallback(
    (imageIdx: number) => {
      if (!imageItems.length) return;

      const safeIdx = Math.max(0, Math.min(imageIdx, imageItems.length - 1));
      const imageUrl = imageItems[safeIdx]?.url;
      const globalIdx = mediaItems.findIndex(
        (it) => it.kind === "image" && it.url === imageUrl,
      );

      setSelectedMediaIndex(globalIdx >= 0 ? globalIdx : safeIdx);
      setMediaViewerIndex(safeIdx);
    },
    [imageItems, mediaItems, setMediaViewerIndex, setSelectedMediaIndex],
  );

  const selectVideoAt = useCallback(
    (videoIdx: number, animated = true) => {
      if (!videoItems.length) return;

      const safeIdx = Math.max(0, Math.min(videoIdx, videoItems.length - 1));
      const item = videoItems[safeIdx];
      if (!item) return;

      const globalIdx = mediaItems.findIndex(
        (it) => it.kind === "video" && it.url === item.url,
      );

      if (globalIdx >= 0) setSelectedMediaIndex(globalIdx);
      setActiveVideoUrl(item.url);
      setVideoCoverVisible(false);

      try {
        videoPagerRef.current?.scrollToIndex({ index: safeIdx, animated });
      } catch {
        // ignore
      }
    },
    [
      mediaItems,
      setActiveVideoUrl,
      setSelectedMediaIndex,
      setVideoCoverVisible,
      videoItems,
    ],
  );

  if (!mediaItems.length) return null;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Images</Text>

        {imageItems.length && selectedImage ? (
          <>
            <Pressable
              onPress={() => openImageViewerAt(selectedImageIndex)}
              style={({ pressed }) => [
                styles.imageHeroWrap,
                pressed ? styles.pressed : null,
              ]}
            >
              <Image
                source={{ uri: selectedImage.url }}
                style={styles.imageHero}
              />

              <View style={styles.imageHeroCount}>
                <Text style={styles.indexText}>
                  {selectedImageIndex + 1} / {imageItems.length}
                </Text>
              </View>
            </Pressable>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {imageItems.map((it, idx) => {
                  const isOn = idx === selectedImageIndex;

                  return (
                    <Pressable
                      key={`${it.url}-${idx}`}
                      onPress={() => selectImageAt(idx)}
                      onLongPress={() => openImageViewerAt(idx)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        isOn ? styles.thumbOn : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Image source={{ uri: it.url }} style={styles.thumb} />
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        ) : (
          <Text style={styles.empty}>—</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Videos</Text>

        {videoItems.length ? (
          <>
            <FlatList
              ref={videoPagerRef}
              data={videoItems}
              horizontal
              pagingEnabled
              keyExtractor={(item, i) => `${item.url}-${i}`}
              getItemLayout={(_, i) => ({
                length: videoPageWidth,
                offset: videoPageWidth * i,
                index: i,
              })}
              onScrollToIndexFailed={() => {
                // ignore
              }}
              onMomentumScrollEnd={(e) => {
                const next =
                  Math.round(e.nativeEvent.contentOffset.x / videoPageWidth) ||
                  0;
                selectVideoAt(next, false);
              }}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={3}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isActive = item.url === activeVideoUrl;

                return (
                  <Pressable
                    onPress={() => {
                      if (!isActive) selectVideoAt(index);
                    }}
                    onLongPress={() => openExternal(item.url)}
                    style={[styles.videoPage, { width: videoPageWidth }]}
                  >
                    <View style={styles.videoBox}>
                      {isActive ? (
                        <VideoView
                          player={player}
                          style={styles.video}
                          allowsFullscreen
                          allowsPictureInPicture
                        />
                      ) : item.thumbUrl ? (
                        <Image
                          source={{ uri: item.thumbUrl }}
                          style={styles.videoPagerCover}
                        />
                      ) : (
                        <View style={styles.videoPlaceholderLarge}>
                          <Text style={styles.videoPlaceholderText}>
                            Video {index + 1}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {videoItems.map((it, idx) => (
                  <Pressable
                    key={`${it.url}-${idx}`}
                    onPress={() => selectVideoAt(idx)}
                    onLongPress={() => openExternal(it.url)}
                    style={({ pressed }) => [
                      styles.thumbWrap,
                      activeVideoUrl === it.url ? styles.videoThumbOn : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    {it.thumbUrl ? (
                      <Image
                        source={{ uri: it.thumbUrl }}
                        style={styles.thumb}
                      />
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
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        ) : (
          <Text style={styles.empty}>—</Text>
        )}
      </View>

      <Modal
        visible={mediaViewerVisible}
        transparent
        onRequestClose={() => setMediaViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <FlatList
            ref={imageViewerRef}
            data={imageItems}
            horizontal
            pagingEnabled
            keyExtractor={(item, i) => `${item.url}-${i}`}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i,
            })}
            initialScrollIndex={Math.max(
              0,
              Math.min(mediaViewerIndex, Math.max(0, imageItems.length - 1)),
            )}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next =
                Math.round(e.nativeEvent.contentOffset.x / width) || 0;
              const safeNext = Math.max(
                0,
                Math.min(next, imageItems.length - 1),
              );
              const imageUrl = imageItems[safeNext]?.url;
              const globalIdx = mediaItems.findIndex(
                (it) => it.kind === "image" && it.url === imageUrl,
              );

              setMediaViewerIndex(safeNext);
              if (globalIdx >= 0) setSelectedMediaIndex(globalIdx);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={styles.viewerImage} />
            )}
          />

          <Pressable
            style={styles.closeButton}
            onPress={() => setMediaViewerVisible(false)}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.indexCaption}>
            <Text style={styles.indexText}>
              {imageItems.length ? mediaViewerIndex + 1 : 0} /{" "}
              {imageItems.length}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function FooterBar(props: {
  showBuyerActions: boolean;
  FOOTER_H: number;
  safePriceText: string;
  productTitle: any;
  purchaseDisabled: boolean;
  onPurchase: () => void;

  styles: any;
}) {
  const {
    showBuyerActions,
    FOOTER_H,
    safePriceText,
    productTitle,
    purchaseDisabled,
    onPurchase,
    styles,
  } = props;

  if (!showBuyerActions) return null;

  return (
    <View style={[styles.footer, { height: FOOTER_H }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.footerTitle} numberOfLines={1}>
          {safeText(productTitle)}
        </Text>
        <Text style={styles.footerSub} numberOfLines={1}>
          {safeText(safePriceText)}
        </Text>
      </View>

      <Pressable
        onPress={onPurchase}
        disabled={purchaseDisabled}
        style={({ pressed }) => [
          styles.footerBtn,
          purchaseDisabled ? styles.footerBtnDisabled : null,
          pressed && !purchaseDisabled ? styles.pressed : null,
        ]}
      >
        <Text style={styles.footerBtnText}>Purchase</Text>
      </Pressable>
    </View>
  );
}
