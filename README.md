# Fastify Auth API

A simple authentication API built with Fastify and TypeScript
This project handles user registration and login using email OTP verification
## How it works
When user requests a OTP  6 digit OTP is generated and stored in Redis for 5 minutes
OTP  also sent to the users email
After the OTP is verified the users password is hashed using Argon2 and saved in PostgreSQL
If email already exists the password is updated instead of creating another user
After successful verification a JWT token is created which can be used to access protected routes
Login works by checking the email and password and creating a new JWT token after successful authentication
The protected getData route verifies the JWT and returns the users data

## Tech used
Fastify for the API
TypeScript for the code
PostgreSQL for storing users
Redis for temporary OTP storage
Argon2 for password hashing
JWT for authentication
Nodemailer for sending OTP emails
Fastify rate limit for limiting requests

## API routes
### POST /get_otp                    Send an OTP to an email
### POST /Make_TokenOrReset        Verify the OTP and create or update the user Returns a JWT token after successful verification
### POST /login                  Login with email and password Returns a JWT token
### GET /getData            Protected route that verifies the JWT and returns user data

## Setup

Clone the repository
Install dependencies
npm install
Create a .env file with your database email Redis and JWT settings
Start the server
npm run dev
The API runs on    localhost port 3000
