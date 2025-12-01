module.exports = {
  apps: [
    {
      name: 'yebalabs-auth',
      script: './dist/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Cluster mode for load balancing
      env: {
        NODE_ENV: 'production',
      },
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // Prepend timestamp to logs
      merge_logs: true,
      
      // Auto restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Advanced PM2 features
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Environment variables (override with .env file)
      env_file: '.env',
    },
  ],
};

