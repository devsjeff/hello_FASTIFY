
> **`server.ts` starts everything → `app.ts` builds Fastify → routes receive HTTP requests → services contain logic → DB/Redis/email do the actual external work.**

Here is a beginner-friendly README-style architecture for **this exact project**.

# Fastify Auth API — Architecture & README

A small authentication API built with **Fastify + TypeScript + PostgreSQL + Redis + JWT + Argon2 + Nodemailer**.

The project is structured so that HTTP routes, business logic, database code, configuration, and external services are separated.

---

## 1. What this project does

The API provides:

* Email OTP generation
* OTP storage in Redis
* OTP email sending through Gmail
* Password hashing with Argon2
* User creation/update in PostgreSQL
* Login with email + password
* JWT access-token generation
* Protected `/data` route
* Rate limiting
* Graceful shutdown

### Available routes

| Method | Route         | Purpose                           |
| ------ | ------------- | --------------------------------- |
| POST   | `/get-otp`    | Generate and send OTP             |
| POST   | `/verify-otp` | Verify OTP and create/update user |
| POST   | `/login`      | Login with email/password         |
| GET    | `/data`       | Get protected user data           |

---

# 2. Project architecture

```text
fastify-auth-structured/
│
├── .env.example
├── README.md
│
└── src/
    │
    ├── server.ts
    ├── app.ts
    │
    ├── config/
    │   └── env.ts
    │
    ├── routes/
    │   ├── auth.ts
    │   └── user.ts
    │
    ├── services/
    │   ├── auth.ts
    │   ├── otp.ts
    │   └── email.ts
    │
    └── db/
        ├── index.ts
        ├── users.ts
        └── init.ts
```

The important mental model is:

```text
                 server.ts
                     │
                     ▼
                  app.ts
                     │
             registers routes
              ┌──────┴──────┐
              ▼             ▼
          auth.ts        user.ts
          routes          routes
              │             │
              ▼             ▼
          services       services
          ┌────┼────┐       │
          ▼    ▼    ▼       ▼
        Redis Auth Email   PostgreSQL
              │
              ▼
          PostgreSQL
```

---

# 3. The most important concept

Think of the application as different layers.

```text
HTTP layer
    ↓
Routes
    ↓
Business/application logic
    ↓
Database / Redis / Email
```

Each layer has a job.

### Routes

Routes answer:

> "What should happen when somebody sends `POST /login`?"

### Services

Services answer:

> "How exactly do we verify a password or generate a JWT?"

### Database

Database code answers:

> "How do I read/write the user in PostgreSQL?"

### Redis

Redis code answers:

> "Where do I temporarily store the OTP?"

This separation prevents one giant file containing everything.

---

# 4. `server.ts` — the entry point

This is where the application actually starts.

```ts
async function start() {
  const app = await buildApp();

  await initializeDatabase();
  await connectRedis();

  await app.listen({
    port: env.port,
    host: "0.0.0.0",
  });
}

start();
```

Think:

```text
server.ts
   │
   ├── build Fastify app
   ├── connect PostgreSQL
   ├── connect Redis
   └── start HTTP server
```

So `server.ts` is basically the **startup manager**.

It does NOT contain your routes.

---

# 5. `app.ts` — building the Fastify application

This is where your Fastify application is created.

```ts
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";

import { authRoutes } from "./routes/auth.ts";
import { userRoutes } from "./routes/user.ts";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(rateLimit, {
    max: 6,
    timeWindow: "1 minute",
  });

  await app.register(authRoutes);
  await app.register(userRoutes);

  return app;
}
```

This is the part you were asking about.

## What is happening?

First:

```ts
import { authRoutes } from "./routes/auth.ts";
```

This imports the function:

```ts
authRoutes
```

from:

```text
src/routes/auth.ts
```

Then:

```ts
import { userRoutes } from "./routes/user.ts";
```

imports:

```ts
userRoutes
```

Then:

```ts
await app.register(authRoutes);
```

means:

> "Fastify, execute/register this route plugin against this Fastify application."

And:

```ts
await app.register(userRoutes);
```

does the same for the user routes.

---

# 6. What exactly is `app.register()`?

This is an extremely important Fastify concept.

Your route file contains:

```ts
export async function authRoutes(app: FastifyInstance) {
  app.post("/get-otp", ...);

  app.post("/verify-otp", ...);

  app.post("/login", ...);
}
```

Notice that `authRoutes` is simply a function.

It receives:

```ts
app
```

which is the Fastify instance.

Then it uses that instance:

```ts
app.post(...)
app.post(...)
app.post(...)
```

When you write:

```ts
await app.register(authRoutes);
```

Fastify essentially gives your function the Fastify application.

Conceptually:

