module.exports = {
  apps: [{
    name: 'ollama-tools-api',
    script: './server.js',
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3100
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3100
    },
    
    // Performance
    instances: 1,
    exec_mode: 'fork',
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    
    // Auto restart
    watch: false,
    max_memory_restart: '200M',
    
    // Restart settings
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Advanced
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000
  }]
};
