import { buildApp } from "./app.ts";
import { env } from "./config/env.ts";
import { initializeDatabase } from "./db/init.ts";
import { closeDatabase } from "./db/index.ts";
import { connectRedis, closeRedis } from "./services/otp.ts";

async function start() {
  const app = await buildApp();

  try {
    await initializeDatabase();
    await connectRedis();

    await app.listen({
      port: env.port,
      host: "0.0.0.0",
    });

    app.log.info(`Server running on port ${env.port}`);
  } catch (error) {
    app.log.error(error, "Failed to start server");
    process.exit(1);
  }

  const shutdown = async () => {
    app.log.info("Shutting down");

    await app.close();
    await closeRedis();
    await closeDatabase();

    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
