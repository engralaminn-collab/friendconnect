/**
 * A tiny, fully offline translator.
 *
 * It is not a machine-translation model and does not pretend to be one: it
 * carries a curated phrase table plus a word table for four languages, matches
 * the longest phrases first, and marks anything it cannot translate so the
 * UI never silently shows a half-translated sentence.
 */

export type LangCode = "en" | "bn" | "es" | "fr" | "ar";

export interface Language {
  code: LangCode;
  label: string;
  native: string;
  rtl: boolean;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English", rtl: false, flag: "🇬🇧" },
  { code: "bn", label: "Bengali", native: "বাংলা", rtl: true, flag: "🇧🇩" },
  { code: "es", label: "Spanish", native: "Español", rtl: false, flag: "🇪🇸" },
  { code: "fr", label: "French", native: "Français", rtl: false, flag: "🇫🇷" },
  { code: "ar", label: "Arabic", native: "العربية", rtl: true, flag: "🇸🇦" },
];

/** Full-sentence phrases — matched before single words, longest first. */
const PHRASES: Record<Exclude<LangCode, "en">, Record<string, string>> = {
  bn: {
    "good morning": "সুপ্রভাত",
    "good evening": "শুভ সন্ধ্যা",
    "thank you": "ধন্যবাদ",
    "thank you very much": "অনেক ধন্যবাদ",
    "how are you": "আপনি কেমন আছেন",
    "see you soon": "শীঘ্রই দেখা হবে",
    "i am on my way": "আমি রওনা পথে আছি",
    "let us talk later": "পরে কথা বলি",
    "the meeting is at three": "সভা তিনটায়",
    "i have sent the documents": "আমি ডকুমেন্টগুলো পাঠিয়ে দিয়েছি",
    "the deposit deadline is friday": "ডিপোজিটের শেষ তারিখ শুক্রবার",
    "we need to reschedule": "আমাদের সময় পরিবর্তন করতে হবে",
    "can you send me the link": "আপনি কি আমাকে লিংকটি পাঠাতে পারবেন",
    "the offer is confirmed": "অফারটি নিশ্চিত হয়েছে",
    "book the english test": "ইংরেজি টেস্ট বুক করুন",
    "the bank letter": "ব্যাংকের চিঠি",
    "noted, thank you": "বুঝেছি, ধন্যবাদ",
    "the visa slot opens at nine": "ভিসা স্লট নয়টায় খুলবে",
    "on my way": "রওনা পথে",
    "call me": "আমাকে কল করুন",
    "good night": "শুভ রাত্রি",
    "how much is it": "দাম কত",
    "i will check": "আমি দেখে জানাব",
  },
  es: {
    "good morning": "Buenos días",
    "good evening": "Buenas tardes",
    "thank you": "Gracias",
    "thank you very much": "Muchas gracias",
    "how are you": "¿Cómo estás?",
    "see you soon": "Hasta pronto",
    "i am on my way": "Voy en camino",
    "let us talk later": "Hablamos luego",
    "the meeting is at three": "La reunión es a las tres",
    "i have sent the documents": "He enviado los documentos",
    "the deposit deadline is friday": "El plazo del depósito es el viernes",
    "we need to reschedule": "Tenemos que reprogramar",
    "can you send me the link": "¿Puedes enviarme el enlace?",
    "the offer is confirmed": "La oferta está confirmada",
    "book the english test": "Reserva el examen de inglés",
    "the bank letter": "La carta del banco",
    "noted, thank you": "Entendido, gracias",
    "the visa slot opens at nine": "La plaza de visa abre a las nueve",
    "on my way": "Voy en camino",
    "call me": "Llámame",
    "good night": "Buenas noches",
    "how much is it": "¿Cuánto cuesta?",
    "i will check": "Lo comprobaré",
  },
  fr: {
    "good morning": "Bonjour",
    "good evening": "Bonsoir",
    "thank you": "Merci",
    "thank you very much": "Merci beaucoup",
    "how are you": "Comment allez-vous ?",
    "see you soon": "À bientôt",
    "i am on my way": "Je suis en route",
    "let us talk later": "On en parle plus tard",
    "the meeting is at three": "La réunion est à trois heures",
    "i have sent the documents": "J'ai envoyé les documents",
    "the deposit deadline is friday": "La date limite du dépôt est vendredi",
    "we need to reschedule": "Nous devons reprogrammer",
    "can you send me the link": "Pouvez-vous m'envoyer le lien ?",
    "the offer is confirmed": "L'offre est confirmée",
    "book the english test": "Réservez le test d'anglais",
    "the bank letter": "La lettre de la banque",
    "noted, thank you": "Noté, merci",
    "the visa slot opens at nine": "Le créneau de visa ouvre à neuf heures",
    "on my way": "Je suis en route",
    "call me": "Appelez-moi",
    "good night": "Bonne nuit",
    "how much is it": "Combien ça coûte ?",
    "i will check": "Je vais vérifier",
  },
  ar: {
    "good morning": "صباح الخير",
    "good evening": "مساء الخير",
    "thank you": "شكرا لك",
    "thank you very much": "شكرا جزيلا",
    "how are you": "كيف حالك؟",
    "see you soon": "نراك قريبا",
    "i am on my way": "أنا في الطريق",
    "let us talk later": "نتحدث لاحقا",
    "the meeting is at three": "الاجتماع في الساعة الثالثة",
    "i have sent the documents": "أرسلت المستندات",
    "the deposit deadline is friday": "آخر موعد للإيداع يوم الجمعة",
    "we need to reschedule": "علينا تغيير الموعد",
    "can you send me the link": "هل يمكنك إرسال الرابط؟",
    "the offer is confirmed": "تم تأكيد العرض",
    "book the english test": "احجز اختبار اللغة الإنجليزية",
    "the bank letter": "رسالة البنك",
    "noted, thank you": "تم، شكرا",
    "the visa slot opens at nine": "يبدأ موعد التأشيرة في التاسعة",
    "on my way": "في الطريق",
    "call me": "اتصل بي",
    "good night": "تصبح على خير",
    "how much is it": "كم الثمن؟",
    "i will check": "سأتحقق",
  },
};

