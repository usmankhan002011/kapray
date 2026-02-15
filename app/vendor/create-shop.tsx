// C:\DEV\kapray\kapray\app\vendor\create-shop.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
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

const BUCKET_VENDOR = "vendor_images";

type Picked = { uri: string; mimeType?: string; fileName?: string };

function prettyNameFromPicked(p: Picked, fallback: string) {
  if (p.fileName && p.fileName.trim()) return p.fileName.trim();
  const parts = (p.uri || "").split("/");
  const last = parts[parts.length - 1];
  return last || fallback;
}

export default function CreateShopScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Login not active yet → we will not rely on vendorId.
  // Keeping this read for future use (no functional dependency).
  const authUserId = useAppSelector((s) => s.user?.userDetails?.userId);

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

  async function pickImages(multiple: boolean) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Allow gallery access.");
      return [];
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: multiple,
      quality: 0.85
    });
    if (res.canceled) return [];
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
      return [];
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"] as any,
      allowsMultipleSelection: multiple
    });
    if (res.canceled) return [];
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
            style={styles.input}
            value={ownerName}
            onChangeText={setOwnerName}
            autoCapitalize="words"
            placeholder="Enter name"
            placeholderTextColor="#777"
          />
        </View>
      )}

      <FieldHeader label="Email *" open={openEmail} onPress={openAndFocusEmail} />
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

      <FieldHeader
        label="Mobile *"
        open={openMobile}
        onPress={openAndFocusMobile}
      />
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

      <FieldHeader
        label="Shop name *"
        open={openShop}
        onPress={openAndFocusShop}
      />
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

      <FieldHeader
        label="Landline"
        open={openLandline}
        onPress={openAndFocusLandline}
      />
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

      <FieldHeader
        label="Address *"
        open={openAddress}
        onPress={openAndFocusAddress}
      />
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

      <FieldHeader
        label="Location URL"
        open={openLocation}
        onPress={openAndFocusLocation}
      />
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

      <Text
        style={styles.blueBtn}
        onPress={async () => setProfile((await pickImages(false))[0] ?? null)}
      >
        Vendor profile / logo
      </Text>
      {!!profile?.uri && (
        <Image source={{ uri: profile.uri }} style={styles.preview} />
      )}

      <Text
        style={styles.blueBtn}
        onPress={async () =>
          setGovPermission((await pickImages(false))[0] ?? null)
        }
      >
        Authorities permission
      </Text>
      {!!govPermission?.uri && (
        <Image source={{ uri: govPermission.uri }} style={styles.preview} />
      )}

      <Text
        style={styles.blueBtn}
        onPress={async () => setBanner((await pickImages(false))[0] ?? null)}
      >
        Shop banner
      </Text>
      {!!banner?.uri && (
        <Image source={{ uri: banner.uri }} style={styles.preview} />
      )}

      <Text
        style={styles.blueBtn}
        onPress={async () => setImages(await pickImages(true))}
      >
        Shop images
      </Text>
      {!!images.length && (
        <View style={styles.mediaRow}>
          {images.slice(0, 6).map((it, idx) => (
            <Image
              key={`${it.uri}-${idx}`}
              source={{ uri: it.uri }}
              style={styles.thumb}
            />
          ))}
          {images.length > 6 && (
            <Text style={styles.moreText}>+{images.length - 6} more</Text>
          )}
        </View>
      )}

      <Text style={styles.blueBtn} onPress={async () => setVideos(await pickVideos(true))}>
        Shop videos
      </Text>
      {!!videos.length && (
        <View style={styles.videoList}>
          <Text style={styles.videoCount}>{videos.length} selected</Text>
          {videos.slice(0, 5).map((v, idx) => (
            <Text key={`${v.uri}-${idx}`} style={styles.videoItem} numberOfLines={1}>
              {idx + 1}. {prettyNameFromPicked(v, `video-${idx + 1}`)}
            </Text>
          ))}
          {videos.length > 5 && (
            <Text style={styles.moreText}>+{videos.length - 5} more</Text>
          )}
        </View>
      )}

      <Text
        style={[styles.submitBtn, !canSubmit && styles.disabledBtn]}
        onPress={canSubmit ? submit : undefined}
      >
        {saving ? "Saving..." : "Submit"}
      </Text>

      {false && !!authUserId && (
        <Text style={styles.meta}>Auth user detected: {String(authUserId)}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: "#fff" },

  title: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 6 },

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

  meta: { marginTop: 6, fontSize: 12, color: "#111", opacity: 0.7 },

  preview: { width: "100%", height: 160, borderRadius: 10, marginTop: 10 },

  mediaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },

  videoList: { marginTop: 8 },
  videoCount: { marginTop: 6, fontSize: 12, color: "#111", opacity: 0.7 },
  videoItem: { marginTop: 6, fontSize: 12, color: "#111", opacity: 0.85 },

  moreText: { marginTop: 10, fontSize: 12, color: "#111", opacity: 0.7 },

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
  disabledBtn: { opacity: 0.5 }
});
