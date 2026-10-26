import { db } from '@/lib/db'
import { json } from '@/lib/serialize'

// Prometheus-style metrics endpoint (round 11)
export async function GET() {
  const [users, messages, groups, calls, stories, sessions, files] = await Promise.all([
    db.user.count(),
    db.message.count(),
    db.group.count(),
    db.call.count(),
    db.story.count(),
    db.session.count({ where: { expiresAt: { gt: new Date() } } }),
    db.file.count(),
  ])
  const lines = [
    '# HELP friendconnect_users_total Total registered users',
    '# TYPE friendconnect_users_total gauge',
    `friendconnect_users_total ${users}`,
    '# HELP friendconnect_messages_total Total messages sent',
    '# TYPE friendconnect_messages_total gauge',
    `friendconnect_messages_total ${messages}`,
    '# HELP friendconnect_groups_total Total groups',
    '# TYPE friendconnect_groups_total gauge',
    `friendconnect_groups_total ${groups}`,
    '# HELP friendconnect_calls_total Total calls',
    '# TYPE friendconnect_calls_total gauge',
    `friendconnect_calls_total ${calls}`,
    '# HELP friendconnect_stories_total Total stories',
    '# TYPE friendconnect_stories_total gauge',
    `friendconnect_stories_total ${stories}`,
    '# HELP friendconnect_active_sessions Active sessions',
    '# TYPE friendconnect_active_sessions gauge',
    `friendconnect_active_sessions ${sessions}`,
    '# HELP friendconnect_files_total Total uploaded files',
    '# TYPE friendconnect_files_total gauge',
    `friendconnect_files_total ${files}`,
  ]
  return new Response(lines.join('\n') + '\n', { headers: { 'content-type': 'text/plain; version=0.0.4' } })
}
