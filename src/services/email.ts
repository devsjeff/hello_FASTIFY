import nodemailer from "nodemailer";
import { env } from "../config/env.ts";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.email,
    pass: env.emailPassword,
  },
});

export async function sendEmailOtp(to: string, otp: string) {
  await transporter.sendMail({
    from: env.email,
    to,
    subject: "Your OTP",
    text: `Your OTP is ${otp}`,
  });
}
