module.exports = {
  apps: [
    {
      name: "omega",
      cwd: "/apps/0mega",
      script: "npm",
      args: "start",
      post_update: ["npm install", "npm run build"],
      env: {
        NODE_ENV: "production",
      },
    },

    {
      name: "omega-boot",
      cwd: "/apps/0mega",
      script: "bash",
      args: "-c 'sleep 5 && curl -s http://localhost:3000/api/engine/boot'",

      autorestart: false,
      watch: false,
    },
  ],
};