/** Single words — a safety net, matched after phrases. */
const WORDS: Record<Exclude<LangCode, "en">, Record<string, string>> = {
  bn: {
    hello: "হ্যালো",
    hi: "হাই",
    please: "দয়া করে",
    yes: "হ্যাঁ",
    no: "না",
    today: "আজ",
    tomorrow: "আগামীকাল",
    monday: "সোমবার",
    tuesday: "মঙ্গলবার",
    wednesday: "বুধবার",
    thursday: "বৃহস্পতিবার",
    friday: "শুক্রবার",
    saturday: "শনিবার",
    sunday: "রবিবার",
    morning: "সকাল",
    evening: "সন্ধ্যা",
    night: "রাত",
    call: "কল",
    message: "মেসেজ",
    meeting: "সভা",
    documents: "নথিপত্র",
    offer: "অফার",
    deposit: "ডিপোজিট",
    deadline: "শেষ তারিখ",
    link: "লিংক",
    bank: "ব্যাংক",
    letter: "চিঠি",
    english: "ইংরেজি",
    test: "পরীক্ষা",
    visa: "ভিসা",
    slot: "স্লট",
    opens: "খোলে",
    at: "এ",
    nine: "নয়টায়",
    thanks: "ধন্যবাদ",
    check: "দেখে জানানো",
    send: "পাঠানো",
    later: "পরে",
    soon: "শীঘ্রই",
    way: "পথে",
    confirmed: "নিশ্চিত",
    price: "দাম",
    how: "কীভাবে",
    much: "কত",
    is: "হয়",
    it: "এটি",
    you: "আপনি",
    i: "আমি",
    the: "",
    a: "",
    to: "এর জন্য",
    and: "এবং",
    is_: "",
  },
  es: {
    hello: "hola",
    hi: "hola",
    please: "por favor",
    yes: "sí",
    no: "no",
    today: "hoy",
    tomorrow: "mañana",
    monday: "lunes",
    tuesday: "martes",
    wednesday: "miércoles",
    thursday: "jueves",
    friday: "viernes",
    saturday: "sábado",
    sunday: "domingo",
    morning: "mañana",
    evening: "tarde",
    night: "noche",
    call: "llamar",
    message: "mensaje",
    meeting: "reunión",
    documents: "documentos",
    offer: "oferta",
    deposit: "depósito",
    deadline: "plazo",
    link: "enlace",
    bank: "banco",
    letter: "carta",
    english: "inglés",
    test: "examen",
    visa: "visa",
    slot: "plaza",
    opens: "abre",
    at: "a las",
    nine: "nueve",
    thanks: "gracias",
    check: "comprobar",
    send: "enviar",
    later: "más tarde",
    soon: "pronto",
    way: "camino",
    confirmed: "confirmada",
    price: "precio",
    how: "cómo",
    much: "mucho",
    is: "es",
    it: "eso",
    you: "tú",
    i: "yo",
    the: "el",
    a: "un",
    to: "a",
    and: "y",
  },
  fr: {
    hello: "bonjour",
    hi: "salut",
    please: "s'il te plaît",
    yes: "oui",
    no: "non",
    today: "aujourd'hui",
    tomorrow: "demain",
    monday: "lundi",
    tuesday: "mardi",
    wednesday: "mercredi",
    thursday: "jeudi",
    friday: "vendredi",
    saturday: "samedi",
    sunday: "dimanche",
    morning: "matin",
    evening: "soir",
    night: "nuit",
    call: "appeler",
    message: "message",
    meeting: "réunion",
    documents: "documents",
    offer: "offre",
    deposit: "dépôt",
    deadline: "date limite",
    link: "lien",
    bank: "banque",
    letter: "lettre",
    english: "anglais",
    test: "test",
    visa: "visa",
    slot: "créneau",
    opens: "ouvre",
    at: "à",
    nine: "neuf",
    thanks: "merci",
    check: "vérifier",
    send: "envoyer",
    later: "plus tard",
    soon: "bientôt",
    way: "route",
    confirmed: "confirmée",
    price: "prix",
    how: "comment",
    much: "combien",
    is: "est",
    it: "cela",
    you: "vous",
    i: "je",
    the: "le",
    a: "un",
    to: "à",
    and: "et",
  },
  ar: {
    hello: "مرحبا",
    hi: "أهلا",
    please: "من فضلك",
    yes: "نعم",
    no: "لا",
    today: "اليوم",
    tomorrow: "غدا",
    monday: "الاثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
    sunday: "الأحد",
    morning: "صباحا",
    evening: "مساء",
    night: "ليلا",
    call: "اتصال",
    message: "رسالة",
    meeting: "اجتماع",
    documents: "مستندات",
    offer: "عرض",
    deposit: "إيداع",
    deadline: "آخر موعد",
    link: "رابط",
    bank: "بنك",
    letter: "رسالة",
    english: "الإنجليزية",
    test: "اختبار",
    visa: "تأشيرة",
    slot: "موعد",
    opens: "يبدأ",
    at: "في",
    nine: "التاسعة",
    thanks: "شكرا",
    check: "أتحقق",
    send: "أرسل",
    later: "لاحقا",
    soon: "قريبا",
    way: "الطريق",
    confirmed: "مؤكد",
    price: "السعر",
    how: "كيف",
    much: "كم",
    is: "هو",
    it: "ذلك",
    you: "أنت",
    i: "أنا",
    the: "الـ",
    a: "",
    to: "إلى",
    and: "و",
  },
};

