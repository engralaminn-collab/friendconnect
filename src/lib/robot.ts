/**
 * Plain English → Robot Framework, and plain English → pytest.
 *
 * The two generators here are deterministic: the same requirement always
 * produces the same suite. That is deliberate — an auto-generated test that
 * changes on every run is worse than no test at all, because you cannot review
 * the diff.
 *
 * The Robot output is real, valid Robot Framework syntax: settings, variables,
 * keywords and test cases, with a library section and `[Tags]`.
 */

export type TestKind = "smoke" | "functional" | "regression" | "edge" | "negative";

export interface GeneratedCase {
  id: string;
  title: string;
  kind: TestKind;
  priority: "P0" | "P1" | "P2";
  requirement: string;
  steps: string[];
  expected: string;
  tags: string[];
  keyword: string;
}

export interface RobotSuite {
  name: string;
  description: string;
  library: string;
  tags: string[];
  cases: GeneratedCase[];
  robot: string;
  pytest: string;
  sheet: { title: string; kind: string; priority: string; steps: string; expected: string }[];
}

/* ------------------------------------------------------------------ */
/* requirement parsing                                                  */
/* ------------------------------------------------------------------ */

const VERBS: Record<string, string> = {
  login: "Sign In",
  signin: "Sign In",
  logon: "Sign In",
  logout: "Sign Out",
  signout: "Sign Out",
  register: "Register Account",
  signup: "Register Account",
  search: "Search",
  filter: "Filter Results",
  add: "Add Item",
  create: "Create Item",
  edit: "Edit Item",
  update: "Update Item",
  delete: "Delete Item",
  remove: "Delete Item",
  submit: "Submit Form",
  upload: "Upload File",
  download: "Download File",
  verify: "Verify",
  check: "Verify",
  confirm: "Verify",
  navigate: "Navigate",
  open: "Open",
  close: "Close",
  invite: "Invite User",
  share: "Share",
  export: "Export",
  import: "Import",
  pay: "Make Payment",
  apply: "Submit Application",
  schedule: "Schedule",
  cancel: "Cancel",
  reset: "Reset",
  upgrade: "Upgrade Plan",
};

const SUBJECTS: Record<string, string> = {
  user: "the user",
  admin: "the administrator",
  administrator: "the administrator",
  agent: "the agent",
  customer: "the customer",
  student: "the student",
  applicant: "the applicant",
  system: "the system",
  api: "the API",
  page: "the page",
  form: "the form",
  report: "the report",
  notification: "the notification",
  email: "the email",
};

function normalise(sentence: string) {
  return sentence
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^.*?\b(given|when|then|and|should|can|must|is able to)\b[: ]\s*/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function detectVerb(sentence: string): string {
  const words = sentence.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const w of words) {
    if (VERBS[w]) return VERBS[w];
  }
  return "Verify Behaviour";
}

function detectSubject(sentence: string): string {
  const words = sentence.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const w of words) {
    if (SUBJECTS[w]) return SUBJECTS[w];
  }
  return "the system";
}

