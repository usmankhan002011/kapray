import {
  getPaymentProduct,
  getPurchaseMediaPublicUrl,
  getPurchaseProductDetails,
} from "../purchaseProducts";
import {
  createQueryMock,
  getPublicUrlMock,
  registerTableQuery,
  resetSupabaseMock,
  storageFromMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("purchase product service", () => {
  it("loads the payment product by id", async () => {
    const product = { id: 12, product_code: "KP-12" };
    const query = createQueryMock({
      single: { data: product, error: null },
    });
    registerTableQuery("products", query);

    await expect(getPaymentProduct({ productId: 12 })).resolves.toEqual(
      product,
    );
    expect(query.eq).toHaveBeenCalledWith("id", 12);
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("loads product and vendor details by product code", async () => {
    const product = {
      id: 12,
      product_code: "KP-12",
      vendor: { id: 7, name: "Ayesha" },
    };
    const query = createQueryMock({
      single: { data: product, error: null },
    });
    registerTableQuery("products", query);

    await expect(
      getPurchaseProductDetails({ productCode: "KP-12" }),
    ).resolves.toEqual(product);
    expect(query.eq).toHaveBeenCalledWith("product_code", "KP-12");
    expect(query.limit).not.toHaveBeenCalled();
  });

  it("resolves purchase media from the vendor image bucket", () => {
    expect(getPurchaseMediaPublicUrl("products/12/image.jpg")).toBe(
      "https://storage.test/products/12/image.jpg",
    );
    expect(storageFromMock).toHaveBeenCalledWith("vendor_images");
    expect(getPublicUrlMock).toHaveBeenCalledWith("products/12/image.jpg");
  });

  it("propagates product query errors", async () => {
    const error = new Error("product failed");
    registerTableQuery(
      "products",
      createQueryMock({ single: { data: null, error } }),
    );

    await expect(getPaymentProduct({ productId: 12 })).rejects.toBe(error);
  });
});
