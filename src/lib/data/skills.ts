/**
 * Agent skills + MCP registry.
 *
 * The shape an agent-skills pack takes: a dispatcher, an onboarding journey,
 * and a family of scoped skills per platform. Alongside it, the documentation
 * MCP server that lets an agent read the guides and write the integration.
 */

export type SkillFamily =
  | "dispatcher"
  | "onboarding"
  | "core"
  | "components"
  | "placement"
  | "customization"
  | "features"
  | "calls"
  | "push"
  | "migration"
  | "production"
  | "testing"
  | "troubleshooting"
  | "cross-cutting";

export interface AgentSkill {
  id: string;
  name: string;
  family: SkillFamily;
  platform: string;
  summary: string;
  /** What the skill does when it fires. */
  behaviour: string[];
  /** The words that make the agent pick this skill. */
  triggers: string[];
  weight: number;
}

export const SKILLS: AgentSkill[] = [
  {
    id: "sk_cometchat",
    name: "cometchat",
    family: "dispatcher",
    platform: "all",
    summary:
      "The entry point. Routes a request to the onboarding journey or straight to a platform's core skill.",
    behaviour: [
      "Detect the framework, the intent and where the chat should live",
      "Ask only the questions it cannot infer, then write the code",
      "Never guess a platform — if it is ambiguous, ask",
    ],
    triggers: ["add chat", "add chat to my app", "add messaging", "cometchat"],
    weight: 100,
  },
  {
    id: "sk_onboarding",
    name: "cometchat-onboarding",
    family: "onboarding",
    platform: "all",
    summary:
      "A four-stage journey — discover, understand, plan, approve — before any code is written.",
    behaviour: [
      "Discover: framework, package manager, existing routing, build tool",
      "Understand: one-to-one or group, calling or not, which features",
      "Plan: a scoped plan the human approves",
      "Approve: only then write into the files that already exist",
    ],
    triggers: ["start", "begin", "set up chat"],
    weight: 95,
  },
  {
    id: "sk_react_core",
    name: "cometchat-react-v7-core",
    family: "core",
    platform: "react",
    summary: "The React UI Kit core: SDK init, session, UI provider, theming, auth.",
    behaviour: [
      "Initialise the SDK once, at the app root",
      "Create a session with an auth token the server minted",
      "Wrap the tree in the UI provider and pass the theme",
      "Register the calls screen only if calling is in scope",
    ],
    triggers: ["react", "next.js", "vite", "nextjs"],
    weight: 90,
  },
  {
    id: "sk_react_components",
    name: "cometchat-react-v7-components",
    family: "components",
    platform: "react",
    summary: "Which components to mount for the requested surface, and where.",
    behaviour: [
      "Map the intent to a component set",
      "Place the conversation list and the message list in the right regions",
      "Keep the component boundary thin — the kit owns the chat",
    ],
    triggers: ["add reactions", "add a details side panel", "add threads", "add polls"],
    weight: 82,
  },
  {
    id: "sk_react_theming",
    name: "cometchat-react-v7-customization",
    family: "customization",
    platform: "react",
    summary: "Theme the kit with CSS custom properties, and keep dark mode consistent.",
    behaviour: [
      "Override tokens, not component internals",
      "Ship both light and dark values",
      "Check contrast on the outgoing bubble in both themes",
    ],
    triggers: ["switch to dark mode", "change colours", "brand the chat", "theme"],
    weight: 74,
  },
  {
    id: "sk_react_features",
    name: "cometchat-react-v7-features",
    family: "features",
    platform: "react",
    summary: "Turn features on in the right order so nothing renders half-configured.",
    behaviour: [
      "Enable the extension, then mount the UI",
      "Wire presence and typing indicators last",
      "Verify each feature with a short manual pass",
    ],
    triggers: ["add reactions", "add mentions", "add read receipts", "add presence"],
    weight: 76,
  },
  {
    id: "sk_react_calls",
    name: "cometchat-react-v7-calls",
    family: "calls",
    platform: "react",
    summary: "Voice and video calling, and the call log surface.",
    behaviour: [
      "Register the calling extension and the token provider",
      "Mount the ongoing-call surface and the call log",
      "Handle permission denial without breaking the chat",
    ],
    triggers: ["add calls", "add voice call", "add video call", "call log"],
    weight: 78,
  },
  {
    id: "sk_react_push",
    name: "cometchat-react-v7-push",
    family: "push",
    platform: "react",
    summary: "Background delivery, with the token lifecycle handled correctly.",
    behaviour: [
      "Register the device token on login",
      "Invalidate the token on logout",
      "Route the notification to the right conversation",
    ],
    triggers: ["add push", "notifications", "fcm", "apns"],
    weight: 60,
  },
  {
    id: "sk_react_production",
    name: "cometchat-react-v7-production",
    family: "production",
    platform: "react",
    summary: "Server-minted auth tokens, environment handling and error surfaces.",
    behaviour: [
      "Never ship the API key to the browser",
      "Mint the auth token server-side and hand it to the client",
      "Fail loudly when a session cannot be created",
    ],
    triggers: ["production", "auth token", "server minted", "deploy"],
    weight: 70,
  },
  {
    id: "sk_react_testing",
    name: "cometchat-react-v7-testing",
    family: "testing",
    platform: "react",
    summary: "Unit, story and end-to-end coverage for the chat surfaces.",
    behaviour: [
      "Unit-test the components in isolation",
      "Cover the full journey in an end-to-end suite",
      "Mock the SDK at the boundary, not inside the component",
    ],
    triggers: ["test", "e2e", "storybook", "vitest", "playwright"],
    weight: 55,
  },
  {
    id: "sk_react_migration",
    name: "cometchat-react-v7-migration",
    family: "migration",
    platform: "react",
    summary: "Move an existing chat onto the kit without a rewrite.",
    behaviour: [
      "Map the old screen to the new component set",
      "Move one surface at a time",
      "Keep the data layer until the last step",
    ],
    triggers: ["migrate", "upgrade", "move from"],
    weight: 50,
  },
  {
    id: "sk_angular_core",
    name: "cometchat-angular-v5-core",
    family: "core",
    platform: "angular",
    summary: "The Angular UI Kit core: standalone providers, signals, strict templates.",
    behaviour: [
      "Register the providers once",
      "Use signals for the session state",
      "Keep templates strict",
    ],
    triggers: ["angular"],
    weight: 85,
  },
  {
    id: "sk_rn_core",
    name: "cometchat-rn-v5-core",
    family: "core",
    platform: "react-native",
    summary: "The React Native UI Kit core, on Expo and bare React Native.",
    behaviour: [
      "Wrap the app in the SDK provider",
      "Handle safe areas around the composer",
      "Test on a device — not only the simulator",
    ],
    triggers: ["react native", "expo", "mobile"],
    weight: 84,
  },
  {
    id: "sk_ios_core",
    name: "cometchat-ios-v5-core",
    family: "core",
    platform: "ios",
    summary: "The iOS UI Kit core in Swift and SwiftUI.",
    behaviour: [
      "Set up the SDK before the first view appears",
      "Keep the call screen on top of the navigation stack",
      "Support dynamic type",
    ],
    triggers: ["ios", "swift", "swiftui"],
    weight: 82,
  },
  {
    id: "sk_android_core",
    name: "cometchat-android-v6-core",
    family: "core",
    platform: "android",
    summary: "The Android UI Kit core in Kotlin and Compose.",
    behaviour: [
      "Initialise the SDK in Application.onCreate",
      "Store the session in the ViewModel layer",
      "Keep the call service bound",
    ],
    triggers: ["android", "kotlin", "compose"],
    weight: 81,
  },
  {
    id: "sk_flutter_core",
    name: "cometchat-flutter-v6-core",
    family: "core",
    platform: "flutter",
    summary: "The Flutter UI Kit core across Android, iOS, web and desktop.",
    behaviour: [
      "Initialise the SDK before runApp",
      "Handle the platform channel for calls",
      "Keep the widget tree shallow",
    ],
    triggers: ["flutter", "dart"],
    weight: 79,
  },
  {
    id: "sk_js_calls",
    name: "cometchat-js-calls-v5",
    family: "calls",
    platform: "headless",
    summary: "The headless Calls SDK for JavaScript — media without a UI kit.",
    behaviour: [
      "Create the call session and token",
      "Own the media elements yourself",
      "Report call events to your own state",
    ],
    triggers: ["headless calls", "no ui kit", "custom call screen"],
    weight: 66,
  },
  {
    id: "sk_android_calls",
    name: "cometchat-android-v5-calls-sdk",
    family: "calls",
    platform: "headless",
    summary: "The headless Calls SDK for Android, with a bound ConnectionService.",
    behaviour: [
      "Bind the call service so the system UI can show the call",
      "Handle incoming calls through the service",
      "Release the service when the app goes to the background",
    ],
    triggers: ["android calls", "connection service", "incoming call"],
    weight: 64,
  },
  {
    id: "sk_a11y",
    name: "cometchat-a11y",
    family: "cross-cutting",
    platform: "all",
    summary: "Accessibility contract for every chat surface, on every platform.",
    behaviour: [
      "Check focus, target size, contrast and announcement",
      "Provide transcripts for voice notes",
      "Respect reduced motion",
    ],
    triggers: ["accessibility", "a11y", "screen reader", "wcag"],
    weight: 72,
  },
  {
    id: "sk_analytics",
    name: "cometchat-analytics",
    family: "cross-cutting",
    platform: "all",
    summary: "Event instrumentation, with a stable event vocabulary.",
    behaviour: [
      "Emit message, call and engagement events consistently",
      "Do not log message bodies",
      "Keep the event names stable across releases",
    ],
    triggers: ["analytics", "events", "tracking"],
    weight: 48,
  },
  {
    id: "sk_audit",
    name: "cometchat-audit",
    family: "cross-cutting",
    platform: "all",
    summary: "A read-only reviewer that checks an integration against the guide.",
    behaviour: [
      "Compare the implementation to the task guide",
      "Report mismatches with a fix for each",
      "Never rewrite code without being asked",
    ],
    triggers: ["audit", "review", "check my integration"],
    weight: 58,
  },
  {
    id: "sk_compliance",
    name: "cometchat-compliance",
    family: "cross-cutting",
    platform: "all",
    summary: "Data-handling and compliance rules for a production deployment.",
    behaviour: [
      "Keep PII out of logs and analytics",
      "Record consent for messaging and calling",
      "Support data deletion on request",
    ],
    triggers: ["compliance", "gdpr", "pii", "data retention"],
    weight: 62,
  },
  {
    id: "sk_troubleshoot",
    name: "cometchat-troubleshooting",
    family: "troubleshooting",
    platform: "all",
    summary: "A symptom-first diagnostic for integration problems.",
    behaviour: [
      "Start from the symptom, not the code",
      "Check the session, then the token, then the extension",
      "Reproduce with the smallest possible case",
    ],
    triggers: ["not working", "error", "blank screen", "no messages"],
    weight: 68,
  },
];

