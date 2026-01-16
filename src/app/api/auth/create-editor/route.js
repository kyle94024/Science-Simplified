// app/api/create-editor/route.js
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard"; // or adminGuard you already have

export async function POST(request) {
  // 1) block non‑admins
  const guard = requireAdmin(request);
  if (guard instanceof NextResponse) return guard;

  // 2) pull the new user data + role
  const { firstName, lastName, email, password } = await request.json();
  if (!firstName || !lastName || !email || !password ) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  // 3) hash & insert
  const passwordHash = await bcrypt.hash(password, 10);
  const insertUser = await query(
    `INSERT INTO email_credentials
       (first_name, last_name, email, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, email`,
    [firstName, lastName, email.toLowerCase(), passwordHash, "editor"]
  );
  const userId = insertUser.rows[0].id;

  // 4) profile table
  await query(
    `INSERT INTO profile (user_id, name, email, photo, bio)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, `${firstName} ${lastName}`, email.toLowerCase(), null, null]
  );

  // 5) done—return 201, but **do not** set any cookie
  return NextResponse.json(
    { message: "Editor created", user: { id: userId, email } },
    { status: 201 }
  );
}
