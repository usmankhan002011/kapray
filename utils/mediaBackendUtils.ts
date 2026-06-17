import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

import { supabase } from "@/utils/supabase/client";

export const VENDOR_MEDIA_BUCKET = "vendor_images";

export type VendorMediaFile = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function getVendorMediaPublicUrl(
  pathOrUrl: string | null | undefined,
): string | null {
  const clean = String(pathOrUrl ?? "").trim();
  if (!clean) return null;
  if (isHttpUrl(clean)) return clean;

  const { data } = supabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .getPublicUrl(clean);

  return data?.publicUrl ?? null;
}

export function getVendorMediaPublicUrlOrEmpty(
  pathOrUrl: string | null | undefined,
) {
  return getVendorMediaPublicUrl(pathOrUrl) ?? "";
}

export function getVendorMediaPathFromPublicUrl(urlOrPath: string) {
  const clean = String(urlOrPath ?? "").trim();
  if (!clean) return "";
  if (!isHttpUrl(clean)) return clean.replace(/^\/+/, "");

  const marker = `/storage/v1/object/public/${VENDOR_MEDIA_BUCKET}/`;
  const idx = clean.indexOf(marker);
  if (idx < 0) return "";

  return decodeURIComponent(clean.slice(idx + marker.length));
}

export async function uploadVendorMediaBuffer(args: {
  path: string;
  buffer: ArrayBuffer;
  contentType: string;
  upsert?: boolean;
}) {
  const { data, error } = await supabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .upload(args.path, args.buffer, {
      contentType: args.contentType,
      upsert: args.upsert ?? true,
    });

  if (error) throw new Error(error.message);
  return data?.path ?? args.path;
}

export async function uploadVendorMediaFromUri(args: {
  path: string;
  uri: string;
  contentType: string;
  upsert?: boolean;
}) {
  const base64 = await FileSystem.readAsStringAsync(args.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buffer = decode(base64);

  return uploadVendorMediaBuffer({
    path: args.path,
    buffer,
    contentType: args.contentType,
    upsert: args.upsert,
  });
}

export async function uploadVendorMediaFile(args: {
  path: string;
  file: VendorMediaFile;
  fallbackContentType: string;
  upsert?: boolean;
}) {
  return uploadVendorMediaFromUri({
    path: args.path,
    uri: args.file.uri,
    contentType: args.file.mimeType || args.fallbackContentType,
    upsert: args.upsert,
  });
}