/* ------------------------------------------------------------------ */
/* MCP registry                                                         */
/* ------------------------------------------------------------------ */

export interface McpServer {
  id: string;
  name: string;
  publisher: string;
  transport: "http" | "stdio" | "sse";
  url: string;
  readOnly: boolean;
  auth: "none" | "api-key" | "oauth";
  tools: { name: string; description: string }[];
  prompts: { name: string; example: string }[];
  install: { agent: string; command: string }[];
  registry: string[];
}

export const MCP_SERVERS: McpServer[] = [
  {
    id: "mcp_cometchat_docs",
    name: "CometChat Docs MCP",
    publisher: "CometChat",
    transport: "http",
    url: "https://mcp.cometchat.com/mcp",
    readOnly: true,
    auth: "none",
    tools: [
      { name: "search_docs", description: "Search the official task guides for a feature." },
      { name: "get_guide", description: "Return the full guide for one task." },
      { name: "list_examples", description: "List runnable examples for a platform." },
      { name: "check_api", description: "Check a method signature against the current SDK." },
    ],
    prompts: [
      { name: "add_chat_to_app", example: "add a chat tab where users can DM each other" },
      { name: "multi_tenant_chat", example: "walk me through multi-tenant chat for a Next.js SaaS" },
      { name: "presence_and_typing", example: "show me how to add presence indicators and typing dots" },
      { name: "moderation", example: "add profanity filtering and a report flow" },
    ],
    install: [
      { agent: "Claude Code", command: "claude mcp add --transport http cometchat https://mcp.cometchat.com/mcp" },
      { agent: "Cursor", command: 'mcpServers: { "cometchat": { "url": "https://mcp.cometchat.com/mcp" } }' },
      { agent: "Codex CLI", command: "codex plugin marketplace add cometchat/docs-mcp" },
      { agent: "Windsurf", command: "MCP: Add MCP Server → https://mcp.cometchat.com/mcp" },
      { agent: "VS Code Copilot", command: "MCP: Add MCP Server → https://mcp.cometchat.com/mcp" },
      { agent: "Gemini CLI", command: "gemini extensions install https://github.com/cometchat/cometchat-skills" },
    ],
    registry: ["MCP Registry", "Smithery", "Glama", "ClaudePluginHub"],
  },
  {
    id: "mcp_crm",
    name: "Workspace CRM",
    publisher: "FriendConnect",
    transport: "stdio",
    url: "node ./mcp/crm.mjs",
    readOnly: false,
    auth: "api-key",
    tools: [
      { name: "lookup_contact", description: "Find a contact by name, email or phone." },
      { name: "log_activity", description: "Append an activity to a contact timeline." },
      { name: "create_deal", description: "Create a deal in a pipeline stage." },
    ],
    prompts: [
      { name: "summarise_thread", example: "summarise the last thread with this contact" },
    ],
    install: [
      { agent: "Claude Code", command: "claude mcp add crm -- node ./mcp/crm.mjs" },
    ],
    registry: ["local"],
  },
  {
    id: "mcp_calls",
    name: "Call centre",
    publisher: "FriendConnect",
    transport: "http",
    url: "https://api.friendconnect.test/mcp/calls",
    readOnly: false,
    auth: "oauth",
    tools: [
      { name: "start_call", description: "Place an outbound call with a recipe." },
      { name: "live_transcript", description: "Read the live transcript of the active call." },
      { name: "call_summary", description: "Fetch the three-part summary for a closed call." },
    ],
    prompts: [
      { name: "call_back", example: "call the customer who asked for a callback" },
    ],
    install: [
      { agent: "Cursor", command: '{ "mcpServers": { "calls": { "url": "https://api.friendconnect.test/mcp/calls" } } }' },
    ],
    registry: ["MCP Registry"],
  },
  {
    id: "mcp_scraper",
    name: "Self-hosted scraper",
    publisher: "FriendConnect",
    transport: "http",
    url: "http://127.0.0.1:8080",
    readOnly: false,
    auth: "none",
    tools: [
      { name: "scrape", description: "Fetch a page and return clean markdown, HTML, text or links." },
      { name: "search", description: "Search the web through the self-hosted index." },
      { name: "batch", description: "Queue many pages and collect them as a job." },
      { name: "enrich", description: "Pipe scraped content through a model into structured JSON." },
    ],
    prompts: [
      { name: "research_topic", example: "research this topic and summarise the sources" },
    ],
    install: [
      { agent: "Claude Code", command: "claude mcp add scraper --transport http scraper http://127.0.0.1:8080" },
    ],
    registry: ["self-hosted"],
  },
];

