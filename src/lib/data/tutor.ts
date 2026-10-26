/**
 * Language-tutor seed data.
 *
 * A seven-level learning map, an offline dictionary, practice formats, learner
 * profiles and the local speech pipeline that a voice-first tutor runs on.
 */

export interface TutorLevel {
  id: string;
  name: string;
  cefr: "A1" | "A2" | "B1" | "B2" | "C1";
  zone: string;
  zoneEmoji: string;
  lessons: number;
  colour: string;
  summary: string;
}

export const TUTOR_LEVELS: TutorLevel[] = [
  { id: "l1", name: "Sprout Forest", cefr: "A1", zone: "L1 · Sprout Forest", zoneEmoji: "🌱", lessons: 20, colour: "#22c55e", summary: "Greetings, numbers, colours and the first 200 words." },
  { id: "l2", name: "Echo Valley", cefr: "A1", zone: "L2 · Echo Valley", zoneEmoji: "🏔️", lessons: 11, colour: "#14b8a6", summary: "Family, food, and short sentences that sound like speech." },
  { id: "l3", name: "Shining Sea", cefr: "A2", zone: "L3 · Shining Sea", zoneEmoji: "🌊", lessons: 15, colour: "#0ea5e9", summary: "Daily routine, shopping, and the past tense." },
  { id: "l4", name: "Cloud City", cefr: "A2", zone: "L4 · Cloud City", zoneEmoji: "☁️", lessons: 13, colour: "#6366f1", summary: "Travel, weather, and telling a short story." },
  { id: "l5", name: "Eternal Stars", cefr: "B1", zone: "L5 · Eternal Stars", zoneEmoji: "⭐", lessons: 13, colour: "#8b5cf6", summary: "Work, opinions, and the present perfect." },
  { id: "l6", name: "Time Corridor", cefr: "B1", zone: "L6 · Time Corridor", zoneEmoji: "⚙️", lessons: 10, colour: "#d946ef", summary: "Abstract topics, conditionals and debate." },
  { id: "l7", name: "Genesis Core", cefr: "B2", zone: "L7 · Genesis Core", zoneEmoji: "💎", lessons: 8, colour: "#f59e0b", summary: "Academic register, nuance and long-form writing." },
];

export interface TutorLesson {
  id: string;
  levelId: string;
  title: string;
  topic: string;
  words: number;
  sentences: number;
  minutes: number;
  unlocked: boolean;
  starred: boolean;
}

