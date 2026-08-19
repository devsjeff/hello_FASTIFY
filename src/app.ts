import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.ts";
import { userRoutes } from "./routes/user.ts";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Global limit: 6 requests per minute per client
  await app.register(rateLimit, {
    max: 6,
    timeWindow: "1 minute",
  });

  await app.register(authRoutes);
  await app.register(userRoutes);

  return app;
}
