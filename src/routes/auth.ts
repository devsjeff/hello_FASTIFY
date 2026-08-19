import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendOtp, verifyOtp } from "../services/otp.ts";
import {
  createAccessToken,
  createOrUpdateUser,
  verifyPassword,
} from "../services/auth.ts";

type EmailBody = {
  email: string;
};

type VerifyOtpBody = {
  email: string;
  password: string;
  otp: number;
};

type LoginBody = {
  email: string;
  password: string;
};

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/get-otp",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "1 minute",
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: EmailBody }>,
      reply: FastifyReply
    ) => {
      const { email } = request.body;

      if (!email) {
        return reply.status(400).send({
          error: "Email is required",
        });
      }

      try {
        await sendOtp(email);

        return reply.status(200).send({
          message: "OTP sent successfully",
        });
      } catch (error) {
        request.log.error(error, "Failed to send OTP");

        return reply.status(500).send({
          error: "Failed to send OTP",
        });
      }
    }
  );

  app.post(
    "/verify-otp",
    async (
      request: FastifyRequest<{ Body: VerifyOtpBody }>,
      reply: FastifyReply
    ) => {
      const { email, otp, password } = request.body;

      if (!email || otp == null || !password) {
        return reply.status(400).send({
          error: "Email OTP and password are required",
        });
      }

      try {
        const isValid = await verifyOtp(email, String(otp));

        if (!isValid) {
          return reply.status(401).send({
            error: "Invalid or expired OTP",
          });
        }

        await createOrUpdateUser(email, password);

        const token = createAccessToken(email);

        return reply
          .status(200)
          .header("token", token)
          .send({
            status: "verified",
          });
      } catch (error) {
        request.log.error(error, "OTP verification failed");

        return reply.status(500).send({
          error: "Verification failed",
        });
      }
    }
  );

  app.post(
    "/login",
    async (
      request: FastifyRequest<{ Body: LoginBody }>,
      reply: FastifyReply
    ) => {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.status(400).send({
          error: "Email and password are required",
        });
      }

      try {
        const isValid = await verifyPassword(email, password);

        if (!isValid) {
          return reply.status(401).send({
            error: "Invalid email or password",
          });
        }

        const token = createAccessToken(email);

        return reply
          .status(200)
          .header("token", token)
          .send({
            message: "Login successful",
          });
      } catch (error) {
        request.log.error(error, "Login failed");

        return reply.status(500).send({
          error: "Login failed",
        });
      }
    }
  );
}
