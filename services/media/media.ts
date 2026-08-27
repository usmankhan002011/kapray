import { appSupabase } from "@/services/supabase";
import { isHttpUrl, toStringArray } from "@/utils/buyer";

const VENDOR_MEDIA_BUCKET = "vendor_images";
const FABRIC_TYPE_MEDIA_BUCKET = "fabric-types";

type MediaUpload = {
  path: string;
  fileBody: ArrayBuffer;
  contentType: string;
};

function getPublicUrl(bucket: string, path: string): string {
  return appSupabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function upload(bucket: string, media: MediaUpload, upsert: boolean) {
  return appSupabase.storage.from(bucket).upload(media.path, media.fileBody, {
    contentType: media.contentType,
    upsert,
  });
}

export function getVendorMediaPublicUrl(path: string): string {
  return getPublicUrl(VENDOR_MEDIA_BUCKET, path);
}

export function getVendorMediaUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  return isHttpUrl(path) ? path : getVendorMediaPublicUrl(path);
}

export function getVendorMediaUrls(paths: unknown): string[] {
  return toStringArray(paths)
    .map(getVendorMediaUrl)
    .filter((url): url is string => Boolean(url));
}

export function getVendorMediaPathFromPublicUrl(url: string): string {
  const marker = `/storage/v1/object/public/${VENDOR_MEDIA_BUCKET}/`;
  const clean = url.trim();
  const index = clean.indexOf(marker);
  return index >= 0
    ? decodeURIComponent(clean.slice(index + marker.length))
    : "";
}

export function getFabricTypeMediaUrl(path: string): string {
  return getPublicUrl(FABRIC_TYPE_MEDIA_BUCKET, path);
}

export function uploadVendorMedia(media: MediaUpload) {
  return upload(VENDOR_MEDIA_BUCKET, media, false);
}

export function uploadVendorMediaWithOverwrite(media: MediaUpload) {
  return upload(VENDOR_MEDIA_BUCKET, media, true);
}
