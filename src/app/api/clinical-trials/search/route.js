import { NextResponse } from "next/server";
import { semanticSearchTrials } from "@/lib/clinicalTrials/embeddings";

// Simple in-memory rate limiter (per-instance, not perfect but cheap)
const RATE_BUCKET = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

function rateLimitKey(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon"
  );
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = RATE_BUCKET.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }
  entry.count += 1;
  RATE_BUCKET.set(key, entry);
  return entry.count > RATE_MAX;
}

export async function POST(req) {
  const key = rateLimitKey(req);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { query, includeArchived = false, limit = 20 } = body;

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Query must be at least 3 characters" },
        { status: 400 }
      );
    }

    const tenant = process.env.NEXT_PUBLIC_SITE_KEY;
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Missing site tenant" },
        { status: 400 }
      );
    }

    const trials = await semanticSearchTrials(tenant, query, {
      limit: Math.min(limit, 50),
      includeArchived,
    });

    return NextResponse.json({ success: true, trials, count: trials.length });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}
