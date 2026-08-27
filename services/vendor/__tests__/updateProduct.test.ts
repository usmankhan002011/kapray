import {
  getVendorProductsForUpdate,
  getVendorUpdateProductSettings,
  updateVendorProduct,
  uploadVendorProductAsset,
} from "../updateProduct";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
  storageFromMock,
  uploadMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("update product service", () => {
  it("loads a vendor's products in newest-first order", async () => {
    const query = createQueryMock({ list: { data: [], error: null } });
    registerTableQuery("products", query);

    await getVendorProductsForUpdate(7);

    expect(query.eq).toHaveBeenCalledWith("vendor_id", 7);
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("loads the vendor settings used by the update screen", async () => {
    const query = createQueryMock({
      single: { data: { id: 7, offers_tailoring: true }, error: null },
    });
    registerTableQuery("vendor", query);

    await getVendorUpdateProductSettings(7);

    expect(query.select).toHaveBeenCalledWith(
      "id, offers_tailoring, tailoring_options, exports_enabled, export_regions",
    );
    expect(query.eq).toHaveBeenCalledWith("id", 7);
  });

  it("updates only the selected vendor product", async () => {
    const payload = { title: "Updated" };
    const query = createQueryMock({
      single: { data: { id: 12, title: "Updated" }, error: null },
    });
    registerTableQuery("products", query);

    await updateVendorProduct({ productId: 12, vendorId: 7, payload });

    expect(query.update).toHaveBeenCalledWith(payload);
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", 12);
    expect(query.eq).toHaveBeenNthCalledWith(2, "vendor_id", 7);
  });

  it("uploads update media without overwriting an existing object", async () => {
    const fileBody = new ArrayBuffer(2);

    await uploadVendorProductAsset({
      path: "vendors/7/products/KP-12/images/main.jpg",
      fileBody,
      contentType: "image/jpeg",
    });

    expect(storageFromMock).toHaveBeenCalledWith("vendor_images");
    expect(uploadMock).toHaveBeenCalledWith(
      "vendors/7/products/KP-12/images/main.jpg",
      fileBody,
      { contentType: "image/jpeg", upsert: false },
    );
  });
});
