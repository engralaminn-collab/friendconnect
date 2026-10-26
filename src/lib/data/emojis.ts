/**
 * FriendConnect emoji library.
 *
 * A single, categorised source of truth for the composers, reactions and
 * stickers. The "Playful" pack exists because this is a private app for close
 * friends: flirty, cheeky and suggestive emoji are first-class citizens, while
 * every entry is still a standard Unicode emoji (nothing explicit, nothing
 * that cannot render on a stock device).
 *
 * Pure data + pure helpers so it can be unit-tested without a DOM.
 */

export interface EmojiCategory {
  id: string;
  label: string;
  /** Short hint shown next to the category. */
  hint: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "reactions",
    label: "Quick",
    hint: "Everyday reactions",
    emojis: [
      "😀", "😄", "😁", "😂", "🥹", "😊", "🙂", "😉",
      "😎", "🤔", "😴", "😭", "😡", "🥳", "😇", "🙃",
      "😮", "😱", "🤯", "🥺", "😬", "🤫", "🤐", "🫠",
      "😢", "😅", "🙄", "😑", "😶", "🫥", "🤨", "😴",
    ],
  },
  {
    id: "gestures",
    label: "Gestures",
    hint: "Hands and people",
    emojis: [
      "👍", "👎", "🙏", "👏", "🙌", "🤝", "👋", "✌️",
      "🤞", "💪", "🫶", "🤗", "🫡", "🤙", "👊", "🤛",
      "🖖", "👌", "🤌", "🫰", "🫵", "🤷", "🙋", "💃",
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    hint: "Warm and lovey",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "♥️", "😍", "🥰", "😘", "🫂",
    ],
  },
  {
    id: "playful",
    label: "Playful",
    hint: "Flirty, cheeky, suggestive",
    emojis: [
      "😏", "😉", "😜", "🤪", "😈", "😽", "🫦", "🥵",
      "💋", "👅", "🍑", "🍆", "🍒", "🍌", "🌶️", "💦",
      "🔥", "🥴", "🤤", "🫣", "😳", "💃", "🕺", "🎯",
      "🛏️", "🌹", "🫦", "💌", "🩲", "👀", "🤭", "😹",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    hint: "Animals and weather",
    emojis: [
      "🌸", "🌺", "🌻", "🌷", "🌹", "🌙", "☀️", "⭐",
      "🌟", "🌈", "☁️", "🌊", "🐶", "🐱", "🦄", "🐢",
      "🦋", "🐝", "🐻", "🦊", "🐼", "🐨", "🌵", "🍀",
    ],
  },
  {
    id: "food",
    label: "Food",
    hint: "Snacks and drinks",
    emojis: [
      "☕", "🍵", "🍕", "🍔", "🍟", "🌮", "🍜", "🍣",
      "🍦", "🍩", "🍪", "🎂", "🍫", "🍓", "🍉", "🥂",
      "🍻", "🍷", "🥃", "🍿", "🥑", "🍞", "🧀", "🍯",
    ],
  },
  {
    id: "activity",
    label: "Activity",
    hint: "Play and travel",
    emojis: [
      "⚽", "🏀", "🎾", "🏓", "🎯", "🎮", "🎲", "🎵",
      "🎧", "🎤", "🎸", "🎬", "📸", "🚀", "✈️", "🏝️",
      "🚗", "🏍️", "🚲", "🏕️", "🎢", "🎡", "🧘", "🏋️",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    hint: "Status and sparkle",
    emojis: [
      "✨", "💯", "✅", "❌", "❓", "❗", "💡", "📌",
      "🎉", "🎁", "🏆", "👑", "💎", "🔒", "🔔", "⏰",
      "📱", "💻", "📚", "🖊️", "📎", "🗂️", "🔗", "♻️",
    ],
  },
];

/** Flat list, de-duplicated, in category order — used by quick reaction rows. */
export const ALL_EMOJIS: string[] = Array.from(
  new Set(EMOJI_CATEGORIES.flatMap((c) => c.emojis)),
);

export const PLAYFUL_EMOJIS: string[] = EMOJI_CATEGORIES.find((c) => c.id === "playful")?.emojis ?? [];

/** Reactions offered on a message bubble (fast, non-verbal replies). */
export const QUICK_REACTIONS: string[] = ["❤️", "😂", "👍", "😮", "😢", "🙏", "🔥", "😏"];

export function findCategory(id: string): EmojiCategory | undefined {
  return EMOJI_CATEGORIES.find((c) => c.id === id);
}

/**
 * Category search: matches on the label or the hint, so "flirt", "cheeky" or
 * "food" all work. An empty query returns every category.
 */
export function categoriesForQuery(query: string): EmojiCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return EMOJI_CATEGORIES;
  return EMOJI_CATEGORIES.filter(
    (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
  );
}
