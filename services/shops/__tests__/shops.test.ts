import { getShopVendors } from "../shops";
import {
  createQueryMock,
  registerTableQuery,
  resetSupabaseMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("shops service", () => {
  it("loads vendors ordered by name", async () => {
    const vendors = [
      { id: 7, name: "Ayesha", shop_name: "Kapray", location: "Lahore" },
    ];
    const query = createQueryMock({ list: { data: vendors, error: null } });
    registerTableQuery("vendor", query);

    await expect(getShopVendors()).resolves.toEqual(vendors);
    expect(query.select).toHaveBeenCalledWith("id, name, shop_name, location");
    expect(query.order).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("propagates vendor query errors", async () => {
    const error = new Error("vendors failed");
    registerTableQuery(
      "vendor",
      createQueryMock({ list: { data: null, error } }),
    );

    await expect(getShopVendors()).rejects.toBe(error);
  });
});
