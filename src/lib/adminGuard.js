// lib/adminGuard.js
import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

function decodeToken(req) {
  const token = req.cookies.get("auth")?.value;
  if (!token) return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };

  try {
    const payload = verify(token, process.env.JWT_SECRET || "your-secret-key");
    return { payload };
  } catch {
    return { error: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
  }
}

export function requireAdmin(req) {
  const { payload, error } = decodeToken(req);
  if (error) return error;

  if (!payload.isAdmin && payload.role !== "editor") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return payload;
}

/**
 * Returns the JWT payload if the user is an admin, editor, or researcher.
 * Researcher role is included for trial-related endpoints; route-level checks
 * should additionally verify the specific assignment if needed.
 */
export function requireResearcherOrAdmin(req) {
  const { payload, error } = decodeToken(req);
  if (error) return error;

  if (!payload.isAdmin && payload.role !== "editor" && payload.role !== "researcher") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return payload;
}
