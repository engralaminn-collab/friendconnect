import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, Lock, ShieldCheck, Activity } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

type Slug = "privacy" | "terms" | "security" | "status";

interface LegalPage {
  title: string;
  eyebrow: string;
  intro: string;
  updated: string;
  icon: typeof FileText;
  sections: Array<{ heading: string; body: string[] }>;
}

const PAGES: Record<Slug, LegalPage> = {
  privacy: {
    title: "Privacy",
    eyebrow: "Legal",
    updated: "26 October 2026",
    icon: Lock,
    intro:
      "FriendConnect is local-first. The workspace modules store their data in your browser, and the private messenger stores messages on the server you deploy. This page states exactly which is which — no vague promises.",
    sections: [
      {
        heading: "What stays in your browser",
        body: [
          "Workspace records — contacts, deals, students, applications, articles, campaigns, notes, wiki pages, diagrams, automations and the Bill Agent audit trail — are held in localStorage under keys beginning friendconnect-. They are not uploaded anywhere by these modules.",
          "Clearing site data removes them permanently. That is the trade: no server backup, no server breach.",
        ],
      },
      {
        heading: "What reaches a server",
        body: [
          "Accounts, sessions, messages, groups, stories, call records, media files and push subscriptions are stored by the FriendConnect backend you run, in the database you configured (SQLite, MySQL or PostgreSQL).",
          "Media is written to the private media directory or your S3-compatible bucket, never to the public folder.",
        ],
      },
      {
        heading: "What leaves your machine",
        body: [
          "Bill Agent sends a prompt and the tool catalogue directly from your browser to the model endpoint you configure. If that endpoint is Ollama on localhost, nothing leaves the machine. If it is a hosted provider, the prompt, the tool list and any tool results the model needs are sent to that provider and are subject to that provider's terms.",
          "API keys are stored in this browser and sent only to the endpoint they belong to. There is no FriendConnect proxy that could log them.",
        ],
      },
      {
        heading: "Deletion",
        body: [
          "Workspace data: Settings → Data → reset, or clear site data.",
          "Server data: delete the account from the profile page, or remove the rows from the database you control. Media files are removed by scripts/cleanup-media.ts.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms",
    eyebrow: "Legal",
    updated: "26 October 2026",
    icon: FileText,
    intro:
      "This is a self-hosted workspace. You run it, you own the data, you are responsible for how you use it. The terms below are short on purpose.",
    sections: [
      {
        heading: "The software",
        body: [
          "FriendConnect is provided as-is, without warranty. You may run, modify and deploy it for your own organisation.",
          "You are responsible for the deployment: the database, the TLS certificate, the backups and the access control on the server.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not use the messenger or the call centre module to send unsolicited bulk messages, to impersonate someone, or to process data you have no lawful basis to hold.",
          "Outbound calling and SMS features must follow the consent rules in your jurisdiction. The call centre module records requested-versus-permitted fields for exactly this reason.",
        ],
      },
      {
        heading: "AI output",
        body: [
          "Bill Agent acts only through the tools it is given. A model can still be wrong: it may choose the wrong record or write copy that needs editing. Treat every automated write as a draft until you have checked it, and use the audit trail to see exactly what changed.",
          "You are responsible for the provider you connect to, including its cost, availability and data handling.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "There is no hosted service-level agreement. The status page describes how to monitor your own instance; the health endpoint reports what the running box actually answers.",
        ],
      },
    ],
  },
  security: {
    title: "Security",
    eyebrow: "Legal",
    updated: "26 October 2026",
    icon: ShieldCheck,
    intro:
      "What the code does to protect an account, and what it deliberately leaves to your deployment. Written so you can verify each claim in the repository.",
    sections: [
      {
        heading: "Accounts and sessions",
        body: [
          "Passwords are hashed with scrypt (src/server/auth/passwords.ts) and never logged. Sessions are opaque tokens in HttpOnly, SameSite cookies, revocable per device from the sessions API.",
          "Failed sign-ins are rate-limited per IP and per account window, and lockouts are written to the audit log. Two-factor authentication (TOTP) is available per account.",
        ],
      },
      {
        heading: "Requests",
        body: [
          "State-changing API routes check origin against ALLOWED_ORIGINS, require a session, validate every body with zod, and return errors without stack traces.",
          "Uploads are sniffed by magic bytes, capped by size and quota, and served through an authenticated route rather than a public path.",
        ],
      },
      {
        heading: "Bill Agent specifics",
        body: [
          "The operator can only call tools in the registry. Arguments are validated against a strict schema; unknown arguments are rejected rather than ignored.",
          "Destructive tools always require an explicit human approval, regardless of autonomy setting. Dry run executes nothing.",
          "The HTTP control surface (/api/agent/*) is gated by AGENT_TOKEN when that variable is set. Set it before exposing the domain. Queued commands live in server memory with a five-minute TTL and are executed only by an open operator tab.",
        ],
      },
      {
        heading: "What you must do",
        body: [
          "Set AUTH_SECRET and AGENT_TOKEN to long random values, force HTTPS at the proxy, keep Cloudflare in Full (strict) mode, and run the backup script on a schedule you have actually restored from once.",
          "Review the §CIS Ubuntu 22.04 hardening baseline before putting a new host online.",
        ],
      },
    ],
  },
  status: {
    title: "Status",
    eyebrow: "Operations",
    updated: "26 October 2026",
    icon: Activity,
    intro:
      "This instance reports its own state. Nothing on this page is decorative: each check either queries the running server or explains why it cannot.",
    sections: [
      {
        heading: "How to read the health endpoint",
        body: [
          "GET /api/health returns { status, checks, timestamp }. status is healthy, degraded or unhealthy. degraded means the app works but an optional subsystem (Redis, email, push) is unconfigured. unhealthy means the database is unreachable.",
          "GET /api/webrtc/health reports STUN and TURN configuration honestly: calls inside one network work with STUN alone; calls across networks need TURN.",
        ],
      },
      {
        heading: "Endpoints to watch",
        body: [
          "/api/health — database, Redis, email, push, uptime",
          "/api/webrtc/health — ICE configuration",
          "/api/agent/manifest — Bill Agent tool inventory (no data)",
          "PM2: pm2 status · logs at ~/.pm2/logs/friendconnect-*.log",
        ],
      },
      {
        heading: "Incident routine",
        body: [
          "1. Confirm the proxy is up: curl -I http://127.0.0.1:3012/api/health",
          "2. Confirm the app is up: pm2 status friendconnect",
          "3. If a deploy broke it: scripts/rollback.sh to the previous release",
          "4. Record what happened in the workspace notes so the next person does not repeat the diagnosis.",
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return (Object.keys(PAGES) as Slug[]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug as Slug];
  if (!page) return { title: "Not found — FriendConnect" };
  return { title: `${page.title} — FriendConnect`, description: page.intro.slice(0, 160) };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug as Slug];
  if (!page) notFound();
  const Icon = page.icon;
  const others = (Object.keys(PAGES) as Slug[]).filter((key) => key !== slug);

  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-500)]">
          <Icon className="size-3.5" />
          {page.eyebrow}
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{page.title}</h1>
        <p className="mt-2 text-[12px] text-[var(--fc-fg-subtle)]">Last updated {page.updated}</p>
        <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-[var(--fc-fg-muted)]">
          {page.intro}
        </p>

        <div className="mt-10 space-y-8">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="flex items-center gap-2 font-display text-[17px] font-bold">
                <CheckCircle2 className="size-4 text-emerald-500" />
                {section.heading}
              </h2>
              <div className="mt-2 space-y-2">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-5">
          <h2 className="text-[13px] font-bold">Also worth reading</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((key) => (
              <Link key={key} href={`/legal/${key}`} className="btn btn-sm">
                {PAGES[key].title}
                <ArrowRight className="size-3" />
              </Link>
            ))}
            <Link href="/contact" className="btn btn-sm btn-secondary">
              Ask a question
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
