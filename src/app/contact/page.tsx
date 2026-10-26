"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal } from "@/components/ui/Reveal";
import { useToast } from "@/store/useUI";

const reasons = [
  "Product or feature question",
  "Enterprise / self-hosting",
  "Education consultancy partnership",
  "Press or research",
  "Something is broken",
  "Just saying hello",
];

export default function ContactPage() {
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    company: "",
    reason: reasons[0],
    message: "",
  });
  const toast = useToast();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.warning("Almost there", "Name, email and a message are required.");
      return;
    }
    setSent(true);
    toast.success("Message sent", "We reply within one working day.");
  };

  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                Get in touch
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                Talk to a human
              </h1>
              <p className="mt-5 text-[var(--fc-fg-muted)]">
                We answer every message within one working day, and we will tell you
                honestly if we are the wrong fit.
              </p>

              <div className="mt-9 space-y-5">
                {[
                  { i: Mail, t: "hello@friendconnect.app", d: "General enquiries" },
                  { i: Phone, t: "+44 20 4520 8890", d: "Mon–Fri, 09:00–18:00 GMT" },
                  { i: MapPin, t: "London · Dhaka · Berlin", d: "Remote-first, three hubs" },
                ].map((c) => (
                  <div key={c.t} className="flex items-start gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                      <c.i className="size-4.5" />
                    </span>
                    <div>
                      <div className="text-[14.5px] font-semibold">{c.t}</div>
                      <div className="text-[13px] text-[var(--fc-fg-muted)]">{c.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-6">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <BookOpen className="size-4 text-[var(--color-brand-500)]" />
                  Prefer to self-serve?
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  The Marketing Kit has annotated swipe files, copy templates and
                  launch checklists — all free, no email required.
                </p>
                <Link href="/marketing-kit" className="btn btn-secondary btn-sm mt-4">
                  Get the kit
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="fc-card p-7">
                {sent ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <span className="grid size-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check className="size-7" strokeWidth={2.6} />
                    </span>
                    <h2 className="mt-5 text-xl font-semibold">Thanks — message received</h2>
                    <p className="mt-2 max-w-sm text-sm text-[var(--fc-fg-muted)]">
                      We reply within one working day. If it is urgent, message us on
                      WhatsApp and say so.
                    </p>
                    <button
                      onClick={() => setSent(false)}
                      className="btn btn-secondary mt-6"
                    >
                      Send another
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-[12.5px] font-semibold">Your name</span>
                        <input
                          className="field"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Alex Morgan"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[12.5px] font-semibold">Email</span>
                        <input
                          className="field"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="alex@company.com"
                        />
                      </label>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-[12.5px] font-semibold">
                          Company <span className="font-normal text-[var(--fc-fg-subtle)]">(optional)</span>
                        </span>
                        <input
                          className="field"
                          value={form.company}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                          placeholder="Northwind Analytics"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[12.5px] font-semibold">Reason</span>
                        <select
                          className="field"
                          value={form.reason}
                          onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        >
                          {reasons.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] font-semibold">Message</span>
                      <textarea
                        className="field min-h-[140px] resize-y"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us what you are trying to do, and where it hurts."
                      />
                    </label>
                    <button type="submit" className="btn btn-primary w-full">
                      <MessageSquare className="size-4" />
                      Send message
                    </button>
                    <p className="text-center text-[11.5px] text-[var(--fc-fg-subtle)]">
                      We store your message only so we can reply to it.
                    </p>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
