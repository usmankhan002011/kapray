import {
  createAtomicPurchaseOrder,
  getCurrentBuyerId,
  type AtomicOrderArgs,
} from "../purchaseOrder";
import {
  getUserMock,
  resetSupabaseMock,
  rpcMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("purchase order service", () => {
  it("returns the current buyer id when signed in", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "buyer-1" } },
      error: null,
    });

    await expect(getCurrentBuyerId()).resolves.toBe("buyer-1");
  });

  it("returns null when there is no signed-in buyer", async () => {
    await expect(getCurrentBuyerId()).resolves.toBeNull();
  });

  it("creates an order through the atomic RPC", async () => {
    const args = { p_product_id: 12 } as AtomicOrderArgs;
    const result = [{ ok: true, message: "created", order_id: 44 }];
    rpcMock.mockResolvedValue({ data: result, error: null });

    await expect(createAtomicPurchaseOrder(args)).resolves.toEqual(result);
    expect(rpcMock).toHaveBeenCalledWith(
      "create_order_atomic_single_unit",
      args,
    );
  });

  it("propagates RPC errors", async () => {
    const error = new Error("order failed");
    rpcMock.mockResolvedValue({ data: null, error });

    await expect(createAtomicPurchaseOrder({} as AtomicOrderArgs)).rejects.toBe(
      error,
    );
  });
});
