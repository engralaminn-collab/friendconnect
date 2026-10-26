'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/hooks/use-auth'
import { api, ApiError } from '@/lib/api'
import { FCLogo } from '@/components/fc/ui'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Mail, Lock, User as UserIcon, AtSign, ShieldCheck, Sparkles, Users, MessageCircle, Video } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export function AuthFlow() {
  const { view, setView } = useApp()

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-accent/40 blur-3xl" />
      </div>
      <AnimatePresence mode="wait">
        {view === 'splash' && <Splash key="splash" onDone={() => setView('welcome')} />}
        {view === 'welcome' && <Welcome key="welcome" />}
        {view === 'login' && <Login key="login" />}
        {view === 'register' && <Register key="register" />}
        {view === 'forgot' && <Forgot key="forgot" />}
      </AnimatePresence>
    </div>
  )
}

function Splash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      onAnimationComplete={() => setTimeout(onDone, 900)}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        className="fc-pulse"
      >
        <FCLogo size={88} />
      </motion.div>
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-center"
      >
        <h1 className="text-3xl font-extrabold tracking-tight">FriendConnect</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reconnect with old friends, privately.</p>
      </motion.div>
    </motion.div>
  )
}

function Welcome() {
  const { setView } = useApp()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-screen flex-col px-6 py-10"
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <FCLogo size={72} className="mb-6" />
        <h1 className="text-3xl font-extrabold tracking-tight">Find your people again.</h1>
        <p className="mt-3 max-w-sm text-muted-foreground">
          FriendConnect is a private space to rediscover old friends — chat, call, and share memories without the noise of public networks.
        </p>
        <div className="mt-8 grid w-full max-w-sm gap-3">
          {[
            { icon: Users, title: 'Find friends', desc: 'Search by name or username' },
            { icon: MessageCircle, title: 'Private chat', desc: 'End-to-end encrypted feel, realtime' },
            { icon: Video, title: 'Voice & video calls', desc: 'Crystal-clear across networks' },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3 text-left backdrop-blur">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <f.icon size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Button size="lg" className="w-full rounded-2xl" onClick={() => setView('register')}>
          Create account <ArrowRight size={18} className="ml-1" />
        </Button>
        <Button size="lg" variant="ghost" className="w-full rounded-2xl" onClick={() => setView('login')}>
          I already have an account
        </Button>
      </div>
    </motion.div>
  )
}

function BackButton() {
  const { setView } = useApp()
  return (
    <button
      onClick={() => setView('welcome')}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft size={16} /> Back
    </button>
  )
}

function FieldShell({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      {children}
    </div>
  )
}

function Login() {
  const { login } = useAuth()
  const { setView } = useApp()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!identifier || !password) return toast.error('Enter your credentials')
    setLoading(true)
    try {
      await login(identifier, password)
      toast.success('Welcome back!')
      setView('home')
    } catch (e: any) {
      toast.error(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex min-h-screen flex-col px-6 py-10">
      <BackButton />
      <div className="mb-8">
        <FCLogo size={56} className="mb-4" />
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue to FriendConnect.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="li-id">Email or username</Label>
          <FieldShell icon={Mail}>
            <Input id="li-id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" className="rounded-xl pl-9" onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </FieldShell>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="li-pw">Password</Label>
          <FieldShell icon={Lock}>
            <Input id="li-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="rounded-xl pl-9" onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </FieldShell>
        </div>
        <button onClick={() => setView('forgot')} className="text-xs font-medium text-primary hover:underline">
          Forgot password?
        </button>
      </div>
      <Button size="lg" className="mt-6 w-full rounded-2xl" disabled={loading} onClick={submit}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="mb-1 flex items-center gap-1 font-medium text-foreground"><Sparkles size={13} /> Demo accounts</div>
        aria@friendconnect.app · bilal@friendconnect.app · carla@friendconnect.app — password: <span className="font-mono">password123</span>
      </div>
      <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
        No account?{' '}
        <button onClick={() => setView('register')} className="font-semibold text-primary hover:underline">Create one</button>
      </p>
    </motion.div>
  )
}

function Register() {
  const { register } = useAuth()
  const { setView } = useApp()
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name || !form.username || !form.email || !form.password) return toast.error('Fill in all fields')
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to FriendConnect.')
      setView('home')
    } catch (e: any) {
      toast.error(e.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex min-h-screen flex-col px-6 py-10">
      <BackButton />
      <div className="mb-6">
        <FCLogo size={56} className="mb-4" />
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted-foreground">It only takes a minute.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <FieldShell icon={UserIcon}><Input value={form.name} onChange={set('name')} placeholder="Your name" className="rounded-xl pl-9" /></FieldShell>
        </div>
        <div className="space-y-1.5">
          <Label>Username</Label>
          <FieldShell icon={AtSign}><Input value={form.username} onChange={set('username')} placeholder="username" className="rounded-xl pl-9" autoCapitalize="none" /></FieldShell>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <FieldShell icon={Mail}><Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className="rounded-xl pl-9" autoCapitalize="none" /></FieldShell>
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <FieldShell icon={Lock}><Input type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" className="rounded-xl pl-9" /></FieldShell>
        </div>
      </div>
      <Button size="lg" className="mt-6 w-full rounded-2xl" disabled={loading} onClick={submit}>
        {loading ? 'Creating…' : 'Create account'}
      </Button>
      <p className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <ShieldCheck size={13} /> Your password is hashed and never stored in plain text.
      </p>
      <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
        Have an account?{' '}
        <button onClick={() => setView('login')} className="font-semibold text-primary hover:underline">Sign in</button>
      </p>
    </motion.div>
  )
}

function Forgot() {
  const { setView } = useApp()
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const requestOtp = async () => {
    if (!identifier) return toast.error('Enter your email or username')
    setLoading(true)
    try {
      const data = await api<{ otp: string }>('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email: identifier }) })
      setGeneratedOtp(data.otp)
      setStep('verify')
      toast.success(`OTP sent (demo code: ${data.otp})`)
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!otp) return toast.error('Enter the OTP')
    setLoading(true)
    try {
      await api('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email: identifier, otp }) })
      setStep('reset')
      toast.success('Verified! Set a new password.')
    } catch (e: any) {
      toast.error(e.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const reset = async () => {
    if (!password || password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email: identifier, otp, password }) })
      toast.success('Password reset! You can sign in now.')
      setView('login')
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex min-h-screen flex-col px-6 py-10">
      <BackButton />
      <div className="mb-6">
        <FCLogo size={56} className="mb-4" />
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          {step === 'request' && 'Enter your email to receive a verification code.'}
          {step === 'verify' && `Enter the 6-digit code we sent${generatedOtp ? ` (demo: ${generatedOtp})` : ''}.`}
          {step === 'reset' && 'Choose a new password.'}
        </p>
      </div>
      <div className="space-y-3">
        {step === 'request' && (
          <FieldShell icon={Mail}>
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email or username" className="rounded-xl pl-9" autoCapitalize="none" />
          </FieldShell>
        )}
        {step === 'verify' && (
          <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6} className="rounded-xl text-center text-2xl tracking-[0.5em]" />
        )}
        {step === 'reset' && (
          <FieldShell icon={Lock}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="rounded-xl pl-9" /></FieldShell>
        )}
      </div>
      <Button size="lg" className="mt-6 w-full rounded-2xl" disabled={loading} onClick={step === 'request' ? requestOtp : step === 'verify' ? verifyOtp : reset}>
        {loading ? 'Please wait…' : step === 'request' ? 'Send code' : step === 'verify' ? 'Verify' : 'Reset password'}
      </Button>
    </motion.div>
  )
}
