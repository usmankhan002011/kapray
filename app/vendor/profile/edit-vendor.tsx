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
  BackHandler,
  ActivityIndicator
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
import { VideoView, useVideoPlayer } from "expo-video";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");
const SETTINGS_ROUTE = "/vendor/profile/settings";

type Picked = { uri: string; mimeType?: string; fileName?: string };

type VendorRow = {
  id: number;
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

  // ✅ NEW: vendor-wide tailoring offering
  offers_tailoring?: boolean | null;

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

function extFromUri(uri: string) {
  const clean = String(uri || "");
  const qIdx = clean.indexOf("?");
  const base = qIdx >= 0 ? clean.slice(0, qIdx) : clean;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

function guessContentTypeFromExt(ext: string) {
  const e = String(ext || "").toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "heic") return "image/heic";
  if (e === "mp4") return "video/mp4";
  if (e === "mov") return "video/quicktime";
  if (e === "m4v") return "video/x-m4v";
  return "application/octet-stream";
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
      .upload(path, buffer, { contentType, upsert: false });

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
  const [locationUrl, setLocationUrl] = useState(selectedVendor?.location_url ?? "");

  // ✅ NEW: Vendor-wide tailoring offering
  const [offersTailoring, setOffersTailoring] = useState<boolean>(
    Boolean((selectedVendor as any)?.offers_tailoring)
  );

  // ✅ Media (editable like update-product: add/remove single items)
  const [profilePath, setProfilePath] = useState<string | null>(
    selectedVendor?.profile_image_path ?? null
  );
  const [bannerPath, setBannerPath] = useState<string | null>(
    selectedVendor?.banner_path ?? null
  );
  const [certificatePaths, setCertificatePaths] = useState<string[]>(
    Array.isArray(selectedVendor?.certificate_paths) ? selectedVendor!.certificate_paths! : []
  );
  const [shopImagePaths, setShopImagePaths] = useState<string[]>(
    Array.isArray(selectedVendor?.shop_image_paths) ? selectedVendor!.shop_image_paths! : []
  );
  const [shopVideoPaths, setShopVideoPaths] = useState<string[]>(
    Array.isArray(selectedVendor?.shop_video_paths) ? selectedVendor!.shop_video_paths! : []
  );

  // Keep state in sync if redux vendor changes
  useEffect(() => {
    setShopName(selectedVendor?.shop_name ?? "");
    setOwnerName(selectedVendor?.name ?? "");
    setEmail(selectedVendor?.email ?? "");
    setMobile(selectedVendor?.mobile ?? "");
    setLandline(selectedVendor?.landline ?? "");
    setAddress((selectedVendor?.address ?? selectedVendor?.location ?? "") as any);
    setLocationUrl(selectedVendor?.location_url ?? "");
    setOffersTailoring(Boolean((selectedVendor as any)?.offers_tailoring));

    setProfilePath(selectedVendor?.profile_image_path ?? null);
    setBannerPath(selectedVendor?.banner_path ?? null);
    setCertificatePaths(
      Array.isArray(selectedVendor?.certificate_paths) ? selectedVendor!.certificate_paths! : []
    );
    setShopImagePaths(
      Array.isArray(selectedVendor?.shop_image_paths) ? selectedVendor!.shop_image_paths! : []
    );
    setShopVideoPaths(
      Array.isArray(selectedVendor?.shop_video_paths) ? selectedVendor!.shop_video_paths! : []
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const [saving, setSaving] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
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

  const profileUrl = useMemo(() => resolvePublicUrl(profilePath), [resolvePublicUrl, profilePath]);
  const bannerUrl = useMemo(() => resolvePublicUrl(bannerPath), [resolvePublicUrl, bannerPath]);

  const certificateUrls = useMemo(
    () => (certificatePaths ?? []).map((p) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [certificatePaths, resolvePublicUrl]
  );
  const shopImageUrls = useMemo(
    () => (shopImagePaths ?? []).map((p) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [shopImagePaths, resolvePublicUrl]
  );
  const shopVideoUrls = useMemo(
    () => (shopVideoPaths ?? []).map((p) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [shopVideoPaths, resolvePublicUrl]
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

  // Video thumbnails (existing, no limit)
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
    // generate thumbs for all existing videos (sequential)
    const list = (shopVideoUrls ?? []).filter(Boolean);
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
  }, [ensureVideoThumb, JSON.stringify(shopVideoUrls)]);

  // ✅ NEW: Play videos like View Profile (embedded player + selectable tiles)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");

  useEffect(() => {
    if (!shopVideoUrls.length) {
      setSelectedVideoUrl("");
      return;
    }
    if (!selectedVideoUrl || !shopVideoUrls.includes(selectedVideoUrl)) {
      setSelectedVideoUrl(shopVideoUrls[0]);
    }
  }, [JSON.stringify(shopVideoUrls), selectedVideoUrl]);

  const player = useVideoPlayer(selectedVideoUrl || "");

  useEffect(() => {
    try {
      if (player) player.loop = false;
    } catch {
      // ignore
    }
  }, [player]);

  const videoTiles = useMemo(() => {
    return (shopVideoUrls ?? []).map((v, idx) => ({ videoUrl: v, idx }));
  }, [shopVideoUrls]);

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
      !saving &&
      !savingMedia
    );
  }, [vendorId, shopName, ownerName, email, mobile, address, saving, savingMedia]);

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

  async function saveVendorMedia(next: Partial<VendorRow>) {
    if (!vendorId) return;
    if (savingMedia) return;

    try {
      setSavingMedia(true);

    const { data, error } = await supabase
      .from("vendor")
      .update(next as any)
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
          "location",
          "offers_tailoring"
        ].join(",")
      )
      .single();

      if (error) {
        Alert.alert("Media update failed", error.message);
        return;
      }

     const row = data as unknown as VendorRow;

      // keep local in sync
      setProfilePath(row.profile_image_path ?? null);
      setBannerPath(row.banner_path ?? null);
      setCertificatePaths(Array.isArray(row.certificate_paths) ? row.certificate_paths : []);
      setShopImagePaths(Array.isArray(row.shop_image_paths) ? row.shop_image_paths : []);
      setShopVideoPaths(Array.isArray(row.shop_video_paths) ? row.shop_video_paths : []);

      dispatch(
        setSelectedVendor({
          ...(row as any),
          created_at: row.created_at ?? undefined,
          image: null as any
        } as any)
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update media.");
    } finally {
      setSavingMedia(false);
    }
  }

  async function pickAndUpload(kind: "profile" | "banner" | "certificate" | "shop_image" | "shop_video") {
    if (!vendorId) {
      Alert.alert("No vendor selected", "Please open a vendor profile first.");
      return;
    }
    if (savingMedia) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow media library access.");
      return;
    }

    const isVideo = kind === "shop_video";
    const isMultiImage = kind === "certificate" || kind === "shop_image";

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isVideo
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      quality: !isVideo ? 0.9 : undefined,
      allowsEditing: false
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    try {
      setSavingMedia(true);

      const uri = asset.uri;
      const ext = extFromUri(uri) || (!isVideo ? "jpg" : "mp4");
      const contentType =
        asset.mimeType || guessContentTypeFromExt(ext) || (!isVideo ? "image/jpeg" : "video/mp4");

      const fileName = (asset as any)?.fileName
        ? String((asset as any).fileName)
        : `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

      const picked: Picked = { uri, mimeType: contentType, fileName };

      const folder =
        kind === "profile"
          ? "profile"
          : kind === "banner"
            ? "banner"
            : kind === "certificate"
              ? "certificates"
              : kind === "shop_image"
                ? "shop-images"
                : "shop-videos";

      const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
      const storagePath = `vendors/${vendorId}/${folder}/${filename}`;

      const uploadedPath = await uploadToBucket(
        BUCKET_VENDOR,
        storagePath,
        picked,
        isVideo ? "video/mp4" : "image/jpeg"
      );

      if (!uploadedPath) return;

      if (kind === "profile") {
        await saveVendorMedia({ profile_image_path: uploadedPath });
        return;
      }

      if (kind === "banner") {
        await saveVendorMedia({ banner_path: uploadedPath });
        return;
      }

      if (kind === "certificate") {
        const next = [...(certificatePaths ?? [])];
        next.push(uploadedPath);
        await saveVendorMedia({ certificate_paths: next });
        return;
      }

      if (kind === "shop_image") {
        const next = [...(shopImagePaths ?? [])];
        next.push(uploadedPath);
        await saveVendorMedia({ shop_image_paths: next });
        return;
      }

      if (kind === "shop_video") {
        const next = [...(shopVideoPaths ?? [])];
        next.push(uploadedPath);
        await saveVendorMedia({ shop_video_paths: next });
        return;
      }

      if (!isMultiImage) {
        // no-op
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not upload media.");
    } finally {
      setSavingMedia(false);
    }
  }

  async function removeCertificateAt(idx: number) {
    const list = Array.isArray(certificatePaths) ? [...certificatePaths] : [];
    if (idx < 0 || idx >= list.length) return;
    list.splice(idx, 1);
    await saveVendorMedia({ certificate_paths: list.length ? list : null });
  }

  async function removeShopImageAt(idx: number) {
    const list = Array.isArray(shopImagePaths) ? [...shopImagePaths] : [];
    if (idx < 0 || idx >= list.length) return;
    list.splice(idx, 1);
    await saveVendorMedia({ shop_image_paths: list.length ? list : null });
  }

  async function removeShopVideoAt(idx: number) {
    const list = Array.isArray(shopVideoPaths) ? [...shopVideoPaths] : [];
    if (idx < 0 || idx >= list.length) return;

    const removedUrl = shopVideoUrls[idx] || "";
    list.splice(idx, 1);

    await saveVendorMedia({ shop_video_paths: list.length ? list : null });

    // if removed is currently selected, select first remaining
    try {
      const removed = String(removedUrl || "").trim();
      if (removed && removed === String(selectedVideoUrl || "").trim()) {
        const nextList = list.map((p) => resolvePublicUrl(p)).filter(Boolean) as string[];
        setSelectedVideoUrl(nextList[0] || "");
      }
    } catch {
      // ignore
    }
  }

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

    const updatePayload = {
      name: ownerName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      landline: landline.trim() || null,

      shop_name: shopName.trim(),
      address: address.trim(),
      location_url: locationUrl.trim() || null,

      // ✅ NEW: vendor-wide tailoring offering
      offers_tailoring: Boolean(offersTailoring),

      location: address.trim(),

      // ✅ media (already editable live; keep current snapshot on submit too)
      profile_image_path: profilePath,
      banner_path: bannerPath,
      certificate_paths: certificatePaths.length ? certificatePaths : null,
      shop_image_paths: shopImagePaths.length ? shopImagePaths : null,
      shop_video_paths: shopVideoPaths.length ? shopVideoPaths : null
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
          "location",
          "offers_tailoring"
        ].join(",")
      )
      .single();

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    const row = data as unknown as VendorRow;

    dispatch(
      setSelectedVendor({
        ...(row as any),
        created_at: row.created_at ?? undefined,
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
          <Text style={styles.meta}>No vendor selected. Open the vendor profile first.</Text>
        </View>
      </ScrollView>
    );
  }

  const showSetCurrentLocation = (locationUrl || "").trim().length === 0;

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

        {/* ✅ NEW: Offers tailoring toggle */}
        <View style={styles.tailoringRow}>
          <Text style={styles.tailoringLabel}>Offers stitching / tailoring</Text>

          <Pressable
            onPress={() => setOffersTailoring((v) => !v)}
            style={({ pressed }) => [
              styles.tailoringPill,
              offersTailoring ? styles.tailoringPillOn : null,
              pressed ? styles.pressed : null
            ]}
          >
            <Text style={[styles.tailoringText, offersTailoring ? styles.tailoringTextOn : null]}>
              {offersTailoring ? "Yes" : "No"}
            </Text>
          </Pressable>
        </View>

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
        <View style={styles.mediaHeaderRow}>
          <Text style={styles.section}>Media</Text>

          {savingMedia ? (
            <View style={styles.mediaLoadingRow}>
              <ActivityIndicator />
              <Text style={styles.mediaLoadingText}>Updating media…</Text>
            </View>
          ) : null}
        </View>

        {/* ✅ Profile (segregated) */}
        <View style={styles.existingBox}>
          <View style={styles.mediaSectionHeaderRow}>
            <Text style={styles.existingTitle}>Profile / Logo</Text>

            <Pressable
              onPress={() => pickAndUpload("profile")}
              disabled={savingMedia}
              style={({ pressed }) => [
                styles.smallBtn,
                savingMedia ? styles.smallBtnDisabled : null,
                pressed ? styles.pressed : null
              ]}
            >
              <Text style={styles.smallBtnText}>Update Profile</Text>
            </Pressable>
          </View>

          {profileUrl ? (
            <Pressable
              onPress={() => openViewerAt([profileUrl], 0)}
              style={({ pressed }) => [styles.previewWrap, pressed ? styles.pressed : null]}
            >
              <Image source={{ uri: profileUrl }} style={styles.previewImg} />
            </Pressable>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        {/* ✅ Banner (segregated) */}
        <View style={styles.existingBox}>
          <View style={styles.mediaSectionHeaderRow}>
            <Text style={styles.existingTitle}>Shop Banner</Text>

            <Pressable
              onPress={() => pickAndUpload("banner")}
              disabled={savingMedia}
              style={({ pressed }) => [
                styles.smallBtn,
                savingMedia ? styles.smallBtnDisabled : null,
                pressed ? styles.pressed : null
              ]}
            >
              <Text style={styles.smallBtnText}>Update Banner</Text>
            </Pressable>
          </View>

          {bannerUrl ? (
            <Pressable
              onPress={() => openViewerAt([bannerUrl], 0)}
              style={({ pressed }) => [styles.previewWrap, pressed ? styles.pressed : null]}
            >
              <Image source={{ uri: bannerUrl }} style={styles.previewImg} />
            </Pressable>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        {/* Certificates (add/remove) */}
        <View style={styles.existingBox}>
          <View style={styles.mediaSectionHeaderRow}>
            <Text style={styles.existingTitle}>Certificates</Text>

            <Pressable
              onPress={() => pickAndUpload("certificate")}
              disabled={savingMedia}
              style={({ pressed }) => [
                styles.smallBtn,
                savingMedia ? styles.smallBtnDisabled : null,
                pressed ? styles.pressed : null
              ]}
            >
              <Text style={styles.smallBtnText}>+ Add Certificate</Text>
            </Pressable>
          </View>

          {certificateUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {certificateUrls.map((u, idx) => (
                  <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                    <Pressable
                      onPress={() => openViewerAt(certificateUrls, idx)}
                      style={({ pressed }) => [styles.thumbPress, pressed ? styles.pressed : null]}
                    >
                      <Image source={{ uri: u }} style={styles.thumb} />
                    </Pressable>

                    <Pressable
                      onPress={() => removeCertificateAt(idx)}
                      disabled={savingMedia}
                      style={({ pressed }) => [styles.thumbX, pressed ? styles.pressed : null]}
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
        </View>

        {/* Shop Images (add/remove) */}
        <View style={styles.existingBox}>
          <View style={styles.mediaSectionHeaderRow}>
            <Text style={styles.existingTitle}>Shop Images</Text>

            <Pressable
              onPress={() => pickAndUpload("shop_image")}
              disabled={savingMedia}
              style={({ pressed }) => [
                styles.smallBtn,
                savingMedia ? styles.smallBtnDisabled : null,
                pressed ? styles.pressed : null
              ]}
            >
              <Text style={styles.smallBtnText}>+ Add Image</Text>
            </Pressable>
          </View>

          {shopImageUrls.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {shopImageUrls.map((u, idx) => (
                  <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                    <Pressable
                      onPress={() => openViewerAt(shopImageUrls, idx)}
                      style={({ pressed }) => [styles.thumbPress, pressed ? styles.pressed : null]}
                    >
                      <Image source={{ uri: u }} style={styles.thumb} />
                    </Pressable>

                    <Pressable
                      onPress={() => removeShopImageAt(idx)}
                      disabled={savingMedia}
                      style={({ pressed }) => [styles.thumbX, pressed ? styles.pressed : null]}
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
        </View>

        {/* ✅ Shop Videos (add/remove + thumbs + embedded player like View Profile) */}
        <View style={styles.existingBox}>
          <View style={styles.mediaSectionHeaderRow}>
            <Text style={styles.existingTitle}>Shop Videos</Text>

            <Pressable
              onPress={() => pickAndUpload("shop_video")}
              disabled={savingMedia}
              style={({ pressed }) => [
                styles.smallBtn,
                savingMedia ? styles.smallBtnDisabled : null,
                pressed ? styles.pressed : null
              ]}
            >
              <Text style={styles.smallBtnText}>+ Add Video</Text>
            </Pressable>
          </View>

          {shopVideoUrls.length ? (
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

              <Text style={styles.videoMeta}>
                Tap a tile to play. Long-press to open externally.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {videoTiles.map((t) => {
                    const thumbUri = videoThumbs[t.videoUrl] || "";
                    const isOn = selectedVideoUrl === t.videoUrl;
                    const isLoading = !!thumbLoading[t.videoUrl];

                    return (
                      <View key={`${t.videoUrl}-${t.idx}`} style={styles.thumbWrap}>
                        <Pressable
                          onPress={() => setSelectedVideoUrl(t.videoUrl)}
                          onLongPress={() => openExternal(t.videoUrl)}
                          style={({ pressed }) => [
                            styles.thumbPress,
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

                        <Pressable
                          onPress={() => removeShopVideoAt(t.idx)}
                          disabled={savingMedia}
                          style={({ pressed }) => [styles.thumbX, pressed ? styles.pressed : null]}
                        >
                          <Text style={styles.thumbXText}>✕</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.emptyInline}>—</Text>
          )}
        </View>

        <Text
          style={[styles.submitBtn, !canSubmit && styles.disabledBtn]}
          onPress={canSubmit ? submit : undefined}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Text>
      </ScrollView>

      {/* Fullscreen Viewer (images only) */}
      <Modal visible={viewerVisible} transparent onRequestClose={() => setViewerVisible(false)}>
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
            initialScrollIndex={Math.max(0, Math.min(currentIndex, Math.max(0, gallery.length - 1)))}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width) || 0;
              setCurrentIndex(next);
            }}
            renderItem={({ item }) => <Image source={{ uri: item }} style={styles.viewerImage} />}
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

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#F8FAFC"
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },

  backBtn: {
    minHeight: 40,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D7E3FF",
    textAlignVertical: "center",
    overflow: "hidden"
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A"
  },

  section: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A"
  },

  mediaHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10
  },

  mediaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },

  mediaLoadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B"
  },

  fieldBtnBlue: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB"
  },

  input: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A"
  },

  multi: {
    minHeight: 90,
    textAlignVertical: "top"
  },

  blueBtn: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB"
  },

  disabledText: {
    opacity: 0.6
  },

  orText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B"
  },

  tailoringRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  tailoringLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A"
  },

  tailoringPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF"
  },

  tailoringPillOn: {
    borderColor: "#D7E3FF",
    backgroundColor: "#EEF4FF"
  },

  tailoringText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A"
  },

  tailoringTextOn: {
    color: "#2563EB"
  },

  meta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500"
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 18
  },

  existingBox: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    backgroundColor: "#FFFFFF"
  },

  mediaSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },

  existingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A"
  },

  subHead: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A"
  },

  empty: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#64748B"
  },

  emptyInline: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#64748B"
  },

  previewWrap: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden"
  },

  previewImg: {
    width: "100%",
    height: 160
  },

  hRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4
  },

  smallBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  smallBtnDisabled: {
    opacity: 0.6
  },

  smallBtnText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12
  },

  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF"
  },

  thumbPress: {
    width: "100%",
    height: "100%"
  },

  thumb: {
    width: "100%",
    height: "100%"
  },

  thumbX: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },

  thumbXText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 12
  },

  videoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FF"
  },

  videoPlaceholderText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12
  },

  playBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center"
  },

  playBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12
  },

  videoBox: {
    marginTop: 10,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },

  video: {
    width: "100%",
    height: 220
  },

  videoMeta: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500"
  },

  videoThumbOn: {
    borderColor: "#2563EB",
    borderWidth: 2
  },

  hint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500"
  },

  pressed: {
    opacity: 0.82
  },

  submitBtn: {
    marginTop: 18,
    minHeight: 48,
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    overflow: "hidden",
    textAlign: "center",
    textAlignVertical: "center"
  },

  disabledBtn: {
    opacity: 0.6
  },

  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
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
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },

  closeText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900"
  },

  indexCaption: {
    position: "absolute",
    bottom: 34,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },

  indexText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14
  }
});