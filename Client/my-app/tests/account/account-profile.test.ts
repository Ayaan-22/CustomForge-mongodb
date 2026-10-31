import { describe, expect, it } from "vitest";
import {
  createProfileDraft,
  profileHasChanges,
  syncProfileDraft,
} from "@/lib/account-profile";
import type { User } from "@/lib/types";

const user: User = {
  id: "member-a",
  name: "Saved name",
  phone: "123",
  email: "member@example.test",
  role: "user",
};

describe("restored profile drafts", () => {
  it("hydrates initially empty fields when the session arrives", () => {
    expect(syncProfileDraft(createProfileDraft(), user).values).toEqual({
      name: "Saved name",
      phone: "123",
      avatar: "",
    });
  });
  it("refreshes untouched fields without overwriting a dirty field", () => {
    const draft = createProfileDraft(user);
    draft.values = { ...draft.values, name: "My unsaved edit" };
    const result = syncProfileDraft(draft, {
      ...user,
      name: "Server edit",
      phone: "456",
    });
    expect(result.values).toEqual({
      name: "My unsaved edit",
      phone: "456",
      avatar: "",
    });
    expect(result.baseline.name).toBe("Server edit");
    expect(profileHasChanges(result)).toBe(true);
  });
  it("resets fields when a different account becomes active", () => {
    const draft = createProfileDraft(user);
    draft.values = { ...draft.values, name: "Unsaved private name" };
    const result = syncProfileDraft(draft, {
      ...user,
      id: "member-b",
      name: "Other member",
      phone: undefined,
    });
    expect(result.values).toEqual({
      name: "Other member",
      phone: "",
      avatar: "",
    });
    expect(profileHasChanges(result)).toBe(false);
  });
  it("recognizes edits reverted to the saved value and avoids unchanged resets", () => {
    const draft = createProfileDraft(user);
    expect(profileHasChanges(draft)).toBe(false);
    expect(syncProfileDraft(draft, { ...user })).toBe(draft);
    draft.values = { ...draft.values, phone: "999" };
    expect(profileHasChanges(draft)).toBe(true);
    draft.values.phone = "123";
    expect(profileHasChanges(draft)).toBe(false);
  });
});
