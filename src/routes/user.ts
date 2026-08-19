import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  getEmailFromToken,
  verifyAccessToken,
} from "../services/auth.ts";
import { findUserByEmail } from "../db/users.ts";

type AuthHeaders = {
  token: string;
};

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/data",
    async (
      request: FastifyRequest<{ Headers: AuthHeaders }>,
      reply: FastifyReply
    ) => {
      const token = request.headers.token;

      if (!token) {
        return reply.status(401).send({
          error: "Token is required",
        });
      }

      try {
        if (!verifyAccessToken(token)) {
          return reply.status(401).send({
            error: "Invalid or expired token",
          });
        }

        const email = getEmailFromToken(token);
        const user = await findUserByEmail(email);

        if (!user) {
          return reply.status(404).send({
            error: "User not found",
          });
        }

        return reply.status(200).send({
          data: user.data,
        });
      } catch (error) {
        request.log.error(error, "Failed to get user data");

        return reply.status(500).send({
          error: "Failed to get user data",
        });
      }
    }
  );
}
