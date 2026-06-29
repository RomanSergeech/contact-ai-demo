module.exports = {
  apps: [
    {
      name: "contact-ai-back",
      cwd: ".../backend",
      script: "node",
      args: "dist/src/main.js",
      watch: false,
      env_production: {
        PORT: 5000,
        NODE_ENV: "production",
        CLIENT_URL: "",
        JWT_ACCESS_SECRET: "",
        JWT_REFRESH_SECRET: "",
        OPENAI_API_KEY: "",
        DATABASE_URL: "",
        OPENAI_BASE_URL: "",
        OPENAI_MODEL_CHAT: "",
        OPENAI_MODEL_FAST: "",
        ENCRYPTION_KEY: "",
        TELEGRAM_API_ID: "",
        TELEGRAM_API_HASH: "",
        TELEGRAM_PROXY_IP: "",
        TELEGRAM_PROXY_PORT: "",
        VK_CLIENT_ID: "",
        VK_CLIENT_SECRET: "",
        BACKEND_URL: ""
      }
    }
  ]
};
