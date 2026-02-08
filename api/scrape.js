/**
 * POST /api/scrape – run Dice + Eventbrite + CrowdVolt NYC scrapers and insert events into the DB.
 * Called by the "Pull from Dice & Eventbrite" button on the site.
 */
const { neon } = require("@neondatabase/serverless");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { scrapeDiceNy } = require("../scrapers/dice-nyc.js");
    const { scrapeEventbriteNy } = require("../scrapers/eventbrite-nyc.js");
    const { scrapeCrowdvoltNy } = require("../scrapers/crowdvolt-nyc.js");
    const [diceEvents, eventbriteEvents, crowdvoltEvents] = await Promise.all([
      scrapeDiceNy().catch(() => []),
      scrapeEventbriteNy().catch(() => []),
      scrapeCrowdvoltNy().catch(() => [])
    ]);
    const events = [...(diceEvents || []), ...(eventbriteEvents || []), ...(crowdvoltEvents || [])];
    if (events.length === 0) {
      res.status(200).json({ ok: true, scraped: 0, inserted: 0, message: "No events parsed from Dice, Eventbrite, or CrowdVolt." });
      return;
    }

    const sql = getConn();
    let inserted = 0;
    for (const ev of events) {
      const title = ev.title || "Event";
      const date = ev.date || new Date().toISOString().slice(0, 10);
      const link = ev.link || "";
      const platform = ev.platform || "Dice";
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
          RETURNING id
        `;
        if (row && row[0]) inserted++;
      } catch (e) {
        if (e.code !== "23505") throw e;
      }
    }
    res.status(200).json({ ok: true, scraped: events.length, inserted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Scrape failed" });
  }
};