```ts
authRoutes(app);
```

although Fastify's `register()` also provides its plugin system, encapsulation, lifecycle handling, etc.

So mentally:

```text
app.register(authRoutes)

        ↓

authRoutes(app)

        ↓

app.post("/get-otp")
app.post("/verify-otp")
app.post("/login")
```

That is the key idea.

---

# 7. `routes/auth.ts`

This file contains authentication-related HTTP routes.

```ts
export async function authRoutes(app: FastifyInstance) {
```

This is a **route plugin function**.

It receives the Fastify instance.

Then:

```ts
app.post("/get-otp", ...)
```

registers the route.

```ts
app.post("/verify-otp", ...)
```

registers another route.

```ts
app.post("/login", ...)
```

registers another route.

So this:

```text
auth.ts
```

becomes:

```text
POST /get-otp
POST /verify-otp
POST /login
```

after:

```ts
app.register(authRoutes)
```

---

# 8. What happens when `/login` is called?

Suppose the frontend sends:

```http
POST /login
```

with:

```json
{
  "email": "dev@example.com",
  "password": "hello123"
}
```

Fastify finds:

```ts
app.post("/login", ...)
```

and executes the handler.

The route does:

```ts
const { email, password } = request.body;
```

Then:

```ts
const isValid = await verifyPassword(email, password);
```

Notice something important.

The route does NOT directly perform Argon2.

Instead, it calls:

```ts
verifyPassword()
```

from:

```text
services/auth.ts
```

This is separation of responsibility.

---

# 9. `services/auth.ts`

This file contains authentication/business logic.

It handles:

```text
password hashing
password verification
JWT creation
JWT verification
JWT payload extraction
```

For example:

```ts
export async function verifyPassword(
  email: string,
  password: string
): Promise<boolean> {
```

It finds the user:

```ts
const user = await findUserByEmail(email);
```

Then verifies the password:

```ts
return argon2.verify(user.password, password);
```

So the flow is:

```text
/login route
     ↓
verifyPassword()
     ↓
findUserByEmail()
     ↓
PostgreSQL
     ↓
stored password hash
     ↓
Argon2 verifies password
```

---

# 10. Why not put Argon2 directly inside the route?

You technically could.

But imagine 10 different routes need password verification.

Without services:

```text
route 1 → Argon2
route 2 → Argon2
route 3 → Argon2
route 4 → Argon2
```

Now authentication logic is duplicated.

With services:

```text
route 1 ─┐
route 2 ─┼──→ verifyPassword()
route 3 ─┤
route 4 ─┘
```

One place contains the actual logic.

---

# 11. `services/otp.ts`

This file manages OTPs.

It uses Redis.

The flow is:

```text
generate OTP
     ↓
store OTP in Redis
     ↓
send OTP through email
```

The OTP is generated with:

```ts
crypto.randomInt(100000, 1000000)
```

This creates a six-digit number.

For example:

```text
483921
```

Then:

```ts
await redis.set(email, otp, { EX: 300 });
```

means:

```text
key   = user's email
value = OTP
expiry = 300 seconds
```

So Redis might conceptually contain:

```text
dev@example.com → 483921
```

After five minutes Redis automatically removes it.

---

# 12. OTP verification

When the user submits:

```json
{
  "email": "dev@example.com",
  "otp": 483921
}
```

the code does:

```ts
const storedOtp = await redis.get(email);
```

Then:

```ts
const isValid = storedOtp === otp;
```

If valid:

```ts
await redis.del(email);
```

This makes the OTP **one-time use**.

The flow is:

```text
User enters OTP
      ↓
Redis lookup
      ↓
Does OTP exist?
      ↓
Does it match?
      ↓
YES
 ↓
Delete OTP
 ↓
Continue
```

---

# 13. `services/email.ts`

This file is responsible only for email sending.

It creates a Nodemailer transporter:

```ts
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.email,
    pass: env.emailPassword,
  },
});
```

Then:

```ts
sendEmailOtp(email, otp)
```

sends the email.

This means the OTP service doesn't need to understand SMTP.

It simply says:

```ts
await sendEmailOtp(email, otp);
```

So:

```text
otp.ts
   ↓
email.ts
   ↓
Nodemailer
   ↓
Gmail SMTP
   ↓
User's inbox
```

---

# 14. `db/index.ts`

This creates the PostgreSQL connection.

```ts
export const sql = postgres(env.databaseUrl);
```

This `sql` object is then imported by database files.

For example:

```ts
import { sql } from "./index.ts";
```

Think:

```text
db/index.ts
     ↓
PostgreSQL connection
     ↓
db/users.ts
```

---

# 15. `db/users.ts`

This file contains user-related SQL.

For example:

