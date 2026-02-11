/**
 * NYC Events API – Vercel serverless (GET list, POST insert, DELETE by id).
 * Needs POSTGRES_URL or DATABASE_URL (e.g. from Vercel + Neon).
 */
const { neon } = require("@neondatabase/serverless");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function cors(res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  return res;
}

function getConn() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Missing POSTGRES_URL or DATABASE_URL");
  return neon(url);
}

async function handleGet(sql, query) {
  const includePast = query && (query.past === "1" || query.past === "true");
  const today = new Date().toISOString().slice(0, 10);
  if (includePast) {
    const rows = await sql`SELECT id, title, date, time, address, neighborhood, venue, image_url, price, link, platform, description, created_at FROM events ORDER BY date ASC`;
    return rows;
  }
  const rows = await sql`SELECT id, title, date, time, address, neighborhood, venue, image_url, price, link, platform, description, created_at FROM events WHERE date >= ${today} ORDER BY date ASC`;
  return rows;
}

async function handlePost(sql, body) {
  const list = Array.isArray(body) ? body : [body];
  const inserted = [];
  for (const ev of list) {
    const title = ev.title || "Event";
    const date = ev.date || new Date().toISOString().slice(0, 10);
    const link = ev.link || "";
    const platform = ev.platform || "Manual";
    if (!link) continue;
    try {
      const row = await sql`
        INSERT INTO events (title, date, time, address, neighborhood, venue, image_url, price, link, platform, description)
        VALUES (${title}, ${date}, ${ev.time || null}, ${ev.address || null}, ${ev.neighborhood || null}, ${ev.venue || null}, ${ev.image_url || null}, ${ev.price || null}, ${link}, ${platform}, ${ev.description || null})
        ON CONFLICT (link) DO UPDATE SET
          title = EXCLUDED.title,
          date = EXCLUDED.date,
          time = COALESCE(EXCLUDED.time, events.time),
          address = COALESCE(EXCLUDED.address, events.address),
          neighborhood = COALESCE(EXCLUDED.neighborhood, events.neighborhood),
          venue = COALESCE(EXCLUDED.venue, events.venue),
          image_url = COALESCE(EXCLUDED.image_url, events.image_url),
          price = COALESCE(EXCLUDED.price, events.price),
          platform = EXCLUDED.platform,
          description = COALESCE(EXCLUDED.description, events.description)
        RETURNING id, title, date, time, address, neighborhood, venue, image_url, price, link, platform, description, created_at
      `;
      if (row && row[0]) inserted.push(row[0]);
    } catch (e) {
      if (e.code !== "23505") throw e; // ignore unique violation
    }
  }
  return inserted;
}

async function handleDelete(sql, id, query) {
  const deletePast = query && (query.past === "1" || query.past === "true");
  if (deletePast) {
    const today = new Date().toISOString().slice(0, 10);
    const out = await sql`DELETE FROM events WHERE date < ${today} RETURNING id`;
    return { deleted: out.length };
  }
  if (!id) return { deleted: 0 };
  const out = await sql`DELETE FROM events WHERE id = ${id} RETURNING id`;
  return { deleted: out.length };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    if (req.method === "POST" && req.body) body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (_) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  try {
    const sql = getConn();
    const query = req.query || (req.url && req.url.includes("?") ? Object.fromEntries(new URL(req.url, "http://x").searchParams) : {});

    if (req.method === "GET") {
      const rows = await handleGet(sql, query);
      res.status(200).json(rows);
      return;
    }

    if (req.method === "POST") {
      const inserted = await handlePost(sql, body);
      res.status(200).json(inserted.length === 1 ? inserted[0] : inserted);
      return;
    }

    if (req.method === "DELETE") {
      const id = query.id || (req.url && req.url.includes("id=") ? new URL(req.url, "http://x").searchParams.get("id") : null);
      const result = await handleDelete(sql, id, query);
      res.status(200).json(result);
      return;
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Server error" });
  }
};
