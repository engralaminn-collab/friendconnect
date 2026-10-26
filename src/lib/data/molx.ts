/**
 * molx — the self-hosted Firecrawl alternative wired into the research module.
 * Everything here mirrors the real service contract: the endpoints, the request
 * bodies, the response shapes, the environment variables and the operational
 * envelope (Go binary, Obscura headless browser, ~3 MB idle / ~7 MB working).
 */

export interface MolxEndpoint {
  method: "GET" | "POST";
  path: string;
  purpose: string;
  auth: boolean;
  body?: string;
  response?: string;
}

export interface MolxVar {
  name: string;
  default: string;
  purpose: string;
}

export interface MolxEngine {
  id: string;
  label: string;
  note: string;
}

export const MOLX_ENDPOINTS: MolxEndpoint[] = [
  {
    method: "GET",
    path: "/health",
    purpose: "Liveness probe. Never needs a token.",
    auth: false,
    response: `{ "status": "ok" }`,
  },
  {
    method: "GET",
    path: "/reference",
    purpose: "Interactive API docs served by the binary itself.",
    auth: false,
  },
  {
    method: "POST",
    path: "/v2/scrape",
    purpose: "Fetch one page through the headless browser and return clean markdown, HTML, text or links.",
    auth: true,
    body: `{
  "url": "https://example.com",
  "formats": ["markdown"],
  "onlyMainContent": true,
  "onlyCleanContent": true
}`,
    response: `{
  "success": true,
  "data": {
    "markdown": "# Example Domain\\n\\nThis domain...",
    "metadata": {
      "title": "Example Domain",
      "sourceURL": "https://example.com"
    }
  }
}`,
  },
  {
    method: "POST",
    path: "/search",
    purpose: "Query Brave, DuckDuckGo and Startpage natively, then optionally scrape every hit.",
    auth: true,
    body: `{
  "query": "golang context cancel",
  "limit": 5,
  "scrapeOptions": {
    "formats": ["markdown"],
    "onlyMainContent": true,
    "onlyCleanContent": true
  }
}`,
    response: `{
  "success": true,
  "data": [
    { "title": "...", "url": "https://...", "description": "...", "markdown": "..." }
  ]
}`,
  },
  {
    method: "POST",
    path: "/v2/batch/scrape",
    purpose: "Queue many URLs, run them in the background, poll the job URL for the results.",
    auth: true,
    body: `{
  "urls": ["https://example.com", "https://example.org"]
}`,
    response: `{ "success": true, "jobUrl": "http://localhost:8080/v2/batch/scrape/job_7f2a" }`,
  },
  {
    method: "POST",
    path: "/enrich",
    purpose: "Send the page (or the pages the prompt finds) to any OpenAI-compatible LLM and get structured JSON back against your schema.",
    auth: true,
    body: `{
  "prompt": "Extract the company name, CEO, and funding amount from each page",
  "schema": {
    "type": "object",
    "properties": {
      "company": { "type": "string" },
      "ceo": { "type": "string" },
      "funding": { "type": "string" }
    }
  },
  "urls": ["https://example.com"]
}`,
    response: `{ "success": true, "id": "a1b2c3d4", "url": "http://localhost:8080/enrich/a1b2c3d4", "status": "pending" }`,
  },
  {
    method: "GET",
    path: "/enrich/{id}",
    purpose: "Poll the enrichment job. Results expire after 24 hours.",
    auth: true,
    response: `{
  "id": "a1b2c3d4",
  "status": "completed",
  "prompt": "Extract the company name, CEO, and funding amount from each page",
  "schema": { ... },
  "urls": ["https://example.com"],
  "result": { "company": "Example Inc", "ceo": "Jane Doe", "funding": "$10M" },
  "createdAt": "2026-07-23T06:00:00Z",
  "expiresAt": "2026-07-24T06:00:00Z"
}`,
  },
];