export const TUTOR_LESSONS: TutorLesson[] = [
  { id: "t101", levelId: "l1", title: "Hello, friend", topic: "Greetings", words: 18, sentences: 8, minutes: 4, unlocked: true, starred: true },
  { id: "t102", levelId: "l1", title: "One to ten", topic: "Numbers", words: 14, sentences: 9, minutes: 4, unlocked: true, starred: false },
  { id: "t103", levelId: "l1", title: "Big and small", topic: "Adjectives", words: 22, sentences: 7, minutes: 5, unlocked: true, starred: false },
  { id: "t104", levelId: "l1", title: "What is this?", topic: "Everyday objects", words: 26, sentences: 10, minutes: 5, unlocked: true, starred: false },
  { id: "t105", levelId: "l1", title: "My name is", topic: "Introductions", words: 19, sentences: 11, minutes: 5, unlocked: true, starred: false },
  { id: "t201", levelId: "l2", title: "At home", topic: "Family", words: 30, sentences: 12, minutes: 6, unlocked: true, starred: false },
  { id: "t202", levelId: "l2", title: "I am hungry", topic: "Food and drink", words: 34, sentences: 13, minutes: 6, unlocked: true, starred: true },
  { id: "t203", levelId: "l2", title: "Every morning", topic: "Daily routine", words: 28, sentences: 12, minutes: 6, unlocked: false, starred: false },
  { id: "t204", levelId: "l2", title: "I like it", topic: "Preferences", words: 24, sentences: 10, minutes: 5, unlocked: false, starred: false },
  { id: "t301", levelId: "l3", title: "At the market", topic: "Shopping", words: 42, sentences: 16, minutes: 8, unlocked: false, starred: false },
  { id: "t302", levelId: "l3", title: "Yesterday", topic: "Past tense", words: 38, sentences: 14, minutes: 7, unlocked: false, starred: false },
  { id: "t303", levelId: "l3", title: "On the bus", topic: "Transport", words: 36, sentences: 13, minutes: 7, unlocked: false, starred: false },
  { id: "t401", levelId: "l4", title: "The weather", topic: "Weather", words: 40, sentences: 15, minutes: 8, unlocked: false, starred: false },
  { id: "t402", levelId: "l4", title: "In the past", topic: "Narrative", words: 46, sentences: 18, minutes: 9, unlocked: false, starred: false },
  { id: "t403", levelId: "l4", title: "A long weekend", topic: "Travel plans", words: 44, sentences: 16, minutes: 8, unlocked: false, starred: false },
  { id: "t501", levelId: "l5", title: "The meeting", topic: "Work", words: 52, sentences: 19, minutes: 10, unlocked: false, starred: false },
  { id: "t502", levelId: "l5", title: "I think that", topic: "Opinions", words: 48, sentences: 17, minutes: 9, unlocked: false, starred: false },
  { id: "t503", levelId: "l5", title: "Ever been?", topic: "Present perfect", words: 50, sentences: 18, minutes: 9, unlocked: false, starred: false },
  { id: "t601", levelId: "l6", title: "If I were", topic: "Conditionals", words: 58, sentences: 20, minutes: 11, unlocked: false, starred: false },
  { id: "t602", levelId: "l6", title: "Both sides", topic: "Debate", words: 62, sentences: 21, minutes: 12, unlocked: false, starred: false },
  { id: "t701", levelId: "l7", title: "The argument", topic: "Academic writing", words: 70, sentences: 22, minutes: 14, unlocked: false, starred: false },
  { id: "t702", levelId: "l7", title: "In contrast", topic: "Cohesion", words: 66, sentences: 20, minutes: 13, unlocked: false, starred: false },
];

export interface DictionaryEntry {
  word: string;
  ipa: string;
  pos: string;
  level: "A1" | "A2" | "B1" | "B2";
  meaning: string;
  example: string;
  chinese: string;
}

