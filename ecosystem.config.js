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
  ],
};
