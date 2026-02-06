# NYC Events – Setup

The **NYC Events** app shows events in New York City: auto-collected from Dice.fm (and more later) plus events you add manually. It uses **Supabase** for storage.

---

## What you need to do

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account / project.
2. In the Supabase dashboard, open **SQL Editor** and run the contents of **`supabase-events-schema.sql`** (in this repo root). That creates the `events` table and permissions.
3. In **Project Settings → API**, copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public** key (for the frontend and optional scraper)

### 2. Wire the frontend to Supabase

Edit **`nyc-events/events.js`** (top of the file) and set:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key-here";
```

Without these, the app runs in **demo mode** (sample data only, no real backend).

### 3. (Optional) Run the scraper on a schedule

The scraper lives in **`scrapers/`**. It fetches Dice.fm NYC events and POSTs them to Supabase.

**GitHub Actions (recommended)**  
Add these **Repository secrets** (Settings → Secrets and variables → Actions):

- `SUPABASE_URL` – same as above
- `SUPABASE_ANON_KEY` – same as above (or use `SUPABASE_SERVICE_ROLE_KEY` if you need service role)

The workflow **`.github/workflows/scrape-nyc-events.yml`** runs daily at 6:00 UTC. You can also run it manually: Actions → “Scrape NYC Events” → Run workflow.

**Run locally**  
From the repo root:

```bash
cd scrapers
npm install
SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=your-key node run.js
```

---

## Adding another platform

1. Add a new file in `scrapers/`, e.g. `scrapers/eventbrite-nyc.js`.
2. Export a `main()` that:
   - Fetches the platform’s NYC listing URL
   - Parses events into `{ title, date, time, neighborhood, price, link, platform }`
   - Calls the same Supabase POST logic (or reuse a shared `pushToSupabase()`).
3. In `scrapers/run.js`, require the new module and call its `main()` (e.g. `await eventbriteNy.main()`).

---

## Files

| Path | Purpose |
|------|---------|
| `nyc-events/index.html` | Events app page |
| `nyc-events/events.js` | Frontend: list, filters, add form, Supabase config |
| `supabase-events-schema.sql` | Run once in Supabase SQL Editor |
| `scrapers/dice-nyc.js` | Dice.fm NYC scraper |
| `scrapers/run.js` | Runs all scrapers |
| `.github/workflows/scrape-nyc-events.yml` | Daily scrape job |

If Dice.fm’s listing is client-rendered (no events in initial HTML), the scraper may get 0 events. In that case you can add Puppeteer (or similar) in the scraper, or rely on manual adds and other platforms.
