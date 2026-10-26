import { describe, expect, it } from "vitest";
import {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  PLAYFUL_EMOJIS,
  QUICK_REACTIONS,
  categoriesForQuery,
  findCategory,
} from "@/lib/data/emojis";

describe("emoji library", () => {
  it("every category has an id, label, hint and emoji", () => {
    for (const category of EMOJI_CATEGORIES) {
      expect(category.id).toBeTruthy();
      expect(category.label).toBeTruthy();
      expect(category.hint).toBeTruthy();
      expect(category.emojis.length).toBeGreaterThan(15);
    }
  });

  it("ships a wide flat list without duplicates", () => {
    expect(ALL_EMOJIS.length).toBeGreaterThan(120);
    expect(new Set(ALL_EMOJIS).size).toBe(ALL_EMOJIS.length);
  });

  it("includes a playful (flirty / suggestive) pack", () => {
    const playful = findCategory("playful");
    expect(playful).toBeDefined();
    expect(playful!.hint.toLowerCase()).toContain("flirty");
    expect(PLAYFUL_EMOJIS.length).toBeGreaterThan(15);
    // A representative sample of cheeky-but-standard emoji.
    for (const emoji of ["😏", "😉", "💋", "🍑", "🥵"]) {
      expect(PLAYFUL_EMOJIS).toContain(emoji);
    }
  });

  it("every entry is a real, non-empty emoji string", () => {
    for (const emoji of ALL_EMOJIS) {
      expect(typeof emoji).toBe("string");
      expect(emoji.length).toBeGreaterThan(0);
      expect(emoji).not.toContain(" ");
    }
  });

  it("searches categories by label and hint", () => {
    expect(categoriesForQuery("flirt").map((c) => c.id)).toEqual(["playful"]);
    expect(categoriesForQuery("food").map((c) => c.id)).toEqual(["food"]);
    expect(categoriesForQuery("").length).toBe(EMOJI_CATEGORIES.length);
    expect(categoriesForQuery("nothing-matches-this")).toEqual([]);
  });

  it("offers a compact quick-reaction row", () => {
    expect(QUICK_REACTIONS.length).toBeGreaterThanOrEqual(6);
    for (const emoji of QUICK_REACTIONS) expect(ALL_EMOJIS).toContain(emoji);
  });
});
