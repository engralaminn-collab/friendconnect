/**
 * Transactional email. When SMTP_URL is configured, real messages are sent
 * through nodemailer; otherwise messages are logged (development mode) and the
 * one-time token is returned so flows remain testable without a mail provider.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_URL) return null;
  if (!transporter) transporter = nodemailer.createTransport(env.SMTP_URL);
  return transporter;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ delivered: boolean; logged: boolean }> {
  const tx = getTransporter();
  if (!tx) {
    console.info(`[email:dev] To=${msg.to} Subject=${msg.subject}\n${msg.text}`);
    return { delivered: false, logged: true };
  }
  await tx.sendMail({ from: env.EMAIL_FROM, ...msg });
  return { delivered: true, logged: false };
}

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_URL);
}