function detectKind(sentence: string, index: number): TestKind {
  const s = sentence.toLowerCase();
  if (/\b(invalid|wrong|missing|without|not |never|should not|shouldn't|reject|expired)\b/.test(s))
    return "negative";
  if (/\b(zero|empty|boundary|maximum|minimum|limit|large|invalid format|too long|too short)\b/.test(s))
    return "edge";
  if (index === 0) return "smoke";
  if (/\b(after|second|again|regression|once more)\b/.test(s)) return "regression";
  return "functional";
}

function priorityFor(kind: TestKind, index: number): "P0" | "P1" | "P2" {
  if (kind === "smoke") return "P0";
  if (kind === "negative" || kind === "edge") return "P1";
  if (index < 3) return "P0";
  return "P2";
}

function splitRequirements(text: string): string[] {
  return text
    .split(/\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => normalise(s))
    .filter((s) => s.length > 6);
}

function titleCase(s: string) {
  return s
    .split(" ")
    .slice(0, 9)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* case synthesis                                                       */
/* ------------------------------------------------------------------ */

function buildSteps(sentence: string, subject: string, verb: string) {
  const steps: string[] = [];
  const lower = sentence.toLowerCase();

  if (/log ?in|sign ?in|log ?on/.test(lower)) {
    steps.push(`${subject} opens the sign-in page`);
    steps.push(`${subject} enters valid credentials`);
  } else if (/log ?out|sign ?out/.test(lower)) {
    steps.push(`${subject} is signed in`);
    steps.push(`${subject} opens the account menu`);
  } else if (/register|sign ?up/.test(lower)) {
    steps.push(`${subject} opens the registration page`);
    steps.push(`${subject} completes the registration form`);
  } else {
    steps.push(`${subject} is on the relevant page`);
  }

  if (/search/.test(lower)) {
    steps.push(`${subject} enters a search term`);
    steps.push(`${subject} runs the search`);
  } else if (/filter/.test(lower)) {
    steps.push(`${subject} opens the filter panel`);
    steps.push(`${subject} applies the filter`);
  } else if (/upload/.test(lower)) {
    steps.push(`${subject} opens the upload tray`);
    steps.push(`${subject} chooses a file from disk`);
  } else if (/add|create/.test(lower)) {
    steps.push(`${subject} opens the create form`);
    steps.push(`${subject} fills in the required fields`);
  } else if (/edit|update/.test(lower)) {
    steps.push(`${subject} opens the record`);
    steps.push(`${subject} changes a field`);
  } else if (/delete|remove/.test(lower)) {
    steps.push(`${subject} opens the record`);
    steps.push(`${subject} triggers the delete action`);
  } else if (/export/.test(lower)) {
    steps.push(`${subject} opens the reports section`);
    steps.push(`${subject} chooses an export format`);
  } else if (/schedule/.test(lower)) {
    steps.push(`${subject} opens the scheduler`);
    steps.push(`${subject} picks a date and time`);
  }

  steps.push(`${subject} ${verb.toLowerCase()}`);
  return steps;
}

function buildExpected(sentence: string, kind: TestKind) {
  const subject = detectSubject(sentence);
  if (kind === "negative")
    return `The action is rejected and ${subject} sees a clear validation message. No record is created or changed.`;
  if (kind === "edge")
    return `The boundary value is handled without an error, and ${subject} sees either a success state or a precise validation message.`;
  if (/\b(error|fail|cannot|unable)\b/i.test(sentence))
    return `The failure is handled and ${subject} sees a specific, actionable error message.`;
  return `${subject} sees the expected result and the state is persisted.`;
}

function robotCase(c: GeneratedCase, indent = "    ") {
  const lines: string[] = [];
  lines.push(`${indent}${c.title}`);
  lines.push(`${indent}    [Tags]    ${c.tags.join("    ")}`);
  lines.push(`${indent}    ${c.steps[0]}`);
  for (const s of c.steps.slice(1, -1)) lines.push(`${indent}    ${s}`);
  lines.push(`${indent}    ${c.expected}`);
  lines.push("");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* public API                                                           */
/* ------------------------------------------------------------------ */

export function generateSuite(
  requirement: string,
  options: {
    suiteName?: string;
    library?: string;
    tags?: string[];
  } = {},
): RobotSuite {
  const library = options.library ?? "Browser    # web app under test";
  const suiteName =
    options.suiteName ?? "Generated Suite";
  const baseTags = options.tags ?? ["generated", "friendconnect"];

  const sentences = splitRequirements(requirement);
  const cases: GeneratedCase[] = sentences.map((sentence, i) => {
    const kind = detectKind(sentence, i);
    const verb = detectVerb(sentence);
    const subject = detectSubject(sentence);
    return {
      id: `tc_${String(i + 1).padStart(3, "0")}`,
      title: `${verb} — ${titleCase(sentence)}`,
      kind,
      priority: priorityFor(kind, i),
      requirement: sentence,
      steps: buildSteps(sentence, subject, verb),
      expected: buildExpected(sentence, kind),
      tags: [kind, baseTags[0], ...baseTags.slice(1)],
      keyword: verb,
    };
  });

  const keywords = [...new Set(cases.map((c) => c.keyword))];

  const robot = [
    "*** Settings ***",
    "Documentation    Generated from a plain-English requirement.",
    "Library          " + library,
    "",
    "*** Variables ***",
    "${BASE_URL}       https://app.friendconnect.test",
    "${TIMEOUT}        30s",
    "",
    "*** Keywords ***",
    ...keywords.flatMap((k) => [
      `${k}`,
      "    [Arguments]    ${subject}=the user    ${value}=${EMPTY}",
      "    ${subject} is on the relevant page",
      "    ${subject} performs the action",
      "",
    ]),
    "*** Test Cases ***",
    ...cases.map((c) => robotCase(c)),
  ].join("\n");

  const pytest = [
    "import pytest",
    "",
    ...cases.flatMap((c) => [
      `def ${c.id}():`,
      `    """${c.requirement}"""`,
      ...c.steps.map((s) => `    # ${s}`),
      `    # Expected: ${c.expected}`,
      "    pass",
      "",
      "",
    ]),
    `@pytest.mark.parametrize("kind", ["smoke", "functional", "negative", "edge"])`,
    "def test_suite_kinds(kind):",
    `    assert kind in {"smoke", "functional", "negative", "edge"}`,
  ].join("\n");

  const sheet = cases.map((c) => ({
    title: c.title,
    kind: c.kind,
    priority: c.priority,
    steps: c.steps.join(" → "),
    expected: c.expected,
  }));

  return {
    name: suiteName,
    description: `Generated from ${cases.length} requirement sentence${
      cases.length === 1 ? "" : "s"
    }.`,
    library,
    tags: baseTags,
    cases,
    robot,
    pytest,
    sheet,
  };
}

/** Escapes a value for Robot Framework's cell syntax. */
export function robotCell(value: string) {
  if (value === "") return "${EMPTY}";
  if (value.includes("\n")) return value.replace(/\n/g, " ");
  if (/[${}]/.test(value)) return value;
  return value;
}

/** Converts a Robot Framework suite into a CSV test-case sheet. */
export function suiteToCsv(suite: RobotSuite) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    ["Test Name", "Type", "Priority", "Steps", "Expected"].map(escape).join(","),
    ...suite.sheet.map((r) =>
      [r.title, r.kind, r.priority, r.steps, r.expected].map(escape).join(","),
    ),
  ];
  return rows.join("\n");
}
