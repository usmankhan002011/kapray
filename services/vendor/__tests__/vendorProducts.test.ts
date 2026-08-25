import { getVendorProduct, getVendorProductsPage } from "../vendorProducts";
import {
  createQueryMock,
  getPublicUrlMock,
  registerTableQuery,
  resetSupabaseMock,
  storageFromMock,
} from "../../__tests__/supabaseClientMock";

const product = {
  id: 12,
  product_code: "KP-12",
  title: "Blue Silk",
  created_at: "2026-08-25T00:00:00Z",
  inventory_qty: 4,
  made_on_order: false,
  product_category: "stitched_ready",
  spec: {},
  price: {},
  media: { images: ["products/12/main.jpg"] },
};

beforeEach(resetSupabaseMock);
afterEach(() => jest.restoreAllMocks());

describe("vendor products service", () => {
  it("loads a product page with images, order counts, and text search", async () => {
    const productsQuery = createQueryMock({
      list: { data: [product], error: null, count: 8 },
    });
    const ordersQuery = createQueryMock({
      list: {
        data: [
          { product_id: 12, status: "pending" },
          { product_id: 12, status: "delivered" },
          { product_id: 12, status: "cancelled" },
        ],
        error: null,
      },
    });
    registerTableQuery("products", productsQuery);
    registerTableQuery("orders", ordersQuery);

    const result = await getVendorProductsPage({
      vendorId: 7,
      searchText: "Blue_%,Silk",
      from: 0,
      to: 29,
      includeCount: true,
    });

    expect(result).toEqual({
      products: [
        {
          ...product,
          banner_url: "https://storage.test/products/12/main.jpg",
          order_count: 2,
        },
      ],
      totalCount: 8,
    });
    expect(productsQuery.or).toHaveBeenCalledWith(
      "product_code.ilike.%Blue   Silk%,title.ilike.%Blue   Silk%",
    );
    expect(productsQuery.range).toHaveBeenCalledWith(0, 29);
    expect(ordersQuery.in).toHaveBeenCalledWith("product_id", [12]);
    expect(storageFromMock).toHaveBeenCalledWith("vendor_images");
    expect(getPublicUrlMock).toHaveBeenCalledWith("products/12/main.jpg");
  });

  it("uses an exact category filter for ready-to-wear searches", async () => {
    const query = createQueryMock({ list: { data: [], error: null } });
    registerTableQuery("products", query);

    await getVendorProductsPage({
      vendorId: 7,
      searchText: "ready to wear",
      from: 0,
      to: 29,
    });

    expect(query.eq).toHaveBeenCalledWith("product_category", "stitched_ready");
  });

  it("uses a multi-category filter for unstitched searches", async () => {
    const query = createQueryMock({ list: { data: [], error: null } });
    registerTableQuery("products", query);

    await getVendorProductsPage({
      vendorId: 7,
      searchText: "unstitched",
      from: 30,
      to: 59,
    });

    expect(query.in).toHaveBeenCalledWith("product_category", [
      "unstitched_plain",
      "unstitched_dyeing",
      "unstitched_dyeing_tailoring",
    ]);
  });

  it("keeps products when order counts cannot be loaded", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation();
    const orderError = { message: "orders failed" };
    registerTableQuery(
      "products",
      createQueryMock({ list: { data: [product], error: null } }),
    );
    registerTableQuery(
      "orders",
      createQueryMock({ list: { data: null, error: orderError } }),
    );

    const result = await getVendorProductsPage({
      vendorId: 7,
      searchText: "",
      from: 0,
      to: 29,
    });

    expect(result.products[0].order_count).toBe(0);
    expect(warning).toHaveBeenCalledWith(
      "Could not load product order counts:",
      "orders failed",
    );
  });

  it("propagates product page errors", async () => {
    const error = new Error("products failed");
    registerTableQuery(
      "products",
      createQueryMock({ list: { data: null, error } }),
    );

    await expect(
      getVendorProductsPage({
        vendorId: 7,
        searchText: "",
        from: 0,
        to: 29,
      }),
    ).rejects.toBe(error);
  });

  it("loads one vendor-owned product and its order count", async () => {
    const productsQuery = createQueryMock({
      single: { data: product, error: null },
    });
    registerTableQuery("products", productsQuery);
    registerTableQuery(
      "orders",
      createQueryMock({
        list: { data: [{ product_id: 12, status: "paid" }], error: null },
      }),
    );

    await expect(getVendorProduct(7, 12)).resolves.toMatchObject({
      id: 12,
      order_count: 1,
    });
    expect(productsQuery.eq).toHaveBeenNthCalledWith(1, "id", 12);
    expect(productsQuery.eq).toHaveBeenNthCalledWith(2, "vendor_id", 7);
  });
});
