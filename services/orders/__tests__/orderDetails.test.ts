import {
  getOrderDetails,
  getOrderMediaPublicUrl,
  hasCurrentBuyerReviewedOrder,
  updateOrderStatus,
} from "../orderDetails";
import {
  createQueryMock,
  fromMock,
  getPublicUrlMock,
  getUserMock,
  registerTableQuery,
  resetSupabaseMock,
  storageFromMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("order details service", () => {
  it("loads one order with its vendor", async () => {
    const order = { id: 12, vendor_id: 7, vendor: { id: 7 } };
    const query = createQueryMock({
      single: { data: order, error: null },
    });
    registerTableQuery("orders", query);

    await expect(getOrderDetails(12)).resolves.toEqual(order);
    expect(query.eq).toHaveBeenCalledWith("id", 12);
    expect(query.single).toHaveBeenCalledTimes(1);
  });

  it("returns false when there is no signed-in buyer", async () => {
    await expect(hasCurrentBuyerReviewedOrder(12)).resolves.toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("checks whether the signed-in buyer reviewed the order", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "buyer-1" } },
      error: null,
    });
    const query = createQueryMock({
      list: { data: [{ id: 99 }], error: null },
    });
    registerTableQuery("vendor_reviews", query);

    await expect(hasCurrentBuyerReviewedOrder(12)).resolves.toBe(true);
    expect(query.eq).toHaveBeenCalledWith("order_id", 12);
    expect(query.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("updates order status and dispatch details", async () => {
    const query = createQueryMock({
      update: { data: null, error: null },
    });
    registerTableQuery("orders", query);
    const update = {
      status: "dispatched",
      courier_name: "TCS",
      tracking_number: "PK123",
    };

    await expect(updateOrderStatus(12, update)).resolves.toBeUndefined();
    expect(query.update).toHaveBeenCalledWith(update);
    expect(query.eq).toHaveBeenCalledWith("id", 12);
  });

  it("resolves order media from the vendor image bucket", () => {
    expect(getOrderMediaPublicUrl("orders/12/image.jpg")).toBe(
      "https://storage.test/orders/12/image.jpg",
    );
    expect(storageFromMock).toHaveBeenCalledWith("vendor_images");
    expect(getPublicUrlMock).toHaveBeenCalledWith("orders/12/image.jpg");
  });
});
