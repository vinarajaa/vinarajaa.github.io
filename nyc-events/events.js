// NYC Events – Vercel API only (or demo mode when not configured)
// Set EVENTS_API_URL to your Vercel deployment; leave empty for demo. See NYC_EVENTS_SETUP.md.
const EVENTS_API_URL = "https://vinarajaa-github-io.vercel.app";  // e.g. https://your-project.vercel.app
// Optional (for the “Pull from Dice” modal link)
const GITHUB_REPO = "vinarajaa/vinarajaa.github.io";
const GITHUB_WORKFLOW_FILE = "scrape-nyc-events.yml";

let eventsData = [];
let demoMode = false;
var DEMO_EVENTS = [
  { id: "demo-1", title: "Sample Show", date: "2025-02-15", time: "20:00", neighborhood: "Brooklyn", price: "$25", link: "https://dice.fm/example1", platform: "Dice", created_at: "2025-02-01T12:00:00Z" },
  { id: "demo-2", title: "Free Comedy Night", date: "2025-02-20", time: "19:30", neighborhood: "Manhattan", price: "Free", link: "https://dice.fm/example2", platform: "Dice", created_at: "2025-02-01T12:00:00Z" }
];

function get(id) { return document.getElementById(id); }

var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDateDisplay(val) {
  if (val == null || val === "") return "—";
  var d;
  if (val instanceof Date) {
    d = val;
  } else {
    var s = String(val).trim();
    var parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      d = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
    } else {
      d = new Date(s);
    }
  }
  if (isNaN(d.getTime())) return "—";
  return DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

/** Truncate price decimals to hundredth (2 places); drop the rest. */
function formatPriceDisplay(val) {
  if (val == null || val === "") return "—";
  var s = String(val).trim();
  return s.replace(/(\.\d{2})\d+/g, "$1");
}

function setStatus(text) {
  var el = get("events-status");
  if (el) el.textContent = text;
}

function eventsApiUrl() {
  var base = (EVENTS_API_URL || "").replace(/\/$/, "");
  return base ? base + "/api/events" : null;
}

async function fetchEvents() {
  var url = eventsApiUrl();
  if (!url) {
    demoMode = true;
    eventsData = DEMO_EVENTS.map(function (e) { return { ...e }; });
    return;
  }
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error("Events " + res.status);
    const data = await res.json();
    eventsData = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("Fetch events failed:", err);
    demoMode = true;
    eventsData = DEMO_EVENTS.map(function (e) { return { ...e }; });
  }
}

