// File: app/vendor/create-shop.tsx

import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import GradientInputCard from "@/components/Wizard/GradientInputCard";
import VendorReviewSummary from "@/components/Wizard/VendorReviewSummary";
import WizardScaffold from "@/components/Wizard/WizardScraffold";
import { EXPORT_REGIONS } from "@/data/kapray/exportRegions";
import {
  BLOUSE_NECK_PATTERNS,
  BLOUSE_SLEEVE_PATTERNS,
  TROUSER_STYLES,
} from "@/data/kapray/tailoringOptions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";
import {
  STEPS,
  StepId,
  VendorWizardData,
  pickImages,
  pickVideos,
  uploadToBucket,
} from "@/utils/helpers/wizardHelpers";
import { supabase } from "@/utils/supabase/client";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");

const EMPTY_TAILORING_OPTIONS = {
  blouse_neck: [] as string[],
  sleeves: [] as string[],
  trouser: [] as string[],
};

const DEFAULT_TAILORING_OPTIONS = {
  blouse_neck: [...BLOUSE_NECK_PATTERNS],
  sleeves: [...BLOUSE_SLEEVE_PATTERNS],
  trouser: [...TROUSER_STYLES],
};

const initialForm: VendorWizardData = {
  ownerName: "",
  email: "",
  mobile: "",
  landline: "",
  shopName: "",
  address: "",
  locationUrl: "",
  offersTailoring: false,
  exportsEnabled: false,
  exportRegions: [],
  tailoringOptions: EMPTY_TAILORING_OPTIONS,
  profile: null,
  govPermission: null,
  banner: null,
  images: [],
  videos: [],
};

