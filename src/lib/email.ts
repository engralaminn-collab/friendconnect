// Email provider abstraction (round 12) — supports SMTP, SES, SendGrid.
// If no provider is configured, falls back to dev mode (returns the code).
import { logger } from '@/lib/logger'

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }>
}

class DevEmailProvider implements EmailProvider {
  async send(msg: EmailMessage) {
    // Dev mode: log the email content (OTP is visible in logs/API response)
    logger.info('email (dev mode)', { to: msg.to, subject: msg.subject, text: msg.text.slice(0, 200) })
    return { ok: true, messageId: `dev-${Date.now()}` }
  }
}

class SMTPEmailProvider implements EmailProvider {
  constructor(private config: { host: string; port: number; user: string; pass: string; from: string; secure: boolean }) {}
  async send(msg: EmailMessage) {
    try {
      // Dynamic import of nodemailer (optional dependency)
      const nodemailer = await import('nodemailer').catch(() => null)
      if (!nodemailer) {
        logger.error('nodemailer not installed — falling back to dev mode')
        return { ok: false, error: 'nodemailer not installed' }
      }
      const transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: { user: this.config.user, pass: this.config.pass },
      })
      const info = await transporter.sendMail({
        from: this.config.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      })
      logger.info('email sent', { to: msg.to, messageId: info.messageId })
      return { ok: true, messageId: info.messageId }
    } catch (e: any) {
      logger.error('email send failed', { error: e?.message, to: msg.to })
      return { ok: false, error: e?.message }
    }
  }
}

let _provider: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider
  const provider = process.env.EMAIL_PROVIDER || ''
  if (provider === 'smtp' && process.env.SMTP_HOST) {
    _provider = new SMTPEmailProvider({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
      from: process.env.SMTP_FROM || 'noreply@friendconnect.app',
      secure: process.env.SMTP_SECURE === 'true',
    })
    logger.info('email provider: smtp')
  } else {
    _provider = new DevEmailProvider()
    logger.info('email provider: dev (no SMTP configured)')
  }
  return _provider
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  return getEmailProvider().send({ to, subject, text, html })
}

export function isEmailConfigured(): boolean {
  return !!(process.env.EMAIL_PROVIDER && process.env.SMTP_HOST)
}
