// app/(buyer)/view-profile.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useAppDispatch } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";
import ReviewSummaryCard from "@/components/vendor-reviews/ReviewSummaryCard";
import ReviewList from "@/components/vendor-reviews/ReviewList";
import BuyerProfileField from "@/components/buyer/BuyerProfileField";
import { buyerProfileStyles as styles } from "@/components/buyer/buyerProfileStyles";
import { BUYER_PROFILE_SCREEN_WIDTH as width } from "@/constants/buyer";
import {
  getBuyerVendorProfile,
  getBuyerVendorReviews,
  getBuyerVendorReviewSummary,
  getVendorMediaUrl,
  getVendorMediaUrls,
  toSelectedVendor,
  type BuyerVendorProfile,
  type BuyerVendorReview,
  type BuyerVendorReviewSummary,
} from "@/services/buyer/vendorProfile";
import {
  decodeNumberParam,
  displayText,
  errorMessage,
  joinOrDash,
} from "@/utils/buyer";

export default function BuyerViewProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const vendorId = useMemo(
    () => decodeNumberParam((params as any)?.vendorId ?? (params as any)?.id),
    [params],
  );

  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState<BuyerVendorProfile | null>(null);
  const [missingParam, setMissingParam] = useState(false);

  const [reviewSummary, setReviewSummary] =
    useState<BuyerVendorReviewSummary | null>(null);
  const [reviews, setReviews] = useState<BuyerVendorReview[]>([]);

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");

  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<string>>(null);

  const bannerUrl = useMemo(
    () => getVendorMediaUrl(vendor?.banner_path),
    [vendor?.banner_path],
  );

  const profileUrl = useMemo(
    () => getVendorMediaUrl(vendor?.profile_image_path),
    [vendor?.profile_image_path],
  );

  const certificateUrls = useMemo(
    () => getVendorMediaUrls(vendor?.certificate_paths),
    [vendor?.certificate_paths],
  );

  const shopImageUrls = useMemo(
    () => getVendorMediaUrls(vendor?.shop_image_paths),
    [vendor?.shop_image_paths],
  );

  const shopVideoUrls = useMemo(
    () => getVendorMediaUrls(vendor?.shop_video_paths),
    [vendor?.shop_video_paths],
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
      ...(profileUrl ? [profileUrl] : []),
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
          animated: false,
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
      const row = await getBuyerVendorProfile(vendorId);
      setVendor(row);
      dispatch(setSelectedVendor(toSelectedVendor(row)));
    } catch (error) {
      Alert.alert("Load error", errorMessage(error, "Could not load vendor."));
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [vendorId, dispatch]);

  const fetchReviewData = useCallback(async () => {
    if (vendorId == null) {
      setReviewSummary(null);
      setReviews([]);
      return;
    }

    const [summaryResult, reviewsResult] = await Promise.allSettled([
      getBuyerVendorReviewSummary(vendorId),
      getBuyerVendorReviews(vendorId),
    ]);

    if (summaryResult.status === "fulfilled") {
      setReviewSummary(summaryResult.value);
    } else {
      console.warn("Review summary load error:", summaryResult.reason);
    }

    if (reviewsResult.status === "fulfilled") {
      setReviews(reviewsResult.value);
    } else {
      console.warn("Reviews load error:", reviewsResult.reason);
    }
  }, [vendorId]);

  useFocusEffect(
    useCallback(() => {
      fetchVendor();
      fetchReviewData();
    }, [fetchVendor, fetchReviewData]),
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Vendor Profile</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.linkBtn,
              pressed ? styles.pressed : null,
            ]}
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
            style={({ pressed }) => [
              styles.mediaBlock,
              pressed ? styles.pressed : null,
            ]}
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
                  style={({ pressed }) => [
                    styles.avatarPress,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Image
                    source={{ uri: profileUrl }}
                    style={styles.avatarImg}
                  />
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
                {displayText(vendor?.name)}
              </Text>
              <Text style={styles.shopText} numberOfLines={1}>
                {displayText(vendor?.shop_name)}
              </Text>
              <Text style={styles.statusText} numberOfLines={1}>
                Status: {displayText(vendor?.status)}
              </Text>
            </View>
          </View>

          <BuyerProfileField label="WhatsApp mobile" value={vendor?.mobile} />
          <BuyerProfileField
            label="Additional mobiles"
            value={joinOrDash(vendor?.additional_mobile_numbers)}
          />
          <BuyerProfileField
            label="Primary landline"
            value={vendor?.landline}
          />
          <BuyerProfileField
            label="Additional landlines"
            value={joinOrDash(vendor?.additional_landline_numbers)}
          />
          <BuyerProfileField label="Email" value={vendor?.email} />
          <BuyerProfileField label="Address" value={vendor?.address} />

          {!!String(vendor?.location_url ?? "").trim() ? (
            <Pressable
              onPress={() => openExternal(String(vendor?.location_url))}
              style={({ pressed }) => [
                styles.linkBtnInline,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.linkText}>Open Location</Text>
            </Pressable>
          ) : null}
        </View>

        <ReviewSummaryCard
          title="Ratings & Reviews"
          averageRating={reviewSummary?.average_rating ?? null}
          reviewCount={reviewSummary?.review_count ?? 0}
        />

        <Text style={styles.section}>Recent Comments</Text>
        <ReviewList
          reviews={reviews}
          emptyText="No reviews yet."
          showVendorReply
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Services</Text>

          <BuyerProfileField
            label="Dyeing"
            value={vendor?.offers_dyeing ? "Available" : "Not available"}
          />
          <BuyerProfileField
            label="Tailoring"
            value={vendor?.offers_tailoring ? "Available" : "Not available"}
          />
          <BuyerProfileField
            label="Exports"
            value={vendor?.exports_enabled ? "Yes" : "No"}
          />
          {vendor?.exports_enabled ? (
            <BuyerProfileField
              label="Export Regions"
              value={joinOrDash(vendor?.export_regions)}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Certificates</Text>
          {certificateUrls.length ? (
            <>
              <Text style={styles.meta}>
                Tap any certificate to view full screen.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {certificateUrls.map((u, idx) => (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openViewerAt(certificateUrls, idx)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        pressed ? styles.pressed : null,
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
          <Text style={styles.sectionTitle}>Shop Images</Text>
          {shopImageUrls.length ? (
            <>
              <Text style={styles.meta}>
                Tap any image to view full screen.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {shopImageUrls.map((u, idx) => (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openViewerAt(shopImageUrls, idx)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        pressed ? styles.pressed : null,
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
                        pressed ? styles.pressed : null,
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

        <View style={[styles.card, styles.metaCard]}>
          <Text style={styles.sectionTitle}>Meta</Text>

          <View style={styles.metaRow}>
            <Text style={styles.label}>Vendor ID</Text>
            <Text style={styles.value}>{displayText(vendor?.id)}</Text>
          </View>

          <View style={styles.metaRowSpaced}>
            <Text style={styles.label}>Created</Text>
            <Text style={styles.value}>
              {vendor?.created_at
                ? new Date(vendor.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </Text>
          </View>
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
            showsHorizontalScrollIndicator={false}
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
              <View style={styles.viewerSlide}>
                <Image source={{ uri: item }} style={styles.viewerImage} />
              </View>
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
