# NYC Events Scrapers

Scrapers POST events to your **Vercel API** (`/api/events`). See repo root **NYC_EVENTS_SETUP.md** for Vercel + Neon setup.

## Testing the scraper & API

### 1. Dry run (scraper only, no API)

Scrape Dice.fm and print events without pushing (no credentials needed):

```bash
cd scrapers
npm install
DRY_RUN=1 node dice-nyc.js
```

### 2. Test the API (Vercel + DB)

**Prerequisites:** Vercel project deployed, Neon (or Postgres) connected, and `vercel-events-schema.sql` run in the DB.

**A. List events (curl)**

```bash
curl -s "https://your-project.vercel.app/api/events"
```

**B. Run scraper and then check**

```bash
cd scrapers
npm install
EVENTS_API_URL=https://your-project.vercel.app node run.js
```

Then open **nyc-events/** on your site or run the curl above to see rows.

**C. Quick test script**

```bash
EVENTS_API_URL=https://your-project.vercel.app node test-db.js
```

This fetches from `GET /api/events` and prints count + sample rows.
