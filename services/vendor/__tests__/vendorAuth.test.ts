import { signOutVendor } from "../vendorAuth";
import {
  resetSupabaseMock,
  signOutMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("vendor auth service", () => {
  it("signs out the current vendor session", async () => {
    await expect(signOutVendor()).resolves.toBeUndefined();
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("propagates sign-out errors", async () => {
    const error = new Error("sign out failed");
    signOutMock.mockResolvedValueOnce({ error });

    await expect(signOutVendor()).rejects.toBe(error);
  });
});