function todayYMD() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function endOfWeekYMD() {
  var d = new Date();
  var day = d.getDay();
  var add = day === 0 ? 6 : 7 - day;
  d.setDate(d.getDate() + add);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Parse time string to 0-23 hour (best effort). */
function parseTimeHour(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  var s = timeStr.trim();
  var m = s.match(/(\d{1,2})(?::(\d{2}))?\s*([AP])\.?M?/i);
  if (m) {
    var h = parseInt(m[1], 10);
    if ((m[3] || "").toUpperCase() === "P" && h < 12) h += 12;
    if ((m[3] || "").toUpperCase() === "A" && h === 12) h = 0;
    return h;
  }
  m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function setDateFilter(mode) {
  var fromEl = get("filterDateFrom");
  var toEl = get("filterDateTo");
  var rangeEl = get("dateRangeInputs");
  var today = todayYMD();
  var weekEnd = endOfWeekYMD();
  document.querySelectorAll(".date-filter-btn").forEach(function (btn) {
    btn.classList.remove("ring-2", "ring-offset-1");
    btn.style.boxShadow = "none";
  });
  if (mode === "today") {
    if (fromEl) fromEl.value = today;
    if (toEl) toEl.value = today;
    if (rangeEl) rangeEl.classList.add("hidden");
    var btn = get("dateBtnToday");
    if (btn) { btn.classList.add("ring-2", "ring-offset-1"); btn.style.boxShadow = "0 0 0 2px #B36A5E"; }
  } else if (mode === "week") {
    if (fromEl) fromEl.value = today;
    if (toEl) toEl.value = weekEnd;
    if (rangeEl) rangeEl.classList.add("hidden");
    var btn = get("dateBtnWeek");
    if (btn) { btn.classList.add("ring-2", "ring-offset-1"); btn.style.boxShadow = "0 0 0 2px #B36A5E"; }
  } else {
    if (rangeEl) rangeEl.classList.remove("hidden");
    var btn = get("dateBtnRange");
    if (btn) { btn.classList.add("ring-2", "ring-offset-1"); btn.style.boxShadow = "0 0 0 2px #B36A5E"; }
  }
  applyEventFilters();
}

function applyClientFilters() {
  var dateFrom = (get("filterDateFrom") || {}).value;
  var dateTo = (get("filterDateTo") || {}).value;
  var neighborhood = (get("filterNeighborhood") || {}).value;
  var venue = (get("filterVenue") || {}).value;
  var platform = (get("filterPlatform") || {}).value;
  var price = (get("filterPrice") || {}).value;
  var search = ((get("filterSearch") || {}).value || "").trim().toLowerCase();
  var eventType = (get("filterEventType") || {}).value;
  var timeOfDay = (get("filterTimeOfDay") || {}).value;
  var list = eventsData.filter(function (e) {
    if (dateFrom && (e.date || "") < dateFrom) return false;
    if (dateTo && (e.date || "") > dateTo) return false;
    if (neighborhood && (e.neighborhood || "") !== neighborhood) return false;
    if (venue && (e.venue || "") !== venue) return false;
    if (platform && (e.platform || "") !== platform) return false;
    if (price === "free" && (e.price || "").toLowerCase().indexOf("free") < 0) return false;
    if (price === "paid" && !(e.price || "").trim()) return false;
    if (price === "paid" && (e.price || "").toLowerCase() === "free") return false;
    if (search) {
      var title = (e.title || "").toLowerCase();
      var desc = (e.description || "").toLowerCase();
      if (title.indexOf(search) < 0 && desc.indexOf(search) < 0) return false;
    }
    if (eventType) {
      var text = ((e.title || "") + " " + (e.description || "")).toLowerCase();
      var match = false;
      if (eventType === "music") match = (text.indexOf("music") >= 0 || text.indexOf("concert") >= 0 || text.indexOf("dj") >= 0 || text.indexOf("live") >= 0);
      else if (eventType === "comedy") match = text.indexOf("comedy") >= 0;
      else if (eventType === "nightlife") match = (text.indexOf("night") >= 0 || text.indexOf("club") >= 0 || text.indexOf("party") >= 0 || text.indexOf("dance") >= 0);
      else if (eventType === "arts") match = (text.indexOf("art") >= 0 || text.indexOf("gallery") >= 0 || text.indexOf("theater") >= 0 || text.indexOf("theatre") >= 0);
      else if (eventType === "other") match = true;
      if (!match) return false;
    }
    if (timeOfDay) {
      var h = parseTimeHour(e.time);
      if (h == null) return true;
      if (timeOfDay === "daytime" && (h < 6 || h >= 18)) return false;
      if (timeOfDay === "late" && h >= 4 && h < 22) return false;
    }
    return true;
  });
  return list;
}

function renderEventsTable(list) {
  var tbody = get("eventsTable");
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = "<tr><td colspan=\"11\" class=\"p-4 text-center\" style=\"color: #C89F9C;\">No events match. Add one or adjust filters.</td></tr>";
    return;
  }
  tbody.innerHTML = list.map(function (e) {
    var dateVal = e.date;
    var date = "—";
    if (dateVal != null && dateVal !== "") {
      var s = String(dateVal).trim();
      var parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (parts) {
        var d = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
        if (!isNaN(d.getTime())) date = DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
        else date = s.slice(0, 10);
      } else date = s.slice(0, 10) || "—";
    }
    var time = (e.time || "—");
    var neighborhood = (e.neighborhood || "—");
    var venue = (e.venue || "—");
    var address = (e.address || "—");
    var price = formatPriceDisplay(e.price);
    var platform = (e.platform || "—");
    var link = (e.link || "#");
    var title = (e.title || "Untitled").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var imgCell = "—";
    if (e.image_url && e.image_url.indexOf("http") === 0) {
      var safeImg = (e.image_url || "").replace(/"/g, "&quot;").replace(/>/g, "&gt;").replace(/</g, "&lt;");
      imgCell = "<a href=\"" + safeImg + "\" target=\"_blank\" rel=\"noopener noreferrer\"><img src=\"" + safeImg + "\" alt=\"\" class=\"rounded object-cover\" style=\"width:48px;height:48px;\"></a>";
    }
    return "<tr class=\"border-b\" style=\"border-color: #C89F9C;\">" +
      "<td class=\"p-2\" style=\"border-color: rgba(0,0,0,0.06);\">" + imgCell + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + title + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + date + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + time + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + neighborhood + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + venue + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + address + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + price + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + platform + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\"><a href=\"" + link.replace(/"/g, "&quot;") + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"underline\" style=\"color: #C97C5D;\">Open</a></td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\"><button type=\"button\" onclick=\"openDeleteEventModal('" + (e.id || "").replace(/'/g, "\\'") + "','" + (e.title || "").replace(/'/g, "\\'") + "')\" class=\"text-sm font-semibold\" style=\"color: #B36A5E;\">Delete</button></td>" +
      "</tr>";
  }).join("");
}

function populateFilterDropdowns() {
  var neighborhoods = [];
  var venues = [];
  var platforms = [];
  eventsData.forEach(function (e) {
    if (e.neighborhood && neighborhoods.indexOf(e.neighborhood) < 0) neighborhoods.push(e.neighborhood);
    if (e.venue && venues.indexOf(e.venue) < 0) venues.push(e.venue);
    if (e.platform && platforms.indexOf(e.platform) < 0) platforms.push(e.platform);
  });
  neighborhoods.sort();
  venues.sort();
  platforms.sort();
  var nhSelect = get("filterNeighborhood");
  if (nhSelect) {
    nhSelect.innerHTML = "<option value=\"\">All areas</option>" + neighborhoods.map(function (n) { return "<option value=\"" + n.replace(/"/g, "&quot;") + "\">" + n.replace(/</g, "&lt;") + "</option>"; }).join("");
  }
  var venSelect = get("filterVenue");
  if (venSelect) {
    venSelect.innerHTML = "<option value=\"\">All venues</option>" + venues.map(function (v) { return "<option value=\"" + v.replace(/"/g, "&quot;") + "\">" + v.replace(/</g, "&lt;") + "</option>"; }).join("");
  }
  var pfSelect = get("filterPlatform");
  if (pfSelect) {
    pfSelect.innerHTML = "<option value=\"\">All platforms</option>" + platforms.map(function (p) { return "<option value=\"" + p.replace(/"/g, "&quot;") + "\">" + p.replace(/</g, "&lt;") + "</option>"; }).join("");
  }
}

function applyEventFilters() {
  var list = applyClientFilters();
  renderEventsTable(list);
  setStatus(demoMode ? "Demo mode – " + list.length + " event(s). Set EVENTS_API_URL to use the Vercel backend." : list.length + " event(s).");
}

function toggleEventFilters() {
  var el = get("eventFilterControls");
  if (el) {
    el.classList.toggle("hidden");
  }
}

async function deletePastEvents() {
  var url = eventsApiUrl();
  if (!url) {
    setStatus("Set EVENTS_API_URL to delete past events.");
    return;
  }
  setStatus("Deleting past events…");
  try {
    var res = await fetch(url + "?past=1", { method: "DELETE", headers: { "Content-Type": "application/json" } });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      setStatus("Delete failed: " + (data.error || res.status));
      return;
    }
    var n = (data.deleted != null) ? data.deleted : 0;
    setStatus("Deleted " + n + " past event(s). Refreshing…");
    await fetchEvents();
    populateFilterDropdowns();
    applyEventFilters();
    setStatus(eventsData.length + " event(s). Deleted " + n + " past.");
  } catch (err) {
    setStatus("Error: " + (err.message || "Could not delete past events."));
    console.error(err);
  }
}

async function loadEvents() {
  setStatus("Loading…");
  await fetchEvents();
  populateFilterDropdowns();
  applyEventFilters();
}

function showModal(id) {
  var el = get(id);
  if (el) {
    el.style.display = "flex";
    el.classList.remove("hidden");
    el.classList.add("flex");
    el.setAttribute("aria-hidden", "false");
  }
}

function hideModal(id) {
  var el = get(id);
  if (el) {
    el.style.display = "none";
    el.classList.add("hidden");
    el.classList.remove("flex");
    el.setAttribute("aria-hidden", "true");
  }
}

async function triggerPullFromDice() {
  var base = eventsApiUrl();
  if (!base) {
    setStatus("Set EVENTS_API_URL to enable pull.");
    return;
  }
  var scrapeUrl = (EVENTS_API_URL || "").replace(/\/$/, "") + "/api/scrape";
  setStatus("Pulling from Dice & Eventbrite…");
  try {
    var res = await fetch(scrapeUrl, { method: "POST", headers: { "Content-Type": "application/json" } });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      setStatus("Pull failed: " + (data.error || res.status));
      return;
    }
    setStatus("Pulled " + (data.inserted || 0) + " new event(s). Refreshing…");
    await fetchEvents();
    populateFilterDropdowns();
    applyEventFilters();
    setStatus(eventsData.length + " event(s). Pulled " + (data.inserted || 0) + " new.");
  } catch (err) {
    setStatus("Pull failed: " + (err.message || "Network error"));
    console.error(err);
  }
}

function closePullFromDiceModal() {
  hideModal("pull-dice-modal");
}

function openAddEventModal(prefill) {
  var form = document.getElementById("addEventForm");
  if (form) form.reset();
  if (prefill) {
    if (prefill.link) form.link.value = prefill.link;
    if (prefill.platform) form.platform.value = prefill.platform;
  }
  var successEl = get("add-event-success");
  if (successEl) successEl.classList.add("hidden");
  showModal("add-event-modal");
}

function closeAddEventModal() {
  hideModal("add-event-modal");
}

function openAddByUrlModal() {
  document.getElementById("addByUrlForm").reset();
  showModal("add-by-url-modal");
}

function closeAddByUrlModal() {
  hideModal("add-by-url-modal");
}

function handleAddByUrlSubmit(ev) {
  ev.preventDefault();
  var form = ev.target;
  var url = (form.url && form.url.value) || (get("add-by-url-input") && get("add-by-url-input").value);
  var platform = (form.platform && form.platform.value) || (get("add-by-url-platform") && get("add-by-url-platform").value) || "Dice";
  closeAddByUrlModal();
  openAddEventModal({ link: url, platform: platform });
  return false;
}

function handleAddEventSubmit(ev) {
  ev.preventDefault();
  var form = ev.target;
  var payload = {
    title: form.title.value.trim(),
    date: form.date.value,
    time: (form.time && form.time.value) || null,
    neighborhood: (form.neighborhood && form.neighborhood.value.trim()) || null,
    venue: (form.venue && form.venue.value.trim()) || null,
    address: (form.address && form.address.value.trim()) || null,
    price: (form.price && form.price.value.trim()) || null,
    link: form.link.value.trim(),
    platform: (form.platform && form.platform.value) || "Manual",
    description: (form.description && form.description.value.trim()) || null
  };
  if (demoMode) {
    payload.id = "demo-" + Date.now();
    payload.created_at = new Date().toISOString();
    eventsData.push(payload);
    populateFilterDropdowns();
    applyEventFilters();
    get("add-event-success").classList.remove("hidden");
    setStatus("Demo mode – event added locally.");
    return false;
  }
  fetch(eventsApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function (res) {
    if (res.ok) {
      return res.json();
    }
    throw new Error(res.status + " " + res.statusText);
  }).then(function (rows) {
    var row = Array.isArray(rows) ? rows[0] : rows;
    if (row) eventsData.push(row);
    populateFilterDropdowns();
    applyEventFilters();
    get("add-event-success").classList.remove("hidden");
    setStatus("Event added.");
  }).catch(function (err) {
    setStatus("Error: " + (err.message || "Could not add event."));
    console.error(err);
  });
  return false;
}

var deleteEventId = null;

function openDeleteEventModal(id, title) {
  deleteEventId = id;
  var el = get("delete-event-title");
  if (el) el.textContent = (title || "this event");
  var btn = get("confirm-delete-event-btn");
  if (btn) {
    btn.onclick = function () { confirmDeleteEvent(); };
  }
  showModal("delete-event-modal");
}

function closeDeleteEventModal() {
  hideModal("delete-event-modal");
  deleteEventId = null;
}

function confirmDeleteEvent() {
  if (!deleteEventId) {
    closeDeleteEventModal();
    return;
  }
  if (demoMode) {
    eventsData = eventsData.filter(function (e) { return e.id !== deleteEventId; });
    populateFilterDropdowns();
    applyEventFilters();
    setStatus("Demo mode – event removed.");
    closeDeleteEventModal();
    return;
  }
  fetch(eventsApiUrl() + "?id=" + encodeURIComponent(deleteEventId), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" }
  }).then(function (res) {
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    eventsData = eventsData.filter(function (e) { return e.id !== deleteEventId; });
    populateFilterDropdowns();
    applyEventFilters();
    setStatus("Event deleted.");
  }).catch(function (err) {
    setStatus("Error: " + (err.message || "Could not delete."));
    console.error(err);
  });
  closeDeleteEventModal();
}

document.addEventListener("DOMContentLoaded", function () {
  loadEvents();
});
