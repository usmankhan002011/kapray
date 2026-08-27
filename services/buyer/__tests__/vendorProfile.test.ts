import {
  getBuyerVendorProfile,
  getBuyerVendorReviews,
  getBuyerVendorReviewSummary,
  toSelectedVendor,
} from "../vendorProfile";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("buyer vendor profile service", () => {
  it("loads a vendor and normalizes export regions", async () => {
    const vendor = {
      id: 7,
      name: "Ayesha",
      shop_name: "Kapray Studio",
      export_regions: ["GCC", 3, "UK"],
    };
    const query = createQueryMock({
      single: { data: vendor, error: null },
    });
    registerTableQuery("vendor", query);

    await expect(getBuyerVendorProfile(7)).resolves.toMatchObject({
      id: 7,
      export_regions: ["GCC", "3", "UK"],
    });
    expect(query.eq).toHaveBeenCalledWith("id", 7);
  });

  it("loads the public review summary and latest reviews", async () => {
    const summary = { average_rating: 4.5, review_count: 2 };
    const reviews = [
      {
        id: 10,
        created_at: "2026-08-01T00:00:00Z",
        rating: 5,
        comment: "Great",
        vendor_reply: null,
      },
    ];
    const summaryQuery = createQueryMock({
      maybeSingle: { data: summary, error: null },
    });
    const reviewsQuery = createQueryMock({
      list: { data: reviews, error: null },
    });
    registerTableQuery("vendor_review_summary", summaryQuery);
    registerTableQuery("vendor_reviews", reviewsQuery);

    await expect(getBuyerVendorReviewSummary(7)).resolves.toEqual(summary);
    await expect(getBuyerVendorReviews(7)).resolves.toEqual(reviews);
    expect(reviewsQuery.eq).toHaveBeenCalledWith("is_public", true);
    expect(reviewsQuery.eq).toHaveBeenCalledWith("is_hidden", false);
    expect(reviewsQuery.limit).toHaveBeenCalledWith(5);
  });

  it("maps profile data to the selected vendor state", () => {
    const selected = toSelectedVendor({
      id: 7,
      name: "Ayesha",
      shop_name: "Kapray Studio",
      banner_path: "vendors/7/banner.jpg",
      export_regions: ["GCC"],
    } as Parameters<typeof toSelectedVendor>[0]);

    expect(selected).toMatchObject({
      id: 7,
      owner_name: "Ayesha",
      shop_name: "Kapray Studio",
      banner_url: "https://storage.test/vendors/7/banner.jpg",
      export_regions: ["GCC"],
    });
  });

  it("propagates Supabase query errors", async () => {
    const error = new Error("vendor query failed");
    registerTableQuery(
      "vendor",
      createQueryMock({ single: { data: null, error } }),
    );

    await expect(getBuyerVendorProfile(7)).rejects.toBe(error);
  });
});