export const MOLX_VARS: MolxVar[] = [
  { name: "PORT", default: "8080", purpose: "HTTP port the service listens on." },
  { name: "API_KEY", default: "empty", purpose: "Bearer token required by every scrape and search endpoint." },
  { name: "OBSCURA_BIN", default: "deps/obscura", purpose: "Path to the Obscura headless-browser binary." },
  { name: "TIMEOUT_MS", default: "60000", purpose: "Default timeout for a single Obscura render." },
  { name: "SEARCH_ENGINES", default: "duckduckgo,brave,startpage", purpose: "Which native search engines to query." },
  { name: "SEARCH_TIMEOUT_MS", default: "30000", purpose: "Timeout per engine query." },
  { name: "SEARCH_DEFAULT_LIMIT", default: "10", purpose: "Default number of results a search returns." },
  { name: "PROXY", default: "empty", purpose: "Optional proxy used for both search and scrape." },
  { name: "OTEL_ENDPOINT", default: "empty", purpose: "OTLP endpoint for OpenTelemetry traces." },
  { name: "ALLOWED_ORIGIN", default: "empty", purpose: "Comma-separated CORS origins." },
  { name: "LLM_BASE_URL", default: "empty", purpose: "OpenAI-compatible chat-completions base URL." },
  { name: "LLM_API_KEY", default: "empty", purpose: "Key for the LLM provider." },
  { name: "LLM_MODEL", default: "empty", purpose: "Model name — required when onlyCleanContent is on." },
];

export const MOLX_ENGINES: MolxEngine[] = [
  { id: "duckduckgo", label: "DuckDuckGo", note: "The default. No key, no quota, good recall on long-tail queries." },
  { id: "brave", label: "Brave", note: "Needs a Brave API key. The best structured snippets." },
  { id: "startpage", label: "Startpage", note: "Proxied results, useful when the others throttle." },
];

export const MOLX_COMPARISON: {
  row: string;
  molx: string;
  firecrawl: string;
}[] = [
  { row: "Hosting", molx: "Self-hosted on your own server or cloud", firecrawl: "Managed SaaS" },
  { row: "Data privacy", molx: "Your data never leaves your infrastructure", firecrawl: "Sent to vendor infrastructure" },
  { row: "Cost control", molx: "No per-credit billing", firecrawl: "Usage-based paid plans" },
  { row: "Memory footprint", molx: "Idle ~3 MB, working ~7 MB", firecrawl: "Larger managed runtime" },
  { row: "Web search", molx: "Native Brave, DuckDuckGo, Startpage", firecrawl: "Available on some plans" },
  { row: "LLM enrichment", molx: "Any OpenAI-compatible provider", firecrawl: "Built-in or provider-specific" },
  { row: "Deployment", molx: "Single Docker container or Go binary", firecrawl: "Managed only" },
  { row: "Observability", molx: "OpenTelemetry built in", firecrawl: "Vendor dashboards" },
];

export const MOLX_ROADMAP: { id: string; title: string; detail: string }[] = [
  { id: "redis", title: "Optional Redis cache", detail: "Cache scrape results and job status without making Redis a hard dependency. The single binary keeps working when Redis is not configured." },
  { id: "postgres", title: "Optional Postgres persistence", detail: "Store batch and enrich jobs in Postgres so they survive a restart or redeploy. In-memory mode stays available for single-node deployments." },
  { id: "proxy", title: "Advanced proxy integration", detail: "Rotating proxies, proxy pools and per-domain proxy rules for scraping at scale." },
  { id: "pluggable", title: "Pluggable scrapers", detail: "Ship your own extractor alongside the built-in Obscura renderer." },
];

export const MOLX_DEPLOY: { id: string; label: string; command: string; note: string }[] = [
  {
    id: "docker",
    label: "Docker",
    command: `docker run -d \\
  -p 8080:8080 \\
  -e API_KEY=your-secret-key \\
  ghcr.io/ioi-labs/molx:latest`,
    note: "The published image ships the Obscura binaries for amd64 and arm64.",
  },
  {
    id: "compose",
    label: "Docker Compose",
    command: `cp .env.example .env
# set API_KEY in .env
docker compose up -d`,
    note: "One container, one volume, no external dependency for a single node.",
  },
  {
    id: "source",
    label: "From source",
    command: `make setup          # downloads the Obscura binaries
API_KEY=your-secret-key go run .`,
    note: "Needs Go 1.23 or later and the Obscura binaries for your platform.",
  },
  {
    id: "buildx",
    label: "Cross-build",
    command: `docker buildx build \\
  --platform linux/amd64,linux/arm64 \\
  -t molx:latest .`,
    note: "Both architectures are supported by the Dockerfile.",
  },
];

export const MOLX_CHECKLIST: string[] = [
  "Set API_KEY before you expose the port. /health and /reference are the only open routes.",
  "The LLM is optional. Scrape and search work without it; onlyCleanContent and /enrich need it.",
  "Search engines are queried natively — there is no SearXNG instance to run.",
  "Batch and enrich jobs are in-memory by default, so a restart loses them. Move to Postgres when that matters.",
  "Enrichment results expire 24 hours after they are produced. Copy anything you want to keep.",
  "Proxy, OTLP and CORS are all opt-in through environment variables, so the defaults stay safe.",
];
