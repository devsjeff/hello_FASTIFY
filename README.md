# Fastify Auth API

A small authentication API built with Fastify and TypeScript

It supports email OTP verification password login JWT authentication Redis and PostgreSQL

## Flow

User requests an OTP

The OTP is stored in Redis for 5 minutes and sent by email

The user sends the OTP and password

The OTP is verified and the password is hashed with Argon2

The user is created or the existing users password is updated

A JWT access token is returned in the response header

The login route verifies the password and returns a new JWT

The data route verifies the JWT before returning user data

## Routes

POST /get-otp

POST /verify-otp

POST /login

GET /data

## Run

npm install

Copy .env.example to .env and add your values

Start with your existing npm dev script

The default server port is 3000
