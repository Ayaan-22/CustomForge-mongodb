import type { User } from "./types";

export type ProfileFields = { name: string; phone: string; avatar: string };
export type ProfileDraft = {
  ownerId: string | null;
  baseline: ProfileFields;
  values: ProfileFields;
};
const fields = ["name", "phone", "avatar"] as const;

export function profileFields(
  user: Pick<User, "name" | "phone" | "avatar"> | null | undefined,
): ProfileFields {
  return {
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    avatar: user?.avatar ?? "",
  };
}

export function createProfileDraft(user?: User | null): ProfileDraft {
  const values = profileFields(user);
  return { ownerId: user?.id ?? null, baseline: values, values };
}

/** A restored session/refetch updates untouched fields without erasing local edits. */
export function syncProfileDraft(
  draft: ProfileDraft,
  user: User,
): ProfileDraft {
  if (draft.ownerId !== user.id) return createProfileDraft(user);
  const baseline = profileFields(user);
  const values = { ...draft.values };
  for (const field of fields)
    if (draft.values[field] === draft.baseline[field])
      values[field] = baseline[field];
  if (
    fields.every(
      (field) =>
        baseline[field] === draft.baseline[field] &&
        values[field] === draft.values[field],
    )
  )
    return draft;
  return { ownerId: user.id, baseline, values };
}

export function profileHasChanges(draft: ProfileDraft) {
  return fields.some((field) => draft.values[field] !== draft.baseline[field]);
}
