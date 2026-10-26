import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  KanbanSquare,
  Radar,
  CalendarCheck,
  GraduationCap,
  FileCheck2,
  School,
  NotebookPen,
  Newspaper,
  Send,
  Share2,
  Search,
  Workflow,
  Clapperboard,
  AudioLines,
  Bot,
  StickyNote,
  BookOpen,
  Plug,
  MessagesSquare,
  UsersRound,
  CalendarDays,
  Settings,
  Blocks,
  ImageIcon,
  Cpu,
  RadarIcon,
  LayoutGrid,
  Truck,
  ScanText,
  MessageCircle,
  PhoneCall,
  RadioTower,
  Headset,
  Blocks as BlocksIcon,
  Sparkles,
  FlaskConical,
  BookMarked,
  Network,
  Wand2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  keywords?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        href: "/app",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Every module, one lens",
        keywords: "home overview metrics charts",
      },
    ],
  },
  {
    id: "messaging",
    label: "Messaging & Calls",
    items: [
      {
        href: "/app/messenger",
        label: "Messenger",
        icon: MessageCircle,
        description: "Private chat with every media type",
        keywords: "whatsapp chat message media voice document image video emoji",
      },
      {
        href: "/app/calls",
        label: "Calls",
        icon: PhoneCall,
        description: "Audio and video with diagnostics",
        keywords: "audio video call webrtc voip sip dialpad quality mos",
      },
      {
        href: "/app/gateways",
        label: "Gateways & bridges",
        icon: RadioTower,
        description: "SMS, ComfyUI, SIP and IPC",
        keywords: "sms http api httpsms domovina comfyui sip webhook ipc bridge",
      },
      {
        href: "/app/callcenter",
        label: "Call centre",
        icon: Headset,
        description: "Live assist, QA and outbound",
        keywords: "call center contact centre assist transcript qa scoring outbound bot flow",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM & Revenue",
    items: [
      {
        href: "/app/contacts",
        label: "Contacts",
        icon: Users,
        description: "People, enriched and scored",
        keywords: "people customers leads records",
      },
      {
        href: "/app/companies",
        label: "Companies",
        icon: Building2,
        description: "Accounts and firmographics",
        keywords: "accounts organisations companies",
      },
      {
        href: "/app/pipeline",
        label: "Pipeline",
        icon: KanbanSquare,
        description: "Deals across six stages",
        keywords: "kanban deals forecast board",
      },
      {
        href: "/app/leads",
        label: "Lead enrichment",
        icon: Radar,
        description: "Prospect, enrich, qualify",
        keywords: "prospector gtm outbound signals",
      },
      {
        href: "/app/activities",
        label: "Activities & tasks",
        icon: CalendarCheck,
        description: "Calls, meetings, reminders",
        keywords: "tasks calls meetings todo",
      },
    ],
  },
  {
    id: "education",
    label: "Education Consultancy",
    items: [
      {
        href: "/app/students",
        label: "Students",
        icon: GraduationCap,
        description: "Enquiries through enrolment",
        keywords: "learners clients pupils cas",
      },
      {
        href: "/app/applications",
        label: "Applications",
        icon: FileCheck2,
        description: "Checklists and deadlines",
        keywords: "offers visa documents checklist",
      },
      {
        href: "/app/universities",
        label: "Universities",
        icon: School,
        description: "Courses, fees and intakes",
        keywords: "courses tuition ranking intakes",
      },
      {
        href: "/app/study",
        label: "Study planner",
        icon: NotebookPen,
        description: "Sessions, streaks and confidence",
        keywords: "ielts revision focus timetable",
      },
      {
        href: "/app/tutor",
        label: "Language tutor",
        icon: Sparkles,
        description: "Offline voice English tutor",
        keywords: "english tutor speaking pronunciation dictionary vocabulary cefr lessons buddy",
      },
    ],
  },
  {
    id: "marketing",
    label: "AI Marketing",
    items: [
      {
        href: "/app/content",
        label: "Content studio",
        icon: Newspaper,
        description: "Write, humanise, publish",
        keywords: "articles blog seo writer humanizer",
      },
      {
        href: "/app/campaigns",
        label: "Campaigns",
        icon: Send,
        description: "Email, ads, webinar, SMS",
        keywords: "marketing email ads nurture",
      },
      {
        href: "/app/social",
        label: "Social planner",
        icon: Share2,
        description: "Schedule across six networks",
        keywords: "linkedin twitter instagram posts",
      },
      {
        href: "/app/seo",
        label: "SEO auditor",
        icon: Search,
        description: "Score and prioritise fixes",
        keywords: "audit ranking meta schema keywords",
      },
    ],
  },
  {
    id: "studios",
    label: "Studios",
    items: [
      {
        href: "/app/diagrams",
        label: "Diagram designer",
        icon: Workflow,
        description: "Flows, systems, journeys",
        keywords: "flowchart mermaid nodes architecture",
      },
      {
        href: "/app/video",
        label: "Video studio",
        icon: Clapperboard,
        description: "Script, scenes, captions",
        keywords: "short form reel script timeline",
      },
      {
        href: "/app/voice",
        label: "Voice studio",
        icon: AudioLines,
        description: "Narration and waveforms",
        keywords: "tts speech audio narration",
      },
      {
        href: "/app/agents",
        label: "Agent builder",
        icon: Bot,
        description: "Bounded tool-calling loops",
        keywords: "ai llm tools automation mcp",
      },
      {
        href: "/app/image",
        label: "Image studio",
        icon: ImageIcon,
        description: "Prompts, models and workflows",
        keywords: "image prompt comfyui diffusion generate art",
      },
      {
        href: "/app/models",
        label: "Model playground",
        icon: Cpu,
        description: "Compare models side by side",
        keywords: "llm models openrouter gpt claude gemini router",
      },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    items: [
      {
        href: "/app/notes",
        label: "Notes",
        icon: StickyNote,
        description: "Working memory",
        keywords: "notepad scratchpad memos",
      },
      {
        href: "/app/wiki",
        label: "Wiki",
        icon: BookOpen,
        description: "Canonical team knowledge",
        keywords: "docs pages handbook kb",
      },
      {
        href: "/app/apis",
        label: "API directory",
        icon: Plug,
        description: "Browse and test public APIs",
        keywords: "rest apis marketplace sandbox",
      },
      {
        href: "/app/plugins",
        label: "Plugins",
        icon: Blocks,
        description: "Extend the workspace",
        keywords: "extensions addons marketplace install",
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      {
        href: "/app/community",
        label: "Community feed",
        icon: UsersRound,
        description: "Share, discuss, learn",
        keywords: "social posts feed timeline",
      },
      {
        href: "/app/inbox",
        label: "Inbox",
        icon: MessagesSquare,
        description: "SMS, WhatsApp, email, VoIP",
        keywords: "messages threads chat whatsapp sms",
      },
      {
        href: "/app/events",
        label: "Events",
        icon: CalendarDays,
        description: "Deadlines and sessions",
        keywords: "calendar webinars deadlines launches",
      },
      {
        href: "/app/settings",
        label: "Settings",
        icon: Settings,
        description: "Workspace and profile",
        keywords: "profile preferences theme workspace",
      },
    ],
  },
  {
    id: "insights",
    label: "Insights & Ops",
    items: [
      {
        href: "/app/radar",
        label: "Market radar",
        icon: RadarIcon,
        description: "Signals, competitors, forecasts",
        keywords: "market intelligence trends forecast competitor signals",
      },
      {
        href: "/app/research",
        label: "Web research",
        icon: ScanText,
        description: "Crawl and read the open web",
        keywords: "scrape crawl firecrawl research extract web",
      },
      {
        href: "/app/logistics",
        label: "Logistics",
        icon: Truck,
        description: "Shipments, carriers, customs",
        keywords: "shipping freight customs carriers supply chain",
      },
      {
        href: "/app/builder",
        label: "Dashboard builder",
        icon: LayoutGrid,
        description: "Compose your own dashboards",
        keywords: "low code dashboard tooljet widgets canvas grid",
      },
      {
        href: "/app/swarm",
        label: "Swarm lab",
        icon: Network,
        description: "Simulate a crowd and watch it react",
        keywords: "mirofish swarm simulation personas sentiment graph focus group",
      },
    ],
  },
  {
    id: "platform",
    label: "Platform & AI",
    items: [
      {
        href: "/app/chatkit",
        label: "Chat UI kit",
        icon: BlocksIcon,
        description: "43 components, six platforms",
        keywords: "cometchat uikit design system components theming a11y react flutter android ios",
      },
      {
        href: "/app/skills",
        label: "Agent skills & MCP",
        icon: Wand2,
        description: "Teach an agent to build it",
        keywords: "skills mcp cometchat dispatcher onboarding contracts documentation server",
      },
      {
        href: "/app/testing",
        label: "Test generation",
        icon: FlaskConical,
        description: "Criteria in, suites out",
        keywords: "robot framework pytest test cases generator ollama openai quality assurance",
      },
      {
        href: "/app/glossary",
        label: "AI coding dictionary",
        icon: BookMarked,
        description: "Jargon in plain English",
        keywords: "glossary dictionary terms ai coding plain english reference",
      },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function findNavItem(href: string) {
  return allNavItems.find((i) => i.href === href);
}
