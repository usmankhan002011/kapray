import React, { useMemo, useState } from "react";
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

export default function CreateShopScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Login not active yet → we will not rely on vendorId.
  // Keeping this read for future use (no functional dependency).
  const authUserId = useAppSelector((s) => s.user?.userDetails?.userId);

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

        // keep legacy column if you still use it elsewhere
        // location can be used as a short label; we keep it in sync
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

        // keep legacy compatibility fields if you still show them somewhere
        location: address.trim(),
        image: null as any
      } as any)
    );

    router.replace("/vendor");
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Register Vendor</Text>

      <Text style={styles.label}>Shop name *</Text>
      <View style={optionStyles.card}>
        <TextInput
          style={styles.input}
          value={shopName}
          onChangeText={setShopName}
          autoCapitalize="words"
        />
      </View>

      <Text style={styles.label}>Vendor / owner name *</Text>
      <View style={optionStyles.card}>
        <TextInput
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
          autoCapitalize="words"
        />
      </View>

      <Text style={styles.label}>Email *</Text>
      <View style={optionStyles.card}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.label}>Mobile *</Text>
      <View style={optionStyles.card}>
        <TextInput
          style={styles.input}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
      </View>

      <Text style={styles.label}>Landline</Text>
      <View style={optionStyles.card}>
        <TextInput
          style={styles.input}
          value={landline}
          onChangeText={setLandline}
          keyboardType="phone-pad"
        />
      </View>

      <Text style={styles.label}>Address *</Text>
      <View style={optionStyles.card}>
        <TextInput
          style={[styles.input, styles.multi]}
          value={address}
          onChangeText={setAddress}
          multiline
        />
      </View>

      <Text style={styles.label}>Location URL</Text>
      <View style={optionStyles.card}>
        <TextInput
          style={styles.input}
          value={locationUrl}
          onChangeText={setLocationUrl}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <Text
        style={[styles.blueBtn, locLoading && styles.disabledText]}
        onPress={locLoading ? undefined : setCurrentLocation}
      >
        {locLoading ? "Setting current location..." : "Set current location"}
      </Text>

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
        <Text style={styles.meta}>{images.length} selected</Text>
      )}

      <Text
        style={styles.blueBtn}
        onPress={async () => setVideos(await pickVideos(true))}
      >
        Shop videos
      </Text>
      {!!videos.length && (
        <Text style={styles.meta}>{videos.length} selected</Text>
      )}

      <Text
        style={[styles.submitBtn, !canSubmit && styles.disabledBtn]}
        onPress={canSubmit ? submit : undefined}
      >
        {saving ? "Saving..." : "Submit"}
      </Text>

      {!!authUserId && (
        <Text style={styles.meta}>Auth user detected: {String(authUserId)}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: "#fff" },

  title: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 6 },

  label: { fontSize: 16, color: "#111", marginBottom: 8, marginTop: 12 },
  input: { fontSize: 16, color: "#111" },
  multi: { minHeight: 90, textAlignVertical: "top" },

  blueBtn: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#005ea6"
  },
  disabledText: { opacity: 0.6 },

  meta: { marginTop: 6, fontSize: 12, color: "#111", opacity: 0.7 },

  preview: { width: "100%", height: 160, borderRadius: 10, marginTop: 10 },

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
