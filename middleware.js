// middleware.js
import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const ADMIN_API = [
  "/api/editors",
  "/api/articles/assign",
  "/api/articles/unassign",
  "/api/admin",
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 1) Public pages
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return NextResponse.next();
  }

  // 2) Must be authenticated
  const token = req.cookies.get("auth")?.value;
  if (!token) {
    // For pages, redirect. For APIs, return JSON 401.
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let decoded;
  try {
    decoded = verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.user = decoded;
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3) If this is an admin‑only API, you must be isAdmin
  if (pathname.startsWith("/api")) {
    // find any admin path that matches the start of pathname
    const isAdminApi = ADMIN_API.some((p) => pathname.startsWith(p));
    if (isAdminApi && !decoded.isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  // 4) All good
  return NextResponse.next();
}

export const config = {
  // run on everything except your public assets (adjust as needed)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