/** The onboarding conversation the dispatcher runs. */
export const ONBOARDING_STEPS: {
  id: string;
  stage: "discover" | "understand" | "plan" | "approve";
  question: string;
  why: string;
  options?: string[];
  inferred?: string;
}[] = [
  {
    id: "ob_framework",
    stage: "discover",
    question: "Which framework is the chat going into?",
    why: "The component set, the provider and the build differ per platform.",
    options: ["React", "Angular", "React Native", "iOS", "Android", "Flutter", "Headless only"],
    inferred: "Detected React 19 with Next.js App Router from package.json.",
  },
  {
    id: "ob_intent",
    stage: "understand",
    question: "What kind of conversation is it — one-to-one, groups, or both?",
    why: "Groups need membership, roles and a group metadata layer.",
    options: ["One-to-one only", "Groups only", "Both"],
  },
  {
    id: "ob_calling",
    stage: "understand",
    question: "Do you need voice or video calling in this release?",
    why: "Calling adds a token provider, permissions and a call surface.",
    options: ["No calling", "Voice only", "Voice and video"],
  },
  {
    id: "ob_features",
    stage: "understand",
    question: "Which features are in scope for the first release?",
    why: "Each feature is an extension that has to be enabled and mounted.",
    options: ["Reactions", "Threads", "Polls", "Voice notes", "Push", "AI assistant", "Moderation"],
  },
  {
    id: "ob_plan",
    stage: "plan",
    question: "Here is the plan. Approve it?",
    why: "Nothing is written until the plan is approved.",
  },
  {
    id: "ob_build",
    stage: "approve",
    question: "Writing the integration into the files you already have.",
    why: "Code lands in the existing structure, not in a new folder.",
  },
];

