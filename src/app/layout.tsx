import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { CommandPalette } from "@/components/app/CommandPalette";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://friendconnect.app"),
  title: {
    default: "FriendConnect — the workspace for community, revenue and creative work",
    template: "%s · FriendConnect",
  },
  description:
    "FriendConnect is an all-in-one workspace: CRM and pipeline, education consultancy, AI marketing studio, diagram designer, video and voice studios, agent builder, knowledge base and a community feed.",
  keywords: [
    "CRM",
    "AI marketing studio",
    "education consultancy",
    "diagram designer",
    "video studio",
    "voice studio",
    "AI agents",
    "community platform",
  ],
  openGraph: {
    title: "FriendConnect",
    description:
      "Community, revenue operations, AI marketing, education consultancy and creative studios — one workspace.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1124" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('friendconnect-ui-v1')||'{}');var t=(s&&s.state&&s.state.theme)||'dark';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:bg-[var(--color-brand-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        <CommandPalette />
      </body>
    </html>
  );
}
