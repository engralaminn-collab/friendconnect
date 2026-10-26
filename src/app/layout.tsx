import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "FriendConnect — Reconnect with old friends",
  description:
    "FriendConnect is a private social platform to find and reconnect with old friends. Chat, call, and share — privately.",
  keywords: ["FriendConnect", "social", "friends", "chat", "calls", "reconnect"],
  authors: [{ name: "FriendConnect" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/friendconnect-logo.png",
    shortcut: "/friendconnect-logo.png",
    apple: "/friendconnect-logo.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FriendConnect" },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Register service worker for PWA + push notifications
const SW_SCRIPT = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SW_SCRIPT }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          {/* Session/websocket/call context for every route: /login, /register, /app/*.
              The private SPA at `/` adds its own FC providers inside this tree. */}
          <AuthProvider>
            {children}
            <Toaster />
            <SonnerToaster position="top-center" richColors closeButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
