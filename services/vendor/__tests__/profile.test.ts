import {
  getVendorReviews,
  getVendorReviewSummary,
  updateVendorProfile,
} from "../profile";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("vendor profile service", () => {
  it("loads the vendor review summary and visible reviews", async () => {
    const summary = { vendor_id: 7, average_rating: 4.5, review_count: 2 };
    const reviews = [{ id: 1, rating: 5, comment: "Great" }];
    const summaryQuery = createQueryMock({
      maybeSingle: { data: summary, error: null },
    });
    const reviewsQuery = createQueryMock({
      list: { data: reviews, error: null },
    });
    registerTableQuery("vendor_review_summary", summaryQuery);
    registerTableQuery("vendor_reviews", reviewsQuery);

    await expect(getVendorReviewSummary(7)).resolves.toEqual({
      data: summary,
      error: null,
    });
    await expect(getVendorReviews(7)).resolves.toEqual({
      data: reviews,
      error: null,
    });
    expect(summaryQuery.select).toHaveBeenCalledWith("*");
    expect(reviewsQuery.eq).toHaveBeenCalledWith("is_hidden", false);
    expect(reviewsQuery.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("updates a vendor and returns the refreshed profile", async () => {
    const updated = { id: 7, address: "Lahore" };
    const query = createQueryMock({
      single: { data: updated, error: null },
    });
    registerTableQuery("vendor", query);

    await expect(
      updateVendorProfile(7, { address: "Lahore" }),
    ).resolves.toEqual({ data: updated, error: null });
    expect(query.update).toHaveBeenCalledWith({ address: "Lahore" });
    expect(query.eq).toHaveBeenCalledWith("id", 7);
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("tailoring_options"),
    );
  });
});
