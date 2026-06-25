// Centralized auth/runtime configuration, read from the environment at call
// time (so tests and the seed migration can vary it). Phase 0 scaffolding: this
// module is introduced before any code consumes it, so the running app is
// unchanged until the auth phase wires it in.

export function authConfig(env = process.env) {
  return {
    jwtSecret: env.JWT_SECRET || "dev-insecure-jwt-secret-change-me",
    refreshSecret: env.REFRESH_SECRET || env.JWT_SECRET || "dev-insecure-refresh-secret-change-me",
    // Long-lived by default so a signed-in user stays logged in until they
    // explicitly log out (set ACCESS_TTL / REFRESH_TTL to shorten for prod).
    accessTtl: env.ACCESS_TTL || "3650d",
    refreshTtl: env.REFRESH_TTL || "3650d",
    bcryptRounds: Number(env.BCRYPT_ROUNDS || 12),
  };
}

// Refuse to boot in production with a weak/absent JWT secret. Called from the
// server's start() so dev, CI and tests (NODE_ENV !== "production") are never
// blocked, while a real deployment fails fast on misconfiguration.
export function assertAuthConfig(env = process.env) {
  if (env.NODE_ENV === "production") {
    const secret = env.JWT_SECRET || "";
    if (secret.length < 16) {
      throw new Error(
        "JWT_SECRET must be set to at least 16 characters in production (set it in your environment or .env).",
      );
    }
  }
}
