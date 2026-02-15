import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";

const BUCKET_VENDOR = "vendor_images";

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

export default function VendorProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // ✅ slice is flat (no selectedVendor object)
  const selectedVendor = useAppSelector((s) => s.vendor) as unknown as
    | VendorRow
    | null
    | undefined;

  const vendorId = selectedVendor?.id ?? null;

  const [vendor, setVendor] = useState<VendorRow | null>(
    selectedVendor ? (selectedVendor as any) : null
  );

  const [loading, setLoading] = useState(false);

  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [shopImageUrls, setShopImageUrls] = useState<string[]>([]);
  const [certificateUrls, setCertificateUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  const heading = useMemo(() => {
    const shop = vendor?.shop_name?.trim();
    const owner = vendor?.name?.trim();
    if (shop && owner) return `${shop} • ${owner}`;
    return shop || owner || "Vendor Profile";
  }, [vendor]);

  async function resolveUrl(path: string | null | undefined) {
    if (!path) return null;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_VENDOR)
        .createSignedUrl(path, 60 * 60);

      if (error) return null;
      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  }

  async function resolveMany(paths: string[] | null | undefined) {
    const list = (paths ?? []).filter(Boolean);
    const urls: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const u = await resolveUrl(list[i]);
      if (u) urls.push(u);
    }
    return urls;
  }

  async function openExternal(url: string) {
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert("Cannot open", url);
      return;
    }
    Linking.openURL(url);
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

  async function hydrateMedia(v: VendorRow | null) {
    if (!v) {
      setProfileUrl(null);
      setBannerUrl(null);
      setShopImageUrls([]);
      setCertificateUrls([]);
      setVideoUrls([]);
      return;
    }

    const [p, b, imgs, certs, vids] = await Promise.all([
      resolveUrl(v.profile_image_path),
      resolveUrl(v.banner_path),
      resolveMany(v.shop_image_paths),
      resolveMany(v.certificate_paths),
      resolveMany(v.shop_video_paths)
    ]);

    setProfileUrl(p);
    setBannerUrl(b);
    setShopImageUrls(imgs);
    setCertificateUrls(certs);
    setVideoUrls(vids);
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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Text style={styles.back} onPress={() => router.back()}>
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

      {!!bannerUrl && (
        <Text style={styles.tapWrap} onPress={() => openExternal(bannerUrl)}>
          <Image source={{ uri: bannerUrl }} style={styles.banner} />
        </Text>
      )}

      <View style={styles.headerCard}>
        <View style={styles.avatarWrap}>
          {!!profileUrl ? (
            <Text
              style={styles.tapWrap}
              onPress={() => openExternal(profileUrl)}
            >
              <Image source={{ uri: profileUrl }} style={styles.avatar} />
            </Text>
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
          {!!loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading vendor...</Text>
            </View>
          )}
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
        <Text style={styles.subTitle}>Shop images (tap to open)</Text>
        {!!shopImageUrls.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hRow}>
              {shopImageUrls.map((u, idx) => (
                <Text
                  key={`${u}-${idx}`}
                  style={styles.tapWrap}
                  onPress={() => openExternal(u)}
                >
                  <Image source={{ uri: u }} style={styles.thumb} />
                </Text>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.empty}>—</Text>
        )}

        <View style={styles.sep} />

        <Text style={styles.subTitle}>Certificates (tap to open)</Text>
        {!!certificateUrls.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hRow}>
              {certificateUrls.map((u, idx) => (
                <Text
                  key={`${u}-${idx}`}
                  style={styles.tapWrap}
                  onPress={() => openExternal(u)}
                >
                  <Image source={{ uri: u }} style={styles.thumb} />
                </Text>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.empty}>—</Text>
        )}

        <View style={styles.sep} />

        <Text style={styles.subTitle}>Shop videos (tap to open)</Text>
        {!!videoUrls.length ? (
          <View style={styles.videoList}>
            {videoUrls.slice(0, 10).map((u, idx) => (
              <Text
                key={`${u}-${idx}`}
                style={styles.videoLink}
                numberOfLines={1}
                onPress={() => openExternal(u)}
              >
                {idx + 1}. Open video
              </Text>
            ))}
            {videoUrls.length > 10 && (
              <Text style={styles.moreText}>+{videoUrls.length - 10} more</Text>
            )}
          </View>
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
  refresh: {
    fontSize: 14,
    fontWeight: "900",
    color: stylesVars.blue
  },
  disabledText: { opacity: 0.6 },

  title: { marginTop: 12, fontSize: 20, fontWeight: "900", color: stylesVars.blue },
  hint: { marginTop: 10, fontSize: 12, color: stylesVars.subText },

  banner: {
    width: "100%",
    height: 170,
    borderRadius: 16,
    marginTop: 12,
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

  loadingRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: { fontSize: 12, color: stylesVars.subText },

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

  subTitle: { fontSize: 12, fontWeight: "900", color: stylesVars.blue, opacity: 0.9 },
  empty: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.subText
  },

  sep: { height: 1, backgroundColor: stylesVars.borderSoft, marginVertical: 12 },

  hRow: { flexDirection: "row", gap: 10, paddingTop: 10, paddingBottom: 4 },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },

  videoList: { marginTop: 8 },
  videoLink: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "900",
    color: stylesVars.blue,
    textDecorationLine: "underline"
  },

  moreText: {
    marginTop: 10,
    fontSize: 12,
    color: stylesVars.subText,
    fontWeight: "800"
  },

  tapWrap: { color: stylesVars.text }
});
