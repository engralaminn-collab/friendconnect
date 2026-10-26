"use client";

import * as React from "react";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { CommandPalette } from "@/components/app/CommandPalette";

/**
 * Workspace shell for the module workspace (/app/*).
 * The session/websocket context is provided once, in the root layout.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommandPalette />
      <div className="flex min-h-dvh bg-[var(--fc-surface-2)]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main" className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
