import {
  createVendorProduct,
  getAddProductAssetPathFromPublicUrl,
  getAddProductAssetPublicUrl,
  getVendorAddProductSettings,
  updateVendorProductMedia,
  uploadAddProductAsset,
} from "../addProduct";
import {
  createQueryMock,
  getPublicUrlMock,
  registerTableQuery,
  resetSupabaseMock,
  storageFromMock,
  uploadMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("add product service", () => {
  it("loads vendor tailoring settings", async () => {
    const settings = {
      id: 7,
      offers_tailoring: true,
      tailoring_options: { sleeves: ["Full"] },
    };
    const query = createQueryMock({
      single: { data: settings, error: null },
    });
    registerTableQuery("vendor", query);

    await expect(getVendorAddProductSettings(7)).resolves.toEqual({
      data: settings,
      error: null,
    });
    expect(query.select).toHaveBeenCalledWith(
      "id, offers_tailoring, tailoring_options",
    );
    expect(query.eq).toHaveBeenCalledWith("id", 7);
  });

  it("uploads product media to the vendor image bucket", async () => {
    const fileBody = new ArrayBuffer(2);
    uploadMock.mockResolvedValueOnce({
      data: { path: "vendors/7/products/KP-7/main.jpg" },
      error: null,
    });

    await expect(
      uploadAddProductAsset({
        path: "vendors/7/products/KP-7/main.jpg",
        fileBody,
        contentType: "image/jpeg",
      }),
    ).resolves.toEqual({
      data: { path: "vendors/7/products/KP-7/main.jpg" },
      error: null,
    });
    expect(storageFromMock).toHaveBeenCalledWith("vendor_images");
    expect(uploadMock).toHaveBeenCalledWith(
      "vendors/7/products/KP-7/main.jpg",
      fileBody,
      { contentType: "image/jpeg", upsert: true },
    );
  });

  it("resolves public media URLs and extracts their storage paths", () => {
    const path = "vendors/7/products/KP-7/main image.jpg";
    getPublicUrlMock.mockReturnValueOnce({
      data: {
        publicUrl:
          "https://project.supabase.co/storage/v1/object/public/vendor_images/vendors/7/products/KP-7/main%20image.jpg",
      },
    });

    const publicUrl = getAddProductAssetPublicUrl(path);

    expect(getPublicUrlMock).toHaveBeenCalledWith(path);
    expect(publicUrl).not.toBeNull();
    expect(getAddProductAssetPathFromPublicUrl(publicUrl!)).toBe(path);
    expect(getAddProductAssetPathFromPublicUrl("file:///local/main.jpg")).toBe(
      "",
    );
  });

  it("creates a product and returns its generated identity", async () => {
    const payload = {
      vendor_id: 7,
      vendor_seq: 12,
      product_code: "KP-12",
      title: "Blue Silk",
    };
    const query = createQueryMock({
      single: { data: { id: 12, product_code: "KP-12" }, error: null },
    });
    registerTableQuery("products", query);

    await expect(createVendorProduct(payload)).resolves.toEqual({
      data: { id: 12, product_code: "KP-12" },
      error: null,
    });
    expect(query.insert).toHaveBeenCalledWith(payload);
    expect(query.select).toHaveBeenCalledWith("id, product_code");
  });

  it("updates the created product media and payload", async () => {
    const update = {
      media: { images: ["products/12/main.jpg"] },
      inventory_qty: 4,
    };
    const query = createQueryMock({
      update: { data: null, error: null },
    });
    registerTableQuery("products", query);

    await expect(updateVendorProductMedia(12, update)).resolves.toEqual({
      data: null,
      error: null,
    });
    expect(query.update).toHaveBeenCalledWith(update);
    expect(query.eq).toHaveBeenCalledWith("id", 12);
  });
});
