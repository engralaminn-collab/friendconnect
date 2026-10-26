'use client'

import { useAuth } from '@/hooks/use-auth'
import { useApp } from '@/lib/store'
import { api, timeAgo } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTheme } from 'next-themes'
import {
  Moon, Sun, Monitor, Bell, Shield, ShieldCheck, HelpCircle, LogOut, Globe, Volume2, Vibrate,
  Trash2, Download, Info, Github, Heart, Mail, MailCheck, Smartphone, QrCode, Key, AlertTriangle,
  Check, Loader2, HardDrive,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function SettingsView() {
  const { user, logout, refresh } = useAuth()
  const { setView } = useApp()
  const { theme, setTheme } = useTheme()
  const [notifSound, setNotifSound] = useState(true)
  const [notifVibrate, setNotifVibrate] = useState(true)
  const [readReceipts, setReadReceipts] = useState(user?.profile?.readReceipts ?? true)

  const toggleReadReceipts = async (v: boolean) => {
    setReadReceipts(v)
    try {
      await api('/api/users/me', { method: 'PUT', body: JSON.stringify({ readReceipts: v }) })
      toast.success(v ? 'Read receipts enabled' : 'Read receipts disabled')
    } catch (e: any) {
      setReadReceipts(!v)
      toast.error(e.message || 'Failed to update')
    }
  }

  return (
    <div className="fc-scroll h-full overflow-y-auto pb-6">
      <div className="border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <Card className="divide-y divide-border border-border shadow-none">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Moon size={16} /></div>
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-muted-foreground">Light, dark or system</div>
              </div>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><span className="flex items-center gap-2"><Sun size={14} /> Light</span></SelectItem>
                <SelectItem value="dark"><span className="flex items-center gap-2"><Moon size={14} /> Dark</span></SelectItem>
                <SelectItem value="system"><span className="flex items-center gap-2"><Monitor size={14} /> System</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Card className="divide-y divide-border border-border shadow-none">
          <ToggleRow icon={Bell} label="Push notifications" desc="Friend requests, messages & calls" checked={notifSound} onChange={setNotifSound} />
          <ToggleRow icon={Volume2} label="Notification sound" desc="Play a sound for new activity" checked={notifSound} onChange={setNotifSound} />
          <ToggleRow icon={Vibrate} label="Vibration" desc="Vibrate on new messages" checked={notifVibrate} onChange={setNotifVibrate} />
        </Card>
      </Section>

      {/* Privacy */}
      <Section title="Privacy & Security">
        <Card className="divide-y divide-border border-border shadow-none">
          <ToggleRow icon={Shield} label="Read receipts" desc="Show others when you read messages" checked={readReceipts} onChange={toggleReadReceipts} />
          <button onClick={() => setView('friends')} className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/40">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Shield size={16} /></div>
            <div className="flex-1"><div className="text-sm font-medium">Blocked users</div><div className="text-xs text-muted-foreground">Manage who you've blocked</div></div>
          </button>
        </Card>
      </Section>

      {/* Security — 2FA, email verification, active sessions */}
      <Section title="Security">
        <SecuritySection />
      </Section>

      {/* Account */}
      <Section title="Account">
        <Card className="divide-y divide-border border-border shadow-none">
          <Row icon={Globe} label="Email" value={user?.email || ''} />
          <Row icon={Info} label="Username" value={`@${user?.username}`} />
          <button onClick={() => setView('profile')} className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/40">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Shield size={16} /></div>
            <div className="flex-1"><div className="text-sm font-medium">Edit profile</div><div className="text-xs text-muted-foreground">Update your info & privacy</div></div>
          </button>
        </Card>
      </Section>

      {/* Data */}
      <Section title="Data & Storage">
        <Card className="divide-y divide-border border-border shadow-none">
          <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/40" onClick={() => toast.info('Export started — you’ll be notified when ready.')}>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Download size={16} /></div>
            <div className="flex-1"><div className="text-sm font-medium">Export my data</div><div className="text-xs text-muted-foreground">Download a copy of your data</div></div>
          </button>
        </Card>
      </Section>

      {/* Storage — file quota */}
      <Section title="Storage">
        <StorageSection />
      </Section>

      {/* About */}
      <Section title="About">
        <Card className="divide-y divide-border border-border shadow-none">
          <Row icon={Info} label="Version" value="1.0.0" />
          <Row icon={HelpCircle} label="Help & support" value="Tap to view" />
          <Row icon={Github} label="Open source" value="MIT licensed" />
        </Card>
        <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          Made with <Heart size={12} className="text-destructive" /> for reconnecting friends
        </p>
      </Section>

      {/* Sign out */}
      <div className="mt-4 px-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"><LogOut size={16} className="mr-1" />Sign out</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>You’ll need to sign in again to use FriendConnect.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => { await logout(); toast.success('Signed out') }}>Sign out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="px-4">{children}</div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></div>
      <div className="flex-1"><div className="text-sm font-medium">{label}</div></div>
      <span className="truncate text-sm text-muted-foreground">{value}</span>
    </div>
  )
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange }: { icon: typeof Bell; label: string; desc: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></div>
      <div className="flex-1"><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Security section — 2FA, email verification, active sessions
// ---------------------------------------------------------------------------

interface SessionRow {
  id: string
  deviceName: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  lastActiveAt: string
  expiresAt: string
  isCurrent: boolean
}

function SecuritySection() {
  const { user, refresh } = useAuth()
  const twoFactorEnabled = !!user?.twoFactorEnabled
  const emailVerified = !!user?.emailVerified

  const [twoFactorOpen, setTwoFactorOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)

  return (
    <Card className="divide-y divide-border border-border shadow-none">
      {/* 2FA */}
      <div className="flex items-center gap-3 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          {twoFactorEnabled ? <ShieldCheck size={16} /> : <Key size={16} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            Two-factor authentication
          </div>
          <div className="text-xs text-muted-foreground">
            {twoFactorEnabled ? 'Enabled — extra protection on login' : 'Protect your account with a TOTP code'}
          </div>
        </div>
        {twoFactorEnabled ? (
          <Badge variant="default" className="bg-primary/15 text-primary">
            <Check size={11} /> 2FA on
          </Badge>
        ) : null}
        <Button
          size="sm"
          variant={twoFactorEnabled ? 'outline' : 'default'}
          onClick={() => setTwoFactorOpen(true)}
        >
          {twoFactorEnabled ? 'Disable' : 'Enable'}
        </Button>
      </div>

      {/* Email verification */}
      <EmailVerificationRow email={user?.email || ''} verified={emailVerified} onVerified={refresh} />

      {/* Active sessions */}
      <button
        onClick={() => setSessionsOpen(true)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/40"
      >
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Smartphone size={16} /></div>
        <div className="flex-1">
          <div className="text-sm font-medium">Active sessions</div>
          <div className="text-xs text-muted-foreground">Manage devices logged into your account</div>
        </div>
        <ChevronRightIcon />
      </button>

      <TwoFactorDialog
        open={twoFactorOpen}
        onOpenChange={setTwoFactorOpen}
        enabled={twoFactorEnabled}
        onChanged={async () => {
          await refresh()
        }}
      />
      <SessionsDialog open={sessionsOpen} onOpenChange={setSessionsOpen} />
    </Card>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function EmailVerificationRow({
  email,
  verified,
  onVerified,
}: {
  email: string
  verified: boolean
  onVerified: () => Promise<any>
}) {
  const [open, setOpen] = useState(false)
  if (verified) {
    return (
      <div className="flex items-center gap-3 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><MailCheck size={16} /></div>
        <div className="flex-1">
          <div className="text-sm font-medium">Email verification</div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
        </div>
        <Badge variant="default" className="bg-primary/15 text-primary">
          <Check size={11} /> Verified
        </Badge>
      </div>
    )
  }
  return (
    <>
      <div className="flex items-center gap-3 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Mail size={16} /></div>
        <div className="flex-1">
          <div className="text-sm font-medium">Email verification</div>
          <div className="text-xs text-amber-600">Not verified — verify to secure your account</div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Verify</Button>
      </div>
      <EmailVerifyDialog
        open={open}
        onOpenChange={setOpen}
        email={email}
        onVerified={async () => {
          await onVerified()
          setOpen(false)
        }}
      />
    </>
  )
}

function EmailVerifyDialog({
  open,
  onOpenChange,
  email,
  onVerified,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  email: string
  onVerified: () => Promise<any>
}) {
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const sendCode = useCallback(async () => {
    setSending(true)
    try {
      const data = await api<{ ok: boolean; code?: string }>('/api/email/resend', { method: 'POST' })
      setSent(true)
      // The demo backend returns the code so the user can complete verification
      // without an actual email round-trip. We surface it as a hint.
      if (data?.code) setDemoCode(data.code)
      toast.success('Verification code sent')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send code')
    } finally {
      setSending(false)
    }
  }, [])

  const verify = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Enter the code')
      return
    }
    setVerifying(true)
    try {
      await api('/api/email/verify', { method: 'POST', body: JSON.stringify({ code: code.trim() }) })
      toast.success('Email verified')
      setDemoCode(null)
      setCode('')
      setSent(false)
      await onVerified()
    } catch (e: any) {
      toast.error(e?.message || 'Invalid code')
    } finally {
      setVerifying(false)
    }
  }, [code, onVerified])

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setCode(''); setDemoCode(null); setSent(false) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail size={18} className="text-primary" /> Verify your email</DialogTitle>
          <DialogDescription>
            We&apos;ll send a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {demoCode && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>Demo mode — your code is <span className="font-mono font-semibold">{demoCode}</span></span>
            </div>
          )}
          {sent && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-code" className="text-xs">Enter the 6-digit code</Label>
              <Input
                id="ev-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ''))}
                className="text-center font-mono text-lg tracking-[0.4em]"
              />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {!sent ? (
            <Button onClick={sendCode} disabled={sending} className="w-full">
              {sending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Mail size={14} className="mr-1" />}
              Send code
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={sendCode} disabled={sending || verifying} className="flex-1">
                {sending ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
                Resend
              </Button>
              <Button onClick={verify} disabled={verifying || !code.trim()} className="flex-1">
                {verifying ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
                Verify
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- 2FA setup / disable dialog -------------------------------------------

function TwoFactorDialog({
  open,
  onOpenChange,
  enabled,
  onChanged,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  enabled: boolean
  onChanged: () => Promise<any>
}) {
  if (enabled) {
    return <DisableTwoFactorDialog open={open} onOpenChange={onOpenChange} onChanged={onChanged} />
  }
  return <SetupTwoFactorDialog open={open} onOpenChange={onOpenChange} onChanged={onChanged} />
}

function SetupTwoFactorDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onChanged: () => Promise<any>
}) {
  // step: 'setup' → show QR + secret, 'verify' → enter code, 'backup' → show backup codes
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [secret, setSecret] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [uri, setUri] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setStep('setup')
    setSecret('')
    setQrDataUrl('')
    setUri('')
    setCode('')
    setBackupCodes([])
    setCopied(false)
  }

  // Generate secret + QR when the dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    api<{ secret: string; uri: string; qrDataUrl: string }>('/api/2fa/setup', { method: 'POST' })
      .then((d) => {
        if (cancelled) return
        setSecret(d.secret)
        setUri(d.uri)
        setQrDataUrl(d.qrDataUrl)
        setStep('setup')
      })
      .catch((e: any) => {
        toast.error(e?.message || 'Failed to start 2FA setup')
        onOpenChange(false)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [open])

  const verify = useCallback(async () => {
    if (code.replace(/\s/g, '').length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app')
      return
    }
    setVerifying(true)
    try {
      const data = await api<{ ok: boolean; backupCodes: string[] }>('/api/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: code.replace(/\s/g, '') }),
      })
      setBackupCodes(data.backupCodes || [])
      setStep('backup')
      toast.success('2FA enabled')
      await onChanged()
    } catch (e: any) {
      toast.error(e?.message || 'Invalid code')
    } finally {
      setVerifying(false)
    }
  }, [code, onChanged])

  const copyCodes = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n')).then(() => {
      setCopied(true)
      toast.success('Backup codes copied')
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => toast.error('Clipboard unavailable'))
  }

  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) {
      // give the dialog a beat to close before wiping state
      setTimeout(reset, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            {step === 'backup' ? 'Save your backup codes' : 'Enable two-factor authentication'}
          </DialogTitle>
          <DialogDescription>
            {step === 'setup' && 'Scan the QR code with an authenticator app like Authy or 1Password.'}
            {step === 'verify' && 'Enter the 6-digit code shown in your authenticator app.'}
            {step === 'backup' && 'Store these one-time backup codes somewhere safe.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : step === 'setup' ? (
          <div className="space-y-3">
            <div className="flex justify-center rounded-xl border border-border bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="2FA QR code" width={200} height={200} className="h-[200px] w-[200px]" />
              ) : (
                <div className="grid h-[200px] w-[200px] place-items-center text-muted-foreground">
                  <QrCode size={64} />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Or enter this key manually</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs">
                  {secret}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(secret).then(() => toast.success('Secret copied')).catch(() => toast.error('Clipboard unavailable'))
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setStep('verify')} className="w-full" disabled={!secret}>
                Next <ChevronRightIcon />
              </Button>
            </DialogFooter>
          </div>
        ) : step === 'verify' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tfa-code" className="text-xs">Enter the 6-digit code</Label>
              <Input
                id="tfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ''))}
                className="text-center font-mono text-lg tracking-[0.5em]"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">Back</Button>
              <Button onClick={verify} disabled={verifying || code.length !== 6} className="flex-1">
                {verifying ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
                Verify & enable
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>Save these backup codes somewhere safe. They won&apos;t be shown again.</span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 font-mono text-sm">
              {backupCodes.map((c, i) => (
                <div key={i} className="select-all">{c}</div>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={copyCodes} className="flex-1">
                {copied ? <Check size={14} className="mr-1" /> : null}
                {copied ? 'Copied' : 'Copy codes'}
              </Button>
              <Button onClick={() => close(false)} className="flex-1">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DisableTwoFactorDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onChanged: () => Promise<any>
}) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const disable = useCallback(async () => {
    if (!password) {
      toast.error('Enter your password to confirm')
      return
    }
    setLoading(true)
    try {
      await api('/api/2fa/disable', { method: 'POST', body: JSON.stringify({ password }) })
      toast.success('2FA disabled')
      setPassword('')
      onOpenChange(false)
      await onChanged()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }, [password, onOpenChange, onChanged])

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setPassword('') }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle size={18} className="text-amber-600" /> Disable 2FA?</DialogTitle>
          <DialogDescription>
            This will lower your account security. Enter your password to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="tfa-pw" className="text-xs">Password</Label>
          <Input
            id="tfa-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">Cancel</Button>
          <Button variant="destructive" onClick={disable} disabled={loading || !password} className="flex-1">
            {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Shield size={14} className="mr-1" />}
            Disable 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Sessions dialog -------------------------------------------------------

function SessionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ sessions: SessionRow[] }>('/api/sessions')
      setSessions(data.sessions || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const revoke = useCallback(async (id: string) => {
    setRevokingId(id)
    try {
      await api(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== id))
      toast.success('Session revoked')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to revoke')
    } finally {
      setRevokingId(null)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 gap-1 border-b border-border bg-background/95 px-5 pb-4 pt-5 backdrop-blur">
          <DialogTitle className="flex items-center gap-2">
            <Smartphone size={18} className="text-primary" /> Active sessions
          </DialogTitle>
          <DialogDescription>Devices currently signed into your account.</DialogDescription>
        </DialogHeader>

        <div className="fc-scroll flex-1 overflow-y-auto p-3">
          {loading && sessions.length === 0 ? (
            <div className="space-y-2 px-1">
              {[0, 1, 2].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">No active sessions</div>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    {deviceIcon(s.userAgent)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{s.deviceName}</span>
                      {s.isCurrent && (
                        <Badge variant="default" className="bg-primary/15 text-primary">Current</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {s.ipAddress && <span>{s.ipAddress}</span>}
                      {s.ipAddress && <span aria-hidden>·</span>}
                      <span>Active {timeAgo(s.lastActiveAt)}</span>
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={revokingId === s.id}
                      onClick={() => revoke(s.id)}
                    >
                      {revokingId === s.id ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function deviceIcon(userAgent: string | null | undefined) {
  const ua = (userAgent || '').toLowerCase()
  if (/mobile|android|iphone|ipod/.test(ua)) return <Smartphone size={18} />
  return <Monitor size={18} />
}

// ---------------------------------------------------------------------------
// Storage section — file quota bar
// ---------------------------------------------------------------------------

interface QuotaData {
  used: number
  quota: number
  remaining: number
  usedMB: string | number
  quotaMB: string | number
  percent: number
}

function StorageSection() {
  const { user } = useAuth()
  const [quota, setQuota] = useState<QuotaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const data = await api<QuotaData>('/api/quota')
      setQuota(data)
    } catch (e: any) {
      setErr(e?.message || 'Failed to load quota')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Compute from user.fileQuota if the API hasn't returned yet (instant UI).
  const fallback = user?.fileQuota
  const used = quota?.used ?? fallback?.used ?? 0
  const total = quota?.quota ?? fallback?.quota ?? 0
  const percent = quota?.percent ?? (total > 0 ? Math.round((used / total) * 100) : 0)
  const usedMB = quota?.usedMB ?? (used / 1048576).toFixed(2)
  const quotaMB = quota?.quotaMB ?? (total / 1048576).toFixed(2)
  const warning = percent > 80

  if (loading && !quota) {
    return (
      <Card className="border-border shadow-none">
        <div className="flex items-center gap-3 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><HardDrive size={16} /></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </Card>
    )
  }

  if (err && !quota) {
    return (
      <Card className="border-border shadow-none">
        <div className="flex items-center gap-3 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive"><AlertTriangle size={16} /></div>
          <div className="flex-1">
            <div className="text-sm font-medium">Storage unavailable</div>
            <div className="text-xs text-muted-foreground">{err}</div>
          </div>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-none">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><HardDrive size={16} /></div>
          <div className="flex-1">
            <div className="text-sm font-medium">File storage</div>
            <div className={`text-xs ${warning ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {usedMB} MB of {quotaMB} MB used{warning ? ' — almost full' : ''}
            </div>
          </div>
          <span className={`text-2xl font-bold ${warning ? 'text-amber-600' : 'text-primary'}`}>{percent}%</span>
        </div>
        <div className="mt-3">
          <Progress value={percent} className={warning ? 'h-2.5' : 'h-2.5'} />
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{Number(usedMB)} MB used</span>
            <span>{Math.max(0, Number(quotaMB) - Number(usedMB)).toFixed(2)} MB free</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
