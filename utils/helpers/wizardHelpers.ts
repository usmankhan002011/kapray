import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import { supabase } from "@/utils/supabase/client";

export type Picked = { uri: string; mimeType?: string; fileName?: string };

export type VendorWizardData = {
  ownerName: string;
  email: string;
  mobile: string;
  landline: string;
  shopName: string;
  address: string;
  locationUrl: string;
  offersTailoring: boolean;

  exportsEnabled: boolean;
  exportRegions: string[];
  tailoringOptions: {
    blouse_neck: string[];
    sleeves: string[];
    trouser: string[];
  };

  profile: Picked | null;
  govPermission: Picked | null;
  banner: Picked | null;
  images: Picked[];
  videos: Picked[];
};

export type StepId =
  | "owner"
  | "email"
  | "mobile"
  | "shop"
  | "address"
  | "location"
  | "tailoring"
  | "media"
  | "review";

export type StepConfig = {
  id: StepId;
  title: string;
  subtitle: string;
};

export const STEPS: StepConfig[] = [
  {
    id: "owner",
    title: "Who owns this shop?",
    subtitle: "Write the owner name.",
  },
  {
    id: "email",
    title: "What is the shop email?",
    subtitle: "Add the main email customers can use.",
  },
  {
    id: "mobile",
    title: "What is the mobile number?",
    subtitle: "Add the primary mobile contact number.",
  },
  {
    id: "shop",
    title: "What is the shop name?",
    subtitle: "Add the name of the shop.",
  },
  {
    id: "address",
    title: "Where is the shop located?",
    subtitle: "Enter the full address visible to users.",
  },
  {
    id: "location",
    title: "Attach a map location",
    subtitle: "You can paste a map link or use the current location.",
  },
  {
    id: "tailoring",
    title: "Tailoring and export services",
    subtitle: "Set tailoring capability, styles, and export regions.",
  },
  {
    id: "media",
    title: "Add photos and videos",
    subtitle: "Upload profile, shop banner, images, and videos.",
  },
  {
    id: "review",
    title: "Review and submit",
    subtitle: "Check everything once before creating the vendor.",
  },
];

export function prettyNameFromPicked(p: Picked, fallback: string) {
  if (p.fileName && p.fileName.trim()) return p.fileName.trim();
  const parts = (p.uri || "").split("/");
  const last = parts[parts.length - 1];
  return last || fallback;
}

export async function pickImages(multiple: boolean) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission denied", "Allow gallery access.");
    return [] as Picked[];
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"] as any,
    allowsMultipleSelection: multiple,
    quality: 0.85,
  });

  if (res.canceled) return [] as Picked[];

  return (res.assets ?? []).map((a: any) => ({
    uri: a.uri,
    mimeType: a.mimeType,
    fileName: a.fileName,
  })) as Picked[];
}

export async function pickVideos(multiple: boolean) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission denied", "Allow gallery access.");
    return [] as Picked[];
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"] as any,
    allowsMultipleSelection: multiple,
  });

  if (res.canceled) return [] as Picked[];

  return (res.assets ?? []).map((a: any) => ({
    uri: a.uri,
    mimeType: a.mimeType,
    fileName: a.fileName,
  })) as Picked[];
}

export async function uploadToBucket(
  bucket: string,
  path: string,
  file: Picked,
  fallbackContentType: string
): Promise<string | null> {
  try {
    const contentType = file.mimeType || fallbackContentType;

    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
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