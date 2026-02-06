# House Inventory – How it’s set up

## Overview

The **House Inventory** app has two parts:

1. **Frontend (this repo)** – The page and buttons you see. It’s hosted on GitHub Pages (your site, e.g. `www.vinaraja.com`).
2. **Backend (API)** – A separate server that stores rooms, categories, and items. It used to run on **Azure App Service**.

---

## Frontend (this repo)

- **URL:** You open the app from your site, e.g.  
  `https://www.vinaraja.com/database/`  
  (from the homepage “DataBase” link: `href="/database"`).

- **Files:**
  - **Live copy (what `/database` uses):**  
    `database/index.html` and `database/database.js`
  - **Duplicate (same app):**  
    `pages/database/database.html` and `pages/database/database.js`

- **Script:** The page loads `database.js` from the same folder (e.g. `https://www.vinaraja.com/database/database.js`). If that request returns **404**, the buttons won’t work because no JavaScript runs.

---

## Backend (API)

- **Base URL used in the code:**  
  `https://house-inventory-c5c7cyfpfqe9e6gk.westus-01.azurewebsites.net`

- **Endpoints the frontend calls:**
  - `GET /rooms` – list rooms
  - `GET /categories` – list categories  
  - `GET /items?limit=1000&room_id=...&category_id=...&search=...` – list items
  - `POST /items/` – add item (JSON body)
  - `DELETE /items/{id}` – delete item

If this server is stopped, deleted, or the URL changed, you’ll get **404** or **network errors** when the page tries to load data. The app now has **demo mode**: when the API fails, sample data is shown and Filter / Add / Delete / Search / New List all work locally (no server needed).

---

## Why you might see “404” or “nothing happens”

| What you see | Likely cause |
|--------------|----------------|
| **404 in the browser (whole page)** | Wrong URL (e.g. `/database` doesn’t exist on your host). Fix: use the correct link from the homepage or open `…/database/` or `…/database/index.html`. |
| **Page loads but “Demo mode” / sample table** | API is down or URL changed. The app is using local demo data; all buttons work. To use the real backend again, fix the API and refresh. |
| **Page loads but no buttons work** | `database.js` didn’t load (e.g. 404 on `…/database/database.js`). Check DevTools → Network for `database.js` and fix the path so it loads from the same path as the page. |

---

## What to do next

1. **Check the API URL**  
   In `database/database.js` and `pages/database/database.js`, line 1:  
   `API_BASE = "https://house-inventory-c5c7cyfpfqe9e6gk.westus-01.azurewebsites.net"`  
   If you have a new backend URL, replace it in **both** files.

2. **If the backend is still on Azure**  
   - In Azure Portal, open the App Service for “house-inventory”.
   - Make sure it’s **Running** (not Stopped).
   - If the URL changed (e.g. after recreate), update `API_BASE` in both JS files.

3. **Demo mode (no backend)**  
   When the API returns 404 or fails, the app automatically uses demo data. You can Filter, Add, Delete, Search, and create New Lists; changes are only in the browser until the backend is available again.

4. **CORS**  
   If the backend is running but the browser blocks requests, the API must send CORS headers allowing your site (e.g. `https://www.vinaraja.com`). That’s configured on the **backend**, not in this repo.

---

## Quick reference

- **Homepage link to the app:** `index.html` → `<a href="/database">` (opens `/database`).
- **Backend base URL:** Set in `database/database.js` and `pages/database/database.js` as `API_BASE`.
- **Two copies of the app:** `database/` (used by `/database`) and `pages/database/`; keep both in sync when you change behavior or API URL.
