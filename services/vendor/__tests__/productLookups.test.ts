import {
  FALLBACK_FABRIC_TYPES,
  FALLBACK_ORIGIN_CITIES,
  getDressTypes,
  getFabricTypes,
  getOriginCities,
  getWearStates,
  getWorkDensities,
  getWorkTypes,
} from "../productLookups";
import {
  createQueryMock,
  getPublicUrlMock,
  registerTableQuery,
  resetSupabaseMock,
  storageFromMock,
} from "../../__tests__/supabaseClientMock";

jest.mock("@/utils/supabase/lookupTimeout", () => ({
  timeoutAfter: jest.fn(() => new Promise(() => undefined)),
}));

beforeEach(resetSupabaseMock);

describe("vendor product lookup service", () => {
  it("loads and normalizes active dress types", async () => {
    const query = createQueryMock({
      list: {
        data: [
          { id: "1", code: "saree", name: "Saree" },
          { id: null, code: "invalid", name: "Invalid" },
        ],
        error: null,
      },
    });
    registerTableQuery("dress_types", query);

    await expect(getDressTypes()).resolves.toEqual([
      { id: "1", code: "saree", name: "Saree" },
    ]);
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.order).toHaveBeenNthCalledWith(1, "sort_order", {
      ascending: true,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "name", {
      ascending: true,
    });
  });

  it("returns an empty dress type list when the query fails", async () => {
    const error = new Error("dress types failed");
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    registerTableQuery(
      "dress_types",
      createQueryMock({ list: { data: null, error } }),
    );

    await expect(getDressTypes()).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "Error fetching dress types:",
      error,
    );
    consoleError.mockRestore();
  });

  it("maps fabric image paths to public URLs", async () => {
    const query = createQueryMock({
      list: {
        data: [
          { id: "1", code: "silk", name: "Silk", image_path: "silk.jpg" },
          { id: "2", code: "net", name: "Net", image_path: null },
        ],
        error: null,
      },
    });
    registerTableQuery("fabric_types", query);

    await expect(getFabricTypes()).resolves.toEqual([
      {
        id: "1",
        code: "silk",
        name: "Silk",
        imageUrl: "https://storage.test/silk.jpg",
      },
      { id: "2", code: "net", name: "Net", imageUrl: null },
    ]);
    expect(storageFromMock).toHaveBeenCalledWith("fabric-types");
    expect(getPublicUrlMock).toHaveBeenCalledWith("silk.jpg");
  });

  it("returns fresh fabric fallbacks when loading fails", async () => {
    registerTableQuery(
      "fabric_types",
      createQueryMock({
        list: { data: null, error: new Error("fabric types failed") },
      }),
    );

    const result = await getFabricTypes();

    expect(result).toEqual(FALLBACK_FABRIC_TYPES);
    expect(result).not.toBe(FALLBACK_FABRIC_TYPES);
    expect(result[0]).not.toBe(FALLBACK_FABRIC_TYPES[0]);
  });

  it.each([
    ["origin_cities", getOriginCities],
    ["work_densities", getWorkDensities],
    ["work_types", getWorkTypes],
  ])("loads the %s lookup", async (table, load) => {
    const rows = [{ id: "1", name: "First", code: "first" }];
    const query = createQueryMock({ list: { data: rows, error: null } });
    registerTableQuery(table, query);

    await expect(load()).resolves.toEqual(rows);
    expect(query.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("uses fresh origin-city fallbacks when no rows are returned", async () => {
    registerTableQuery(
      "origin_cities",
      createQueryMock({ list: { data: [], error: null } }),
    );

    const result = await getOriginCities();

    expect(result).toEqual(FALLBACK_ORIGIN_CITIES);
    expect(result).not.toBe(FALLBACK_ORIGIN_CITIES);
    expect(result[0]).not.toBe(FALLBACK_ORIGIN_CITIES[0]);
  });

  it("loads wear states and propagates query errors", async () => {
    const rows = [
      { id: "1", name: "Dupatta Included", code: "dupatta-included" },
    ];
    registerTableQuery(
      "wear_states",
      createQueryMock({ list: { data: rows, error: null } }),
    );
    await expect(getWearStates()).resolves.toEqual(rows);

    const error = new Error("wear states failed");
    registerTableQuery(
      "wear_states",
      createQueryMock({ list: { data: null, error } }),
    );
    await expect(getWearStates()).rejects.toBe(error);
  });
});
