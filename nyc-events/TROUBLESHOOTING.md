# NYC Events – Troubleshooting

## "Inserted: 0, Skipped: 29" when running the scraper

This usually means one of two things:

### 1. Your database is missing new columns

The scraper sends `venue` and `image_url`. If your Neon `events` table was created before those were added, the API INSERT will fail (500) and the scraper counts that as "skipped".

**Fix:** In Neon (SQL Editor or your DB client), run:

```sql
alter table events add column if not exists venue text;
alter table events add column if not exists image_url text;
create index if not exists events_venue_idx on events (venue);
```

Then run the scraper again.

### 2. The Vercel API is using a different database

"Skipped (duplicate)" means the API successfully saw the row already exists (same `link`). So the database that **Vercel** uses (via `POSTGRES_URL` / `DATABASE_URL`) already has those events. If the database you open in Neon shows **0 rows**, you’re likely looking at a different Neon project or connection.

**Fix:** In Vercel → Project → Settings → Environment Variables, check `POSTGRES_URL` (or `DATABASE_URL`). It must be the **connection string** for the same Neon database where you see (or want) your events. Copy it from Neon: Dashboard → your project → Connection string.

---

## Frontend shows "Demo mode – 2 event(s)"

The app switches to demo data when `fetch(/api/events)` fails (network error or non-OK response).

**Causes and fixes:**

1. **Wrong or missing API URL**  
   In `nyc-events/events.js`, `EVENTS_API_URL` must be your Vercel app URL (e.g. `https://your-project.vercel.app`) with no trailing slash. The page must be loaded from that same origin or a permitted one (e.g. GitHub Pages or Vercel), not as `file://`.

2. **API or DB error**  
   If the serverless function or DB fails, the request fails and the app shows demo mode. Check Vercel → Project → Logs (or Functions) for errors. Ensure the same Neon DB has the columns above and that `POSTGRES_URL` is set in Vercel.

3. **CORS**  
   The API sends `Access-Control-Allow-Origin: *`. If you host the frontend on another domain, the browser should still allow the request. If you see a CORS error in the browser console, the response may be an error (e.g. 500) without CORS headers; fixing the API/DB usually fixes this.

---

## Quick checklist

- [ ] Neon: `events` table has columns `venue`, `image_url` (run the `alter table` above).
- [ ] Vercel: `POSTGRES_URL` (or `DATABASE_URL`) is the connection string for **that** Neon DB.
- [ ] Frontend: `EVENTS_API_URL` in `nyc-events/events.js` is your Vercel URL; page is served over HTTPS (e.g. GitHub Pages / Vercel), not `file://`.
- [ ] After changing env vars, redeploy the Vercel project and re-run the scraper.
