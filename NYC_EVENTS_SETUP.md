# NYC Events – Setup

The **NYC Events** app shows events in New York City: auto-collected from Dice.fm (and more later) plus events you add manually. It uses **Vercel** (API + serverless) and **Neon** (Postgres) for storage. No Supabase.

---

## What you need to do

### 1. Deploy this repo to Vercel

1. In [vercel.com](https://vercel.com), import this repo (or link it if you already have it).
2. Deploy. Vercel will serve your static site and the **`/api/events`** serverless route.

### 2. Add a Postgres database (Neon)

1. In the Vercel dashboard, open your project → **Storage** (or **Integrations**).
2. Add **Neon** (or another Postgres from the marketplace). Connect or create a database.
3. Vercel will set **`POSTGRES_URL`** or **`DATABASE_URL`** for you in the project environment.

### 3. Create the `events` table

1. In the **Neon** dashboard (or your Postgres provider), open **SQL Editor**.
2. Run the contents of **`vercel-events-schema.sql`** (in this repo root). That creates the `events` table and indexes.

### 4. Wire the frontend to your Vercel URL

Edit **`nyc-events/events.js`** (top of the file) and set:

```js
const EVENTS_API_URL = "https://your-project.vercel.app";
```

Use your actual Vercel deployment URL (e.g. `https://vinarajaa-github-io.vercel.app`). Without this, the app runs in **demo mode** (sample data only).

### 5. (Optional) Run the scraper on a schedule

The scraper lives in **`scrapers/`**. It fetches Dice.fm NYC events and POSTs them to your Vercel API.

**GitHub Actions**  
Add this **Repository secret** (Settings → Secrets and variables → Actions):

- `EVENTS_API_URL` – your Vercel URL (e.g. `https://your-project.vercel.app`)

If you have a workflow under **`.github/workflows/`** that runs the scraper, point it at `EVENTS_API_URL` instead of any Supabase vars.

**Run locally**  
From the repo root:

```bash
cd scrapers
npm install
EVENTS_API_URL=https://your-project.vercel.app node run.js
```

---

## Adding another platform

1. Add a new file in `scrapers/`, e.g. `scrapers/eventbrite-nyc.js`.
2. Export a `main()` that:
   - Fetches the platform’s NYC listing URL
   - Parses events into `{ title, date, time, neighborhood, price, link, platform }`
   - Calls the same API (e.g. reuse `pushToEventsApi()` from `dice-nyc.js` or share a small helper).
3. In `scrapers/run.js`, require the new module and call its `main()`.

---

## Files

| Path | Purpose |
|------|---------|
| `nyc-events/index.html` | Events app page |
| `nyc-events/events.js` | Frontend: list, filters, add form; set `EVENTS_API_URL` here |
| `api/events.js` | Vercel serverless: GET/POST/DELETE for events |
| `vercel-events-schema.sql` | Run once in Neon (or your Postgres) SQL Editor |
| `scrapers/dice-nyc.js` | Dice.fm NYC scraper |
| `scrapers/run.js` | Runs all scrapers |

If Dice.fm’s listing is client-rendered (no events in initial HTML), the scraper may get 0 events. You can add Puppeteer in the scraper, or rely on manual adds and other platforms.
