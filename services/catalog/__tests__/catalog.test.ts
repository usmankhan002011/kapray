import {
  getCatalogPriceBuckets,
  getCatalogProductMediaUrl,
  getCatalogProductsPage,
  getInitialCatalogQueries,
  getPriceBands,
  getResultFilterLookupQueries,
} from "../catalog";
import {
  createQueryMock,
  getPublicUrlMock,
  registerTableQuery,
  resetSupabaseMock,
  storageFromMock,
} from "../../__tests__/supabaseClientMock";

const COMMON_LOOKUPS = [
  "fabric_types",
  "work_types",
  "work_densities",
  "origin_cities",
  "wear_states",
] as const;

beforeEach(resetSupabaseMock);

function registerCommonLookups() {
  return COMMON_LOOKUPS.map((table) => {
    const query = createQueryMock({
      list: { data: [{ id: table, name: table }], error: null },
    });
    registerTableQuery(table, query);
    return query;
  });
}

describe("catalog service", () => {
  it("loads legacy price bands in display order", async () => {
    const rows = [
      { id: "under-10k", name: "Under 10k", min_pkr: 0, max_pkr: 10000 },
    ];
    const query = createQueryMock({ list: { data: rows, error: null } });
    registerTableQuery("price_bands", query);

    await expect(getPriceBands()).resolves.toEqual(rows);
    expect(query.select).toHaveBeenCalledWith(
      "id,name,min_pkr,max_pkr,sort_order",
    );
    expect(query.order).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
  });

  it("loads active price buckets in display order", async () => {
    const rows = [{ id: 1, label: "Under 10k", min_pkr: 0, max_pkr: 10000 }];
    const query = createQueryMock({ list: { data: rows, error: null } });
    registerTableQuery("price_buckets", query);

    await expect(getCatalogPriceBuckets()).resolves.toEqual({
      data: rows,
      error: null,
    });
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.order).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
  });

  it("loads a paginated product page", async () => {
    const rows = [{ id: 7, title: "Blue Silk" }];
    const query = createQueryMock({ list: { data: rows, error: null } });
    registerTableQuery("products", query);

    await expect(getCatalogProductsPage(30, 59)).resolves.toEqual({
      data: rows,
      error: null,
    });
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(query.range).toHaveBeenCalledWith(30, 59);
  });

  it("loads the five result-filter lookup lists", async () => {
    const queries = registerCommonLookups();

    const results = await getResultFilterLookupQueries();

    expect(results).toHaveLength(5);
    expect(results.map((result) => result.data?.[0]?.id)).toEqual(
      COMMON_LOOKUPS,
    );
    expect(queries[0].order).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
    for (const query of queries.slice(1)) {
      expect(query.order).toHaveBeenCalledWith("name", { ascending: true });
    }
  });

  it("loads the initial products and dress-type lookup together", async () => {
    registerTableQuery(
      "products",
      createQueryMock({ list: { data: [{ id: 7 }], error: null } }),
    );
    const dressQuery = createQueryMock({
      list: { data: [{ id: "dress", name: "Dress" }], error: null },
    });
    registerTableQuery("dress_types", dressQuery);
    registerCommonLookups();

    const results = await getInitialCatalogQueries(0, 29);

    expect(results).toHaveLength(7);
    expect(results[1].data).toEqual([{ id: "dress", name: "Dress" }]);
    expect(dressQuery.order).toHaveBeenCalledWith("id", { ascending: true });
  });

  it("resolves product media from the shared vendor bucket", () => {
    expect(getCatalogProductMediaUrl("vendors/7/products/photo.jpg")).toBe(
      "https://storage.test/vendors/7/products/photo.jpg",
    );
    expect(storageFromMock).toHaveBeenCalledWith("vendor_images");
    expect(getPublicUrlMock).toHaveBeenCalledWith(
      "vendors/7/products/photo.jpg",
    );
  });
});
