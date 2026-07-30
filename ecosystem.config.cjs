module.exports = {
  apps: [
    {
      name: "inventory-api",
      cwd: "./backend",
      script: "dist/src/server.js",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
