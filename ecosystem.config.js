module.exports = {
  apps: [{
    name: 'lafi-backend',
    script: './src/server.js',
    
    // Instance settings - 1 CPU saja
    instances: 1,
    exec_mode: 'fork', // gunakan 'fork' untuk single instance
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Log settings
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced features
    watch: false, // set true jika ingin auto-restart saat file berubah
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      '.wwebjs_auth',
      '*.log'
    ],
    
    // Restart settings
    max_memory_restart: '500M', // restart jika memory > 500MB
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    
    // Cron restart (optional - restart setiap hari jam 3 pagi)
    cron_restart: '0 3 * * *',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
