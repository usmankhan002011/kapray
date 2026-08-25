import { getVendorOrders } from "../orderList";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("order list service", () => {
  it("loads active orders for the selected vendor", async () => {
    const orders = [{ id: 1, status: "placed" }];
    const query = createQueryMock({ list: { data: orders, error: null } });
    registerTableQuery("orders", query);

    await expect(getVendorOrders(7, "active")).resolves.toEqual(orders);
    expect(query.eq).toHaveBeenCalledWith("vendor_id", 7);
    expect(query.in).toHaveBeenCalledWith("status", [
      "placed",
      "seen",
      "in_progress",
      "packed",
      "dispatched",
    ]);
    expect(query.limit).toHaveBeenCalledWith(500);
  });

  it("loads delivered orders for the completed tab", async () => {
    const query = createQueryMock({ list: { data: [], error: null } });
    registerTableQuery("orders", query);

    await getVendorOrders(7, "completed");

    expect(query.eq).toHaveBeenCalledWith("status", "delivered");
    expect(query.in).not.toHaveBeenCalled();
  });

  it("propagates order query errors", async () => {
    const error = new Error("orders failed");
    registerTableQuery(
      "orders",
      createQueryMock({ list: { data: null, error } }),
    );

    await expect(getVendorOrders(7, "active")).rejects.toBe(error);
  });
});
