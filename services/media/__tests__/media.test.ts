import {
  getFabricTypeMediaUrl,
  getVendorMediaPathFromPublicUrl,
  getVendorMediaPublicUrl,
  getVendorMediaUrl,
  getVendorMediaUrls,
  uploadVendorMedia,
  uploadVendorMediaWithOverwrite,
} from "../media";
import {
  resetSupabaseMock,
  storageFromMock,
  uploadMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("media service", () => {
  it("keeps remote URLs and resolves vendor media paths", () => {
    expect(getVendorMediaUrl("https://cdn.test/banner.jpg")).toBe(
      "https://cdn.test/banner.jpg",
    );
    expect(storageFromMock).not.toHaveBeenCalled();

    expect(getVendorMediaPublicUrl("vendors/7/banner.jpg")).toBe(
      "https://storage.test/vendors/7/banner.jpg",
    );
    expect(getVendorMediaUrls(["vendors/7/a.jpg", "", "   "])).toEqual([
      "https://storage.test/vendors/7/a.jpg",
    ]);
    expect(storageFromMock).toHaveBeenCalledWith("vendor_images");
  });

  it("resolves fabric media from its own bucket", () => {
    expect(getFabricTypeMediaUrl("silk.jpg")).toBe(
      "https://storage.test/silk.jpg",
    );
    expect(storageFromMock).toHaveBeenCalledWith("fabric-types");
  });

  it("extracts a vendor storage path from its public URL", () => {
    const path = "vendors/7/products/KP-7/main image.jpg";
    const url =
      "https://project.supabase.co/storage/v1/object/public/vendor_images/vendors/7/products/KP-7/main%20image.jpg";

    expect(getVendorMediaPathFromPublicUrl(url)).toBe(path);
    expect(getVendorMediaPathFromPublicUrl("file:///local/main.jpg")).toBe("");
  });

  it("preserves each upload overwrite policy", async () => {
    const fileBody = new ArrayBuffer(2);
    const media = {
      path: "vendors/7/products/KP-7/main.jpg",
      fileBody,
      contentType: "image/jpeg",
    };

    await uploadVendorMedia(media);
    await uploadVendorMediaWithOverwrite(media);

    expect(uploadMock).toHaveBeenNthCalledWith(1, media.path, fileBody, {
      contentType: "image/jpeg",
      upsert: false,
    });
    expect(uploadMock).toHaveBeenNthCalledWith(2, media.path, fileBody, {
      contentType: "image/jpeg",
      upsert: true,
    });
  });
});
