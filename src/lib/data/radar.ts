export interface RadarSignal {
  id: string;
  title: string;
  source: string;
  category: string;
  summary: string;
  impact: "low" | "medium" | "high" | "critical";
  confidence: number;
  sentiment: "negative" | "neutral" | "positive";
  detectedAt: string;
  trend: number;
}

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  positioning: string;
  share: number;
  momentum: number;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  lastActivity: string;
  hue: number;
}

export interface RadarSeries {
  id: string;
  name: string;
  category: string;
  unit: string;
  history: number[];
  forecast: number[];
  seasonality: number[];
  confidence: number;
}

export const seedRadarSignals: RadarSignal[] = [
  {
    id: "sig_1",
    title: "Two UK consultancies publish live international tuition calculators",
    source: "Competitor changelog",
    category: "Pricing",
    summary:
      "Both added calculators in the last 30 days. Neither existed six months ago. Expect tuition transparency to become table stakes.",
    impact: "high",
    confidence: 88,
    sentiment: "negative",
    detectedAt: "2026-10-22T09:14:00Z",
    trend: 62,
  },
  {
    id: "sig_2",
    title: "Search volume for “study in UK without IELTS” up 240% year on year",
    source: "Search trends",
    category: "Demand",
    summary:
      "Conditional offers and pre-sessional routes are being searched at more than twice last year's rate. Our current landing page does not mention either.",
    impact: "critical",
    confidence: 94,
    sentiment: "positive",
    detectedAt: "2026-10-24T17:02:00Z",
    trend: 240,
  },
  {
    id: "sig_3",
    title: "Reference-letter turnaround complaints rising on social",
    source: "Social listening",
    category: "Service",
    summary:
      "Complaints about chasing referees rose 31% this quarter. The pattern matches our own stall data: 43% of application stalls are references.",
    impact: "high",
    confidence: 81,
    sentiment: "negative",
    detectedAt: "2026-10-23T11:40:00Z",
    trend: 31,
  },
  {
    id: "sig_4",
    title: "Three competitors launched AI application checkers",
    source: "Product watch",
    category: "Product",
    summary:
      "Each one claims document validation in seconds. None of them appear to check English-test validity windows, which is where most rejections happen.",
    impact: "medium",
    confidence: 76,
    sentiment: "neutral",
    detectedAt: "2026-10-19T08:30:00Z",
    trend: 18,
  },
  {
    id: "sig_5",
    title: "Visa appointment slots in peak season booking out 6 weeks ahead",
    source: "Policy tracker",
    category: "Policy",
    summary:
      "Confirmed across three regions. Any student applying after mid-January should plan a deposit timeline around it, not around university deadlines.",
    impact: "critical",
    confidence: 92,
    sentiment: "neutral",
    detectedAt: "2026-10-21T15:20:00Z",
    trend: 45,
  },
  {
    id: "sig_6",
    title: "Scholarship pages ranking for “partial scholarship UK” have thin content",
    source: "SEO monitor",
    category: "SEO",
    summary:
      "Top three results are under 600 words with no worked examples. A genuinely useful scholarship guide should outrank them within two months.",
    impact: "high",
    confidence: 85,
    sentiment: "positive",
    detectedAt: "2026-10-25T10:05:00Z",
    trend: 27,
  },
  {
    id: "sig_7",
    title: "Average consultancy reply time benchmarked at 4.6 hours",
    source: "Industry benchmark",
    category: "Benchmark",
    summary:
      "We reply in 2.4 hours. That is a defensible differentiator and should be stated on the pricing page rather than buried in a case study.",
    impact: "low",
    confidence: 71,
    sentiment: "positive",
    detectedAt: "2026-10-18T13:45:00Z",
    trend: 9,
  },
  {
    id: "sig_8",
    title: "Parent-group WhatsApp is becoming the discovery channel",
    source: "Channel research",
    category: "Demand",
    summary:
      "Seven of twelve enquiries this month first heard about us through a parent group, not a search. There is no referral capture on that path.",
    impact: "medium",
    confidence: 69,
    sentiment: "positive",
    detectedAt: "2026-10-20T19:10:00Z",
    trend: 58,
  },
];

