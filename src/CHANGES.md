# What changed

This file explains the structure so you can learn what each part is doing

## 1 app.ts

This creates the Fastify application

It registers plugins and routes

The server itself is not started here

This separation makes the app easier to test and reuse

## 2 server.ts

This is the entry point

It starts the application

It connects PostgreSQL and Redis before accepting requests

It also handles graceful shutdown

Graceful shutdown means the app closes its connections properly instead of just killing the process

## 3 routes

Routes contain HTTP related code

auth.ts contains

POST /get-otp

POST /verify-otp

POST /login

user.ts contains

GET /data

The route receives the request validates input calls a service and sends the HTTP response

## 4 services

Services contain application logic

auth.ts handles

password hashing

password verification

JWT creation

JWT verification

otp.ts handles

OTP generation

Redis storage

OTP verification

OTP deletion after successful verification

email.ts handles email sending

The route does not need to know how these things work internally

## 5 db

db/index.ts creates the PostgreSQL connection

db/users.ts contains queries related to users

db/init.ts currently creates the users table when the application starts

For a real production project you would normally use migrations instead of CREATE TABLE IF NOT EXISTS during startup

## 6 config

config/env.ts loads environment variables and checks that required values exist

This means configuration is handled in one place

## 7 rate limiting

The global rate limit is registered in app.ts

The OTP route has a stricter limit

Global

6 requests per minute

OTP

3 requests per minute

This is useful because OTP endpoints are expensive and can be abused

## 8 naming changes

Old

CreateUser

New

createOrUpdateUser

The new name explains what the function actually does

Old

Create_JWT_token

New

createAccessToken

Old

Verify_JWT_token

New

verifyAccessToken

Old

GetUser

New

findUserByEmail

Old

Send_OTP

New

sendOtp

The project now follows normal TypeScript camelCase naming

## 9 important learning idea

Think about the request like this

route
  ↓
service
  ↓
database or external service

For example login

POST /login
  ↓
auth route
  ↓
verifyPassword
  ↓
findUserByEmail
  ↓
PostgreSQL

The route handles HTTP

The service handles business logic

The database file handles SQL

This separation is the main reason the code is easier to maintain
