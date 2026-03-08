import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function Q10Videos() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const { draft, setVideos } = useProductDraft() as any;

  const pickedVideos: any[] = Array.isArray(draft?.media?.videos) ? draft.media.videos : [];
  const videoCount = pickedVideos.length;

  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;

    const uris = pickedVideos.map((v) => safeStr(v?.uri)).filter(Boolean);

    (async () => {
      for (const uri of uris) {
        if (!alive) return;
        if (videoThumbs[uri]) continue;

        try {
          const t = await VideoThumbnails.getThumbnailAsync(uri, { time: 1500 });
          if (!alive) return;
          if (t?.uri) {
            setVideoThumbs((prev) => {
              if (prev[uri]) return prev;
              return { ...prev, [uri]: t.uri };
            });
          }
        } catch {
          // ignore thumb failures
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedVideos]);

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);

  async function pickVideos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      quality: 1
    });

    if (res.canceled) return;

    setVideos?.((prev: any[]) => {
      const p = Array.isArray(prev) ? prev : [];
      const seen = new Set(p.map((a) => a.uri));
      const next = [...p];
      for (const a of res.assets) {
        if (!seen.has(a.uri)) next.push(a);
      }
      return next;
    });
  }

  function removeVideo(uri: string) {
    setVideos?.((prev: any[]) => {
      const p = Array.isArray(prev) ? prev : [];
      return p.filter((a: any) => safeStr(a?.uri) !== uri);
    });
  }

  function goNext() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q11-description" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Videos</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Pick videos (optional)</Text>

          <Pressable
            style={({ pressed }) => [apStyles.secondaryBtn, pressed ? apStyles.pressed : null]}
            onPress={pickVideos}
          >
            <Text style={apStyles.secondaryText}>Pick Videos {videoCount ? `(${videoCount})` : ""}</Text>
          </Pressable>

          {pickedVideos.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 10, gap: 10 }}
            >
              {pickedVideos.map((a: any, idx: number) => {
                const uri = safeStr(a?.uri);
                if (!uri) return null;

                const tUri = videoThumbs[uri];

                return (
                  <View
                    key={`${uri}-${idx}`}
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 12,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: apColors.borderSoft,
                      backgroundColor: "#f3f4f6"
                    }}
                  >
                    {tUri ? (
                      <Image source={{ uri: tUri }} style={{ width: 76, height: 76 }} />
                    ) : (
                      <View style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontWeight: "900", color: "#111", opacity: 0.7 }}>Video</Text>
                      </View>
                    )}

                    <Pressable
                      onPress={() => removeVideo(uri)}
                      style={({ pressed }) => [
                        {
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(0,0,0,0.55)"
                        },
                        pressed ? apStyles.pressed : null
                      ]}
                      hitSlop={10}
                    >
                      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={apStyles.metaHint}>Pick videos or skip.</Text>
          )}

          <View style={apStyles.btnStack}>
            <Pressable
              style={({ pressed }) => [apStyles.dangerBtn, pressed ? apStyles.pressed : null]}
              onPress={goNext}
              disabled={!canContinue}
            >
              <Text style={apStyles.dangerText}>Skip</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                apStyles.primaryBtn,
                !canContinue ? apStyles.primaryBtnDisabled : null,
                pressed ? apStyles.pressed : null
              ]}
              onPress={goNext}
              disabled={!canContinue}
            >
              <Text style={apStyles.primaryText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}