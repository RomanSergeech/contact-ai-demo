module.exports = {
  apps: [
    {
      name: "contact-ai-front",
      cwd: ".../frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
