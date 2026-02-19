// app/(buyer)/view-profile.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
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
  id: string | number;
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

  const vendorId = useMemo(() => {
    const raw = firstParam((params as any)?.vendorId ?? (params as any)?.id ?? null);
    return raw ? decodeURIComponent(raw) : null;
  }, [params]);

  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [missingParam, setMissingParam] = useState(false);

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

  const bannerUrl = useMemo(() => resolvePublicUrl(vendor?.banner_path ?? null), [vendor, resolvePublicUrl]);
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

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");
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
    if (!vendorId) {
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

      // OPTIONAL (safe): populate selected vendor in redux for downstream flows (purchase, etc.)
      const banner_url = resolvePublicUrl(row?.banner_path ?? null);
      dispatch(
        setSelectedVendor({
          shop_name: row?.shop_name ?? null,
          owner_name: row?.name ?? null,

          mobile: row?.mobile ?? null,
          landline: row?.landline ?? null,

          address: row?.address ?? null,
          location_url: row?.location_url ?? null,

          banner_url: banner_url ?? null,

          government_permission_url: null,
          images: null,
          videos: null,

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
    <View style={{ flex: 1, backgroundColor: stylesVars.bg }}>
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
          <View style={styles.bannerWrap}>
            <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              {profileUrl ? <Image source={{ uri: profileUrl }} style={styles.avatarImg} /> : null}
            </View>

            <View style={{ flex: 1 }}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {certificateUrls.map((u, idx) => (
                  <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                    <Image source={{ uri: u }} style={styles.thumb} />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shop Images</Text>
          {shopImageUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {shopImageUrls.map((u, idx) => (
                  <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                    <Image source={{ uri: u }} style={styles.thumb} />
                  </View>
                ))}
              </View>
            </ScrollView>
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

              <Text style={styles.meta}>Tap a thumbnail to play. Long-press to open externally.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
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
  subText: "#60708A"
};

const styles = StyleSheet.create({
  content: { padding: 16, backgroundColor: stylesVars.bg },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  linkBtnInline: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  linkText: { color: stylesVars.blue, fontWeight: "900" },

  loadingRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 12, color: stylesVars.subText, fontWeight: "800" },

  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 14
  },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.blue },
  meta: { marginTop: 6, fontSize: 12, color: stylesVars.subText, fontWeight: "800" },

  row: { marginTop: 10 },
  label: { fontSize: 12, fontWeight: "900", color: stylesVars.blue, letterSpacing: 0.2 },
  value: { marginTop: 4, fontSize: 14, fontWeight: "800", color: stylesVars.text },

  bannerWrap: {
    marginTop: 14,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#fff"
  },
  bannerImage: { width: "100%", height: 190, resizeMode: "cover" },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#fff"
  },
  avatarImg: { width: "100%", height: "100%", resizeMode: "cover" },

  nameText: { fontSize: 16, fontWeight: "900", color: stylesVars.text },
  shopText: { marginTop: 2, fontSize: 13, fontWeight: "800", color: stylesVars.subText },
  statusText: { marginTop: 4, fontSize: 12, fontWeight: "800", color: stylesVars.subText },

  hRow: { flexDirection: "row", gap: 10, paddingTop: 10, paddingBottom: 4 },
  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#fff"
  },
  thumb: { width: "100%", height: "100%", backgroundColor: "#f3f3f3" },

  empty: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },

  videoBox: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#fff"
  },
  video: { width: "100%", height: 210 },

  videoThumb: {
    width: 110,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  videoThumbOn: { borderColor: stylesVars.blue, borderWidth: 2 },
  videoThumbText: { color: stylesVars.blue, fontWeight: "900", fontSize: 12 },

  pressed: { opacity: 0.75 }
});
