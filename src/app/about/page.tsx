import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, MapPin, Users } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "About",
  description:
    "FriendConnect is built by a small team across London, Dhaka and Berlin who were tired of stitching seven tools together.",
};

const team = [
  { name: "Maya Rahman", role: "Head of Growth", hue: 226, bio: "Spent eight years on the demand side, then discovered spreadsheets are not a system." },
  { name: "Dan Whitfield", role: "RevOps Lead", hue: 158, bio: "Believes a CRM is a receipt, not a source of truth. Argues about this weekly." },
  { name: "Aisha Rahman", role: "Education Consultant", hue: 12, bio: "Three hundred successful applications and one very strong opinion about bank statements." },
  { name: "Omar Haddad", role: "Frontend Engineer", hue: 34, bio: "Writes boring code on purpose. Shipped the whole charting layer without a library." },
  { name: "Mei Chen", role: "Community Lead", hue: 288, bio: "Runs the weekly sessions and the template challenge. Keeps everyone honest." },
  { name: "Priya Raman", role: "Investor & Advisor", hue: 205, bio: "Says the useful thing in the meeting after everyone else has been polite." },
];

const values = [
  {
    t: "Ship the whole thing",
    d: "A half-built feature is worse than none, because people build their process around what exists. We would rather take longer and deliver the complete version.",
  },
  {
    t: "One data layer",
    d: "Every module writes to the same graph. A student becomes a contact, a contact becomes a subscriber, a subscriber becomes a script. No exports in between.",
  },
  {
    t: "Show the reasoning",
    d: "Swipe files with annotations. Agent traces with timings. Scores with the reasons attached. If we cannot explain a decision, we do not ship it.",
  },
  {
    t: "Respect the reader",
    d: "No manufactured urgency, no fake scarcity, no countdown timers that reset. If the content is good, people will come back for it.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-50" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Reveal>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              We got tired of stitching seven tools together
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--fc-fg-muted)]">
              FriendConnect started as a spreadsheet for one education consultancy
              that was drowning in exports. It became a CRM, then a content system,
              then a set of studios. The thread through all of it is one shared data
              layer and a refusal to ship half a feature.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-3">
              {[
                { i: MapPin, t: "London" },
                { i: MapPin, t: "Dhaka" },
                { i: MapPin, t: "Berlin" },
                { i: Users, t: "14 people" },
                { i: Heart, t: "Independently funded" },
              ].map((x) => (
                <span
                  key={x.t}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--fc-line)] bg-[var(--fc-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--fc-fg-muted)]"
                >
                  <x.i className="size-3.5 text-[var(--color-brand-500)]" />
                  {x.t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight">How we work</h2>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2">
            {values.map((v) => (
              <StaggerItem key={v.t}>
                <div className="fc-card fc-card-hover h-full p-6">
                  <h3 className="text-[16px] font-semibold">{v.t}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {v.d}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight">The team</h2>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <StaggerItem key={m.name}>
                <div className="fc-card fc-card-hover h-full p-6">
                  <Avatar name={m.name} hue={m.hue} size={48} />
                  <h3 className="mt-4 text-[15.5px] font-semibold">{m.name}</h3>
                  <div className="text-[12.5px] font-medium text-[var(--color-brand-500)]">
                    {m.role}
                  </div>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {m.bio}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Come and look</h2>
          <p className="mt-4 text-[var(--fc-fg-muted)]">
            No sales call required. The workspace opens with sample data.
          </p>
          <Link href="/app" className="btn btn-primary btn-lg mt-8">
            Open the workspace
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