export const DICTIONARY: DictionaryEntry[] = [
  { word: "adventure", ipa: "/ədˈven.tʃər/", pos: "noun", level: "A2", meaning: "An unusual and exciting experience.", example: "The trip to the coast was a real adventure.", chinese: "冒险" },
  { word: "borrow", ipa: "/ˈbɒr.əʊ/", pos: "verb", level: "A1", meaning: "To take something and give it back later.", example: "Can I borrow your pen?", chinese: "借入" },
  { word: "careful", ipa: "/ˈkeə.fəl/", pos: "adjective", level: "A1", meaning: "Paying close attention to avoid mistakes.", example: "Be careful on the wet floor.", chinese: "小心的" },
  { word: "delicious", ipa: "/dɪˈlɪʃ.əs/", pos: "adjective", level: "A1", meaning: "Tasting very good.", example: "The soup was delicious.", chinese: "美味的" },
  { word: "expensive", ipa: "/ɪkˈspen.sɪv/", pos: "adjective", level: "A1", meaning: "Costing a lot of money.", example: "That phone is too expensive for me.", chinese: "昂贵的" },
  { word: "favourite", ipa: "/ˈfeɪ.vər.ɪt/", pos: "adjective", level: "A1", meaning: "The one you like most.", example: "Football is my favourite sport.", chinese: "最喜欢的" },
  { word: "garden", ipa: "/ˈɡɑː.dən/", pos: "noun", level: "A1", meaning: "A piece of land where plants are grown.", example: "We grow tomatoes in the garden.", chinese: "花园" },
  { word: "holiday", ipa: "/ˈhɒl.ə.deɪ/", pos: "noun", level: "A1", meaning: "A time away from work or school.", example: "We are going on holiday in July.", chinese: "假期" },
  { word: "immediately", ipa: "/ɪˈmiː.di.ət.li/", pos: "adverb", level: "B1", meaning: "Right now, without delay.", example: "Call the doctor immediately.", chinese: "立即" },
  { word: "journey", ipa: "/ˈdʒɜː.ni/", pos: "noun", level: "A2", meaning: "The act of travelling from one place to another.", example: "The journey takes about three hours.", chinese: "旅程" },
  { word: "knowledge", ipa: "/ˈnɒl.ədʒ/", pos: "noun", level: "B1", meaning: "What you know about something.", example: "Practice gives you knowledge of the language.", chinese: "知识" },
  { word: "mountain", ipa: "/ˈmaʊn.tən/", pos: "noun", level: "A1", meaning: "A very high piece of land with a peak.", example: "They climbed the mountain at sunrise.", chinese: "山" },
  { word: "necessary", ipa: "/ˈnes.ə.sər.i/", pos: "adjective", level: "B1", meaning: "Needed in order to do something.", example: "It is necessary to bring an umbrella today.", chinese: "必要的" },
  { word: "opportunity", ipa: "/ˌɒp.əˈtʃuː.nə.ti/", pos: "noun", level: "B2", meaning: "A chance to do something good or useful.", example: "This internship is a great opportunity.", chinese: "机会" },
  { word: "practice", ipa: "/ˈpræk.tɪs/", pos: "noun", level: "A2", meaning: "Repeated exercise to improve a skill.", example: "Daily practice makes the difference.", chinese: "练习" },
  { word: "quiet", ipa: "/ˈkwaɪ.ət/", pos: "adjective", level: "A1", meaning: "Making very little noise.", example: "The library is quiet in the morning.", chinese: "安静的" },
  { word: "remember", ipa: "/rɪˈmem.bər/", pos: "verb", level: "A1", meaning: "To keep something in your mind.", example: "Remember to bring your passport.", chinese: "记得" },
  { word: "schedule", ipa: "/ˈʃed.juːl/", pos: "noun", level: "B1", meaning: "A plan that lists when things happen.", example: "The train schedule changed this morning.", chinese: "时间表" },
  { word: "together", ipa: "/təˈɡeð.ər/", pos: "adverb", level: "A1", meaning: "With each other.", example: "Let's do the homework together.", chinese: "一起" },
  { word: "understand", ipa: "/ˌʌn.dəˈstænd/", pos: "verb", level: "A1", meaning: "To know what something means.", example: "I don't understand this question.", chinese: "理解" },
  { word: "weather", ipa: "/ˈweð.ər/", pos: "noun", level: "A1", meaning: "The condition of the air outside.", example: "The weather is terrible today.", chinese: "天气" },
  { word: "yesterday", ipa: "/ˈjes.tə.deɪ/", pos: "noun", level: "A1", meaning: "The day before today.", example: "We visited the museum yesterday.", chinese: "昨天" },
];