/** The contract files the pack ships, one per platform. */
export const SKILL_CONTRACTS: {
  id: string;
  file: string;
  platform: string;
  components: number;
  features: number;
  events: number;
}[] = [
  { id: "sc_react", file: "contracts.react-v7.json", platform: "React v7", components: 43, features: 18, events: 26 },
  { id: "sc_angular", file: "contracts.angular-v5.json", platform: "Angular v5", components: 39, features: 16, events: 24 },
  { id: "sc_rn", file: "contracts.rn-v5.json", platform: "React Native v5", components: 38, features: 16, events: 24 },
  { id: "sc_ios", file: "contracts.ios-v5.json", platform: "iOS v5", components: 36, features: 15, events: 22 },
  { id: "sc_android", file: "contracts.android-v6.json", platform: "Android v6", components: 40, features: 17, events: 25 },
  { id: "sc_flutter", file: "contracts.flutter-v6.json", platform: "Flutter v6", components: 37, features: 16, events: 23 },
  { id: "sc_web_calls", file: "contracts.web-calls-v5.json", platform: "Web Calls v5", components: 0, features: 9, events: 18 },
  { id: "sc_rn_calls", file: "contracts.rn-calls-v5.json", platform: "RN Calls v5", components: 0, features: 9, events: 18 },
  { id: "sc_ios_calls", file: "contracts.ios-calls-v5.json", platform: "iOS Calls v5", components: 0, features: 8, events: 17 },
  { id: "sc_android_calls", file: "contracts.android-calls-v5.json", platform: "Android Calls v5", components: 0, features: 9, events: 18 },
  { id: "sc_flutter_calls", file: "contracts.flutter-calls-v5.json", platform: "Flutter Calls v5", components: 0, features: 8, events: 17 },
  { id: "sc_android_sdk", file: "contracts.sdk-android-v5.json", platform: "Android SDK v5", components: 0, features: 12, events: 20 },
];

/** The iterative commands the pack understands. */
export const ITERATIVE_COMMANDS: { phrase: string; skill: string; effect: string }[] = [
  { phrase: "add reactions", skill: "components", effect: "Mounts the reaction row and the picker." },
  { phrase: "switch to dark mode", skill: "customization", effect: "Adds the dark token set and the class toggle." },
  { phrase: "add a details side panel", skill: "components", effect: "Places the conversation detail panel beside the message list." },
  { phrase: "switch to server-minted auth tokens", skill: "production", effect: "Replaces the client key with a server-minted token." },
  { phrase: "add threads", skill: "features", effect: "Enables the thread extension and the thread header." },
  { phrase: "add polls", skill: "features", effect: "Enables the poll extension and the poll bubble." },
  { phrase: "add voice notes", skill: "features", effect: "Adds the recorder to the composer." },
  { phrase: "add calling", skill: "calls", effect: "Registers the calling extension and the call surfaces." },
  { phrase: "turn on push", skill: "push", effect: "Wires the device token into the login and logout flow." },
  { phrase: "add the AI assistant", skill: "features", effect: "Adds the assistant user and the assistant chat surface." },
];