```ts
export async function findUserByEmail(email: string) {
```

runs:

```sql
SELECT id, email, password, data
FROM users
WHERE email = ...
```

Another function:

```ts
upsertUser()
```

creates or updates a user.

The important concept:

> `users.ts` knows SQL. Routes should not need to know SQL.

So:

```text
route
 ↓
service
 ↓
users.ts
 ↓
PostgreSQL
```

---

# 16. What does `upsert` mean?

This function:

```ts
upsertUser()
```

uses:

```sql
ON CONFLICT (email)
DO UPDATE
```

Meaning:

```text
Does this email already exist?

NO
 ↓
INSERT user

YES
 ↓
UPDATE password
```

So one function handles both cases.

---

# 17. `db/init.ts`

This creates the table when the server starts.

```ts
CREATE TABLE IF NOT EXISTS users (...)
```

The table looks roughly like:

```text
users
--------------------------------
id        SERIAL PRIMARY KEY
email     VARCHAR(255) UNIQUE
password  VARCHAR(255)
data      VARCHAR(255)
```

During startup:

```ts
await initializeDatabase();
```

creates the table if it doesn't already exist.

For learning this is convenient.

For a serious production application, database migrations are normally preferable.

---

# 18. `config/env.ts`

This is the configuration layer.

It loads:

```ts
import "dotenv/config";
```

which reads `.env`.

Then:

```ts
process.env.DATABASE_URL
process.env.SECRET_KEY
process.env.EMAIL
process.env.PASSWORD
```

are converted into one object:

```ts
export const env = {
  port: ...,
  databaseUrl: ...,
  jwtSecret: ...,
  email: ...,
  emailPassword: ...,
};
```

Now the rest of the application can simply use:

```ts
env.databaseUrl
env.jwtSecret
env.email
```

instead of repeatedly accessing:

```ts
process.env.SOMETHING
```

---

# 19. Complete startup flow

When you run the application:

```text
npm run dev
```

the process eventually reaches:

```text
server.ts
```

Then:

```text
start()
  │
  ├── buildApp()
  │      │
  │      ├── Fastify()
  │      ├── register rate-limit
  │      ├── register authRoutes
  │      └── register userRoutes
  │
  ├── initializeDatabase()
  │
  ├── connectRedis()
  │
  └── app.listen()
```

At this point:

```text
SERVER IS LISTENING
```

---

# 20. Complete `/get-otp` flow

User calls:

```http
POST /get-otp
```

with:

```json
{
  "email": "dev@example.com"
}
```

Flow:

```text
Browser / frontend
        │
        ▼
Fastify
        │
        ▼
POST /get-otp
        │
        ▼
auth.ts
        │
        ▼
sendOtp()
        │
        ├──────────→ Redis
        │              │
        │              └── stores OTP for 5 minutes
        │
        └──────────→ email.ts
                       │
                       ▼
                    Nodemailer
                       │
                       ▼
                     Gmail
                       │
                       ▼
                    User email
```

---

# 21. Complete `/verify-otp` flow

```text
POST /verify-otp
        │
        ▼
auth.ts
        │
        ▼
verifyOtp()
        │
        ▼
Redis
        │
        ▼
OTP valid?
        │
       YES
        │
        ▼
createOrUpdateUser()
        │
        ├── Argon2 hashes password
        │
        ▼
upsertUser()
        │
        ▼
PostgreSQL
        │
        ▼
createAccessToken()
        │
        ▼
JWT
        │
        ▼
HTTP response
```

---

# 22. Complete `/login` flow

```text
POST /login
     │
     ▼
auth.ts
     │
     ▼
verifyPassword()
     │
     ▼
findUserByEmail()
     │
     ▼
PostgreSQL
     │
     ▼
get stored password hash
     │
     ▼
Argon2.verify()
     │
     ▼
Password correct?
     │
    YES
     │
     ▼
createAccessToken()
     │
     ▼
JWT
     │
     ▼
response header
```

---

# 23. Complete `/data` flow

`/data` is protected by a JWT.

The client sends:

```http
GET /data
token: <JWT>
```

Then:

```text
GET /data
   │
   ▼
user.ts
   │
   ▼
verifyAccessToken()
   │
   ▼
JWT valid?
   │
  YES
   │
   ▼
getEmailFromToken()
   │
   ▼
findUserByEmail()
   │
   ▼
PostgreSQL
   │
   ▼
return user data
```

---

# 24. Why JWT is used

JWT is a token representing authentication information.

This project creates one with:

```ts
jwt.sign(
  { email },
  env.jwtSecret,
  {
    expiresIn: "1h",
  }
);
```

Conceptually:

```text
email
  +
secret key
  ↓
JWT
```

The client then sends the JWT with future requests.