export interface PracticeQuestion {
  id: string;
  lessonId: string;
  kind: "listen-and-pick" | "word-assembly" | "sentence-order" | "fill-the-blank" | "speak-back";
  prompt: string;
  audioLabel: string;
  options: string[];
  answer: number;
  hint: string;
}

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  { id: "q1", lessonId: "t101", kind: "listen-and-pick", prompt: "Listen and choose the picture", audioLabel: "Good morning!", options: ["🌅 sunrise", "🌙 night", "🌧️ rain"], answer: 0, hint: "It is the start of the day." },
  { id: "q2", lessonId: "t101", kind: "word-assembly", prompt: "Build the word: greeting", audioLabel: "hello", options: ["h", "e", "l", "l", "o"], answer: 0, hint: "Five letters." },
  { id: "q3", lessonId: "t102", kind: "sentence-order", prompt: "Put it in order", audioLabel: "I am seven years old", options: ["am", "I", "old", "years", "seven"], answer: 0, hint: "Start with the subject." },
  { id: "q4", lessonId: "t103", kind: "fill-the-blank", prompt: "The cat is very ___.", audioLabel: "small", options: ["small", "spoon", "sport"], answer: 0, hint: "Opposite of big." },
  { id: "q5", lessonId: "t201", kind: "speak-back", prompt: "Say it back", audioLabel: "This is my family.", options: ["record", "listen", "compare"], answer: 0, hint: "Press record, then compare with the model." },
  { id: "q6", lessonId: "t202", kind: "listen-and-pick", prompt: "Listen and choose the picture", audioLabel: "I am hungry", options: ["🍎 apple", "⚽ football", "📚 books"], answer: 0, hint: "You want to eat." },
  { id: "q7", lessonId: "t203", kind: "word-assembly", prompt: "Build the word: routine", audioLabel: "morning", options: ["r", "o", "u", "t", "i", "n", "e"], answer: 0, hint: "Seven letters." },
  { id: "q8", lessonId: "t301", kind: "sentence-order", prompt: "Put it in order", audioLabel: "How much is it", options: ["much", "is", "it", "How"], answer: 0, hint: "A question starts with the wh-word." },
];

export interface LearnerProfile {
  id: string;
  name: string;
  avatar: string;
  levelId: string;
  minutesToday: number;
  streak: number;
  magic: number;
  wordsKnown: number;
  wordsTotal: number;
  accuracy: number;
  certificates: number;
  active: boolean;
}

export const LEARNER_PROFILES: LearnerProfile[] = [
  { id: "lp1", name: "Mika", avatar: "🐉", levelId: "l3", minutesToday: 24, streak: 11, magic: 820, wordsKnown: 214, wordsTotal: 1074, accuracy: 0.86, certificates: 2, active: true },
  { id: "lp2", name: "Sora", avatar: "🥚", levelId: "l1", minutesToday: 9, streak: 3, magic: 180, wordsKnown: 62, wordsTotal: 1074, accuracy: 0.71, certificates: 0, active: false },
];

export interface BuddyStage {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
  description: string;
}

export const BUDDY_STAGES: BuddyStage[] = [
  { id: "egg", name: "Magic Egg", emoji: "🥚", threshold: 0, description: "Every journey starts as an egg." },
  { id: "hatchling", name: "Hatchling", emoji: "🐣", threshold: 100, description: "The first crack, and a lot of questions." },
  { id: "drake", name: "Drake", emoji: "🦎", threshold: 500, description: "Growing wings, still learning to glide." },
  { id: "dragon", name: "Magic Dragon", emoji: "🐉", threshold: 1500, description: "Full wings. You two can hold a real conversation now." },
];

/** The fully local speech pipeline. */
export const SPEECH_PIPELINE: {
  id: string;
  label: string;
  role: string;
  technology: string;
  offline: boolean;
  detail: string;
}[] = [
  { id: "rec", label: "Record", role: "Capture", technology: "SoX + voice activity detection", offline: true, detail: "Records PCM audio and detects when you stop speaking, so the turn passes naturally." },
  { id: "asr", label: "Transcribe", role: "Speech to text", technology: "Local ASR server", offline: true, detail: "Runs a small speech model on the machine. Nothing is uploaded." },
  { id: "llm", label: "Reply", role: "Dialogue", technology: "Local LLM", offline: true, detail: "A small instruct model keeps the conversation open and patient with a child." },
  { id: "tts", label: "Speak", role: "Text to speech", technology: "Local TTS server", offline: true, detail: "Synthesises the reply and plays it back, with a word-aligned highlight." },
  { id: "coach", label: "Coach", role: "Feedback", technology: "Rule engine", offline: true, detail: "Checks grammar, vocabulary and length and produces one correction at a time." },
];