export default function CreateShopScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selectedVendor = useAppSelector((s) => s.vendor);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<VendorWizardData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const ownerRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const landlineRef = useRef<TextInput>(null);
  const shopRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const locationRef = useRef<TextInput>(null);

  useEffect(() => {
    if (stepIndex !== 0) return;

    const t = setTimeout(() => {
      ownerRef.current?.focus();
    }, 250);

    return () => clearTimeout(t);
  }, [stepIndex]);

  useEffect(() => {
    const onBackPress = () => {
      if (stepIndex > 0) {
        setStepIndex((prev) => prev - 1);
        return true;
      }

      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () => sub.remove();
  }, [stepIndex]);

  const updateForm = useCallback(
    <K extends keyof VendorWizardData>(key: K, value: VendorWizardData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleExportRegion = useCallback((region: string) => {
    setForm((prev) => {
      const exists = prev.exportRegions.includes(region);

      return {
        ...prev,
        exportRegions: exists
          ? prev.exportRegions.filter((r) => r !== region)
          : [...prev.exportRegions, region],
      };
    });
  }, []);

  const setCurrentLocation = useCallback(async () => {
    try {
      setLocLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Enable location to autofill.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      updateForm("locationUrl", `https://maps.google.com/?q=${lat},${lng}`);

      setTimeout(() => {
        locationRef.current?.focus();
      }, 80);
    } catch (e: any) {
      Alert.alert("Location Error", e?.message ?? "Could not get location.");
    } finally {
      setLocLoading(false);
    }
  }, [updateForm]);

  const validateStep = useCallback(
    (id: StepId) => {
      switch (id) {
        case "owner":
          if (!form.ownerName.trim()) {
            Alert.alert("Missing", "Enter vendor / owner name.");
            return false;
          }
          return true;

        case "email":
          if (!form.email.trim()) {
            Alert.alert("Missing", "Enter email.");
            return false;
          }
          return true;

        case "mobile":
          if (!form.mobile.trim()) {
            Alert.alert("Missing", "Enter mobile number.");
            return false;
          }
          return true;

        case "shop":
          if (!form.shopName.trim()) {
            Alert.alert("Missing", "Enter shop name.");
            return false;
          }
          return true;

        case "address":
          if (!form.address.trim()) {
            Alert.alert("Missing", "Enter address.");
            return false;
          }
          return true;

        case "tailoring":
          if (form.exportsEnabled && (form.exportRegions?.length ?? 0) === 0) {
            Alert.alert("Missing", "Please select at least one export region.");
            return false;
          }

          return true;

        default:
          return true;
      }
    },
    [form],
  );

  const canGoNext = useMemo(() => {
    if (saving) return false;

    switch (currentStep.id) {
      case "owner":
        return form.ownerName.trim().length > 0;
      case "email":
        return form.email.trim().length > 0;
      case "mobile":
        return form.mobile.trim().length > 0;
      case "shop":
        return form.shopName.trim().length > 0;
      case "address":
        return form.address.trim().length > 0;
      default:
        return true;
    }
  }, [currentStep.id, form, saving]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    setStepIndex((prev) => prev - 1);
  }, [router, stepIndex]);

  const submitVendor = useCallback(async () => {
    if (form.exportsEnabled && (form.exportRegions?.length ?? 0) === 0) {
      Alert.alert("Missing", "Please select at least one export region.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      Alert.alert("Error", "Vendor session not found. Please sign in again.");
      return;
    }

    const authUserId = user.id;

    const normalizedTailoringOptions = form.offersTailoring
      ? {
          blouse_neck: [...BLOUSE_NECK_PATTERNS],
          sleeves: [...BLOUSE_SLEEVE_PATTERNS],
          trouser: [...TROUSER_STYLES],
        }
      : {
          blouse_neck: [],
          sleeves: [],
          trouser: [],
        };

    const normalizedExportRegions = form.exportsEnabled
      ? form.exportRegions
      : [];

    const { data: existingVendor, error: existingVendorError } = await supabase
      .from("vendor")
      .select("id, created_at, auth_user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (existingVendorError) {
      setSaving(false);
      Alert.alert(
        "Error",
        existingVendorError.message ?? "Could not check existing vendor.",
      );
      return;
    }

    let vendor_id: number;
    let vendorCreatedAt: string | null = null;

    if (existingVendor?.id) {
      const { error: baseUpdateError } = await supabase
        .from("vendor")
        .update({
          owner_user_id: authUserId,
          auth_user_id: authUserId,
          name: form.ownerName.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          landline: form.landline.trim() || null,
          shop_name: form.shopName.trim(),
          address: form.address.trim(),
          location_url: form.locationUrl.trim() || null,
          offers_tailoring: Boolean(form.offersTailoring),
          exports_enabled: Boolean(form.exportsEnabled),
          export_regions: normalizedExportRegions,
          tailoring_options: normalizedTailoringOptions,
          location: form.address.trim(),
          status: "pending",
        })
        .eq("id", existingVendor.id);

      if (baseUpdateError) {
        setSaving(false);
        Alert.alert(
          "Error",
          baseUpdateError.message ?? "Could not update vendor.",
        );
        return;
      }

      vendor_id = Number(existingVendor.id);
      vendorCreatedAt = existingVendor.created_at ?? null;
    } else {
      const { data: vendorRow, error: insertError } = await supabase
        .from("vendor")
        .insert({
          owner_user_id: authUserId,
          auth_user_id: authUserId,
          name: form.ownerName.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          landline: form.landline.trim() || null,
          shop_name: form.shopName.trim(),
          address: form.address.trim(),
          location_url: form.locationUrl.trim() || null,
          offers_tailoring: Boolean(form.offersTailoring),
          exports_enabled: Boolean(form.exportsEnabled),
          export_regions: normalizedExportRegions,
          tailoring_options: normalizedTailoringOptions,
          location: form.address.trim(),
          status: "pending",
        })
        .select("id, created_at, auth_user_id")
        .single();

      if (insertError || !vendorRow?.id) {
        setSaving(false);
        Alert.alert(
          "Error",
          insertError?.message ?? "Could not register vendor.",
        );
        return;
      }

      vendor_id = Number(vendorRow.id);
      vendorCreatedAt = vendorRow.created_at ?? null;
    }

    const ts = Date.now();

    const profilePath = form.profile
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendor_id}/profile/${ts}-${form.profile.fileName || "profile"}`,
          form.profile,
          "image/jpeg",
        )
      : (selectedVendor?.profile_image_path ?? null);

    const certPath = form.govPermission
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendor_id}/certificates/${ts}-${form.govPermission.fileName || "file"}`,
          form.govPermission,
          "image/jpeg",
        )
      : (selectedVendor?.certificate_paths?.[0] ?? null);

    const bannerPath = form.banner
      ? await uploadToBucket(
          BUCKET_VENDOR,
          `vendors/${vendor_id}/banner/${ts}-${form.banner.fileName || "banner"}`,
          form.banner,
          "image/jpeg",
        )
      : (selectedVendor?.banner_path ?? null);

    const imagePaths: string[] = [];
    for (let i = 0; i < form.images.length; i++) {
      const p = await uploadToBucket(
        BUCKET_VENDOR,
        `vendors/${vendor_id}/shop-images/${ts}-${i}-${form.images[i].fileName || "image"}`,
        form.images[i],
        "image/jpeg",
      );
      if (p) imagePaths.push(p);
    }

    const videoPaths: string[] = [];
    for (let i = 0; i < form.videos.length; i++) {
      const p = await uploadToBucket(
        BUCKET_VENDOR,
        `vendors/${vendor_id}/shop-videos/${ts}-${i}-${form.videos[i].fileName || "video"}`,
        form.videos[i],
        "video/mp4",
      );
      if (p) videoPaths.push(p);
    }

    const certificate_paths = certPath ? [certPath] : null;

    const { error: upErr } = await supabase
      .from("vendor")
      .update({
        owner_user_id: authUserId,
        auth_user_id: authUserId,
        profile_image_path: profilePath,
        banner_path: bannerPath,
        certificate_paths,
        shop_image_paths: imagePaths.length
          ? imagePaths
          : (selectedVendor?.shop_image_paths ?? null),
        shop_video_paths: videoPaths.length
          ? videoPaths
          : (selectedVendor?.shop_video_paths ?? null),
        offers_tailoring: Boolean(form.offersTailoring),
        exports_enabled: Boolean(form.exportsEnabled),
        export_regions: normalizedExportRegions,
        tailoring_options: normalizedTailoringOptions,
        status: "pending",
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
        created_at: vendorCreatedAt,
        owner_user_id: authUserId,
        auth_user_id: authUserId,
        has_shop: true,
        name: form.ownerName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        landline: form.landline.trim() || null,
        shop_name: form.shopName.trim(),
        address: form.address.trim(),
        location_url: form.locationUrl.trim() || null,
        profile_image_path: profilePath,
        banner_path: bannerPath,
        certificate_paths,
        shop_image_paths: imagePaths.length
          ? imagePaths
          : (selectedVendor?.shop_image_paths ?? null),
        shop_video_paths: videoPaths.length
          ? videoPaths
          : (selectedVendor?.shop_video_paths ?? null),
        offers_tailoring: Boolean(form.offersTailoring),
        exports_enabled: Boolean(form.exportsEnabled),
        export_regions: normalizedExportRegions,
        tailoring_options: normalizedTailoringOptions,
        status: "pending",
        owner_name: form.ownerName.trim(),
        banner_url: bannerPath,
        images: imagePaths.length
          ? imagePaths
          : (selectedVendor?.images ?? null),
        videos: videoPaths.length
          ? videoPaths
          : (selectedVendor?.videos ?? null),
        image: profilePath,
        location: form.address.trim(),
      }),
    );

    router.replace("/vendor/profile/settings");
  }, [dispatch, form, router, selectedVendor]);

  const goNext = useCallback(async () => {
    if (!validateStep(currentStep.id)) return;

    if (editingStepIndex !== null) {
      setStepIndex(STEPS.length - 1);
      setEditingStepIndex(null);
      return;
    }

    if (isLastStep) {
      await submitVendor();
      return;
    }

    setStepIndex((prev) => prev + 1);
  }, [
    currentStep.id,
    editingStepIndex,
    isLastStep,
    submitVendor,
    validateStep,
  ]);

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
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false,
        });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [viewerVisible, currentIndex, gallery.length]);

  useEffect(() => {
    const all = [
      ...(form.profile?.uri ? [form.profile.uri] : []),
      ...(form.govPermission?.uri ? [form.govPermission.uri] : []),
      ...(form.banner?.uri ? [form.banner.uri] : []),
      ...form.images.map((x) => x.uri),
    ].filter(Boolean);

    all.forEach((u) => {
      try {
        Image.prefetch(u);
      } catch {
        // ignore
      }
    });
  }, [
    form.banner?.uri,
    form.govPermission?.uri,
    form.images,
    form.profile?.uri,
  ]);

  const [videoThumbByUri, setVideoThumbByUri] = useState<
    Record<string, string>
  >({});
  const [selectedVideoUri, setSelectedVideoUri] = useState<string>("");

  const ensureVideoThumb = useCallback(
    async (videoUri: string) => {
      const u = String(videoUri || "").trim();
      if (!u) return null;
      if (videoThumbByUri[u]) return videoThumbByUri[u];

      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(u, {
          time: 1000,
        });
        if (uri) {
          setVideoThumbByUri((prev) => ({ ...prev, [u]: uri }));
          return uri;
        }
        return null;
      } catch {
        return null;
      }
    },
    [videoThumbByUri],
  );

  useEffect(() => {
    const list = form.videos.map((v) => v.uri).filter(Boolean);
    if (!list.length) {
      setSelectedVideoUri("");
      return;
    }

    if (!selectedVideoUri || !list.includes(selectedVideoUri)) {
      setSelectedVideoUri(list[0]);
    }

    (async () => {
      for (let i = 0; i < list.length; i++) {
        await ensureVideoThumb(list[i]);
      }
    })();
  }, [ensureVideoThumb, form.videos, selectedVideoUri]);

  const player = useVideoPlayer(selectedVideoUri || "");

  useEffect(() => {
    try {
      if (player) player.loop = false;
    } catch {
      // ignore
    }
  }, [player]);

  const shopImageUris = useMemo(
    () => form.images.map((x) => x.uri).filter(Boolean),
    [form.images],
  );

  const shopVideoUris = useMemo(
    () => form.videos.map((x) => x.uri).filter(Boolean),
    [form.videos],
  );

  const renderStepContent = () => {
    switch (currentStep.id) {
      case "owner":
        return (
          <GradientInputCard
            ref={ownerRef}
            placeholder="Enter owner name"
            value={form.ownerName}
            onChangeText={(v) => updateForm("ownerName", v)}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={goNext}
          />
        );

      case "email":
        return (
          <GradientInputCard
            ref={emailRef}
            placeholder="Enter email"
            value={form.email}
            onChangeText={(v) => updateForm("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={goNext}
          />
        );

      case "mobile":
        return (
          <GradientInputCard
            ref={mobileRef}
            placeholder="Enter mobile number"
            value={form.mobile}
            onChangeText={(v) => updateForm("mobile", v)}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={goNext}
          />
        );

      case "shop":
        return (
          <GradientInputCard
            ref={shopRef}
            placeholder="Enter shop name"
            value={form.shopName}
            onChangeText={(v) => updateForm("shopName", v)}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={goNext}
          />
        );

      case "address":
        return (
          <GradientInputCard
            ref={addressRef}
            placeholder="Enter full address"
            value={form.address}
            onChangeText={(v) => updateForm("address", v)}
            multiline
          />
        );

      case "location":
        return (
          <>
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Map location</Text>
              <Text style={styles.previewSubtext}>
                Paste a Google Maps link, or use the current device location.
              </Text>

              <GradientInputCard
                ref={locationRef}
                placeholder="Paste Google Maps link"
                value={form.locationUrl}
                onChangeText={(v) => updateForm("locationUrl", v)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                onSubmitEditing={goNext}
              />

              <Pressable
                onPress={locLoading ? undefined : setCurrentLocation}
                disabled={locLoading}
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  locLoading ? styles.secondaryActionButtonDisabled : null,
                  pressed && !locLoading ? styles.pressed : null,
                ]}
              >
                <Text style={styles.secondaryActionButtonText}>
                  {locLoading ? "Getting location..." : "Use current location"}
                </Text>
              </Pressable>
            </View>

            {!!form.locationUrl.trim() && (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Current location URL</Text>
                <Text style={styles.previewValue}>
                  {form.locationUrl.trim()}
                </Text>
              </View>
            )}
          </>
        );

      case "tailoring":
        return (
          <View>
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>
                Does this shop offer tailoring?
              </Text>

              <View style={styles.choiceGrid}>
                <Pressable
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      offersTailoring: true,
                      tailoringOptions: DEFAULT_TAILORING_OPTIONS,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.choiceCard,
                    form.offersTailoring && styles.choiceCardActive,
                    pressed && styles.choiceCardPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceCardTitle,
                      form.offersTailoring && styles.choiceCardTitleActive,
                    ]}
                  >
                    Yes
                  </Text>
                  <Text
                    style={[
                      styles.choiceCardSubtitle,
                      form.offersTailoring && styles.choiceCardSubtitleActive,
                    ]}
                  >
                    This shop offers tailoring services for their unstitched
                    products
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      offersTailoring: false,
                      tailoringOptions: EMPTY_TAILORING_OPTIONS,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.choiceCard,
                    !form.offersTailoring && styles.choiceCardActive,
                    pressed && styles.choiceCardPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceCardTitle,
                      !form.offersTailoring && styles.choiceCardTitleActive,
                    ]}
                  >
                    No
                  </Text>
                  <Text
                    style={[
                      styles.choiceCardSubtitle,
                      !form.offersTailoring && styles.choiceCardSubtitleActive,
                    ]}
                  >
                    The shop only sells unstitched or ready-made items
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Do you export?</Text>

              <View style={styles.choiceGrid}>
                <Pressable
                  onPress={() => updateForm("exportsEnabled", true)}
                  style={({ pressed }) => [
                    styles.choiceCard,
                    form.exportsEnabled && styles.choiceCardActive,
                    pressed && styles.choiceCardPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceCardTitle,
                      form.exportsEnabled && styles.choiceCardTitleActive,
                    ]}
                  >
                    Yes
                  </Text>
                  <Text
                    style={[
                      styles.choiceCardSubtitle,
                      form.exportsEnabled && styles.choiceCardSubtitleActive,
                    ]}
                  >
                    This shop exports internationally
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    updateForm("exportsEnabled", false);
                    updateForm("exportRegions", []);
                  }}
                  style={({ pressed }) => [
                    styles.choiceCard,
                    !form.exportsEnabled && styles.choiceCardActive,
                    pressed && styles.choiceCardPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceCardTitle,
                      !form.exportsEnabled && styles.choiceCardTitleActive,
                    ]}
                  >
                    No
                  </Text>
                  <Text
                    style={[
                      styles.choiceCardSubtitle,
                      !form.exportsEnabled && styles.choiceCardSubtitleActive,
                    ]}
                  >
                    This shop only delivers locally
                  </Text>
                </Pressable>
              </View>

              {form.exportsEnabled ? (
                <>
                  <Text style={styles.optionGroupTitle}>
                    Select export regions
                  </Text>
                  <View style={styles.chipWrap}>
                    {EXPORT_REGIONS.map((region) => {
                      const selected = form.exportRegions?.includes(region);
                      return (
                        <Pressable
                          key={region}
                          style={[
                            styles.choiceChip,
                            selected && styles.choiceChipActive,
                          ]}
                          onPress={() => toggleExportRegion(region)}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              selected && styles.choiceChipTextActive,
                            ]}
                          >
                            {region}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </View>
          </View>
        );

      case "media":
        return (
          <>
            <View style={styles.mediaCard}>
              <Text style={styles.mediaTitle}>Vendor profile / logo</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.uploadButton,
                  pressed && styles.pressed,
                ]}
                onPress={async () => {
                  const picked = await pickImages(false);
                  updateForm("profile", picked[0] ?? null);
                }}
              >
                <Text style={styles.uploadButtonText}>
                  {form.profile ? "Change image" : "Upload image"}
                </Text>
              </Pressable>

              {!!form.profile?.uri && (
                <Pressable onPress={() => openViewerAt([form.profile!.uri], 0)}>
                  <Image
                    source={{ uri: form.profile.uri }}
                    style={styles.largePreviewImage}
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.mediaCard}>
              <Text style={styles.mediaTitle}>Authority permission</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.uploadButton,
                  pressed && styles.pressed,
                ]}
                onPress={async () => {
                  const picked = await pickImages(false);
                  updateForm("govPermission", picked[0] ?? null);
                }}
              >
                <Text style={styles.uploadButtonText}>
                  {form.govPermission ? "Change image" : "Upload permission"}
                </Text>
              </Pressable>

              {!!form.govPermission?.uri && (
                <Pressable
                  onPress={() => openViewerAt([form.govPermission!.uri], 0)}
                >
                  <Image
                    source={{ uri: form.govPermission.uri }}
                    style={styles.largePreviewImage}
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.mediaCard}>
              <Text style={styles.mediaTitle}>Shop banner</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.uploadButton,
                  pressed && styles.pressed,
                ]}
                onPress={async () => {
                  const picked = await pickImages(false);
                  updateForm("banner", picked[0] ?? null);
                }}
              >
                <Text style={styles.uploadButtonText}>
                  {form.banner ? "Change banner" : "Upload banner"}
                </Text>
              </Pressable>

              {!!form.banner?.uri && (
                <Pressable onPress={() => openViewerAt([form.banner!.uri], 0)}>
                  <Image
                    source={{ uri: form.banner.uri }}
                    style={styles.largePreviewImage}
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.mediaCard}>
              <Text style={styles.mediaTitle}>Shop photos</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.uploadButton,
                  pressed && styles.pressed,
                ]}
                onPress={async () => {
                  const picked = await pickImages(true);
                  updateForm("images", picked);
                }}
              >
                <Text style={styles.uploadButtonText}>
                  {form.images.length
                    ? `${form.images.length} image${form.images.length > 1 ? "s" : ""} selected`
                    : "Upload shop photos"}
                </Text>
              </Pressable>

              {shopImageUris.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.thumbRow}>
                    {shopImageUris.map((u, idx) => (
                      <Pressable
                        key={`${u}-${idx}`}
                        onPress={() => openViewerAt(shopImageUris, idx)}
                      >
                        <Image source={{ uri: u }} style={styles.thumb} />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            <View style={styles.mediaCard}>
              <Text style={styles.mediaTitle}>Shop videos</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.uploadButton,
                  pressed && styles.pressed,
                ]}
                onPress={async () => {
                  const picked = await pickVideos(true);
                  updateForm("videos", picked);
                }}
              >
                <Text style={styles.uploadButtonText}>
                  {form.videos.length
                    ? `${form.videos.length} video${form.videos.length > 1 ? "s" : ""} selected`
                    : "Upload shop videos"}
                </Text>
              </Pressable>

              {!!selectedVideoUri && (
                <View style={styles.videoBox}>
                  <VideoView
                    player={player}
                    style={styles.video}
                    allowsFullscreen
                    allowsPictureInPicture
                  />
                </View>
              )}
            </View>
          </>
        );

      case "review":
        return (
          <VendorReviewSummary
            form={form}
            jumpToStep={(index) => {
              setEditingStepIndex(index);
              setStepIndex(index);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <WizardScaffold
        title={currentStep.title}
        subtitle={currentStep.subtitle}
        stepIndex={stepIndex}
        totalSteps={STEPS.length}
        onBack={goBack}
        onNext={goNext}
        nextLabel={
          isLastStep ? (saving ? "Submitting..." : "Submit vendor") : "Continue"
        }
        nextDisabled={!canGoNext}
      >
        {renderStepContent()}
      </WizardScaffold>

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
              index: i,
            })}
            initialScrollIndex={Math.max(
              0,
              Math.min(currentIndex, Math.max(0, gallery.length - 1)),
            )}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next =
                Math.round(e.nativeEvent.contentOffset.x / width) || 0;
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  previewCard: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewLabel: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  previewValue: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  reviewValue: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  previewSubtext: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 14,
  },
  secondaryActionButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },
  secondaryActionButtonDisabled: {
    opacity: 0.6,
  },
  secondaryActionButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
  choiceGrid: {
    flexDirection: "row",
    gap: 10,
  },
  choiceCard: {
    flex: 1,
    minHeight: 140,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D7E3FF",
    justifyContent: "center",
  },
  choiceCardActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  choiceCardPressed: {
    opacity: 0.82,
  },
  choiceCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 4,
    textAlign: "center",
  },
  choiceCardTitleActive: {
    color: "#FFFFFF",
  },
  choiceCardSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: "#2563EB",
    fontWeight: "700",
    textAlign: "center",
  },
  choiceCardSubtitleActive: {
    color: "#FFFFFF",
  },
  optionGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 14,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  choiceChip: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  choiceChipText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  choiceChipTextActive: {
    color: "#FFFFFF",
  },
  mediaCard: {
    marginBottom: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  uploadButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },
  uploadButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
  thumbRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  largePreviewImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    marginTop: 14,
  },
  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  emptyText: {
    marginTop: 12,
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    fontWeight: "700",
  },
  videoBox: {
    marginTop: 14,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  video: {
    width: "100%",
    height: 220,
  },
  videoThumbActive: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  videoPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
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
    justifyContent: "center",
  },
  playBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  viewerImage: {
    width,
    height: "100%",
    resizeMode: "contain",
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
    justifyContent: "center",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  indexCaption: {
    position: "absolute",
    bottom: 34,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  indexText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});
