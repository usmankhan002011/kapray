import { Dimensions } from "react-native";

export const BUYER_RATING_VALUES = [1, 2, 3, 4, 5] as const;
export const BUYER_VENDOR_MEDIA_BUCKET = "vendor_images";
export const BUYER_PROFILE_SCREEN_WIDTH = Dimensions.get("window").width;

export const BUYER_COLORS = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  blueBorder: "#D7E3FF",
  text: "#0F172A",
  muted: "#64748B",
  placeholder: "#94A3B8",
  mediaPlaceholder: "#F1F5F9",
  overlay: "rgba(255,255,255,0.14)",
} as const;