export interface TranslationResult {
  ok: boolean;
  text: string;
  lang: LangCode;
  /** Words that could not be translated. */
  unknown: string[];
  /** Words matched from the phrase table rather than the word table. */
  phrases: number;
  coverage: number;
}

/** Normalises a phrase for lookup: lowercase, collapse whitespace, drop punctuation. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Translates English into the target language. Phrases are matched first, then
 * single words. Anything unmatched is kept in place and reported, so the UI can
 * say "2 words could not be translated" instead of pretending.
 */
export function translate(text: string, lang: LangCode): TranslationResult {
  if (lang === "en") {
    return { ok: true, text, lang, unknown: [], phrases: 0, coverage: 1 };
  }

  const phrases = PHRASES[lang];
  const words = WORDS[lang];

  // Longest-first phrase matching over a token window.
  const phraseKeys = Object.keys(phrases).sort((a, b) => b.length - a.length);
  const maxPhraseWords = phraseKeys.reduce(
    (n, k) => Math.max(n, k.split(" ").length),
    0,
  );

  const tokens = text.split(/(\s+)/);
  const out: string[] = [];
  const unknown: string[] = [];
  let phraseHits = 0;
  let translated = 0;
  let considered = 0;

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (/^\s+$/.test(token)) {
      out.push(token);
      i += 1;
      continue;
    }

    // Try the longest phrase window starting here.
    let matched = false;
    for (let len = maxPhraseWords; len >= 1; len -= 1) {
      const window: string[] = [];
      let j = i;
      while (window.length < len && j < tokens.length) {
        if (!/^\s+$/.test(tokens[j])) window.push(tokens[j]);
        j += 1;
      }
      if (window.length !== len) continue;
      const key = normalise(window.join(" "));
      const hit = phrases[key];
      if (hit) {
        out.push(hit);
        phraseHits += 1;
        translated += 1;
        considered += 1;
        // skip the tokens we consumed
        i = j;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const key = normalise(token);
    if (!key) {
      out.push(token);
      i += 1;
      continue;
    }
    considered += 1;
    const word = words[key];
    if (word === undefined) {
      out.push(token);
      unknown.push(token.replace(/[.,!?;:]+$/, ""));
    } else {
      out.push(word);
      translated += 1;
    }
    i += 1;
  }

  const coverage = considered === 0 ? 1 : translated / considered;
  return {
    ok: unknown.length === 0,
    text: out.join("").replace(/\s+([,.!?;:])/g, "$1"),
    lang,
    unknown,
    phrases: phraseHits,
    coverage: +coverage.toFixed(2),
  };
}

/** The languages a message can be translated into, excluding the source. */
export function targetLanguages(source: LangCode = "en"): Language[] {
  return LANGUAGES.filter((l) => l.code !== source);
}
