// FriendConnect — PM2 Ecosystem Configuration
// Usage: pm2 startOrReload ecosystem.config.cjs --env production
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      // Deployed as panel.alolabs.net → 127.0.0.1:3012 (see scripts/deploy-alo-server.sh)
      name: process.env.APP_NAME || 'friendconnect',
      script: '.next/standalone/server.js',
      cwd: process.env.APP_DIR || __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: Number(process.env.PORT || 3012),
      },
      instances: 1, // Increase for multi-core (use cluster mode)
      autorestart: true,
      max_memory_restart: '512M',
      watch: false,
      out_file: './logs/app-out.log',
      error_file: './logs/app-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000, // Graceful shutdown
      listen_timeout: 10000,
    },
    {
      name: 'friendconnect-realtime',
      script: 'mini-services/realtime/index.ts',
      cwd: process.env.APP_DIR || __dirname,
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1, // For multi-process, add @socket.io/redis-adapter + Redis
      autorestart: true,
      max_memory_restart: '256M',
      watch: false,
      out_file: './logs/realtime-out.log',
      error_file: './logs/realtime-error.log',
      merge_logs: true,
      kill_timeout: 5000,
    },
    {
      name: 'friendconnect-worker',
      script: 'mini-services/worker/index.ts',
      cwd: process.env.APP_DIR || __dirname,
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      watch: false,
      out_file: './logs/worker-out.log',
      error_file: './logs/worker-error.log',
      kill_timeout: 10000, // Workers need more time to finish jobs
    },
    {
      name: 'friendconnect-turn',
      script: 'turnserver',
      args: '-c /etc/turnserver.conf --no-cli',
      cwd: '/',
      interpreter: 'none',
      env: {},
      instances: 1,
      autorestart: true,
      watch: false,
      out_file: '/var/log/turnserver-pm2.log',
      error_file: '/var/log/turnserver-pm2-error.log',
      kill_timeout: 3000,
      // Only starts if coturn is installed; PM2 will retry on failure
    },
  ],
}