/** Speaking topics, grouped by level. */
export const SPEAKING_TOPICS: {
  id: string;
  levelId: string;
  title: string;
  prompt: string;
  seconds: number;
  emoji: string;
}[] = [
  { id: "sp1", levelId: "l1", title: "Introduce yourself", prompt: "Say your name, your age and one thing you like.", seconds: 20, emoji: "👋" },
  { id: "sp2", levelId: "l1", title: "Your family", prompt: "How many people are in your family? What do they like to do?", seconds: 40, emoji: "👨‍👩‍👧" },
  { id: "sp3", levelId: "l2", title: "Your favourite food", prompt: "Describe the best meal you ate this week, and why.", seconds: 60, emoji: "🍜" },
  { id: "sp4", levelId: "l3", title: "A normal day", prompt: "Describe what you did yesterday, from morning to night.", seconds: 90, emoji: "🗓️" },
  { id: "sp5", levelId: "l4", title: "The weather", prompt: "What has the weather been like where you live?", seconds: 90, emoji: "🌦️" },
  { id: "sp6", levelId: "l5", title: "Work and study", prompt: "What did you want to do when you were ten? Why did you change your mind?", seconds: 120, emoji: "💼" },
  { id: "sp7", levelId: "l6", title: "A difficult decision", prompt: "Tell me about a hard choice you made, and what you learned.", seconds: 150, emoji: "⚖️" },
  { id: "sp8", levelId: "l7", title: "Explain it simply", prompt: "Explain what a computer network is, to someone who has never used one.", seconds: 180, emoji: "🧠" },
];

/* ------------------------------------------------------------------ */
/* exam tracks                                                          */
/* ------------------------------------------------------------------ */

export interface ExamTrack {
  id: string;
  name: string;
  body: string;
  sections: { name: string; minutes: number; questions: number; detail: string }[];
  totalMinutes: number;
  totalQuestions: number;
  bands: { label: string; min: string; note: string }[];
}

