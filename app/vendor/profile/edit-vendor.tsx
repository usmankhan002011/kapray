// C:\DEV\kapray\kapray\app\vendor\profile\edit-vendor.tsx
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
  TextInput,
  View,
  Dimensions,
  BackHandler
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { optionStyles } from "@/components/ui/StandardFilterDisplay";
import * as Location from "expo-location";
import * as VideoThumbnails from "expo-video-thumbnails";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");
const SETTINGS_ROUTE = "/vendor/profile/settings";

type Picked = { uri: string; mimeType?: string; fileName?: string };

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

function prettyNameFromPicked(p: Picked, fallback: string) {
  if (p.fileName && p.fileName.trim()) return p.fileName.trim();
  const parts = (p.uri || "").split("/");
  const last = parts[parts.length - 1];
  return last || fallback;
}

function isHttpUrl(v: any) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

async function pickImages(multiple: boolean) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission denied", "Allow gallery access.");
    return [] as Picked[];
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"] as any,
    allowsMultipleSelection: multiple,
    quality: 0.85
  });
  if (res.canceled) return [] as Picked[];
  return (res.assets ?? []).map((a: any) => ({
    uri: a.uri,
    mimeType: a.mimeType,
    fileName: a.fileName
  })) as Picked[];
}

async function pickVideos(multiple: boolean) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission denied", "Allow gallery access.");
    return [] as Picked[];
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"] as any,
    allowsMultipleSelection: multiple
  });
  if (res.canceled) return [] as Picked[];
  return (res.assets ?? []).map((a: any) => ({
    uri: a.uri,
    mimeType: a.mimeType,
    fileName: a.fileName
  })) as Picked[];
}

async function uploadToBucket(
  bucket: string,
  path: string,
  file: Picked,
  fallbackContentType: string
): Promise<string | null> {
  try {
    const contentType = file.mimeType || fallbackContentType;

    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64
    });
    const buffer = decode(base64);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (error) {
      Alert.alert("Upload failed", error.message);
      return null;
    }

    return data?.path ?? null;
  } catch (e: any) {
    Alert.alert("Upload error", e?.message ?? String(e));
    return null;
  }
}

