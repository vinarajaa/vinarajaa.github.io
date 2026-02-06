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

function applyClientFilters() {
  var dateFrom = (get("filterDateFrom") || {}).value;
  var dateTo = (get("filterDateTo") || {}).value;
  var neighborhood = (get("filterNeighborhood") || {}).value;
  var platform = (get("filterPlatform") || {}).value;
  var price = (get("filterPrice") || {}).value;
  var list = eventsData.filter(function (e) {
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    if (neighborhood && (e.neighborhood || "") !== neighborhood) return false;
    if (platform && (e.platform || "") !== platform) return false;
    if (price === "free" && (e.price || "").toLowerCase().indexOf("free") < 0) return false;
    if (price === "paid" && !(e.price || "").trim()) return false;
    if (price === "paid" && (e.price || "").toLowerCase() === "free") return false;
    return true;
  });
  return list;
}

function renderEventsTable(list) {
  var tbody = get("eventsTable");
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = "<tr><td colspan=\"8\" class=\"p-4 text-center\" style=\"color: #C89F9C;\">No events match. Add one or adjust filters.</td></tr>";
    return;
  }
  tbody.innerHTML = list.map(function (e) {
    var date = e.date || "—";
    var time = (e.time || "—");
    var neighborhood = (e.neighborhood || "—");
    var price = (e.price || "—");
    var platform = (e.platform || "—");
    var link = (e.link || "#");
    var title = (e.title || "Untitled").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return "<tr class=\"border-b\" style=\"border-color: #C89F9C;\">" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + title + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + date + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + time + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + neighborhood + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + price + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\">" + platform + "</td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\"><a href=\"" + link.replace(/"/g, "&quot;") + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"underline\" style=\"color: #C97C5D;\">Open</a></td>" +
      "<td class=\"p-3\" style=\"border-color: rgba(0,0,0,0.06);\"><button type=\"button\" onclick=\"openDeleteEventModal('" + (e.id || "").replace(/'/g, "\\'") + "','" + (e.title || "").replace(/'/g, "\\'") + "')\" class=\"text-sm font-semibold\" style=\"color: #B36A5E;\">Delete</button></td>" +
      "</tr>";
  }).join("");
}

function populateFilterDropdowns() {
  var neighborhoods = [];
  var platforms = [];
  eventsData.forEach(function (e) {
    if (e.neighborhood && neighborhoods.indexOf(e.neighborhood) < 0) neighborhoods.push(e.neighborhood);
    if (e.platform && platforms.indexOf(e.platform) < 0) platforms.push(e.platform);
  });
  neighborhoods.sort();
  platforms.sort();
  var nhSelect = get("filterNeighborhood");
  if (nhSelect) {
    nhSelect.innerHTML = "<option value=\"\">All neighborhoods</option>" + neighborhoods.map(function (n) { return "<option value=\"" + n.replace(/"/g, "&quot;") + "\">" + n.replace(/</g, "&lt;") + "</option>"; }).join("");
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

function openPullFromDiceModal() {
  var link = get("pull-dice-actions-link");
  var hint = get("pull-dice-actions-hint");
  if (link) {
    if (GITHUB_REPO) {
      link.href = "https://github.com/" + GITHUB_REPO + "/actions/workflows/" + GITHUB_WORKFLOW_FILE;
      link.textContent = "Open GitHub Actions workflow";
      if (hint) hint.style.display = "none";
    } else {
      link.href = "#";
      link.textContent = "Configure GITHUB_REPO to enable this link";
      if (hint) hint.style.display = "block";
    }
  }
  showModal("pull-dice-modal");
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
