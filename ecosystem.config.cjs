module.exports = {
  apps: [
    {
      name: 'beads-daemon',
      script: 'bd',
      args: 'daemon --start --foreground --interval 5s',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
        BD_AUTO_START_DAEMON: 'true'
      },
      env_production: {
        NODE_ENV: 'production',
        BD_AUTO_START_DAEMON: 'true'
      },
      log_file: '.beads/pm2.log',
      out_file: '.beads/pm2-out.log',
      error_file: '.beads/pm2-error.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: false,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};