export const EXAM_TRACKS: ExamTrack[] = [
  {
    id: "toefl_ibt",
    name: "TOEFL iBT",
    body: "ETS",
    sections: [
      { name: "Reading", minutes: 54, questions: 30, detail: "Three passages, with a word-level highlight as you read." },
      { name: "Listening", minutes: 56, questions: 42, detail: "Six sections, each replayed once, with a transcript." },
      { name: "Speaking", minutes: 16, questions: 4, detail: "Four recorded responses, scored against the rubric." },
      { name: "Writing", minutes: 50, questions: 3, detail: "One integrated and two independent essays." },
    ],
    totalMinutes: 176,
    totalQuestions: 79,
    bands: [
      { label: "Advanced", min: "100+", note: "Close to a native academic speaker." },
      { label: "High intermediate", min: "79–99", note: "Comfortable at university in an English-medium country." },
      { label: "Intermediate", min: "60–78", note: "Enough for a foundation year or a short course." },
      { label: "Elementary", min: "0–59", note: "Keep working through the map before booking." },
    ],
  },
  {
    id: "ielts_academic",
    name: "IELTS Academic",
    body: "British Council",
    sections: [
      { name: "Listening", minutes: 30, questions: 40, detail: "Four recordings, each heard once, with a map question." },
      { name: "Reading", minutes: 60, questions: 40, detail: "Three passages, 20 minutes each." },
      { name: "Writing", minutes: 60, questions: 2, detail: "One task response of 150 words, one essay of 250." },
      { name: "Speaking", minutes: 15, questions: 3, detail: "A two-part interview with the examiner." },
    ],
    totalMinutes: 165,
    totalQuestions: 83,
    bands: [
      { label: "Band 9", min: "8.5+", note: "Mastery. Vocabulary range is not the constraint any more." },
      { label: "Band 7–8", min: "7.0–8.4", note: "University entry in the UK, Canada and Australia." },
      { label: "Band 6–7", min: "6.0–6.9", note: "Postgraduate coursework with a language module." },
      { label: "Band 5–6", min: "5.0–5.9", note: "Pre-sessional or foundation." },
    ],
  },
  {
    id: "toeic",
    name: "TOEIC (Listening & Reading)",
    body: "ETS",
    sections: [
      { name: "Listening", minutes: 45, questions: 125, detail: "Seven parts, four of them photographs." },
      { name: "Reading", minutes: 75, questions: 100, detail: "Seven parts, including the standard business English cloze." },
    ],
    totalMinutes: 120,
    totalQuestions: 225,
    bands: [
      { label: "905–990", min: "905", note: "Business negotiation level." },
      { label: "785–904", min: "785", note: "Meetings and email correspondence." },
      { label: "545–784", min: "545", note: "Everyday workplace communication." },
      { label: "Below 545", min: "0", note: "Start at level 2 and work up." },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* masked-language cloze                                                 */
/* ------------------------------------------------------------------ */

export interface ClozeItem {
  id: string;
  track: string;
  level: string;
  passage: string;
  /** The masked token, exactly as it appears between the markers. */
  target: string;
  /** The correct answer. */
  answer: string;
  /** Distractors, in a fixed order. */
  distractors: string[];
  /** What the masked-LM scored first, second, third. */
  predicted: string[];
  gloss: string;
}

export const CLOZE_ITEMS: ClozeItem[] = [
  {
    id: "cz1",
    track: "toeic",
    level: "L4",
    passage:
      "The company has decided to ___ its production line to a single site, which will reduce costs by roughly twelve per cent.",
    target: "consolidate",
    answer: "consolidate",
    distractors: ["celebrate", "calculate", "contemplate"],
    predicted: ["consolidate", "contemplate", "calculate"],
    gloss:
      "To consolidate is to bring several things into one. The clause after it — which will reduce costs — confirms a merge, not a celebration.",
  },
  {
    id: "cz2",
    track: "toeic",
    level: "L4",
    passage:
      "Attendees who register before the fifteenth of the month will receive a ___ discount on the full conference fee.",
    target: "substantial",
    answer: "substantial",
    distractors: ["subsequent", "subsidiary", "substantive"],
    predicted: ["substantial", "substantive", "subsequent"],
    gloss:
      "All three words start with 'subs'. Only 'substantial' collocates with 'discount' to mean a discount that is large in amount.",
  },
  {
    id: "cz3",
    track: "toeic",
    level: "L5",
    passage:
      "The manual explains how to ___ the delivery process so that each stage is recorded automatically.",
    target: "streamline",
    answer: "streamline",
    distractors: ["straighten", "strengthen", "strain"],
    predicted: ["streamline", "strengthen", "strain"],
    gloss:
      "Streamline means to make something simpler and more efficient, which is what 'so that each stage is recorded automatically' describes.",
  },
  {
    id: "cz4",
    track: "toeic",
    level: "L5",
    passage:
      "Our ___ for the coming year is to reduce the time it takes to onboard a new client.",
    target: "objective",
    answer: "objective",
    distractors: ["objection", "obligation", "obstacle"],
    predicted: ["objective", "obligation", "obstacle"],
    gloss:
      "A stated goal for the year is an objective. An obligation is a duty; an obstacle is a hindrance.",
  },
  {
    id: "cz5",
    track: "ielts_academic",
    level: "L6",
    passage:
      "The study found a ___ relationship between screen time before bed and the quality of sleep reported by participants.",
    target: "negative",
    answer: "negative",
    distractors: ["neutrally", "neglected", "negotiable"],
    predicted: ["negative", "negotiable", "neglected"],
    gloss:
      "Only 'negative' can modify 'relationship' in this sense; the other three belong to different parts of speech or collocations.",
  },
  {
    id: "cz6",
    track: "toefl_ibt",
    level: "L6",
    passage:
      "Although the policy was announced in 2019, it was not ___ enforced until the following year.",
    target: "actually",
    answer: "actually",
    distractors: "accidentally, actually".split(", "),
    predicted: ["actually", "accidentally"],
    gloss:
      "The contrast between 'announced' and 'enforced' needs an adverb that stresses the delay — 'actually', not 'accidentally'.",
  },
];

/* ------------------------------------------------------------------ */
/* reflection reports and certificates                                  */
/* ------------------------------------------------------------------ */

export interface ReflectionReport {
  id: string;
  learner: string;
  period: string;
  headline: string;
  strengths: string[];
  focus: string[];
  evidence: { label: string; value: string; change: string }[];
  quote: string;
}

export const REFLECTION_REPORTS: ReflectionReport[] = [
  {
    id: "rr1",
    learner: "Mika",
    period: "Last 14 days",
    headline:
      "Accuracy is up nine points, and the gain is concentrated in listening rather than speaking.",
    strengths: [
      "Consistent answer accuracy on listen-and-pick — nine in a row",
      "Sentence ordering: the subject-before-verb rule is now automatic",
      "Two full speaking sessions with no hesitation over the first sentence",
    ],
    focus: [
      "Third-person singular in the present — 'she go' still appears under pressure",
      "Article use before a plural noun, mostly in speech, not in writing",
      "Passive voice in the writing track, which has not been practised at all",
    ],
    evidence: [
      { label: "Accuracy", value: "86%", change: "+9 pts" },
      { label: "Words known", value: "214", change: "+31" },
      { label: "Minutes practised", value: "126", change: "+42" },
      { label: "Words per minute", value: "71", change: "+6" },
    ],
    quote:
      "I stopped translating in my head before I answer now. That is the whole difference.",
  },
  {
    id: "rr2",
    learner: "Sora",
    period: "First 7 days",
    headline:
      "A strong start on level 1, with the basics already secure enough to move to the second zone.",
    strengths: [
      "Every lesson in zone 1 completed on the first attempt",
      "Recognises all twenty-four classroom objects without audio",
      "Sentences are short but grammatically complete",
    ],
    focus: [
      "Past tense has not been introduced yet — that is the next thing to open",
      "Liaison in fast speech: 'pick it up' is still heard as three words",
      "Needs a second speaker to practise question forms",
    ],
    evidence: [
      { label: "Accuracy", value: "71%", change: "+12 pts" },
      { label: "Words known", value: "62", change: "+41" },
      { label: "Minutes practised", value: "52", change: "+52" },
      { label: "Words per minute", value: "38", change: "+9" },
    ],
    quote:
      "I can order food now without looking at the menu. That felt impossible on Monday.",
  },
];

export interface CertificateRecord {
  id: string;
  learner: string;
  level: string;
  title: string;
  issuedAt: string;
  score: string;
  expiresAt: string;
  kind: "level" | "exam" | "milestone";
}

export const CERTIFICATES: CertificateRecord[] = [
  {
    id: "ct1",
    learner: "Mika",
    level: "L3",
    title: "Level 3 complete — everyday conversation",
    issuedAt: "2026-10-08",
    score: "94 points",
    expiresAt: "no expiry",
    kind: "level",
  },
  {
    id: "ct2",
    learner: "Mika",
    level: "TOEIC",
    title: "TOEIC Listening & Reading — 815",
    issuedAt: "2026-09-19",
    score: "815 / 990",
    expiresAt: "2028-09-19",
    kind: "exam",
  },
  {
    id: "ct3",
    learner: "Mika",
    level: "L2",
    title: "Level 2 complete — getting by",
    issuedAt: "2026-09-02",
    score: "88 points",
    expiresAt: "no expiry",
    kind: "level",
  },
  {
    id: "ct4",
    learner: "Sora",
    level: "L1",
    title: "First 50 words — milestone",
    issuedAt: "2026-10-24",
    score: "50 words",
    expiresAt: "no expiry",
    kind: "milestone",
  },
];