The server verifies it using the same secret.

```text
Client
  │
  │ token
  ▼
Server
  │
  ▼
verify JWT
  │
  ▼
valid?
```

---

# 25. Rate limiting

The application has a global limit:

```ts
max: 6,
timeWindow: "1 minute"
```

So by default a client can make:

```text
6 requests / minute
```

The OTP endpoint is stricter:

```ts
max: 3,
timeWindow: "1 minute"
```

This is important because somebody could otherwise repeatedly request OTP emails.

The architecture is:

```text
Request
   ↓
Rate limiter
   ↓
Route
```

---

# 26. Graceful shutdown

`server.ts` has:

```ts
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

When the application receives a shutdown signal:

```text
shutdown()
   │
   ├── app.close()
   ├── closeRedis()
   ├── closeDatabase()
   └── process.exit()
```

This is called **graceful shutdown**.

Instead of suddenly killing everything, the application gets a chance to close resources properly.

---

# 27. Why `server.ts` and `app.ts` are separate

You might ask:

> Why not just put everything in `server.ts`?

You could, especially for a tiny application.

But separating them gives:

```text
app.ts
 ↓
build application

server.ts
 ↓
start application
```

This becomes useful for testing.

For example, tests can do:

```ts
const app = await buildApp();
```

without necessarily starting the real network server.

So:

```text
app.ts  = WHAT the application contains

server.ts = START the application
```

---

# 28. The dependency direction

The project generally follows:

```text
server
  ↓
app
  ↓
routes
  ↓
services
  ↓
database/external services
```

More specifically:

```text
server.ts
    ↓
app.ts
    ↓
routes/
    ↓
services/
    ↓
db/
```

And external systems are:

```text
PostgreSQL
Redis
Gmail
```

---

# 29. What each folder means

```text
src/
│
├── server.ts
│   └── Starts the application
│
├── app.ts
│   └── Builds Fastify and registers plugins/routes
│
├── routes/
│   └── HTTP endpoints
│
├── services/
│   └── Business/application logic
│
├── db/
│   └── PostgreSQL connection and SQL queries
│
└── config/
    └── Environment/configuration
```

Simple rule:

```text
routes   = HTTP
services = logic
db       = SQL
config   = settings
server   = startup
app      = application assembly
```

---

# 30. The most important code pattern to remember

Your project uses this pattern:

```ts
// routes/auth.ts

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    // ...
  });
}
```

Then:

```ts
// app.ts

import { authRoutes } from "./routes/auth.ts";

await app.register(authRoutes);
```

This is basically:

```text
Create route plugin
        ↓
Export it
        ↓
Import it into app.ts
        ↓
Register it with Fastify
        ↓
Fastify now knows those routes
```

That is the central Fastify architecture in this project.

---

# 31. One request from beginning to end

Let's take:

```http
POST /login
```

The entire journey is:

```text
                     USER
                      │
                      ▼
              HTTP POST /login
                      │
                      ▼
                 Fastify app
                      │
                      ▼
              authRoutes plugin
                      │
                      ▼
                /login handler
                      │
                      ▼
             verifyPassword()
                      │
                      ▼
             findUserByEmail()
                      │
                      ▼
                 PostgreSQL
                      │
                      ▼
              password hash
                      │
                      ▼
               Argon2.verify()
                      │
                      ▼
              password correct
                      │
                      ▼
            createAccessToken()
                      │
                      ▼
                    JWT
                      │
                      ▼
                HTTP response
                      │
                      ▼
                     USER
```

This is the architecture you should keep in your head.

---

# 32. Common beginner mistake

Don't think:

```text
route = entire feature
```

Instead:

```text
route
  ↓
service
  ↓
database/external service
```

For example, don't make `/login` contain:

```text
SQL
Argon2
JWT
email
Redis
HTTP response
```

all inside one function.

Instead:

```ts
// route
await verifyPassword(...)
```

and:

```ts
// service
argon2.verify(...)
```

and:

```ts
// database
findUserByEmail(...)
```

Each piece has one main responsibility.

---

# 33. Final mental model

If you remember only this, remember:

```text
server.ts
   │
   │ starts everything
   ▼
app.ts
   │
   │ registers things
   ▼
routes/
   │
   │ handles HTTP request/response
   ▼
services/
   │
   │ performs application logic
   ▼
db/
   │
   │ talks SQL
   ▼
PostgreSQL
```

And for external services:

```text
services/otp.ts
      │
      ├── Redis
      │
      └── email.ts
             │
             └── Gmail
```

So the entire project can be remembered as:

> **`server.ts` starts → `app.ts` assembles → routes handle HTTP → services perform logic → DB/Redis/email perform external work.**

That is the main architecture behind this Fastify project.
