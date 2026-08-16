export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || "Admin123",
  corsOrigins: (process.env.CORS_ORIGINS || "https://3bdduo-bit.github.io,http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
});
