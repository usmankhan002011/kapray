// C:\DEV\kapray\kapray\app\vendor\create-shop.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
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
import { VideoView, useVideoPlayer } from "expo-video";
// Requires: npx expo install expo-video-thumbnails
import * as VideoThumbnails from "expo-video-thumbnails";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");

type Picked = { uri: string; mimeType?: string; fileName?: string };

function prettyNameFromPicked(p: Picked, fallback: string) {
  if (p.fileName && p.fileName.trim()) return p.fileName.trim();
  const parts = (p.uri || "").split("/");
  const last = parts[parts.length - 1];
  return last || fallback;
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

export default function CreateShopScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Login not active yet → we will not rely on vendorId.
  // Keeping this read for future use (no functional dependency).
  const authUserId = useAppSelector((s) => s.user?.userDetails?.userId);

  // kept (no functional dependency)
  const selectedVendor = useAppSelector((s) => s.vendor as any);

  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [landline, setLandline] = useState("");
  const [address, setAddress] = useState("");
  const [locationUrl, setLocationUrl] = useState("");

  const [profile, setProfile] = useState<Picked | null>(null);
  const [govPermission, setGovPermission] = useState<Picked | null>(null);

  const [banner, setBanner] = useState<Picked | null>(null);
  const [images, setImages] = useState<Picked[]>([]);
  const [videos, setVideos] = useState<Picked[]>([]);

  const [saving, setSaving] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // Compact UI: tap to expand each input
  const [openOwner, setOpenOwner] = useState(true);
  const [openEmail, setOpenEmail] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [openShop, setOpenShop] = useState(false);
  const [openLandline, setOpenLandline] = useState(false);
  const [openAddress, setOpenAddress] = useState(false);
  const [openLocation, setOpenLocation] = useState(false);

  // Refs for proactive focus
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
      shopName.trim().length > 0 &&
      ownerName.trim().length > 0 &&
      email.trim().length > 0 &&
      mobile.trim().length > 0 &&
      address.trim().length > 0 &&
      !saving
    );
  }, [shopName, ownerName, email, mobile, address, saving]);

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

  // =========================
  // Media UX (ditto style)
  // =========================

  // Fullscreen image viewer (for banner/profile/certs/images)
  const [viewerVisible, setViewerVisible] = useState(false);
  const [gallery, setGallery] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

  const openViewerAt = useCallback((uris: string[], idx: number) => {
    const list = (uris ?? []).filter(Boolean);
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
        flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [viewerVisible, currentIndex, gallery.length]);

  // Prefetch picked images for snappy thumbs
  useEffect(() => {
    const all = [
      ...(profile?.uri ? [profile.uri] : []),
      ...(govPermission?.uri ? [govPermission.uri] : []),
      ...(banner?.uri ? [banner.uri] : []),
      ...(images ?? []).map((x) => x.uri),
      ...(certificatesPreviewUris ?? [])
    ].filter(Boolean);

    all.forEach((u) => {
      try {
        Image.prefetch(u);
      } catch {
        // ignore
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uri, govPermission?.uri, banner?.uri, JSON.stringify(images.map((x) => x.uri))]);

  // Video thumbnails for picked videos
  const [videoThumbByUri, setVideoThumbByUri] = useState<Record<string, string>>({});
  const [selectedVideoUri, setSelectedVideoUri] = useState<string>("");

  const ensureVideoThumb = useCallback(async (videoUri: string) => {
    const u = String(videoUri || "").trim();
    if (!u) return null;
    if (videoThumbByUri[u]) return videoThumbByUri[u];

    try {
      // generate at ~1s; if shorter, it will fallback internally
      const { uri } = await VideoThumbnails.getThumbnailAsync(u, { time: 1000 });
      if (uri) {
        setVideoThumbByUri((prev) => ({ ...prev, [u]: uri }));
        return uri;
      }
      return null;
    } catch {
      return null;
    }
  }, [videoThumbByUri]);

  // When videos change, generate thumbs + set default selected video
  useEffect(() => {
    const list = (videos ?? []).map((v) => v.uri).filter(Boolean);
    if (!list.length) {
      setSelectedVideoUri("");
      return;
    }
    if (!selectedVideoUri || !list.includes(selectedVideoUri)) {
      setSelectedVideoUri(list[0]);
    }

    (async () => {
      for (let i = 0; i < list.length; i++) {
        // sequential to avoid spikes
        // eslint-disable-next-line no-await-in-loop
        await ensureVideoThumb(list[i]);
      }
    })();
  }, [videos, selectedVideoUri, ensureVideoThumb]);

  const player = useVideoPlayer(selectedVideoUri || "");

  useEffect(() => {
    try {
      if (player) player.loop = false;
    } catch {
      // ignore
    }
  }, [player]);

  // Certificates are single in create-shop (govPermission). Keep helper list for viewer.
  const certificatesPreviewUris = useMemo(() => {
    return govPermission?.uri ? [govPermission.uri] : [];
  }, [govPermission?.uri]);

  const shopImageUris = useMemo(() => (images ?? []).map((x) => x.uri).filter(Boolean), [images]);
  const shopVideoUris = useMemo(() => (videos ?? []).map((x) => x.uri).filter(Boolean), [videos]);

  // =========================
  // Submit (unchanged logic)
  // =========================
  async function submit() {
    if (!canSubmit) {
      Alert.alert("Missing", "Fill required fields.");
      return;
    }

    setSaving(true);

    const { data: vendorRow, error: insErr } = await supabase
      .from("vendor")
      .insert({
        // Vendor identity
        name: ownerName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        landline: landline.trim() || null,

        // Vendor-owned shop details
        shop_name: shopName.trim(),
        address: address.trim(),
        location_url: locationUrl.trim() || null,

        // legacy compatibility (keep in sync)
        location: address.trim(),

        status: "pending"
      })
      .select("id")
      .single();

    if (insErr || !vendorRow?.id) {
      setSaving(false);
      Alert.alert("Error", insErr?.message ?? "Could not register vendor.");
      return;
    }

    const vendor_id = vendorRow.id as string;
    const ts = Date.now();

    const profilePath = profile
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendor_id}/profile/${ts}-${profile.fileName || "profile"}`,
          profile,
          "image/jpeg"
        )
      : null;

    const certPath = govPermission
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendor_id}/certificates/${ts}-${govPermission.fileName || "file"}`,
          govPermission,
          "image/jpeg"
        )
      : null;

    const bannerPath = banner
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendor_id}/banner/${ts}-${banner.fileName || "banner"}`,
          banner,
          "image/jpeg"
        )
      : null;

    const imagePaths: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const p = await uploadToBucket(
        BUCKET_VENDOR,
        `vendors/${vendor_id}/shop-images/${ts}-${i}-${images[i].fileName || "image"}`,
        images[i],
        "image/jpeg"
      );
      if (p) imagePaths.push(p);
    }

    const videoPaths: string[] = [];
    for (let i = 0; i < videos.length; i++) {
      const p = await uploadToBucket(
        BUCKET_VENDOR,
        `vendors/${vendor_id}/shop-videos/${ts}-${i}-${videos[i].fileName || "video"}`,
        videos[i],
        "video/mp4"
      );
      if (p) videoPaths.push(p);
    }

    const certificate_paths = certPath ? [certPath] : null;

    const { error: upErr } = await supabase
      .from("vendor")
      .update({
        profile_image_path: profilePath,
        banner_path: bannerPath,
        certificate_paths,
        shop_image_paths: imagePaths.length ? imagePaths : null,
        shop_video_paths: videoPaths.length ? videoPaths : null,
        status: "pending"
      })
      .eq("id", vendor_id);

    setSaving(false);

    if (upErr) {
      Alert.alert("Error", upErr.message);
      return;
    }

    dispatch(
      setSelectedVendor({
        id: vendor_id,
        created_at: null as any,

        name: ownerName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        landline: landline.trim() || null,

        shop_name: shopName.trim(),
        address: address.trim(),
        location_url: locationUrl.trim() || null,

        profile_image_path: profilePath,
        banner_path: bannerPath,
        certificate_paths,
        shop_image_paths: imagePaths.length ? imagePaths : null,
        shop_video_paths: videoPaths.length ? videoPaths : null,

        status: "pending",

        location: address.trim(),
        image: null as any
      } as any)
    );

    router.replace("/vendor/confirmation");
  }

  const FieldHeader = ({
    label,
    open,
    onPress
  }: {
    label: string;
    open: boolean;
    onPress: () => void;
  }) => (
    <Text style={styles.fieldBtnBlue} onPress={onPress}>
      {label}
    </Text>
  );

  const showSetCurrentLocation = (locationUrl || "").trim().length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: stylesVars.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Register Vendor</Text>

        <FieldHeader
          label="Vendor / owner name *"
          open={openOwner}
          onPress={openAndFocusOwner}
        />
        {openOwner && (
          <View style={optionStyles.card}>
            <TextInput
              ref={ownerRef}
              style={styles.inputPlain}
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
              placeholder="Enter name"
              placeholderTextColor={stylesVars.placeholder}
            />
          </View>
        )}

        <FieldHeader label="Email *" open={openEmail} onPress={openAndFocusEmail} />
        {openEmail && (
          <View style={optionStyles.card}>
            <TextInput
              ref={emailRef}
              style={styles.inputPlain}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter email"
              placeholderTextColor={stylesVars.placeholder}
            />
          </View>
        )}

        <FieldHeader label="Mobile *" open={openMobile} onPress={openAndFocusMobile} />
        {openMobile && (
          <View style={optionStyles.card}>
            <TextInput
              ref={mobileRef}
              style={styles.inputPlain}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              placeholder="Enter mobile"
              placeholderTextColor={stylesVars.placeholder}
            />
          </View>
        )}

        <FieldHeader label="Shop name *" open={openShop} onPress={openAndFocusShop} />
        {openShop && (
          <View style={optionStyles.card}>
            <TextInput
              ref={shopRef}
              style={styles.inputPlain}
              value={shopName}
              onChangeText={setShopName}
              autoCapitalize="words"
              placeholder="Enter shop name"
              placeholderTextColor={stylesVars.placeholder}
            />
          </View>
        )}

        <FieldHeader
          label="Landline"
          open={openLandline}
          onPress={openAndFocusLandline}
        />
        {openLandline && (
          <View style={optionStyles.card}>
            <TextInput
              ref={landlineRef}
              style={styles.inputPlain}
              value={landline}
              onChangeText={setLandline}
              keyboardType="phone-pad"
              placeholder="Enter landline (optional)"
              placeholderTextColor={stylesVars.placeholder}
            />
          </View>
        )}

        <FieldHeader label="Address *" open={openAddress} onPress={openAndFocusAddress} />
        {openAddress && (
          <View style={optionStyles.card}>
            <TextInput
              ref={addressRef}
              style={[styles.inputPlain, styles.multi]}
              value={address}
              onChangeText={setAddress}
              multiline
              placeholder="Enter address"
              placeholderTextColor={stylesVars.placeholder}
            />
          </View>
        )}

        <FieldHeader
          label="Location URL"
          open={openLocation}
          onPress={openAndFocusLocation}
        />
        {openLocation && (
          <View style={optionStyles.card}>
            <TextInput
              ref={locationRef}
              style={styles.inputPlain}
              value={locationUrl}
              onChangeText={setLocationUrl}
              keyboardType="url"
              autoCapitalize="none"
              placeholder="Optional"
              placeholderTextColor={stylesVars.placeholder}
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

        {/* MEDIA (improved previews) */}
        <Text style={styles.section}>Media</Text>

        {/* Profile */}
        <Text
          style={styles.blueBtn}
          onPress={async () => setProfile((await pickImages(false))[0] ?? null)}
        >
          Vendor profile / logo
        </Text>
        {!!profile?.uri ? (
          <Pressable
            onPress={() => openViewerAt([profile.uri], 0)}
            style={({ pressed }) => [styles.bigPreviewWrap, pressed ? styles.pressed : null]}
          >
            <Image source={{ uri: profile.uri }} style={styles.preview} />
          </Pressable>
        ) : null}

        {/* Authorities permission (certificate) */}
        <Text
          style={styles.blueBtn}
          onPress={async () => setGovPermission((await pickImages(false))[0] ?? null)}
        >
          Authorities permission
        </Text>
        {!!govPermission?.uri ? (
          <Pressable
            onPress={() => openViewerAt([govPermission.uri], 0)}
            style={({ pressed }) => [styles.bigPreviewWrap, pressed ? styles.pressed : null]}
          >
            <Image source={{ uri: govPermission.uri }} style={styles.preview} />
          </Pressable>
        ) : null}

        {/* Banner */}
        <Text
          style={styles.blueBtn}
          onPress={async () => setBanner((await pickImages(false))[0] ?? null)}
        >
          Shop banner
        </Text>
        {!!banner?.uri ? (
          <Pressable
            onPress={() => openViewerAt([banner.uri], 0)}
            style={({ pressed }) => [styles.bigPreviewWrap, pressed ? styles.pressed : null]}
          >
            <Image source={{ uri: banner.uri }} style={styles.preview} />
          </Pressable>
        ) : null}

        {/* Shop images (thumb row + fullscreen viewer) */}
        <Text
          style={styles.blueBtn}
          onPress={async () => setImages(await pickImages(true))}
        >
          Shop images
        </Text>

        {shopImageUris.length ? (
          <>
            <Text style={styles.metaHint}>Tap any image to view full screen.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {shopImageUris.map((u, idx) => (
                  <Pressable
                    key={`${u}-${idx}`}
                    onPress={() => openViewerAt(shopImageUris, idx)}
                    style={({ pressed }) => [styles.thumbWrap, pressed ? styles.pressed : null]}
                  >
                    <Image source={{ uri: u }} style={styles.thumb} />
                    {idx === 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>First</Text>
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

        {/* Shop videos (thumbnail tiles + inline player) */}
        <Text
          style={styles.blueBtn}
          onPress={async () => {
            const picked = await pickVideos(true);
            setVideos(picked);
          }}
        >
          Shop videos
        </Text>

        {shopVideoUris.length ? (
          <>
            {!!selectedVideoUri ? (
              <View style={styles.videoBox}>
                <VideoView
                  player={player}
                  style={styles.video}
                  allowsFullscreen
                  allowsPictureInPicture
                />
              </View>
            ) : null}

            <Text style={styles.metaHint}>Tap a tile to play.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hRow}>
                {shopVideoUris.map((vUri, idx) => {
                  const thumbUri = videoThumbByUri[vUri] || "";
                  const isOn = selectedVideoUri === vUri;

                  return (
                    <Pressable
                      key={`${vUri}-${idx}`}
                      onPress={() => setSelectedVideoUri(vUri)}
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
                            Video {idx + 1}
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

            <View style={styles.videoNames}>
              {videos.slice(0, 5).map((v, idx) => (
                <Text key={`${v.uri}-${idx}`} style={styles.videoItem} numberOfLines={1}>
                  {idx + 1}. {prettyNameFromPicked(v, `video-${idx + 1}`)}
                </Text>
              ))}
              {videos.length > 5 ? (
                <Text style={styles.moreText}>+{videos.length - 5} more</Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.empty}>—</Text>
        )}

        <Text
          style={[styles.submitBtn, !canSubmit && styles.disabledBtn]}
          onPress={canSubmit ? submit : undefined}
        >
          {saving ? "Saving..." : "Submit"}
        </Text>

        {false && !!authUserId && (
          <Text style={styles.metaHint}>Auth user detected: {String(authUserId)}</Text>
        )}
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
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
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

const stylesVars = {
  bg: "#F5F7FB",
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

  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue, marginBottom: 6 },

  section: { marginTop: 18, fontSize: 16, fontWeight: "900", color: stylesVars.blue },

  fieldBtnBlue: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#005ea6"
  },

  inputPlain: { fontSize: 16, color: stylesVars.text },
  multi: { minHeight: 90, textAlignVertical: "top" },

  blueBtn: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "900",
    color: stylesVars.blue
  },
  disabledText: { opacity: 0.6 },

  orText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
    color: stylesVars.text,
    opacity: 0.75
  },

  metaHint: { marginTop: 8, fontSize: 12, color: stylesVars.subText, fontWeight: "800" },
  empty: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },

  bigPreviewWrap: { marginTop: 10, borderRadius: 12, overflow: "hidden" },
  preview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border
  },

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

  badge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(11,47,107,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 10 },

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
  videoPlaceholderText: { color: stylesVars.blue, fontWeight: "900", fontSize: 12 },

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

  videoNames: { marginTop: 8 },
  videoItem: { marginTop: 6, fontSize: 12, color: stylesVars.text, opacity: 0.85 },
  moreText: { marginTop: 10, fontSize: 12, color: stylesVars.subText, fontWeight: "800" },

  submitBtn: {
    marginTop: 18,
    backgroundColor: stylesVars.blue,
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: "hidden",
    textAlign: "center"
  },
  disabledBtn: { opacity: 0.5 },

  pressed: { opacity: 0.75 },

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
