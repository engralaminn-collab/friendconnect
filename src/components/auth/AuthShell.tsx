"use client";

import Link from "next/link";
import * as React from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--fc-bg,#0f1124)]">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[linear-gradient(135deg,#1b2350,#0c1030_60%,#080b1d)]">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          FriendConnect
        </Link>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Secure, persistent, real-time.</h2>
          <p className="text-white/60 max-w-md">
            Private messaging, voice and video calls, shared media and a full workspace — backed by
            MySQL, authenticated sessions and end-to-end authorization.
          </p>
        </div>
        <p className="text-xs text-white/35">
          Sessions are stored as opaque tokens in HttpOnly cookies. Your password is hashed with
          scrypt and never leaves the browser unencrypted.
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <Link href="/" className="text-xl font-bold tracking-tight">
              FriendConnect
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-[var(--fc-fg-muted,rgba(255,255,255,0.55))]">{subtitle}</p>
          </div>
          {children}
          <div className="text-sm text-[var(--fc-fg-muted,rgba(255,255,255,0.55))]">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input className="field w-full" {...props} />
    </label>
  );
}
