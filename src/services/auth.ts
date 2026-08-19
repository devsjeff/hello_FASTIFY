import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";
import { findUserByEmail, upsertUser } from "../db/users.ts";

export async function createOrUpdateUser(email: string, password: string) {
  const passwordHash = await argon2.hash(password);

  return upsertUser(email, passwordHash);
}

export async function verifyPassword(
  email: string,
  password: string
): Promise<boolean> {
  const user = await findUserByEmail(email);

  if (!user) {
    return false;
  }

  return argon2.verify(user.password, password);
}

export function createAccessToken(email: string): string {
  return jwt.sign({ email }, env.jwtSecret, {
    expiresIn: "1h",
  });
}

export function verifyAccessToken(token: string): boolean {
  try {
    jwt.verify(token, env.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

export function getEmailFromToken(token: string): string {
  const payload = jwt.verify(token, env.jwtSecret);

  if (typeof payload === "string" || !("email" in payload)) {
    throw new Error("Invalid JWT payload");
  }

  return payload.email as string;
}
