import { getVendorSaleProduct, updateVendorProductPrice } from "../productSale";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("vendor product sale service", () => {
  it("loads a product belonging to the vendor", async () => {
    const product = { id: 12, vendor_id: 7, title: "Blue Silk" };
    const query = createQueryMock({
      single: { data: product, error: null },
    });
    registerTableQuery("products", query);

    await expect(getVendorSaleProduct(12, 7)).resolves.toEqual({
      data: product,
      error: null,
    });
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", 12);
    expect(query.eq).toHaveBeenNthCalledWith(2, "vendor_id", 7);
  });

  it("updates the price only for the vendor product", async () => {
    const payload = {
      price: { current_cost_pkr: 900 },
      updated_at: "2026-08-25T00:00:00.000Z",
    };
    const updated = { id: 12, vendor_id: 7, ...payload };
    const query = createQueryMock({
      single: { data: updated, error: null },
    });
    registerTableQuery("products", query);

    await expect(updateVendorProductPrice(12, 7, payload)).resolves.toEqual({
      data: updated,
      error: null,
    });
    expect(query.update).toHaveBeenCalledWith(payload);
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", 12);
    expect(query.eq).toHaveBeenNthCalledWith(2, "vendor_id", 7);
  });
});
