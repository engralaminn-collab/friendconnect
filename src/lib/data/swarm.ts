/** Swarm simulation seed data — the documents you can load into the engine. */

export interface SwarmDocument {
  id: string;
  title: string;
  kind: "press release" | "policy draft" | "financial report" | "product note";
  summary: string;
  body: string;
  suggestedAgents: number;
  suggestedRounds: number;
  colour: string;
}

export const SWARM_DOCUMENTS: SwarmDocument[] = [
  {
    id: "doc_fc_launch",
    title: "FriendConnect launches the private messenger",
    kind: "press release",
    summary: "A new private messenger with real calling, shared media and agent-ready gateways.",
    suggestedAgents: 120,
    suggestedRounds: 8,
    colour: "#3b64f6",
    body: "Northwind today announced FriendConnect, a private communication workspace that combines threaded messaging, real peer-to-peer audio and video calling, and a set of gateways for SMS, SIP and rendering. Amara Osei, who leads the platform team, said the product was built for teams who wanted one place for conversations rather than four. The company said the messenger would open to every workspace on 14 November, with the calling features arriving first and the SMS gateways following. Early users said the biggest change was not the calling but the shared media — images, video, documents and voice notes in the same thread. Some analysts questioned whether a private messenger could compete with the consumer apps people already use, and pointed to the steep learning curve of a workspace that also does CRM, education consultancy and marketing. Northwind said the pricing would be included in the existing seat fee, with no separate charge for calling minutes, and that the company would not require a card for the trial.",
  },
  {
    id: "doc_policy",
    title: "Draft policy: mandatory call recording notice",
    kind: "policy draft",
    summary: "A consultation on announcing call recording and transcription to callers.",
    suggestedAgents: 90,
    suggestedRounds: 6,
    colour: "#f59e0b",
    body: "The Digital Communications Regulator has published a draft measure requiring that any organisation recording a customer call must announce it within the first thirty seconds of the connection, and must offer the caller a route to a human agent who does not record. The draft also proposes a twelve-month retention limit for transcripts, with an exception for calls flagged as complaints. Northwind Consulting, which operates a support line for its education consultancy clients, said the notice requirement would change its opening script but that it supported the twelve-month limit. The regulator's consultation closes on 30 November, and the final measure is expected in March. Several privacy organisations said the draft was a reasonable compromise, while noting that automatic transcription still captures details a caller believed were unrecorded. A spokesperson for a customer-relations consultancy said the human hand-off route was the part most likely to be ignored in practice.",
  },
  {
    id: "doc_results",
    title: "Q3 results: revenue up, churn flat",
    kind: "financial report",
    summary: "A quarterly report on seat growth, retention and the new communication product line.",
    suggestedAgents: 80,
    suggestedRounds: 6,
    colour: "#14b8a6",
    body: "Northwind reported third-quarter revenue of £4.2m, an increase of 18% on the same quarter last year, with seat growth of 11% and net revenue retention of 104%. The company said the new communication product line — the private messenger and the calling platform — reached £310,000 in recognised revenue, but that it had not yet reached break-even. Amara Osei said the calling platform was being adopted faster than expected, and that about a third of new workspaces had enabled calls in their first week. Operating costs rose 22%, driven mainly by infrastructure for the rendering queue and the transcription service. Chief executive Nadia Haddad said the company remained on plan to open the messenger to every workspace in November. Some analysts noted that the churn figure was flat rather than improving, which would suggest the new product line was not yet solving a retention problem. The company said it would not break out messaging revenue separately next quarter.",
  },
  {
    id: "doc_product",
    title: "Product note: agent skills and the docs server",
    kind: "product note",
    summary: "How an AI coding agent can add chat and calling to an existing application.",
    suggestedAgents: 100,
    suggestedRounds: 7,
    colour: "#8b5cf6",
    body: "The platform team has published an agent-skills pack that teaches a coding agent how to add the messenger and the calling SDK to an existing application. The pack detects the framework, runs a short discovery conversation, produces a plan for approval, and then writes the integration into the files that are already there. A companion documentation server exposes the task guides over the Model Context Protocol, so an agent can read the current documentation instead of guessing at an API signature. The team said the pack covers six user-interface kits and five headless calling SDKs, and that the contract files for each platform are published so an agent can check a method against the current release. Daniel Farley said the point was to stop every team re-deriving the same integration, and that a read-only documentation server had no account requirement. A reviewer noted that the two-gate test — a deterministic reviewer and a black-box acceptance explorer — is what makes the pack safe to run unattended.",
  },
];

export const SWARM_STACK: {
  id: string;
  label: string;
  original: string;
  offline: string;
  detail: string;
}[] = [
  { id: "st_ui", label: "Interface", original: "Chinese UI, 1,000+ strings", offline: "English UI, every string translated", detail: "The whole interface was translated and reviewed, not machine-converted." },
  { id: "st_graph", label: "Graph memory", original: "Zep Cloud", offline: "Neo4j Community Edition 5.15", detail: "The knowledge graph runs on your own machine, so the documents never leave it." },
  { id: "st_llm", label: "Language model", original: "DashScope / OpenAI API", offline: "Ollama (qwen2.5, llama3)", detail: "A local instruct model drives every agent. No key, no bill." },
  { id: "st_embed", label: "Embeddings", original: "Zep Cloud embeddings", offline: "nomic-embed-text via Ollama", detail: "Embeddings are computed locally, which keeps the graph build offline too." },
  { id: "st_keys", label: "Cloud keys", original: "Required", offline: "Zero", detail: "The only requirement is a machine with a GPU and a disk." },
];

export const SWARM_PIPELINE: {
  id: string;
  name: string;
  detail: string;
  produces: string;
}[] = [
  { id: "sp1", name: "Graph build", detail: "Extract people, companies, events and policies from the document, then link them into a knowledge graph with per-entity and per-group memory.", produces: "A graph of entities and relationships" },
  { id: "sp2", name: "Environment setup", detail: "Generate hundreds of personas, each with a personality, an opinion bias, a reaction speed, an influence level and a memory of what they have already seen.", produces: "The agent population" },
  { id: "sp3", name: "Simulation", detail: "Agents post, reply, argue and shift their opinions on a simulated platform, round by round. Sentiment, topic propagation and influence are tracked live.", produces: "A timeline of posts and opinion shifts" },
  { id: "sp4", name: "Report", detail: "A report agent reads the finished environment, interviews a focus group of agents and searches the record for what drove the outcome.", produces: "A written report with quoted agents" },
];
