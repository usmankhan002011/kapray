import {
  createGoogleVendor,
  getAppSession,
  getCurrentUser,
  getVendorForAuthUser,
  resetPassword,
  signInWithGoogleIdToken,
  signOut,
  signOutOrThrow,
  subscribeToAuthStateChanges,
  updateAuthUserMetadata,
} from "../auth";
import {
  createQueryMock,
  getSessionMock,
  getUserMock,
  onAuthStateChangeMock,
  registerTableQuery,
  resetPasswordForEmailMock,
  resetSupabaseMock,
  signInWithIdTokenMock,
  signOutMock,
  updateUserMock,
} from "../../__tests__/supabaseClientMock";

beforeEach(resetSupabaseMock);

describe("auth service", () => {
  it("returns the current app session", async () => {
    const session = { access_token: "token" };
    getSessionMock.mockResolvedValueOnce({ data: { session }, error: null });

    await expect(getAppSession()).resolves.toEqual({
      data: { session },
      error: null,
    });
  });

  it("returns the current authenticated user", async () => {
    const result = { data: { user: { id: "user-7" } }, error: null };
    getUserMock.mockResolvedValueOnce(result);

    await expect(getCurrentUser()).resolves.toEqual(result);
  });

  it("subscribes to auth state changes", () => {
    const callback = jest.fn();

    subscribeToAuthStateChanges(callback);

    expect(onAuthStateChangeMock).toHaveBeenCalledWith(callback);
  });

  it("loads the vendor row for an authenticated user", async () => {
    const vendor = { id: 7, auth_user_id: "user-7" };
    const query = createQueryMock({
      maybeSingle: { data: vendor, error: null },
    });
    registerTableQuery("vendor", query);

    await expect(getVendorForAuthUser("user-7")).resolves.toEqual({
      data: vendor,
      error: null,
    });
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("auth_user_id", "user-7");
  });

  it("sends password resets and signs users out", async () => {
    await resetPassword("buyer@example.com");
    await signOut();

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      "buyer@example.com",
    );
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("throws when sign-out fails", async () => {
    const error = new Error("sign out failed");
    signOutMock.mockResolvedValueOnce({ error });

    await expect(signOutOrThrow()).rejects.toBe(error);
  });

  it("signs in with a Google ID token and updates auth metadata", async () => {
    await signInWithGoogleIdToken("google-token");
    await updateAuthUserMetadata({ role: "vendor", name: "Vendor" });

    expect(signInWithIdTokenMock).toHaveBeenCalledWith({
      provider: "google",
      token: "google-token",
    });
    expect(updateUserMock).toHaveBeenCalledWith({
      data: { role: "vendor", name: "Vendor" },
    });
  });

  it("creates the initial vendor row for a Google login", async () => {
    const payload = {
      name: "Vendor",
      auth_user_id: "user-7",
      owner_user_id: "user-7",
    };
    const query = createQueryMock({ insert: { data: null, error: null } });
    registerTableQuery("vendor", query);

    await createGoogleVendor(payload);

    expect(query.insert).toHaveBeenCalledWith(payload);
  });
});