export const seedCompetitors: Competitor[] = [
  {
    id: "cmp_1",
    name: "Meridian Study Partners",
    domain: "meridianstudy.co.uk",
    positioning: "Premium, boutique, one-to-one",
    share: 18,
    momentum: 12,
    pricing: "£1,450 for a full application",
    strengths: [
      "Strong brand recognition with parents",
      "High-touch adviser-to-student ratio",
      "Excellent testimonial library",
    ],
    weaknesses: [
      "Very slow reply time — often over 24 hours",
      "No self-service tooling",
      "Only handles UK university destinations",
    ],
    lastActivity: "Launched a £50 assessment product 8 days ago",
    hue: 226,
  },
  {
    id: "cmp_2",
    name: "Kite Education",
    domain: "kite-edu.com",
    positioning: "Volume, speed, low price",
    share: 24,
    momentum: 31,
    pricing: "£399 flat, unlimited applications",
    strengths: [
      "Fast turnaround — under 48 hours",
      "Transparent pricing with no upsells",
      "Covers 30+ countries",
    ],
    weaknesses: [
      "Thin adviser expertise, high turnover",
      "Complaints about document errors",
      "No scholarship support",
    ],
    lastActivity: "Cut prices 15% last month",
    hue: 268,
  },
  {
    id: "cmp_3",
    name: "Bridgeway Consultancy",
    domain: "bridgewayconsulting.co.uk",
    positioning: "Data-led, transparent, evidence-based",
    share: 11,
    momentum: 44,
    pricing: "£900–£2,200 tiered",
    strengths: [
      "Publishes real acceptance-rate data",
      "Best-in-class website speed",
      "Strong content marketing",
    ],
    weaknesses: [
      "Limited live advising hours",
      "Weak on visa and post-offer logistics",
      "Premium price for a smaller service",
    ],
    lastActivity: "Published a 40-page acceptance-rate report",
    hue: 172,
  },
  {
    id: "cmp_4",
    name: "Northgate Admissions",
    domain: "northgate-admissions.com",
    positioning: "Student services for universities (B2B)",
    share: 8,
    momentum: -6,
    pricing: "£6,000/year per institution",
    strengths: [
      "Direct university relationships",
      "Integrated with institutional CRM systems",
      "Strong reporting",
    ],
    weaknesses: [
      "Only serves institutional clients",
      "Very long contract minimums",
      "No consumer-facing brand",
    ],
    lastActivity: "Lost two university contracts this quarter",
    hue: 32,
  },
  {
    id: "cmp_5",
    name: "Latitude Study Group",
    domain: "latitudestudy.co.uk",
    positioning: "Community-driven, group coaching",
    share: 6,
    momentum: 18,
    pricing: "£220 per cohort",
    strengths: [
      "Very low price point",
      "Strong peer community effect",
      "Good for students without family budget",
    ],
    weaknesses: [
      "No individual document support",
      "Very low adviser-to-student ratio",
      "Minimal scholarship work",
    ],
    lastActivity: "Opened a fourth cohort location",
    hue: 340,
  },
];

export const seedRadarSeries: RadarSeries[] = [
  {
    id: "ser_1",
    name: "Enquiry volume",
    category: "Pipeline",
    unit: "enquiries / week",
    history: [128, 136, 141, 139, 152, 168, 161, 179, 188, 196, 204, 221],
    forecast: [233, 241, 256, 268, 279, 296],
    seasonality: [1.02, 1.04, 1.06, 1.08, 1.12, 1.18, 1.1, 1.02, 0.96, 0.94, 1.0, 1.06],
    confidence: 82,
  },
  {
    id: "ser_2",
    name: "Application value",
    category: "Revenue",
    unit: "£ thousands / month",
    history: [312, 298, 334, 351, 342, 379, 401, 388, 421, 447, 462, 489],
    forecast: [508, 531, 549, 578, 602, 634],
    seasonality: [0.96, 0.92, 1.02, 1.08, 1.05, 0.98, 0.9, 0.86, 1.06, 1.12, 1.1, 1.04],
    confidence: 74,
  },
  {
    id: "ser_3",
    name: "Cost per acquisition",
    category: "Efficiency",
    unit: "£ per enquiry",
    history: [186, 192, 179, 171, 168, 162, 158, 149, 144, 139, 132, 128],
    forecast: [126, 123, 121, 118, 117, 115],
    seasonality: [1.06, 1.04, 1.0, 0.98, 1.02, 1.08, 1.04, 0.96, 0.94, 0.98, 1.04, 1.1],
    confidence: 68,
  },
  {
    id: "ser_4",
    name: "IELTS-only demand",
    category: "Demand",
    unit: "% of enquiries",
    history: [38, 36, 35, 33, 34, 31, 30, 29, 28, 26, 25, 24],
    forecast: [23, 22, 21, 21, 20, 20],
    seasonality: [1.1, 1.05, 0.98, 0.94, 1.0, 1.06, 1.02, 0.96, 0.94, 1.0, 1.06, 1.12],
    confidence: 61,
  },
];

export const SIGNAL_SOURCES = [
  { id: "all", label: "All sources" },
  { id: "Competitor changelog", label: "Competitors" },
  { id: "Search trends", label: "Search" },
  { id: "Social listening", label: "Social" },
  { id: "Product watch", label: "Products" },
  { id: "Policy tracker", label: "Policy" },
  { id: "SEO monitor", label: "SEO" },
  { id: "Industry benchmark", label: "Benchmarks" },
  { id: "Channel research", label: "Channels" },
];
