/**
 * Hide legacy identity in API responses (DB may still hold old names until migrated).
 */
const LEGACY_EMAIL = "daveed@bridgit.io";

export function isLegacyDaveedSubmitter(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null | undefined
): boolean {
  const e = email?.trim().toLowerCase();
  if (e === LEGACY_EMAIL) return true;
  const fn = (firstName ?? "").trim();
  const ln = (lastName ?? "").trim();
  return fn === "Daveed" && ln === "Benjamin";
}

/** Submitter shape returned by list endpoint (no email). */
export function publicSubmitterNames(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null | undefined
): { firstName: string | null; lastName: string | null } {
  if (isLegacyDaveedSubmitter(firstName, lastName, email)) {
    return { firstName: "Anon", lastName: "" };
  }
  return { firstName: firstName ?? null, lastName: lastName ?? null };
}

/** Detail endpoint includes optional email — anonymize when legacy. */
export function publicSubmitterWithEmail(sub: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): { firstName: string | null; lastName: string | null; email: string | null } {
  const { firstName, lastName, email } = sub;
  if (isLegacyDaveedSubmitter(firstName, lastName, email)) {
    return {
      firstName: "Anon",
      lastName: "",
      email: "noreply@themetalayer.org",
    };
  }
  return { firstName, lastName, email };
}
