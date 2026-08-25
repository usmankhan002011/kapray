import { submitVendorReview } from "../vendorReview";
import {
  createQueryMock,
  fromMock,
  getUserMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

const input = { orderId: 12, vendorId: 7, rating: 5, comment: "  Great  " };

beforeEach(resetSupabaseMock);

function signIn(): void {
  getUserMock.mockResolvedValue({
    data: { user: { id: "buyer-1" } },
    error: null,
  });
}

function registerOrder(overrides: Record<string, unknown> = {}) {
  const query = createQueryMock({
    maybeSingle: {
      data: {
        id: 12,
        vendor_id: 7,
        buyer_auth_user_id: "buyer-1",
        status: "delivered",
        ...overrides,
      },
      error: null,
    },
  });
  registerTableQuery("orders", query);
  return query;
}

describe("buyer vendor review service", () => {
  it("requires a signed-in buyer before querying the order", async () => {
    await expect(submitVendorReview(input)).resolves.toBe("requires_sign_in");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("submits a verified review for the buyer's delivered order", async () => {
    signIn();
    registerOrder();
    const reviewQuery = createQueryMock({
      insert: { data: null, error: null },
    });
    registerTableQuery("vendor_reviews", reviewQuery);

    await expect(submitVendorReview(input)).resolves.toBe("submitted");
    expect(reviewQuery.insert).toHaveBeenCalledWith({
      vendor_id: 7,
      buyer_user_id: "buyer-1",
      order_id: 12,
      rating: 5,
      comment: "Great",
      is_verified_purchase: true,
      is_public: true,
      is_hidden: false,
    });
  });

  it.each([
    [{ vendor_id: 8 }, "vendor_mismatch"],
    [{ status: "processing" }, "order_not_delivered"],
    [{ buyer_auth_user_id: "buyer-2" }, "not_order_owner"],
  ])("rejects an ineligible order %#", async (overrides, expected) => {
    signIn();
    registerOrder(overrides);

    await expect(submitVendorReview(input)).resolves.toBe(expected);
  });

  it("maps unique constraint errors to already reviewed", async () => {
    signIn();
    registerOrder();
    registerTableQuery(
      "vendor_reviews",
      createQueryMock({
        insert: {
          data: null,
          error: { code: "23505", message: "duplicate review" },
        },
      }),
    );

    await expect(submitVendorReview(input)).resolves.toBe("already_reviewed");
  });
});
