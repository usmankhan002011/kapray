import {
  getReviewedOrderIds,
  getTrackedOrders,
  searchOrderVendors,
} from "../orderTracking";
import {
  createQueryMock,
  fromMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("order tracking service", () => {
  it("searches vendors by shop or owner name", async () => {
    const vendors = [{ id: 7, shop_name: "Kapray", name: "Ayesha" }];
    const query = createQueryMock({ list: { data: vendors, error: null } });
    registerTableQuery("vendor", query);

    await expect(searchOrderVendors("kap")).resolves.toEqual(vendors);
    expect(query.or).toHaveBeenCalledWith(
      "shop_name.ilike.%kap%,name.ilike.%kap%",
    );
    expect(query.limit).toHaveBeenCalledWith(30);
  });

  it("tracks orders using the supplied buyer and vendor filters", async () => {
    const orders = [{ id: 12, buyer_mobile: "03001234567" }];
    const query = createQueryMock({ list: { data: orders, error: null } });
    registerTableQuery("orders", query);

    await expect(
      getTrackedOrders({
        buyerMobile: "03001234567",
        buyerName: "Usman",
        vendorId: 7,
      }),
    ).resolves.toEqual(orders);
    expect(query.eq).toHaveBeenCalledWith("buyer_mobile", "03001234567");
    expect(query.ilike).toHaveBeenCalledWith("buyer_name", "%Usman%");
    expect(query.eq).toHaveBeenCalledWith("vendor_id", 7);
    expect(query.limit).toHaveBeenCalledWith(200);
  });

  it("returns reviewed order ids", async () => {
    const query = createQueryMock({
      list: { data: [{ order_id: 12 }, { order_id: 15 }], error: null },
    });
    registerTableQuery("vendor_reviews", query);

    await expect(getReviewedOrderIds([12, 15])).resolves.toEqual([12, 15]);
    expect(query.in).toHaveBeenCalledWith("order_id", [12, 15]);
  });

  it("skips the review query when there are no order ids", async () => {
    await expect(getReviewedOrderIds([])).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
