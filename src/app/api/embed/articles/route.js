// Public embed endpoint for partner sites (e.g., Squarespace pages embedding articles).
// - CORS open: any origin can fetch
// - API key gated: clients must send X-API-Key header OR ?key= query param matching EMBED_API_KEY env var
// - Returns only published (certifiedby IS NOT NULL) articles with the full content + certifier snapshot

export const revalidate = 0;

import { query } from "@/lib/db";
import { tenant } from "@/lib/config";

// CORS headers applied to every response
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

function checkApiKey(req) {
  const expected = process.env.EMBED_API_KEY;
  if (!expected) {
    // Refuse to run if no key is configured server-side. Prevents accidental wide-open exposure.
    return { ok: false, error: "EMBED_API_KEY not configured on server" };
  }
  const provided =
    req.headers.get("x-api-key") ||
    new URL(req.url).searchParams.get("key");
  if (!provided || provided !== expected) {
    return { ok: false, error: "Invalid or missing API key" };
  }
  return { ok: true };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req) {
  const auth = checkApiKey(req);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error }),
      { status: 401, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    // Articles in the `article` table are already certified (published).
    // The `pending_article` table holds uncertified drafts which we exclude.
    const result = await query(
      `
      SELECT
        a.id,
        a.title,
        a.summary,
        a.innertext,
        a.tags,
        a.authors,
        a.publication_date,
        a.source_publication,
        a.article_link,
        a.image_url,
        a.image_credit,
        a.audio_url,
        a.certifiedby,
        a.additional_editors,
        p.name        AS certified_by_name,
        p.title       AS certified_by_title,
        p.degree      AS certified_by_degree,
        p.university  AS certified_by_university,
        p.photo       AS certified_by_photo,
        p.linkedin    AS certified_by_linkedin,
        p.lablink     AS certified_by_lablink,
        (SELECT COUNT(*) FROM article_likes al WHERE al.article_id = a.id) AS like_count
      FROM article a
      LEFT JOIN profile p ON (a.certifiedby->>'userId')::INTEGER = p.user_id
      WHERE a.certifiedby IS NOT NULL
      ORDER BY a.publication_date DESC NULLS LAST, a.id DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const totalRes = await query(
      `SELECT COUNT(*)::int AS total FROM article WHERE certifiedby IS NOT NULL`
    );

    const baseUrl = tenant.domain || "";

    const articles = result.rows.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      innertext: a.innertext,
      tags: a.tags || [],
      authors: a.authors || [],
      publication_date: a.publication_date,
      source_publication: a.source_publication,
      article_link: a.article_link,
      image_url: a.image_url,
      image_credit: a.image_credit,
      audio_url: a.audio_url,
      additional_editors: a.additional_editors || [],
      like_count: Number(a.like_count) || 0,
      certified_by: a.certifiedby
        ? {
            name: a.certified_by_name,
            title: a.certified_by_title,
            degree: a.certified_by_degree,
            university: a.certified_by_university,
            photo: a.certified_by_photo,
            linkedin: a.certified_by_linkedin,
            lablink: a.certified_by_lablink,
          }
        : null,
      url: baseUrl ? `${baseUrl}/articles/${a.id}` : `/articles/${a.id}`,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        tenant: tenant.shortName,
        tenant_name: tenant.name,
        tenant_url: baseUrl,
        count: articles.length,
        total: totalRes.rows[0]?.total ?? articles.length,
        limit,
        offset,
        articles,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300",
          ...CORS,
        },
      }
    );
  } catch (err) {
    console.error("EMBED ARTICLES ERROR:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }
}
