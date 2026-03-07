import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";

export type MediaItem =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string; thumbUrl?: string | null; bytes?: number | null };

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

async function headContentLength(url: string, timeoutMs = 2500): Promise<number | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(t);

    const len = res.headers?.get?.("content-length") ?? res.headers?.get?.("Content-Length");
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

  // ✅ Sort videos by size (smallest first) using HEAD Content-Length (best-effort)
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

      // ✅ small concurrency to avoid spikes
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
        Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker())
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

  // Build media items (images first, then videos sorted by size)
  const mediaItems = useMemo<MediaItem[]>(() => {
    const imgs: MediaItem[] = imageUrls.map((u) => ({ kind: "image", url: u }));

    const vids: MediaItem[] = videoUrls.map((u) => {
      const rawIndex = videoUrlsRaw.indexOf(u);
      const thumbUrl = rawIndex >= 0 ? thumbUrls[rawIndex] ?? null : null;
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
    mediaItems
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
    videoCoverVisible,
    setVideoCoverVisible,
    videoControlsVisible,
    showControlsBriefly,
    onTogglePlayPause,
    width,
    styles
  } = props;

  const mediaViewerRef = useRef<FlatList<MediaItem>>(null);

  const selectedMedia = useMemo<MediaItem | null>(() => {
    if (!mediaItems.length) return null;
    const safeIdx = Math.max(0, Math.min(selectedMediaIndex, mediaItems.length - 1));
    return mediaItems[safeIdx] ?? null;
  }, [mediaItems, selectedMediaIndex]);

  const openMediaViewerAt = useCallback(
    (idx: number) => {
      if (!mediaItems.length) return;
      const safeIdx = Math.max(0, Math.min(idx, mediaItems.length - 1));
      setMediaViewerIndex(safeIdx);
      setMediaViewerVisible(true);

      const it = mediaItems[safeIdx];
      if (it?.kind === "video") {
        setActiveVideoUrl(it.url);
        setVideoCoverVisible(true);
      }
    },
    [mediaItems, setMediaViewerIndex, setMediaViewerVisible, setActiveVideoUrl, setVideoCoverVisible]
  );

  useEffect(() => {
    if (!mediaViewerVisible) return;
    if (!mediaItems.length) return;

    const t = setTimeout(() => {
      try {
        mediaViewerRef.current?.scrollToIndex({ index: mediaViewerIndex, animated: false });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [mediaViewerVisible, mediaViewerIndex, mediaItems.length]);

  const isVideoSelected = useMemo(() => {
    return selectedMedia?.kind === "video" && selectedMedia?.url === activeVideoUrl;
  }, [selectedMedia, activeVideoUrl]);

  const activeViewerItem = useMemo(() => mediaItems[mediaViewerIndex], [mediaItems, mediaViewerIndex]);
  const activeViewerIsVideo = useMemo(
    () => activeViewerItem?.kind === "video" && activeViewerItem?.url === activeVideoUrl,
    [activeViewerItem, activeVideoUrl]
  );

  const player = useVideoPlayer(activeVideoUrl || "");
  const { status } = useEvent(player as any, "statusChange", { status: (player as any)?.status });
  const { isPlaying } = useEvent(player as any, "playingChange", {
    isPlaying: (player as any)?.playing
  });

  // ✅ Autoplay when activeVideoUrl changes
  useEffect(() => {
    if (!activeVideoUrl) return;
    const t = setTimeout(() => {
      try {
        (player as any)?.play?.();
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(t);
  }, [activeVideoUrl, player]);

  const coverHideTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (coverHideTimerRef.current) clearTimeout(coverHideTimerRef.current);
    };
  }, []);

  // ✅ Hide cover only AFTER we are actually playing (prevents black flash)
  useEffect(() => {
    if (!activeVideoUrl) return;

    if (isPlaying) {
      if (coverHideTimerRef.current) clearTimeout(coverHideTimerRef.current);

      coverHideTimerRef.current = setTimeout(() => {
        setVideoCoverVisible(false);
      }, 120);

      return;
    }

    setVideoCoverVisible(true);
  }, [activeVideoUrl, isPlaying, status, setVideoCoverVisible]);

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

  const onSelectMedia = useCallback(
    (idx: number) => {
      const item = mediaItems[idx];
      if (!item) return;

      setSelectedMediaIndex(idx);

      if (item.kind === "video") {
        setActiveVideoUrl(item.url);
        setVideoCoverVisible(true);
      }

      openMediaViewerAt(idx);
    },
    [mediaItems, setSelectedMediaIndex, setActiveVideoUrl, setVideoCoverVisible, openMediaViewerAt]
  );

  const Hero = useMemo(() => {
    if (!selectedMedia) return null;

    if (selectedMedia.kind === "video") {
      const thumb = selectedMedia.thumbUrl ?? null;

      return (
        <View style={styles.heroWrap}>
          <View style={styles.heroVideoBox}>
            {isVideoSelected ? (
              <VideoView player={player} style={styles.heroVideo} nativeControls={false} />
            ) : null}

            {thumb && (videoCoverVisible || !isVideoSelected) ? (
              <Image source={{ uri: thumb }} style={styles.heroCover} />
            ) : null}

            {videoControlsVisible ? (
              <Pressable onPress={onTogglePlayPause} style={styles.videoControlsOverlay}>
                <View style={styles.videoControlPill}>
                  <Text style={styles.videoControlText}>⏯</Text>
                </View>
              </Pressable>
            ) : null}

            <Pressable onPress={() => showControlsBriefly()} style={StyleSheet.absoluteFill} />
          </View>

          <Pressable
            onPress={() => openMediaViewerAt(selectedMediaIndex)}
            style={styles.heroOpenViewerBtn}
          >
            <Text style={styles.heroOpenViewerText}>Open</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => openMediaViewerAt(selectedMediaIndex)}
        style={({ pressed }) => [styles.heroWrap, pressed ? styles.pressed : null]}
      >
        <Image source={{ uri: selectedMedia.url }} style={styles.heroImage} />
      </Pressable>
    );
  }, [
    selectedMedia,
    player,
    isVideoSelected,
    videoCoverVisible,
    videoControlsVisible,
    showControlsBriefly,
    onTogglePlayPause,
    openMediaViewerAt,
    selectedMediaIndex,
    styles
  ]);

  if (!mediaItems.length) return null;

  return (
    <>
      <View style={styles.mediaBlock}>
        {Hero}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.thumbRow}>
            {mediaItems.map((it, idx) => {
              const isOn = idx === selectedMediaIndex;

              if (it.kind === "image") {
                return (
                  <Pressable
                    key={`${it.kind}-${it.url}-${idx}`}
                    onPress={() => onSelectMedia(idx)}
                    style={({ pressed }) => [
                      styles.thumbWrap,
                      isOn ? styles.thumbOn : null,
                      pressed ? styles.pressed : null
                    ]}
                  >
                    <Image source={{ uri: it.url }} style={styles.thumb} />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={`${it.kind}-${it.url}-${idx}`}
                  onPress={() => onSelectMedia(idx)}
                  onLongPress={() => openExternal(it.url)}
                  style={({ pressed }) => [
                    styles.thumbWrap,
                    isOn ? styles.thumbOn : null,
                    pressed ? styles.pressed : null
                  ]}
                >
                  {it.thumbUrl ? (
                    <Image source={{ uri: it.thumbUrl }} style={styles.thumb} />
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Text style={styles.videoPlaceholderText}>Video</Text>
                    </View>
                  )}
                  <View style={styles.playBadge}>
                    <Text style={styles.playBadgeText}>▶</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={mediaViewerVisible}
        transparent={false}
        onRequestClose={() => setMediaViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <FlatList
            ref={mediaViewerRef}
            data={mediaItems}
            horizontal
            pagingEnabled
            keyExtractor={(it, i) => `${it.kind}-${it.url}-${i}`}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialScrollIndex={Math.max(
              0,
              Math.min(mediaViewerIndex, Math.max(0, mediaItems.length - 1))
            )}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width) || 0;
              setMediaViewerIndex(next);

              const item = mediaItems[next];
              if (item?.kind === "video") {
                setActiveVideoUrl(item.url);
                setVideoCoverVisible(true);
              }
            }}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => {
              if (item.kind === "video") {
                const isActive = index === mediaViewerIndex && activeViewerIsVideo;
                const thumb = item.thumbUrl ?? null;

                return (
                  <View style={styles.viewerPage}>
                    {isActive ? (
                      <VideoView player={player} style={styles.viewerVideo} nativeControls={false} />
                    ) : null}

                    {thumb && (!isActive || videoCoverVisible) ? (
                      <Image source={{ uri: thumb }} style={styles.viewerCover} />
                    ) : null}

                    {videoControlsVisible && isActive ? (
                      <Pressable onPress={onTogglePlayPause} style={styles.videoControlsOverlay}>
                        <View style={styles.videoControlPill}>
                          <Text style={styles.videoControlText}>⏯</Text>
                        </View>
                      </Pressable>
                    ) : null}

                    <Pressable onPress={() => showControlsBriefly()} style={StyleSheet.absoluteFill} />
                  </View>
                );
              }

              return <Image source={{ uri: item.url }} style={styles.viewerImage} />;
            }}
          />

          <Pressable style={styles.closeButton} onPress={() => setMediaViewerVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.indexCaption}>
            <Text style={styles.indexText}>
              {mediaItems.length ? mediaViewerIndex + 1 : 0} / {mediaItems.length}
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
  const { showBuyerActions, FOOTER_H, safePriceText, productTitle, purchaseDisabled, onPurchase, styles } =
    props;

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
          pressed && !purchaseDisabled ? styles.pressed : null
        ]}
      >
        <Text style={styles.footerBtnText}>Purchase</Text>
      </Pressable>
    </View>
  );
}