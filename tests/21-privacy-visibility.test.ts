import { describe, expect, it } from "vitest";
import {
  MIN_SEARCH_LENGTH,
  canMessage,
  canSeeProfile,
  canSendConnectionRequest,
  isSearchLookupAllowed,
  suggestionEligible,
} from "@/server/privacy/visibility";

/**
 * The product's core promise: two members stay invisible to each other until a
 * connection request is accepted. These rules are what the API routes rely on,
 * so they are pinned here.
 */
describe("privacy: mutual invisibility", () => {
  it("strangers cannot see each other", () => {
    expect(canSeeProfile("stranger")).toBe(false);
  });

  it("connections become visible only once a request exists", () => {
    expect(canSeeProfile("request_sent")).toBe(true);
    expect(canSeeProfile("request_received")).toBe(true);
    expect(canSeeProfile("friend")).toBe(true);
    expect(canSeeProfile("self")).toBe(true);
  });

  it("blocked pairs are invisible in both directions", () => {
    expect(canSeeProfile("blocked_by_me")).toBe(false);
    expect(canSeeProfile("blocked_me")).toBe(false);
  });

  it("a connection request can only start from a stranger relationship", () => {
    expect(canSendConnectionRequest("stranger")).toBe(true);
    for (const rel of ["friend", "request_sent", "request_received", "blocked_by_me", "self"] as const) {
      expect(canSendConnectionRequest(rel)).toBe(false);
    }
  });

  it("messaging requires an accepted connection, not a pending request", () => {
    expect(canMessage("friend")).toBe(true);
    expect(canMessage("request_sent")).toBe(false);
    expect(canMessage("request_received")).toBe(false);
    expect(canMessage("stranger")).toBe(false);
  });

  it("only people who already revealed themselves can be suggested", () => {
    expect(suggestionEligible("request_received")).toBe(true);
    expect(suggestionEligible("stranger")).toBe(false);
    expect(suggestionEligible("friend")).toBe(false);
  });
});

describe("privacy: search is an exact lookup, not a directory", () => {
  it("rejects short queries", () => {
    expect(isSearchLookupAllowed("a".repeat(MIN_SEARCH_LENGTH - 1))).toBe(false);
    expect(isSearchLookupAllowed("   ")).toBe(false);
  });

  it("accepts a full email address", () => {
    expect(isSearchLookupAllowed("old.friend@example.com")).toBe(true);
    expect(isSearchLookupAllowed("  Old.Friend@Example.com ")).toBe(true);
  });

  it("accepts an exact handle", () => {
    expect(isSearchLookupAllowed("old_friend")).toBe(true);
    expect(isSearchLookupAllowed("old.friend-99")).toBe(true);
  });

  it("refuses free text that would allow enumeration", () => {
    expect(isSearchLookupAllowed("old friend")).toBe(false);
    expect(isSearchLookupAllowed("not-an-email@")).toBe(false);
    expect(isSearchLookupAllowed("%")).toBe(false);
    expect(isSearchLookupAllowed("_")).toBe(false);
  });
});