export default function EditVendorScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selectedVendor = useAppSelector((s) => s.vendor) as unknown as
    | VendorRow
    | null
    | undefined;

  const vendorId = selectedVendor?.id ?? null;

  // Prefill from selected vendor
  const [shopName, setShopName] = useState(selectedVendor?.shop_name ?? "");
  const [ownerName, setOwnerName] = useState(selectedVendor?.name ?? "");
  const [email, setEmail] = useState(selectedVendor?.email ?? "");
  const [mobile, setMobile] = useState(selectedVendor?.mobile ?? "");
  const [landline, setLandline] = useState(selectedVendor?.landline ?? "");
  const [address, setAddress] = useState(
    (selectedVendor?.address ?? selectedVendor?.location ?? "") as any
  );
  const [locationUrl, setLocationUrl] = useState(
    selectedVendor?.location_url ?? ""
  );

  // Media: keep existing paths unless user picks new ones
  const existingProfilePath = selectedVendor?.profile_image_path ?? null;
  const existingBannerPath = selectedVendor?.banner_path ?? null;
  const existingCertPaths = selectedVendor?.certificate_paths ?? null;
  const existingShopImagePaths = selectedVendor?.shop_image_paths ?? null;
  const existingShopVideoPaths = selectedVendor?.shop_video_paths ?? null;

  const [profile, setProfile] = useState<Picked | null>(null);
  const [banner, setBanner] = useState<Picked | null>(null);

  // Allow multiple certificates now
  const [certificates, setCertificates] = useState<Picked[]>([]);
  const [images, setImages] = useState<Picked[]>([]);
  const [videos, setVideos] = useState<Picked[]>([]);

  const [saving, setSaving] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const goToSettings = useCallback(() => {
    router.replace(SETTINGS_ROUTE);
  }, [router]);

  // Existing resolved URLs (for previous media)
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

  const existingProfileUrl = useMemo(
    () => resolvePublicUrl(existingProfilePath),
    [resolvePublicUrl, existingProfilePath]
  );
  const existingBannerUrl = useMemo(
    () => resolvePublicUrl(existingBannerPath),
    [resolvePublicUrl, existingBannerPath]
  );
  const existingCertUrls = useMemo(
    () => resolveManyPublic(existingCertPaths),
    [resolveManyPublic, existingCertPaths]
  );
  const existingShopImageUrls = useMemo(
    () => resolveManyPublic(existingShopImagePaths),
    [resolveManyPublic, existingShopImagePaths]
  );
  const existingShopVideoUrls = useMemo(
    () => resolveManyPublic(existingShopVideoPaths),
    [resolveManyPublic, existingShopVideoPaths]
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

  // Fullscreen viewer (images only, for existing + picked)
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<string>>(null);

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

  // ✅ Ensure BOTH header back + Android hardware back always go to Settings
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (viewerVisible) {
        setViewerVisible(false);
        return true;
      }
      goToSettings();
      return true;
    });

    return () => sub.remove();
  }, [goToSettings, viewerVisible]);

  // Video thumbnails (existing + picked)
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});
  const [thumbLoading, setThumbLoading] = useState<Record<string, boolean>>({});

  const ensureVideoThumb = useCallback(
    async (urlOrUri: string) => {
      const u = String(urlOrUri || "").trim();
      if (!u) return;

      if (videoThumbs[u]) return;
      if (thumbLoading[u]) return;

      setThumbLoading((prev) => ({ ...prev, [u]: true }));

      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(u, { time: 1000 });
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
        setThumbLoading((prev) => ({ ...prev, [u]: false }));
      }
    },
    [thumbLoading, videoThumbs]
  );

  useEffect(() => {
    // generate thumbs for existing videos (first 12)
    const list = (existingShopVideoUrls ?? []).slice(0, 12);
    let cancelled = false;

    (async () => {
      for (let i = 0; i < list.length; i++) {
        if (cancelled) return;
        // eslint-disable-next-line no-await-in-loop
        await ensureVideoThumb(list[i]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureVideoThumb, JSON.stringify(existingShopVideoUrls)]);

  useEffect(() => {
    // generate thumbs for picked videos (first 12)
    const list = (videos ?? []).slice(0, 12).map((v) => v.uri);
    let cancelled = false;

    (async () => {
      for (let i = 0; i < list.length; i++) {
        if (cancelled) return;
        // eslint-disable-next-line no-await-in-loop
        await ensureVideoThumb(list[i]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureVideoThumb, JSON.stringify((videos ?? []).map((v) => v.uri))]);

  // Compact UI: tap to expand each input (create-shop pattern)
  const [openOwner, setOpenOwner] = useState(true);
  const [openEmail, setOpenEmail] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [openShop, setOpenShop] = useState(false);
  const [openLandline, setOpenLandline] = useState(false);
  const [openAddress, setOpenAddress] = useState(false);
  const [openLocation, setOpenLocation] = useState(false);

  const ownerRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const shopRef = useRef<TextInput>(null);
  const landlineRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const locationRef = useRef<TextInput>(null);

  const focusSoon = (ref: React.RefObject<TextInput>) => {
    setTimeout(() => ref.current?.focus(), 50);
  };

  const openAndFocusOwner = () => {
    if (!openOwner) setOpenOwner(true);
    focusSoon(ownerRef);
  };
  const openAndFocusEmail = () => {
    if (!openEmail) setOpenEmail(true);
    focusSoon(emailRef);
  };
  const openAndFocusMobile = () => {
    if (!openMobile) setOpenMobile(true);
    focusSoon(mobileRef);
  };
  const openAndFocusShop = () => {
    if (!openShop) setOpenShop(true);
    focusSoon(shopRef);
  };
  const openAndFocusLandline = () => {
    if (!openLandline) setOpenLandline(true);
    focusSoon(landlineRef);
  };
  const openAndFocusAddress = () => {
    if (!openAddress) setOpenAddress(true);
    focusSoon(addressRef);
  };
  const openAndFocusLocation = () => {
    if (!openLocation) setOpenLocation(true);
    focusSoon(locationRef);
  };

  const canSubmit = useMemo(() => {
    return (
      !!vendorId &&
      shopName.trim().length > 0 &&
      ownerName.trim().length > 0 &&
      email.trim().length > 0 &&
      mobile.trim().length > 0 &&
      address.trim().length > 0 &&
      !saving
    );
  }, [vendorId, shopName, ownerName, email, mobile, address, saving]);

  const FieldHeader = ({
    label,
    onPress
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <Text style={styles.fieldBtnBlue} onPress={onPress}>
      {label}
    </Text>
  );

  const setCurrentLocation = async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Enable location to autofill.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      setLocationUrl(`https://maps.google.com/?q=${lat},${lng}`);
      openAndFocusLocation();
    } catch (e: any) {
      Alert.alert("Location Error", e?.message ?? "Could not get location.");
    } finally {
      setLocLoading(false);
    }
  };

  async function submit() {
    if (!vendorId) {
      Alert.alert("No vendor selected", "Please open a vendor profile first.");
      return;
    }

    if (!canSubmit) {
      Alert.alert("Missing", "Fill required fields.");
      return;
    }

    setSaving(true);

    const ts = Date.now();

    const profilePath = profile
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendorId}/profile/${ts}-${profile.fileName || "profile"}`,
          profile,
          "image/jpeg"
        )
      : existingProfilePath;

    const bannerPath = banner
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendorId}/banner/${ts}-${banner.fileName || "banner"}`,
          banner,
          "image/jpeg"
        )
      : existingBannerPath;

    let certificate_paths: string[] | null = existingCertPaths;
    if (certificates.length) {
      const certPaths: string[] = [];
      for (let i = 0; i < certificates.length; i++) {
        const p = await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendorId}/certificates/${ts}-${i}-${certificates[i].fileName || "file"}`,
          certificates[i],
          "image/jpeg"
        );
        if (p) certPaths.push(p);
      }
      certificate_paths = certPaths.length ? certPaths : null;
    }

    let shop_image_paths: string[] | null = existingShopImagePaths;
    if (images.length) {
      const imagePaths: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const p = await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendorId}/shop-images/${ts}-${i}-${images[i].fileName || "image"}`,
          images[i],
          "image/jpeg"
        );
        if (p) imagePaths.push(p);
      }
      shop_image_paths = imagePaths.length ? imagePaths : null;
    }

    let shop_video_paths: string[] | null = existingShopVideoPaths;
    if (videos.length) {
      const videoPaths: string[] = [];
      for (let i = 0; i < videos.length; i++) {
        const p = await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendorId}/shop-videos/${ts}-${i}-${videos[i].fileName || "video"}`,
          videos[i],
          "video/mp4"
        );
        if (p) videoPaths.push(p);
      }
      shop_video_paths = videoPaths.length ? videoPaths : null;
    }

    const updatePayload = {
      name: ownerName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      landline: landline.trim() || null,

      shop_name: shopName.trim(),
      address: address.trim(),
      location_url: locationUrl.trim() || null,

      location: address.trim(),

      profile_image_path: profilePath,
      banner_path: bannerPath,
      certificate_paths,
      shop_image_paths,
      shop_video_paths
    };

    const { data, error } = await supabase
      .from("vendor")
      .update(updatePayload)
      .eq("id", vendorId)
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
      .single();

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    const row = data as VendorRow;

    dispatch(
      setSelectedVendor({
        ...(row as any),
        image: null as any
      } as any)
    );

    Alert.alert("Saved", "Vendor updated successfully.");
    goToSettings();
  }

  if (!vendorId) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Vendor</Text>
        <View style={styles.card}>
          <Text style={styles.meta}>
            No vendor selected. Open the vendor profile first.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const showSetCurrentLocation = (locationUrl || "").trim().length === 0;

  // Existing display lists (images only) for viewer
  const existingProfileBannerGallery = useMemo(() => {
    const list: string[] = [];
    if (existingProfileUrl) list.push(existingProfileUrl);
    if (existingBannerUrl) list.push(existingBannerUrl);
    return list;
  }, [existingProfileUrl, existingBannerUrl]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.backBtn} onPress={goToSettings}>
            ← Back
          </Text>
          <Text style={styles.title}>Edit Vendor</Text>
        </View>

        <FieldHeader label="Vendor / owner name *" onPress={openAndFocusOwner} />
        {openOwner && (
          <View style={optionStyles.card}>
            <TextInput
              ref={ownerRef}
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
              placeholder="Enter name"
              placeholderTextColor="#777"
            />
          </View>
        )}

        <FieldHeader label="Email *" onPress={openAndFocusEmail} />
        {openEmail && (
          <View style={optionStyles.card}>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter email"
              placeholderTextColor="#777"
            />
          </View>
        )}

        <FieldHeader label="Mobile *" onPress={openAndFocusMobile} />
        {openMobile && (
          <View style={optionStyles.card}>
            <TextInput
              ref={mobileRef}
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              placeholder="Enter mobile"
              placeholderTextColor="#777"
            />
          </View>
        )}

        <FieldHeader label="Shop name *" onPress={openAndFocusShop} />
        {openShop && (
          <View style={optionStyles.card}>
            <TextInput
              ref={shopRef}
              style={styles.input}
              value={shopName}
              onChangeText={setShopName}
              autoCapitalize="words"
              placeholder="Enter shop name"
              placeholderTextColor="#777"
            />
          </View>
        )}

        <FieldHeader label="Landline" onPress={openAndFocusLandline} />
        {openLandline && (
          <View style={optionStyles.card}>
            <TextInput
              ref={landlineRef}
              style={styles.input}
              value={landline}
              onChangeText={setLandline}
              keyboardType="phone-pad"
              placeholder="Enter landline (optional)"
              placeholderTextColor="#777"
            />
          </View>
        )}

        <FieldHeader label="Address *" onPress={openAndFocusAddress} />
        {openAddress && (
          <View style={optionStyles.card}>
            <TextInput
              ref={addressRef}
              style={[styles.input, styles.multi]}
              value={address}
              onChangeText={setAddress}
              multiline
              placeholder="Enter address"
              placeholderTextColor="#777"
            />
          </View>
        )}

        <FieldHeader label="Location URL" onPress={openAndFocusLocation} />
        {openLocation && (
          <View style={optionStyles.card}>
            <TextInput
              ref={locationRef}
              style={styles.input}
              value={locationUrl}
              onChangeText={setLocationUrl}
              keyboardType="url"
              autoCapitalize="none"
              placeholder="Optional"
              placeholderTextColor="#777"
            />
          </View>
        )}

        {showSetCurrentLocation && (
          <>
            <Text style={styles.orText}>-----OR------</Text>
            <Text
              style={[styles.blueBtn, locLoading && styles.disabledText]}
              onPress={locLoading ? undefined : setCurrentLocation}
            >
              {locLoading ? "Setting current location..." : "Set current location"}
            </Text>
          </>
        )}

        {/* MEDIA */}
        <Text style={styles.section}>Media</Text>

        {/* Existing Media Preview */}
        <View style={styles.existingBox}>
          <Text style={styles.existingTitle}>Existing Media</Text>
          <Text style={styles.meta}>
            Tap image thumbnails to view full screen. Tap video thumbnails to open.
          </Text>

          <Text style={styles.subHead}>Profile / Logo</Text>
          {existingProfileUrl ? (
            <Pressable
              onPress={() => openViewerAt([existingProfileUrl], 0)}
              style={({ pressed }) => [
                styles.previewWrap,
                pressed ? styles.pressed : null
              ]}
            >
              <Image source={{ uri: existingProfileUrl }} style={styles.previewImg} />
            </Pressable>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}

          <Text style={styles.subHead}>Shop Banner</Text>
          {existingBannerUrl ? (
            <Pressable
              onPress={() => openViewerAt([existingBannerUrl], 0)}
              style={({ pressed }) => [
                styles.previewWrap,
                pressed ? styles.pressed : null
              ]}
            >
              <Image source={{ uri: existingBannerUrl }} style={styles.previewImg} />
            </Pressable>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}

          <Text style={styles.subHead}>Certificates</Text>
          {existingCertUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {existingCertUrls.map((u, idx) => (
                  <Pressable
                    key={`${u}-${idx}`}
                    onPress={() => openViewerAt(existingCertUrls, idx)}
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
          ) : (
            <Text style={styles.empty}>—</Text>
          )}

          <Text style={styles.subHead}>Shop Images</Text>
          {existingShopImageUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {existingShopImageUrls.map((u, idx) => (
                  <Pressable
                    key={`${u}-${idx}`}
                    onPress={() => openViewerAt(existingShopImageUrls, idx)}
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
          ) : (
            <Text style={styles.empty}>—</Text>
          )}

          <Text style={styles.subHead}>Shop Videos</Text>
          {existingShopVideoUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {existingShopVideoUrls.map((u, idx) => {
                  const t = videoThumbs[u] || "";
                  const loadingThumb = !!thumbLoading[u];

                  return (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openExternal(u)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      {t ? (
                        <Image source={{ uri: t }} style={styles.thumb} />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.videoPlaceholderText}>
                            {loadingThumb ? "Loading…" : `Video ${idx + 1}`}
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
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        {/* Pick / Replace Media */}
        <Text
          style={styles.blueBtn}
          onPress={async () => setProfile((await pickImages(false))[0] ?? null)}
        >
          Update profile / logo
        </Text>
        {!!profile?.uri && (
          <Pressable
            onPress={() => openViewerAt([profile.uri], 0)}
            style={({ pressed }) => [
              styles.previewWrap,
              pressed ? styles.pressed : null
            ]}
          >
            <Image source={{ uri: profile.uri }} style={styles.previewImg} />
          </Pressable>
        )}

        <Text
          style={styles.blueBtn}
          onPress={async () => setCertificates(await pickImages(true))}
        >
          Update authorities permission (certificates)
        </Text>
        {!!certificates.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hRow}>
              {certificates.map((it, idx) => (
                <Pressable
                  key={`${it.uri}-${idx}`}
                  onPress={() => openViewerAt(certificates.map((c) => c.uri), idx)}
                  style={({ pressed }) => [
                    styles.thumbWrap,
                    pressed ? styles.pressed : null
                  ]}
                >
                  <Image source={{ uri: it.uri }} style={styles.thumb} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        <Text
          style={styles.blueBtn}
          onPress={async () => setBanner((await pickImages(false))[0] ?? null)}
        >
          Update shop banner
        </Text>
        {!!banner?.uri && (
          <Pressable
            onPress={() => openViewerAt([banner.uri], 0)}
            style={({ pressed }) => [
              styles.previewWrap,
              pressed ? styles.pressed : null
            ]}
          >
            <Image source={{ uri: banner.uri }} style={styles.previewImg} />
          </Pressable>
        )}

        <Text
          style={styles.blueBtn}
          onPress={async () => setImages(await pickImages(true))}
        >
          Update shop images
        </Text>
        {!!images.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hRow}>
              {images.map((it, idx) => (
                <Pressable
                  key={`${it.uri}-${idx}`}
                  onPress={() => openViewerAt(images.map((x) => x.uri), idx)}
                  style={({ pressed }) => [
                    styles.thumbWrap,
                    pressed ? styles.pressed : null
                  ]}
                >
                  <Image source={{ uri: it.uri }} style={styles.thumb} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        <Text
          style={styles.blueBtn}
          onPress={async () => setVideos(await pickVideos(true))}
        >
          Update shop videos
        </Text>
        {!!videos.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hRow}>
              {videos.map((v, idx) => {
                const key = v.uri;
                const t = videoThumbs[key] || "";
                const loadingThumb = !!thumbLoading[key];

                return (
                  <Pressable
                    key={`${v.uri}-${idx}`}
                    onPress={() => openExternal(v.uri)}
                    style={({ pressed }) => [
                      styles.thumbWrap,
                      pressed ? styles.pressed : null
                    ]}
                  >
                    {t ? (
                      <Image source={{ uri: t }} style={styles.thumb} />
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Text style={styles.videoPlaceholderText}>
                          {loadingThumb ? "Loading…" : `Video ${idx + 1}`}
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
        )}

        <Text
          style={[styles.submitBtn, !canSubmit && styles.disabledBtn]}
          onPress={canSubmit ? submit : undefined}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Text>

        <Text style={styles.meta}>
          Note: If you don’t pick new media, existing media stays unchanged.
        </Text>
      </ScrollView>

      {/* Fullscreen Viewer (images only) */}
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

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  backBtn: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0B2F6B",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#EAF2FF",
    borderWidth: 1,
    borderColor: "#D9E2F2"
  },

  title: { fontSize: 20, fontWeight: "700", color: "#111" },

  section: { marginTop: 18, fontSize: 16, fontWeight: "900", color: "#111" },

  fieldBtnBlue: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#005ea6"
  },

  input: { fontSize: 16, color: "#111" },
  multi: { minHeight: 90, textAlignVertical: "top" },

  blueBtn: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "800",
    color: "#005ea6"
  },
  disabledText: { opacity: 0.6 },

  orText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
    color: "#111",
    opacity: 0.75
  },

  meta: { marginTop: 10, fontSize: 12, color: "#111", opacity: 0.7 },

  card: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    padding: 14
  },

  existingBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    padding: 12,
    backgroundColor: "#fafafa"
  },
  existingTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  subHead: { marginTop: 12, fontSize: 12, fontWeight: "900", color: "#0B2F6B" },
  empty: { marginTop: 8, fontSize: 13, fontWeight: "800", color: "#60708A" },

  previewWrap: { marginTop: 10, borderRadius: 10, overflow: "hidden" },
  previewImg: { width: "100%", height: 160 },

  hRow: { flexDirection: "row", gap: 10, paddingTop: 10, paddingBottom: 4 },

  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D9E2F2",
    backgroundColor: "#EAF2FF"
  },
  thumb: { width: "100%", height: "100%" },

  // video tile fallback + play badge
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF"
  },
  videoPlaceholderText: { color: "#0B2F6B", fontWeight: "900", fontSize: 12 },

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

  submitBtn: {
    marginTop: 18,
    backgroundColor: "#0b2f6b",
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    overflow: "hidden",
    textAlign: "center"
  },
  disabledBtn: { opacity: 0.5 },

  // fullscreen viewer
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
