import Fastify, {type FastifyRequest,type FastifyReply,} from "fastify";
import rateLimit from "@fastify/rate-limit";

import {Send_OTP,Verify_OTP,Verify_pass,CreateUser,Create_JWT_token,Verify_JWT_token,GetUser,Get_email,} from "./utility.ts";

const app = Fastify({
  logger: true,
});

await app.register(rateLimit, {max: 6 , timeWindow: "1 minute"});

app.post(
  "/get_otp",  {config: {rateLimit: {max: 3,timeWindow: "1 minute"}}},   //custom rate limiting for OTP ROUTE
  async (
    request: FastifyRequest<{
      Body: {
        email: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { email } = request.body;

    // Validate input
    if (!email) {
      return reply.status(400).send({
        error: "Email is required",
      });
    }

    try {
      await Send_OTP(email);

      return reply.status(200).send({
        message: "OTP sent successfully",
      });
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to send OTP",
      });
    }
  }
);




app.post("/Make_TokenOrReset",
          async (
            request: FastifyRequest<{
              Body: {
                email: string;
                password: string;
                otp: number;
              };
            }>,
            reply: FastifyReply
          ) => {
            const { email, otp, password } = request.body;

            // Validate input
            if (!email || otp == null || !password) {
              return reply.status(400).send({
                error: "Email, OTP and password are required",
              });
            }

            try {
              const isValid = await Verify_OTP(email, otp);

              if (!isValid) {
                return reply.status(401).send({
                  error: "Invalid or expired OTP",
                });
              }


              await CreateUser(email, password);
              const TOKEN = await Create_JWT_token(email);
              return reply
                .status(200)
                .header("token", TOKEN)
                .send({
                  status: "verified",
                });

            } catch (error) {
              app.log.error(error);

              return reply.status(500).send({
                error: "Verification failed",
              });
            }
          }
        );




app.post("/login",
                    async (
                      request: FastifyRequest<{
                        Body: {
                          email: string;
                          password: string;
                        };
                      }>,
                      reply: FastifyReply
                    ) => {
                      const { email, password } = request.body;

                      if (!email || !password) {
                        return reply.status(400).send({
                          error: "Email and password are required",
                        });
                      }

                      try {
                        const isValid = await Verify_pass(email, password);

                        if (!isValid) {
                          return reply.status(401).send({
                            error: "Invalid email or password",
                          });
                        }

                        // Create JWT
                        const TOKEN = await Create_JWT_token(email);

                        return reply
                          .status(200)
                          .header("token", TOKEN)
                          .send({
                            response: "Login DONE",
                          });

                      } catch (error) {
                        app.log.error(error);

                        return reply.status(500).send({
                          error: "Login failed",
                        });
                      }
                    }
                  );



app.get("/getData",
          async (
            request: FastifyRequest<{
              Headers: {
                token: string;
              };
            }>,
            reply: FastifyReply
          ) => {

            const token = request.headers.token;

            if (!token) {
              return reply.status(401).send({
                error: "Token is required",
              });
            }

            try {
              const isValid = await Verify_JWT_token(token);

              if (!isValid) {
                return reply.status(401).send({
                  error: "Invalid or expired token",
                });
              }

              const email = await Get_email(token);

              if (!email) {
                return reply.status(401).send({
                  error: "Invalid token payload",
                });
              }

              const user = await GetUser(email);

              if (!user) {
                return reply.status(404).send({
                  error: "User not found",
                });
              }

              return reply.status(200).send({
                data: user.data,
              });

            } catch (error) {
              app.log.error(error);

              return reply.status(500).send({
                error: "Failed to get user data",
              });
            }
          }
        );



app.listen(
  {
    port: 3000,
  },
  (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }

    console.log("Server started on http://localhost:3000");
  }
);