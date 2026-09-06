/**
 * PM2 process definitions.
 *
 * Two processes: the Next.js app on the public port, and the Express API bound to
 * loopback so it cannot be reached from outside the host.
 *
 * Both run in `fork` mode rather than `cluster`. The API's rate limiter keeps its
 * counters in memory, so multiple workers would each hold a separate count and the
 * effective limit would multiply by the worker count.
 */
module.exports = {
  apps: [
    {
      name: 'ldp-api',
      cwd: './backend',
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8229,
        HOST: '127.0.0.1',
      },
      out_file: '../logs/api-out.log',
      error_file: '../logs/api-error.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '400M',
      // Long enough for the API's graceful shutdown to drain in-flight requests.
      kill_timeout: 12000,
    },
    {
      name: 'ldp-web',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 8228 -H 0.0.0.0',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
      out_file: '../logs/web-out.log',
      error_file: '../logs/web-error.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '600M',
      kill_timeout: 12000,
    },
  ],
};
