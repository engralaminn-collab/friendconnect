"use client";

import * as React from "react";
import { Globe2, GraduationCap, Search, Star, Trophy } from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { BarChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { cn, formatCurrency } from "@/lib/utils";

export default function UniversitiesPage() {
  const universities = useStore((s) => s.universities);
  const courses = useStore((s) => s.courses);
  const students = useStore((s) => s.students);
  const applications = useStore((s) => s.applications);

  const [query, setQuery] = React.useState("");
  const [country, setCountry] = React.useState("all");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const countries = Array.from(new Set(universities.map((u) => u.country)));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return universities
      .filter((u) => country === "all" || u.country === country)
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q) ||
          u.programs.some((p) => p.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.ranking - b.ranking);
  }, [universities, query, country]);

  const tuitionData = universities.slice(0, 8).map((u) => ({
    label: u.city,
    value: u.tuition,
  }));

  const avgTuition = Math.round(
    universities.reduce((a, u) => a + u.tuition, 0) / universities.length,
  );

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Education consultancy"
        title="Universities & courses"
        description="The catalogue your counselling conversations are built on — rankings, tuition, intakes, entry requirements and scholarship availability."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Universities"
          value={universities.length}
          deltaLabel={`${countries.length} countries`}
          icon={<GraduationCap className="size-4" />}
        />
        <StatCard
          label="Courses"
          value={courses.length}
          deltaLabel="across UG, PG and foundation"
          icon={<Globe2 className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Average tuition"
          value={formatCurrency(avgTuition)}
          deltaLabel="international, per year"
          icon={<Trophy className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Scholarships"
          value={`${universities.filter((u) => u.scholarships).length}/${universities.length}`}
          deltaLabel="offer at least one"
          icon={<Star className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search universities, cities or subjects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="field w-auto min-w-[170px]"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="all">All countries</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="size-6" />}
              title="No universities match"
              description="Try a broader search term."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((u) => {
                const uniCourses = courses.filter((c) => c.universityId === u.id);
                const uniApps = applications.filter((a) => a.universityId === u.id);
                const open = openId === u.id;
                return (
                  <article key={u.id} className="fc-card overflow-hidden">
                    <button
                      onClick={() => setOpenId(open ? null : u.id)}
                      className="flex w-full items-center gap-4 p-4 text-left"
                    >
                      <span
                        className="grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                        style={{
                          backgroundImage: `linear-gradient(135deg, hsl(${u.logoHue} 72% 52%), hsl(${
                            (u.logoHue + 42) % 360
                          } 74% 44%))`,
                        }}
                      >
                        {u.name
                          .replace("University of ", "")
                          .replace("University", "")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-semibold">{u.name}</h3>
                          <Badge tone="brand">
                            <Trophy className="size-2.5" />
                            Rank {u.ranking}
                          </Badge>
                          {u.scholarships && <Badge tone="success">Scholarships</Badge>}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-[var(--fc-fg-muted)]">
                          {u.city}, {u.country} · {uniCourses.length} courses ·{" "}
                          {uniApps.length} applications
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-[16px] font-bold tabular-nums">
                          {u.tuition.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-[var(--fc-fg-subtle)]">
                          {u.currency} / year
                        </div>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                        <p className="text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                          {u.description}
                        </p>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div>
                            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                              Intakes
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {u.intakes.map((i) => (
                                <span key={i} className="chip">
                                  {i}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                              Courses
                            </h4>
                            <ul className="space-y-1.5">
                              {uniCourses.map((c) => {
                                const enrolled = students.filter(
                                  (s) => s.targetCourseId === c.id,
                                ).length;
                                return (
                                  <li
                                    key={c.id}
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-3 py-2"
                                  >
                                    <span className="text-[12.5px] font-semibold">{c.title}</span>
                                    <Badge>{c.level}</Badge>
                                    <span className="text-[11.5px] text-[var(--fc-fg-muted)]">
                                      {c.duration}
                                    </span>
                                    <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                                      IELTS {c.ielts}
                                    </span>
                                    <span className="ml-auto text-[12px] font-semibold tabular-nums">
                                      {c.tuition.toLocaleString()}
                                    </span>
                                    {enrolled > 0 && (
                                      <span className="text-[11px] text-[var(--fc-fg-subtle)]">
                                        · {enrolled} interested
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                              {uniCourses.length === 0 && (
                                <li className="text-[12.5px] text-[var(--fc-fg-muted)]">
                                  No courses listed yet.
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-[var(--fc-fg-muted)]">
                          <span className="chip">Website: {u.website}</span>
                          {u.programs.map((p) => (
                            <span key={p} className="chip">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Tuition comparison</h2>
            <p className="text-[12px] text-[var(--fc-fg-muted)]">
              Annual international fees in local currency
            </p>
            <div className="mt-4">
              <BarChart
                height={210}
                labels={tuitionData.map((t) => t.label)}
                series={[{ name: "Tuition", data: tuitionData.map((t) => t.value) }]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">By country</h2>
            <ul className="mt-3 space-y-2">
              {countries.map((c) => {
                const unis = universities.filter((u) => u.country === c);
                const avg = Math.round(
                  unis.reduce((a, u) => a + u.tuition, 0) / unis.length,
                );
                return (
                  <li
                    key={c}
                    className="flex items-center justify-between rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-[12.5px]"
                  >
                    <span className="text-[var(--fc-fg-muted)]">{c}</span>
                    <span className="font-semibold tabular-nums">
                      {unis.length} · {avg.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
