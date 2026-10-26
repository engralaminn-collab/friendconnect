/**
 * Privacy rules for FriendConnect.
 *
 * The product promise is mutual invisibility: a member is only discoverable by
 * someone they have accepted, or who they have explicitly sent a connection
 * request to. Nobody can browse, enumerate or be "suggested" a stranger —
 * not by name, not by mutual friends, not "people you may know".
 *
 * Everything here is pure so the rules can be unit-tested without a database.
 */

/** How the viewer is related to the person being looked at. */
export type Relation =
  | "self"
  | "friend"
  | "request_sent" // viewer sent a connection request, still pending
  | "request_received" // target sent the viewer a request, still pending
  | "blocked_by_me"
  | "blocked_me"
  | "stranger";

/** Can the viewer see this person's profile / presence / activity? */
export function canSeeProfile(relation: Relation): boolean {
  switch (relation) {
    case "self":
    case "friend":
    case "request_sent":
    case "request_received":
      return true;
    default:
      // strangers and blocked pairs stay invisible to each other
      return false;
  }
}

/** Can the viewer's avatar, name or online status be shown to this person? */
export function isVisibleTo(targetRelation: Relation): boolean {
  return canSeeProfile(targetRelation);
}

/** Can a new connection request be created in this direction? */
export function canSendConnectionRequest(relation: Relation): boolean {
  return relation === "stranger";
}

/** Can messages be exchanged over this relation? */
export function canMessage(relation: Relation): boolean {
  return relation === "friend";
}

/**
 * Search is an "I already know you" lookup, not a directory. Only an exact
 * email address or an exact handle may match; free-text name prefixes are
 * deliberately not supported because they let someone enumerate the user base.
 */
export const MIN_SEARCH_LENGTH = 3;
export const MAX_SEARCH_RESULTS = 10;

export function normalizeSearchTerm(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isSearchLookupAllowed(raw: string): boolean {
  const term = normalizeSearchTerm(raw);
  if (term.length < MIN_SEARCH_LENGTH) return false;
  // Exact email or exact handle only.
  return term.includes("@") ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(term) : /^[a-z0-9._-]+$/.test(term);
}

/**
 * Suggestions may only contain people who have already made themselves known
 * to the viewer (they sent a request). Returning anyone else would break the
 * mutual-invisibility promise.
 */
export function suggestionEligible(relation: Relation): boolean {
  return relation === "request_received";
}
