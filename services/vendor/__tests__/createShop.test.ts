import {
  createShopVendor,
  getCurrentVendorUser,
  getVendorByAuthUser,
  updateShopVendor,
} from "../createShop";
import {
  createQueryMock,
  getUserMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("create shop service", () => {
  it("loads the current authenticated vendor user", async () => {
    const result = { data: { user: { id: "user-7" } }, error: null };
    getUserMock.mockResolvedValueOnce(result);

    await expect(getCurrentVendorUser()).resolves.toEqual(result);
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it("finds an existing vendor by auth user", async () => {
    const vendor = { id: 7, auth_user_id: "user-7" };
    const query = createQueryMock({
      maybeSingle: { data: vendor, error: null },
    });
    registerTableQuery("vendor", query);

    await expect(getVendorByAuthUser("user-7")).resolves.toEqual({
      data: vendor,
      error: null,
    });
    expect(query.eq).toHaveBeenCalledWith("auth_user_id", "user-7");
  });

  it("creates a vendor with the current generated fields", async () => {
    const payload = {
      name: "Ayesha",
      exports_enabled: true,
      export_regions: ["GCC"],
      tailoring_options: { sleeves: ["Full"] },
    };
    const query = createQueryMock({
      single: { data: { id: 7 }, error: null },
    });
    registerTableQuery("vendor", query);

    await createShopVendor(payload);

    expect(query.insert).toHaveBeenCalledWith(payload);
    expect(query.select).toHaveBeenCalledWith("id, created_at, auth_user_id");
  });

  it("updates a vendor by id", async () => {
    const payload = { exports_enabled: false, export_regions: [] };
    const query = createQueryMock({
      update: { data: null, error: null },
    });
    registerTableQuery("vendor", query);

    await expect(updateShopVendor(7, payload)).resolves.toEqual({
      data: null,
      error: null,
    });
    expect(query.update).toHaveBeenCalledWith(payload);
    expect(query.eq).toHaveBeenCalledWith("id", 7);
  });

});
