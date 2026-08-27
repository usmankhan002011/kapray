import {
  createVendorProduct,
  getVendorAddProductSettings,
  updateVendorProductMedia,
} from "../addProduct";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
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
