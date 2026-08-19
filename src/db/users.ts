import { sql } from "./index.ts";

export async function upsertUser(email: string, passwordHash: string) {
  const [user] = await sql`
    INSERT INTO users (email, password)
    VALUES (${email}, ${passwordHash})
    ON CONFLICT (email)
    DO UPDATE SET password = EXCLUDED.password
    RETURNING id, email, password, data
  `;

  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await sql`
    SELECT id, email, password, data
    FROM users
    WHERE email = ${email}
  `;

  return user;
}
