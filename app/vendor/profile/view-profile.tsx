import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");
const SETTINGS_ROUTE = "/vendor/profile/settings";

type VendorRow = {
  id: string;
  created_at?: string | null;

  name: string | null;
  email: string | null;
  mobile: string | null;
  landline: string | null;

  shop_name: string | null;
  address: string | null;
  location_url: string | null;

  profile_image_path: string | null;
  banner_path: string | null;
  certificate_paths: string[] | null;
  shop_image_paths: string[] | null;
  shop_video_paths: string[] | null;

  status: string | null;

  // legacy
  location?: string | null;
};

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function isHttpUrl(v: any) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

export default function VendorProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selectedVendor = useAppSelector((s) => s.vendor) as unknown as
    | VendorRow
    | null
    | undefined;

  const vendorId = selectedVendor?.id ?? null;

  const [vendor, setVendor] = useState<VendorRow | null>(
    selectedVendor ? (selectedVendor as any) : null
  );

  const [loading, setLoading] = useState(false);

  // resolved (public) urls
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [shopImageUrls, setShopImageUrls] = useState<string[]>([]);
  const [certificateUrls, setCertificateUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  // video thumbnails (generated on-device)
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});
  const [thumbLoading, setThumbLoading] = useState<Record<string, boolean>>({});

  // fullscreen viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<string>>(null);

  // video selection
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");

  const goBackToSettings = useCallback(() => {
    // If an image modal is open, close it first.
    if (viewerVisible) {
      setViewerVisible(false);
      return;
    }

    // Force the target screen regardless of the current stack/tab state.
    router.replace(SETTINGS_ROUTE);
  }, [router, viewerVisible]);

  // ✅ Hardware back: ALWAYS go to settings from this screen (modal closes first)
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (viewerVisible) {
        setViewerVisible(false);
        return true;
      }
      router.replace(SETTINGS_ROUTE);
      return true;
    });

    return () => sub.remove();
  }, [router, viewerVisible]);

  const heading = useMemo(() => {
    const shop = vendor?.shop_name?.trim();
    const owner = vendor?.name?.trim();
    if (shop && owner) return `${shop} • ${owner}`;
    return shop || owner || "Vendor Profile";
  }, [vendor]);

  const resolvePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (isHttpUrl(path)) return path;

    const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, []);

  const resolveManyPublic = useCallback(
    (paths: any): string[] => {
      const list = Array.isArray(paths) ? paths : [];
      return list
        .map((p) => resolvePublicUrl(String(p || "").trim()))
        .filter(Boolean) as string[];
    },
    [resolvePublicUrl]
  );

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

  async function fetchVendor() {
    if (!vendorId) {
      Alert.alert("No vendor selected", "Create/select a vendor first.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("vendor")
        .select(
          [
            "id",
            "created_at",
            "name",
            "email",
            "mobile",
            "landline",
            "shop_name",
            "address",
            "location_url",
            "profile_image_path",
            "banner_path",
            "certificate_paths",
            "shop_image_paths",
            "shop_video_paths",
            "status",
            "location"
          ].join(",")
        )
        .eq("id", vendorId)
        .single();

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      const row = data as VendorRow;
      setVendor(row);

      dispatch(
        setSelectedVendor({
          ...(row as any),
          image: null as any
        } as any)
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load vendor.");
    } finally {
      setLoading(false);
    }
  }

  function hydrateMedia(v: VendorRow | null) {
    if (!v) {
      setProfileUrl(null);
      setBannerUrl(null);
      setShopImageUrls([]);
      setCertificateUrls([]);
      setVideoUrls([]);
      return;
    }

    setProfileUrl(resolvePublicUrl(v.profile_image_path));
    setBannerUrl(resolvePublicUrl(v.banner_path));
    setShopImageUrls(resolveManyPublic(v.shop_image_paths));
    setCertificateUrls(resolveManyPublic(v.certificate_paths));
    setVideoUrls(resolveManyPublic(v.shop_video_paths));
  }

  useEffect(() => {
    setVendor(selectedVendor ? (selectedVendor as any) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    hydrateMedia(vendor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vendor?.id,
    vendor?.profile_image_path,
    vendor?.banner_path,
    JSON.stringify(vendor?.shop_image_paths || []),
    JSON.stringify(vendor?.certificate_paths || []),
    JSON.stringify(vendor?.shop_video_paths || [])
  ]);

  // Prefetch images
  useEffect(() => {
    [
      ...shopImageUrls,
      ...certificateUrls,
      ...(profileUrl ? [profileUrl] : []),
      ...(bannerUrl ? [bannerUrl] : [])
    ].forEach((u) => u && Image.prefetch(u));
  }, [shopImageUrls, certificateUrls, profileUrl, bannerUrl]);

  const openViewerAt = useCallback((imgs: string[], idx: number) => {
    const list = Array.isArray(imgs) ? imgs.filter(Boolean) : [];
    if (!list.length) return;

    const safeIdx = Math.max(0, Math.min(idx, list.length - 1));
    setGallery(list);
    setCurrentIndex(safeIdx);
    setViewerVisible(true);
  }, []);

  useEffect(() => {
    if (!viewerVisible) return;
    if (!gallery.length) return;

    const t = setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false
        });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [viewerVisible, currentIndex, gallery.length]);

  // video selection default
  useEffect(() => {
    if (!videoUrls.length) {
      setSelectedVideoUrl("");
      return;
    }
    if (!selectedVideoUrl || !videoUrls.includes(selectedVideoUrl)) {
      setSelectedVideoUrl(videoUrls[0]);
    }
  }, [videoUrls, selectedVideoUrl]);

  const player = useVideoPlayer(selectedVideoUrl || "");

  useEffect(() => {
    try {
      if (player) player.loop = false;
    } catch {
      // ignore
    }
  }, [player]);

  // Generate thumbnails for video tiles
  useEffect(() => {
    let cancelled = false;

    async function ensureThumb(url: string) {
      const u = String(url || "").trim();
      if (!u) return;
      if (videoThumbs[u]) return;
      if (thumbLoading[u]) return;

      setThumbLoading((prev) => ({ ...prev, [u]: true }));

      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(u, { time: 1000 });
        if (cancelled) return;

        if (uri) {
          setVideoThumbs((prev) => ({ ...prev, [u]: uri }));
          try {
            Image.prefetch(uri);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          setThumbLoading((prev) => ({ ...prev, [u]: false }));
        }
      }
    }

    const list = (videoUrls ?? []).slice(0, 12);
    (async () => {
      for (let i = 0; i < list.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await ensureThumb(list[i]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(videoUrls)]);

  const Field = ({ label, value }: { label: string; value: any }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{safeText(value)}</Text>
    </View>
  );

  const OpenLink = ({
    label,
    url
  }: {
    label: string;
    url: string | null | undefined;
  }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {!!(url || "").trim() ? (
        <Text
          style={styles.link}
          onPress={async () => {
            const u = String(url).trim();
            await openExternal(u);
          }}
          numberOfLines={1}
        >
          {String(url).trim()}
        </Text>
      ) : (
        <Text style={styles.value}>—</Text>
      )}
    </View>
  );

  const videoTiles = useMemo(() => {
    return videoUrls.map((v, idx) => ({ videoUrl: v, idx }));
  }, [videoUrls]);

  return (
    <View style={{ flex: 1, backgroundColor: stylesVars.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          {/* ✅ On-screen back also goes to Settings */}
          <Text style={styles.back} onPress={goBackToSettings}>
            ← Back
          </Text>

          <Text
            style={[styles.refresh, loading && styles.disabledText]}
            onPress={loading ? undefined : fetchVendor}
          >
            {loading ? "Loading..." : "Refresh"}
          </Text>
        </View>

        <Text style={styles.title}>{heading}</Text>

        {!vendorId && (
          <Text style={styles.hint}>
            No vendor selected. Create a vendor first.
          </Text>
        )}

        {!!loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading vendor...</Text>
          </View>
        )}

        {!!bannerUrl && (
          <Pressable
            onPress={() => openViewerAt([bannerUrl], 0)}
            style={({ pressed }) => [
              styles.bannerWrap,
              pressed ? styles.pressed : null
            ]}
          >
            <Image source={{ uri: bannerUrl }} style={styles.banner} />
          </Pressable>
        )}

        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            {!!profileUrl ? (
              <Pressable
                onPress={() => openViewerAt([profileUrl], 0)}
                style={({ pressed }) => [
                  styles.avatarPress,
                  pressed ? styles.pressed : null
                ]}
              >
                <Image source={{ uri: profileUrl }} style={styles.avatar} />
              </Pressable>
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {(vendor?.shop_name || vendor?.name || "V")
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.shopName}>{safeText(vendor?.shop_name)}</Text>
            <Text style={styles.ownerName}>{safeText(vendor?.name)}</Text>
          </View>
        </View>

        <Text style={styles.section}>Contact</Text>
        <View style={styles.card}>
          <Field label="Email" value={vendor?.email} />
          <Field label="Mobile" value={vendor?.mobile} />
          <Field label="Landline" value={vendor?.landline} />
        </View>

        <Text style={styles.section}>Address</Text>
        <View style={styles.card}>
          <Field label="Address" value={vendor?.address || vendor?.location} />
          <OpenLink label="Location URL" url={vendor?.location_url} />
        </View>

        <Text style={styles.section}>Media</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shop Images</Text>

          {shopImageUrls.length ? (
            <>
              <Text style={styles.meta}>Tap any image to view full screen.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {shopImageUrls.map((u, idx) => (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openViewerAt(shopImageUrls, idx)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      <Image source={{ uri: u }} style={styles.thumb} />
                      {idx === 0 ? (
                        <View style={styles.bannerTag}>
                          <Text style={styles.bannerTagText}>First</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Certificates</Text>

          {certificateUrls.length ? (
            <>
              <Text style={styles.meta}>
                Tap any certificate to view full screen.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {certificateUrls.map((u, idx) => (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openViewerAt(certificateUrls, idx)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      <Image source={{ uri: u }} style={styles.thumb} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shop Videos</Text>

          {videoUrls.length ? (
            <>
              {!!selectedVideoUrl && (
                <View style={styles.videoBox}>
                  <VideoView
                    player={player}
                    style={styles.video}
                    allowsFullscreen
                    allowsPictureInPicture
                  />
                </View>
              )}

              <Text style={styles.meta}>
                Tap a tile to play. Long-press to open externally.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {videoTiles.map((t) => {
                    const thumbUri = videoThumbs[t.videoUrl] || "";
                    const isOn = selectedVideoUrl === t.videoUrl;
                    const isLoading = !!thumbLoading[t.videoUrl];

                    return (
                      <Pressable
                        key={`${t.videoUrl}-${t.idx}`}
                        onPress={() => setSelectedVideoUrl(t.videoUrl)}
                        onLongPress={() => openExternal(t.videoUrl)}
                        style={({ pressed }) => [
                          styles.thumbWrap,
                          isOn ? styles.videoThumbOn : null,
                          pressed ? styles.pressed : null
                        ]}
                      >
                        {thumbUri ? (
                          <Image source={{ uri: thumbUri }} style={styles.thumb} />
                        ) : (
                          <View style={styles.videoPlaceholder}>
                            <Text style={styles.videoPlaceholderText}>
                              {isLoading ? "Loading…" : `Video ${t.idx + 1}`}
                            </Text>
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
            </>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <Text style={styles.section}>Meta</Text>
        <View style={styles.card}>
          <Field label="Vendor ID" value={vendor?.id} />
          <Field label="Created at" value={vendor?.created_at} />
        </View>
      </ScrollView>

      <Modal
        visible={viewerVisible}
        transparent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <FlatList
            ref={flatListRef}
            data={gallery}
            horizontal
            pagingEnabled
            keyExtractor={(_, i) => i.toString()}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i
            })}
            initialScrollIndex={Math.max(
              0,
              Math.min(currentIndex, Math.max(0, gallery.length - 1))
            )}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width) || 0;
              setCurrentIndex(next);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.viewerImage} />
            )}
          />

          <Pressable
            style={styles.closeButton}
            onPress={() => setViewerVisible(false)}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.indexCaption}>
            <Text style={styles.indexText}>
              {gallery.length ? currentIndex + 1 : 0} / {gallery.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const stylesVars = {
  bg: "#F5F7FB",
  cardBg: "#FFFFFF",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",
  blue: "#0B2F6B",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A",
  placeholder: "#94A3B8"
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: stylesVars.bg },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  back: {
    fontSize: 14,
    fontWeight: "900",
    color: stylesVars.blue,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  refresh: { fontSize: 14, fontWeight: "900", color: stylesVars.blue },
  disabledText: { opacity: 0.6 },

  title: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: stylesVars.blue
  },
  hint: { marginTop: 10, fontSize: 12, color: stylesVars.subText },

  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: { fontSize: 12, color: stylesVars.subText, fontWeight: "800" },

  bannerWrap: { marginTop: 12, borderRadius: 16, overflow: "hidden" },
  banner: {
    width: "100%",
    height: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border
  },

  headerCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },

  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  avatarPress: { width: "100%", height: "100%" },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarFallbackText: { fontSize: 28, fontWeight: "900", color: "#fff" },

  headerInfo: { flex: 1 },
  shopName: { fontSize: 16, fontWeight: "900", color: stylesVars.text },
  ownerName: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.subText
  },

  section: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "900",
    color: stylesVars.blue
  },

  card: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 12
  },

  row: { marginTop: 10 },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.2
  },
  value: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.text
  },
  link: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "900",
    color: stylesVars.blue,
    textDecorationLine: "underline"
  },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.blue },
  meta: { marginTop: 8, color: stylesVars.subText, fontWeight: "800" },
  empty: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },

  hRow: { flexDirection: "row", gap: 10, paddingTop: 10, paddingBottom: 4 },

  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.blueSoft
  },
  thumb: { width: "100%", height: "100%" },

  bannerTag: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(11,47,107,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  bannerTagText: { color: "#fff", fontWeight: "900", fontSize: 10 },

  videoBox: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  video: { width: "100%", height: 220 },

  videoThumbOn: { borderColor: stylesVars.blue, borderWidth: 2 },

  videoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft
  },
  videoPlaceholderText: {
    color: stylesVars.blue,
    fontWeight: "900",
    fontSize: 12
  },

  playBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(11,47,107,0.85)",
    alignItems: "center",
    justifyContent: "center"
  },
  playBadgeText: { color: "#fff", fontWeight: "900" },

  pressed: { opacity: 0.75 },

  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center"
  },
  viewerImage: { width, height: "100%", resizeMode: "contain" },

  closeButton: {
    position: "absolute",
    top: 40,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  closeText: { color: "#fff", fontSize: 20, fontWeight: "900" },

  indexCaption: {
    position: "absolute",
    bottom: 34,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  indexText: { color: "#fff", fontWeight: "900" }
});
