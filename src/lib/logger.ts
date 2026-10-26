// Structured logger (round 11) — lightweight, no external deps.
// Emits JSON to stdout with level, timestamp, context.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  ts: string
  msg: string
  [k: string]: any
}

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function write(level: LogLevel, msg: string, ctx?: Record<string, any>) {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return
  const entry: LogEntry = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...ctx,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, any>) => write('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, any>) => write('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, any>) => write('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, any>) => write('error', msg, ctx),
}

// Parse a User-Agent into a friendly device name
export function parseDeviceName(ua: string): string {
  if (!ua) return 'Unknown device'
  let browser = 'Browser'
  if (/edg/i.test(ua)) browser = 'Edge'
  else if (/chrome|crios|crmo/i.test(ua)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua)) browser = 'Safari'
  let os = 'Unknown OS'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/mac os|macintosh|iphone|ipad/i.test(ua)) os = 'iOS/macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/linux/i.test(ua)) os = 'Linux'
  return `${browser} on ${os}`
}
