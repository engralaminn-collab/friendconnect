/**
 * Testing seed data — plain-English requirements, generated suites and the
 * provider configuration that decides which model writes the tests.
 */

export interface RequirementDoc {
  id: string;
  title: string;
  feature: string;
  owner: string;
  status: "draft" | "ready" | "generated" | "approved";
  criteria: string;
  tags: string[];
  updatedAt: string;
}

export const REQUIREMENT_DOCS: RequirementDoc[] = [
  {
    id: "req_login",
    title: "Sign in and session handling",
    feature: "Authentication",
    owner: "Amara Osei",
    status: "generated",
    criteria:
      "The user can log in with a valid email and password. The user sees an error when the password is wrong. The user stays signed in after a page reload. The user can log out and is returned to the sign-in page.",
    tags: ["auth", "smoke"],
    updatedAt: "2026-10-24T10:12:00Z",
  },
  {
    id: "req_search",
    title: "Conversation search",
    feature: "Messaging",
    owner: "Samuel Boateng",
    status: "ready",
    criteria:
      "The user can search for a message by keyword. Search results show the message and the conversation it came from. The user can filter results by date range. The user sees an empty state when nothing matches.",
    tags: ["messaging", "search"],
    updatedAt: "2026-10-25T14:40:00Z",
  },
  {
    id: "req_billing",
    title: "Billing and plan changes",
    feature: "Billing",
    owner: "Maya Rahman",
    status: "draft",
    criteria:
      "The user can upgrade a plan and sees the new price before confirming. The user cannot upgrade without a valid payment method. The admin can issue a credit when a charge is duplicated. The user can download an invoice for a past month.",
    tags: ["billing", "money"],
    updatedAt: "2026-10-25T09:05:00Z",
  },
  {
    id: "req_upload",
    title: "Attachment upload",
    feature: "Messaging",
    owner: "Daniel Farley",
    status: "approved",
    criteria:
      "The user can attach an image to a message. The upload is rejected when the file is larger than 25 megabytes. The user can attach several files at once. The user can remove a file before sending.",
    tags: ["messaging", "media"],
    updatedAt: "2026-10-22T16:30:00Z",
  },
  {
    id: "req_booking",
    title: "Consultation booking",
    feature: "Education consultancy",
    owner: "Priya Raman",
    status: "ready",
    criteria:
      "The student can pick a date and time from the available slots. The student cannot book a slot that is already taken. The student receives a confirmation with the consultant's name. The consultant can reschedule a booking and the student is notified.",
    tags: ["booking", "education"],
    updatedAt: "2026-10-23T11:00:00Z",
  },
];

export interface TestProvider {
  id: string;
  name: string;
  kind: "cloud" | "local";
  model: string;
  temperature: number;
  available: boolean;
  latencyMs: number;
  costPerRun: number;
  note: string;
}

export const TEST_PROVIDERS: TestProvider[] = [
  { id: "p_openai", name: "OpenAI", kind: "cloud", model: "gpt-4o-mini", temperature: 0, available: true, latencyMs: 1400, costPerRun: 0.004, note: "Default. Fast, and the output parses cleanly." },
  { id: "p_ollama", name: "Ollama (local)", kind: "local", model: "qwen2.5:14b", temperature: 0, available: true, latencyMs: 6100, costPerRun: 0, note: "Runs on your own hardware. Nothing leaves the machine." },
  { id: "p_openai_fallback", name: "OpenAI (fallback)", kind: "cloud", model: "gpt-4o", temperature: 0, available: true, latencyMs: 2600, costPerRun: 0.03, note: "Only used when the primary provider fails." },
  { id: "p_ollama_fallback", name: "Ollama (fallback)", kind: "local", model: "llama3.1:8b", temperature: 0, available: false, latencyMs: 3200, costPerRun: 0, note: "Not pulled locally yet." },
];

export interface TestArtifact {
  id: string;
  name: string;
  kind: "robot" | "pytest" | "sheet" | "report";
  bytes: number;
  producedAt: string;
  description: string;
}

export const TEST_ARTIFACTS: TestArtifact[] = [
  { id: "ta1", name: "auth.robot", kind: "robot", bytes: 4128, producedAt: "2026-10-24T10:14:00Z", description: "Robot Framework suite for the sign-in criteria." },
  { id: "ta2", name: "test_generated.py", kind: "pytest", bytes: 2870, producedAt: "2026-10-24T10:14:00Z", description: "pytest module generated from the same criteria." },
  { id: "ta3", name: "test_cases.xlsx", kind: "sheet", bytes: 18432, producedAt: "2026-10-24T10:14:00Z", description: "Spreadsheet with one row per case: name, steps, expected, priority." },
  { id: "ta4", name: "coverage-report.md", kind: "report", bytes: 2210, producedAt: "2026-10-24T10:15:00Z", description: "Coverage against the acceptance criteria, with the gaps named." },
];

/** The project layout the generator writes into. */
export const PROJECT_LAYOUT: { path: string; purpose: string }[] = [
  { path: "criteria/criterion.txt", purpose: "The requirement, in plain English. The only file you edit." },
  { path: "testgen/reader.py", purpose: "Reads the criteria file and splits it into sentences." },
  { path: "testgen/prompt.py", purpose: "Builds the prompt: criteria, rules, and the required output shape." },
  { path: "testgen/llm_router.py", purpose: "Chooses the provider, and switches to the fallback if the first fails." },
  { path: "testgen/generator.py", purpose: "Calls the model, validates the syntax, retries once on a parse failure." },
  { path: "testgen/excel_writer.py", purpose: "Writes the test-case sheet from the generated cases." },
  { path: "tests/test_generated.py", purpose: "The generated pytest module. Never edited by hand." },
  { path: "config.ini", purpose: "Provider, model, API key, export flags — all in one file." },
];

export const SAFETY_RULES: { id: string; rule: string; why: string }[] = [
  { id: "sr1", rule: "Temperature is always 0.", why: "A generated suite that changes on every run cannot be reviewed." },
  { id: "sr2", rule: "Output must be code only.", why: "Prose in a test file is a syntax error waiting to happen." },
  { id: "sr3", rule: "Every generated file is syntax-validated before it is written.", why: "A broken file that lands on disk is worse than no file." },
  { id: "sr4", rule: "The generated tests are never edited by hand.", why: "Regeneration would silently overwrite the fix." },
  { id: "sr5", rule: "The provider is configurable, and a fallback provider is optional.", why: "Local models keep the pipeline running when the network does not." },
];
