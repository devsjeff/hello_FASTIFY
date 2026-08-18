import "dotenv/config";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createClient } from "redis";
import argon2 from "argon2";
import postgres from "postgres";
import jwt from "jsonwebtoken";

const SECRET = process.env.SECRET_KEY!;



const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(process.env.DATABASE_URL!);

// CREATE TABLE
await sql`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    data VARCHAR(255)
  )`;

// INSERT
export async function CreateUser(email: string, password: string) {
  const Hash = await argon2.hash(password);

  const [user] = await sql`
    INSERT INTO users (email, password)
    VALUES (${email}, ${Hash})
    ON CONFLICT (email)
    DO UPDATE SET password = EXCLUDED.password
    RETURNING *
  `;

  return user;
}

// GET
export async function GetUser(email: string) {
  const [user] = await sql`
    SELECT *
    FROM users
    WHERE email = ${email}
  `;

  return user;
}

const redis = createClient();
redis.on("error", (err) => console.error("Redis Client Error", err));
await redis.connect(); // still top-level await, but now error is logged



function OTP() {
  return crypto.randomInt(100000, 1000000);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});





export async function Send_OTP(to: string) {
  const otp = OTP();
  await redis.set(to, otp.toString(), { EX: 300 });
  await transporter.sendMail({
    from: process.env.EMAIL,
    to  , 
    subject: "XYZ_YOUR_APP_NAME OTP",
    text: `OTP is ${otp}`,
  });
}



export async function Verify_OTP(email: string, otp: number): Promise<boolean> {
  const storedOtp = await redis.get(email);
  return storedOtp === otp.toString();
}




export async function Verify_pass(email :string ,password: string , ): Promise<boolean> {
  const User = await GetUser(email)
  const result = await argon2.verify(User.password, password);
  return result;
}


export async function Create_JWT_token(email:string){
  const token = jwt.sign({ email: email },SECRET,{ expiresIn: "1h"});
  return token
}

export async function Verify_JWT_token (token:string){
  try{
      jwt.verify(token, SECRET);
      return true 
  }catch{
    return false 
  };
};

export async function Get_email(token:string){
   const result = jwt.verify(token ,SECRET)
  if (typeof result === "string" || !("email" in result)) {
    throw new Error("Invalid JWT payload");
  }
   return result.email ;
}