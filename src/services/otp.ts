import crypto from "crypto";
import { createClient } from "redis";
import { sendEmailOtp } from "./email.ts";

const redis = createClient();

redis.on("error", (error) => {
  console.error("Redis Client Error", error);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function closeRedis() {
  if (redis.isOpen) {
    await redis.quit();
  }
}

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function sendOtp(email: string) {
  const otp = generateOtp();

  // Store OTP for 5 minutes
  await redis.set(email, otp, { EX: 300 });

  await sendEmailOtp(email, otp);
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const storedOtp = await redis.get(email);

  if (!storedOtp) {
    return false;
  }

  const isValid = storedOtp === otp;

  // One-time use
  if (isValid) {
    await redis.del(email);
  }

  return isValid;
}
