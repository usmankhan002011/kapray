// app/(buyer)/view-profile.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { VideoView, useVideoPlayer } from "expo-video";
import { useAppDispatch } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");

type VendorRow = {
  id: number;
  created_at?: string | null;

  name?: string | null;
  shop_name?: string | null;

  email?: string | null;
  mobile?: string | null;
  landline?: string | null;

  address?: string | null;
  location?: string | null;
  location_url?: string | null;

  profile_image_path?: string | null;
  banner_path?: string | null;

  certificate_paths?: string[] | null;
  shop_image_paths?: string[] | null;
  shop_video_paths?: string[] | null;

  status?: string | null;
};

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function isHttpUrl(v: any) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function firstParam(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

export default function BuyerViewProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const vendorId = useMemo<number | null>(() => {
    const raw = firstParam((params as any)?.vendorId ?? (params as any)?.id ?? null);
    if (!raw) return null;

    try {
      const decoded = decodeURIComponent(raw).trim();
      const parsed = Number(decoded);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      const parsed = Number(String(raw).trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
  }, [params]);

  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [missingParam, setMissingParam] = useState(false);

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");

  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<string>>(null);

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

  const bannerUrl = useMemo(
    () => resolvePublicUrl(vendor?.banner_path ?? null),
    [vendor, resolvePublicUrl]
  );

  const profileUrl = useMemo(
    () => resolvePublicUrl(vendor?.profile_image_path ?? null),
    [vendor, resolvePublicUrl]
  );

  const certificateUrls = useMemo(
    () => resolveManyPublic(vendor?.certificate_paths ?? []),
    [vendor, resolveManyPublic]
  );

  const shopImageUrls = useMemo(
    () => resolveManyPublic(vendor?.shop_image_paths ?? []),
    [vendor, resolveManyPublic]
  );

  const shopVideoUrls = useMemo(
    () => resolveManyPublic(vendor?.shop_video_paths ?? []),
    [vendor, resolveManyPublic]
  );

  useEffect(() => {
    if (!shopVideoUrls.length) {
      setSelectedVideoUrl("");
      return;
    }

    if (!selectedVideoUrl || !shopVideoUrls.includes(selectedVideoUrl)) {
      setSelectedVideoUrl(shopVideoUrls[0]);
    }
  }, [shopVideoUrls, selectedVideoUrl]);

  const player = useVideoPlayer(selectedVideoUrl || "");

  useEffect(() => {
    try {
      if (player) player.loop = false;
    } catch {
      // ignore
    }
  }, [player]);

  useEffect(() => {
    [
      ...certificateUrls,
      ...shopImageUrls,
      ...(bannerUrl ? [bannerUrl] : []),
      ...(profileUrl ? [profileUrl] : [])
    ].forEach((u) => {
      if (u) {
        try {
          Image.prefetch(u);
        } catch {
          // ignore
        }
      }
    });
  }, [certificateUrls, shopImageUrls, bannerUrl, profileUrl]);

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

  const fetchVendor = useCallback(async () => {
    if (vendorId == null) {
      setMissingParam(true);
      setVendor(null);
      return;
    }

    try {
      setMissingParam(false);
      setLoading(true);

      const { data, error } = await supabase
        .from("vendor")
        .select(
          `
          id,
          created_at,
          name,
          shop_name,
          email,
          mobile,
          landline,
          address,
          location,
          location_url,
          profile_image_path,
          banner_path,
          certificate_paths,
          shop_image_paths,
          shop_video_paths,
          status
        `
        )
        .eq("id", vendorId)
        .single();

      if (error) {
        Alert.alert("Load error", error.message);
        setVendor(null);
        return;
      }

      const row = data as VendorRow;
      setVendor(row);

      const banner_url = resolvePublicUrl(row?.banner_path ?? null);

      dispatch(
        setSelectedVendor({
          id: row?.id ?? null,
          shop_name: row?.shop_name ?? null,
          owner_name: row?.name ?? null,
          name: row?.name ?? null,
          mobile: row?.mobile ?? null,
          landline: row?.landline ?? null,
          email: row?.email ?? null,
          address: row?.address ?? null,
          location: row?.location ?? null,
          location_url: row?.location_url ?? null,
          profile_image_path: row?.profile_image_path ?? null,
          banner_path: row?.banner_path ?? null,
          banner_url: banner_url ?? null,
          government_permission_url: null,
          images: row?.shop_image_paths ?? null,
          videos: row?.shop_video_paths ?? null,
          status: row?.status ?? null
        } as any)
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load vendor.");
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [vendorId, dispatch, resolvePublicUrl]);

  useFocusEffect(
    useCallback(() => {
      fetchVendor();
    }, [fetchVendor])
  );

  const Field = ({ label, value }: { label: string; value: any }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{safeText(value)}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Vendor Profile</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.linkText}>Close</Text>
          </Pressable>
        </View>

        {missingParam ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Missing vendorId</Text>
            <Text style={styles.meta} selectable>
              Open this screen with:
              {"\n"}• /(buyer)/view-profile?vendorId=15
            </Text>
          </View>
        ) : null}

        {!!loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading vendor...</Text>
          </View>
        )}

        {!!bannerUrl ? (
          <Pressable
            onPress={() => openViewerAt([bannerUrl], 0)}
            style={({ pressed }) => [styles.mediaBlock, pressed ? styles.pressed : null]}
          >
            <View style={styles.heroWrap}>
              <Image source={{ uri: bannerUrl }} style={styles.heroImage} />
            </View>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              {profileUrl ? (
                <Pressable
                  onPress={() => openViewerAt([profileUrl], 0)}
                  style={({ pressed }) => [styles.avatarPress, pressed ? styles.pressed : null]}
                >
                  <Image source={{ uri: profileUrl }} style={styles.avatarImg} />
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
              <Text style={styles.nameText} numberOfLines={1}>
                {safeText(vendor?.name)}
              </Text>
              <Text style={styles.shopText} numberOfLines={1}>
                {safeText(vendor?.shop_name)}
              </Text>
              <Text style={styles.statusText} numberOfLines={1}>
                Status: {safeText(vendor?.status)}
              </Text>
            </View>
          </View>

          <Field label="Mobile" value={vendor?.mobile} />
          <Field label="Landline" value={vendor?.landline} />
          <Field label="Email" value={vendor?.email} />
          <Field label="Address" value={vendor?.address} />

          {!!String(vendor?.location_url ?? "").trim() ? (
            <Pressable
              onPress={() => openExternal(String(vendor?.location_url))}
              style={({ pressed }) => [styles.linkBtnInline, pressed ? styles.pressed : null]}
            >
              <Text style={styles.linkText}>Open Location</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Certificates</Text>
          {certificateUrls.length ? (
            <>
              <Text style={styles.meta}>Tap any certificate to view full screen.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {certificateUrls.map((u, idx) => (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openViewerAt(certificateUrls, idx)}
                      style={({ pressed }) => [styles.thumbWrap, pressed ? styles.pressed : null]}
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
          <Text style={styles.sectionTitle}>Shop Images</Text>
          {shopImageUrls.length ? (
            <>
              <Text style={styles.meta}>Tap any image to view full screen.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {shopImageUrls.map((u, idx) => (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openViewerAt(shopImageUrls, idx)}
                      style={({ pressed }) => [styles.thumbWrap, pressed ? styles.pressed : null]}
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

          {shopVideoUrls.length ? (
            <>
              {!!selectedVideoUrl ? (
                <View style={styles.videoBox}>
                  <VideoView
                    player={player}
                    style={styles.video}
                    allowsFullscreen
                    allowsPictureInPicture
                  />
                </View>
              ) : null}

              <Text style={styles.meta}>
                Tap a thumbnail to play. Long-press to open externally.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {shopVideoUrls.map((v, idx) => (
                    <Pressable
                      key={`${v}-${idx}`}
                      onPress={() => setSelectedVideoUrl(v)}
                      onLongPress={() => openExternal(v)}
                      style={({ pressed }) => [
                        styles.videoThumb,
                        selectedVideoUrl === v ? styles.videoThumbOn : null,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      <Text style={styles.videoThumbText}>Video {idx + 1}</Text>
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
          <Text style={styles.sectionTitle}>Meta</Text>
          <Field label="Vendor ID" value={vendor?.id} />
          <Field label="Created at" value={vendor?.created_at} />
        </View>
      </ScrollView>

      <Modal visible={viewerVisible} transparent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerContainer}>
          <FlatList
            ref={flatListRef}
            data={gallery}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
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
              <View style={styles.viewerSlide}>
                <Image source={{ uri: item }} style={styles.viewerImage} />
              </View>
            )}
          />

          <Pressable style={styles.closeButton} onPress={() => setViewerVisible(false)}>
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
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
  black: "#000000"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: stylesVars.bg
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text
  },

  linkBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  linkBtnInline: {
    marginTop: 10,
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  linkText: {
    color: stylesVars.blue,
    fontSize: 14,
    fontWeight: "700"
  },

  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },

  loadingText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600"
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
    marginBottom: 2
  },

  meta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  row: {
    marginTop: 10
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.text,
    letterSpacing: 0.2
  },

  value: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: stylesVars.text
  },

  mediaBlock: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    overflow: "hidden"
  },

  heroWrap: {
    width: "100%",
    backgroundColor: stylesVars.cardBg
  },

  heroImage: {
    width: "100%",
    height: 230,
    resizeMode: "cover",
    backgroundColor: "#F1F5F9"
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },

  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg
  },

  avatarPress: {
    width: "100%",
    height: "100%"
  },

  avatarImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },

  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center"
  },

  avatarFallbackText: {
    fontSize: 28,
    fontWeight: "700",
    color: stylesVars.white
  },

  headerInfo: {
    flex: 1
  },

  nameText: {
    fontSize: 16,
    fontWeight: "700",
    color: stylesVars.text
  },

  shopText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    color: stylesVars.mutedText
  },

  statusText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.mutedText
  },

  thumbRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4
  },

  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg
  },

  thumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9"
  },

  empty: {
    marginTop: 10,
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  videoBox: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg
  },

  video: {
    width: "100%",
    height: 220
  },

  videoThumb: {
    width: 110,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    alignItems: "center",
    justifyContent: "center"
  },

  videoThumbOn: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft
  },

  videoThumbText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12
  },

  pressed: {
    opacity: 0.82
  },

  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center"
  },

  viewerSlide: {
    width,
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },

  viewerImage: {
    width,
    height: "100%",
    resizeMode: "contain"
  },

  closeButton: {
    position: "absolute",
    top: 40,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: stylesVars.overlaySoft,
    alignItems: "center",
    justifyContent: "center"
  },

  closeText: {
    color: stylesVars.white,
    fontSize: 20,
    fontWeight: "900"
  },

  indexCaption: {
    position: "absolute",
    bottom: 34,
    alignSelf: "center",
    backgroundColor: stylesVars.overlaySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },

  indexText: {
    color: stylesVars.white,
    fontWeight: "900",
    fontSize: 14
  }
});