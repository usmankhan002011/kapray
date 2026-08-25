import {
  getVendorProductDetails,
  resolveProductLookupNames,
} from "../productDetails";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("vendor product details service", () => {
  it("loads product details by numeric id", async () => {
    const product = { id: 12, product_code: "KP-12" };
    const query = createQueryMock({
      single: { data: product, error: null },
    });
    registerTableQuery("products", query);

    await expect(
      getVendorProductDetails({ productId: "12", productCode: null }),
    ).resolves.toEqual({ data: product, error: null });
    expect(query.eq).toHaveBeenCalledWith("id", 12);
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("vendor:vendor_id"),
    );
  });

  it("loads product details by product code", async () => {
    const query = createQueryMock({
      single: { data: { id: 12 }, error: null },
    });
    registerTableQuery("products", query);

    await getVendorProductDetails({ productId: null, productCode: "KP-12" });

    expect(query.eq).toHaveBeenCalledWith("product_code", "KP-12");
  });

  it("resolves lookup ids in their original order", async () => {
    const query = createQueryMock({
      list: {
        data: [
          { id: "silk", name: "Silk" },
          { id: "cotton", name: "Cotton" },
        ],
        error: null,
      },
    });
    registerTableQuery("fabric_types", query);

    await expect(
      resolveProductLookupNames("fabricTypes", [" cotton ", "silk", "old"]),
    ).resolves.toEqual(["Cotton", "Silk", "old"]);
    expect(query.in).toHaveBeenCalledWith("id", ["cotton", "silk", "old"]);
  });

  it("skips Supabase when no lookup ids are provided", async () => {
    await expect(resolveProductLookupNames("wearStates", [])).resolves.toEqual(
      [],
    );
  });
});
