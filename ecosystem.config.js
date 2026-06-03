/**
 * PM2 Ecosystem Configuration
 * สำหรับรัน Next.js production บน Windows + SQL Server Local
 */

module.exports = {
  apps: [
    {
      name: "car-service",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      instances: 1, // single instance (database connection pooling)
      exec_mode: "fork", // fork mode (not cluster) เพราะใช้ connection pool
      
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      
      // Environment
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      
      // Logging
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Windows specific
      windowsHide: true,
    },
  ],
};
