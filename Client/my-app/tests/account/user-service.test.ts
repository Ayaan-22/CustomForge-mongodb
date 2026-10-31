import { beforeEach, describe, expect, it, vi } from "vitest";
const fetchApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/apiClient", () => ({ apiFetch: fetchApi }));
import { UserService } from "@/services/user-service";
import { createProfileDraft, profileHasChanges } from "@/lib/account-profile";
import { requireSuccess } from "@/lib/query-result";
import type { User } from "@/lib/types";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => fetchApi.mockReset());
describe("wishlist API contract", () => {
  it("reads the authenticated endpoint and accepts available or hidden product references", async () => {
    fetchApi.mockResolvedValue({
      status: 200,
      error: null,
      data: [{ id, productId: id, name: "GPU" }],
    });
    expect((await UserService.wishlist()).data).toEqual([
      { id, productId: id },
    ]);
    expect(fetchApi).toHaveBeenCalledWith("/users/wishlist", { method: "GET" });
  });
  it.each([[{ id }], [{ id, productId: "undefined" }], null])(
    "rejects malformed data before rendering broken cards",
    async (data) => {
      fetchApi.mockResolvedValue({ status: 200, error: null, data });
      expect(await UserService.wishlist()).toMatchObject({
        status: 502,
        data: null,
        error: { status: 502 },
      });
    },
  );
  it("keeps an empty list valid", async () => {
    fetchApi.mockResolvedValue({ status: 200, error: null, data: [] });
    expect((await UserService.wishlist()).data).toEqual([]);
  });
  it("preserves authentication failures", async () => {
    const failure = {
      status: 401,
      data: null,
      error: { status: 401, message: "Sign in" },
    };
    fetchApi.mockResolvedValue(failure);
    expect(await UserService.wishlist()).toEqual(failure);
  });
  it("uses the same product identifier for saving and removing", async () => {
    await UserService.addToWishlist(id);
    await UserService.removeFromWishlist(id);
    expect(fetchApi.mock.calls).toEqual([
      [`/users/wishlist/${id}`, { method: "POST" }],
      [`/users/wishlist/${id}`, { method: "DELETE" }],
    ]);
  });
});

describe("profile update response contract", () => {
  const submitted = {
    name: "  Alex Morgan  ",
    phone: " +1 555 123 4567 ",
    avatar: "",
  };
  const normalized: User = {
    id: "profile-owner",
    name: "Alex Morgan",
    phone: "+15551234567",
    email: "player@example.test",
    role: "user",
    avatar: "",
    isEmailVerified: true,
    twoFactorEnabled: true,
  };

  it("returns the flat server user so the saved draft uses normalized fields immediately", async () => {
    const serverResponse = { status: 200, error: null, data: normalized };
    fetchApi.mockResolvedValue(serverResponse);
    const response = requireSuccess(await UserService.updateMe(submitted));
    expect(response).toBe(serverResponse);
    expect(response.data).toBe(normalized);
    const draft = createProfileDraft(response.data);
    expect(draft.ownerId).toBe("profile-owner");
    expect(draft.baseline).toEqual({
      name: "Alex Morgan",
      phone: "+15551234567",
      avatar: "",
    });
    expect(draft.values).toEqual(draft.baseline);
    expect(draft.values).not.toEqual(submitted);
    expect(profileHasChanges(draft)).toBe(false);
  });

  it("preserves submitted fields and the exact leading-zero protected-operation header", async () => {
    fetchApi.mockResolvedValue({ status: 200, error: null, data: normalized });
    await UserService.updateMe(submitted, "012345");
    expect(fetchApi).toHaveBeenCalledExactlyOnceWith("/users/profile", {
      method: "PATCH",
      body: submitted,
      headers: { "x-2fa-token": "012345" },
    });
    expect(fetchApi.mock.calls[0][1].body).toBe(submitted);
  });

  it("omits the protected-operation header when no challenge is supplied", async () => {
    fetchApi.mockResolvedValue({ status: 200, error: null, data: normalized });
    await UserService.updateMe(submitted);
    expect(fetchApi).toHaveBeenCalledExactlyOnceWith("/users/profile", {
      method: "PATCH",
      body: submitted,
      headers: undefined,
    });
  });

  it("passes failures through so the profile cannot treat a rejected update as saved", async () => {
    const failure = {
      status: 401,
      data: null,
      error: { status: 401, message: "Invalid authentication code" },
    };
    fetchApi.mockResolvedValue(failure);
    const response = await UserService.updateMe(submitted, "012345");
    expect(response).toBe(failure);
    expect(() => requireSuccess(response)).toThrow(
      "Invalid authentication code",
    );
  });
});
