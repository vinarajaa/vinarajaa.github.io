const API_BASE = "https://house-inventory-c5c7cyfpfqe9e6gk.westus-01.azurewebsites.net";
let roomMap = {};
let categoryMap = {};
let demoMode = false;

// Demo data when API is down (404 / unreachable) so the UI still works
var DEMO_ROOMS = [{ room_id: 1, name: "Living Room" }, { room_id: 2, name: "Kitchen" }, { room_id: 3, name: "Bedroom" }];
var DEMO_CATEGORIES = [{ category_id: 1, name: "Furniture" }, { category_id: 2, name: "Electronics" }, { category_id: 3, name: "Kitchen" }];
var DEMO_ITEMS = [
  { item_id: 1, name: "Sofa", quantity: 1, room_id: 1, category_id: 1, purchase_date: "2024-01-15" },
  { item_id: 2, name: "Coffee table", quantity: 1, room_id: 1, category_id: 1, purchase_date: "2024-02-20" },
  { item_id: 3, name: "Blender", quantity: 1, room_id: 2, category_id: 3, purchase_date: "2024-03-10" },
  { item_id: 4, name: "Lamp", quantity: 2, room_id: 3, category_id: 2, purchase_date: "2024-04-05" }
];

var ADD_ROOM_VALUE = "__add_room__";
var ADD_CATEGORY_VALUE = "__add_category__";

function get(id) {
  return document.getElementById(id);
}

function showModal(id) {
  const el = get(id);
  if (el) {
    el.classList.remove("hidden");
    el.classList.add("flex");
    el.style.display = "flex";
    el.setAttribute("aria-hidden", "false");
  }
}

function hideModal(id) {
  const el = get(id);
  if (el) {
    el.style.display = "none";
    el.classList.add("hidden");
    el.classList.remove("flex");
    el.setAttribute("aria-hidden", "true");
  }
}

function setStatus(text) {
  const el = get("app-status");
  if (el) el.textContent = text;
}

async function loadRooms() {
  const roomSelect = get("roomFilter");
  if (roomSelect) roomSelect.innerHTML = "<option value=\"\">All Rooms</option>";
  const addRoomSelect = document.querySelector("select[name='room_id']");
  if (addRoomSelect) {
    addRoomSelect.innerHTML = "<option value=\"\">Select one</option>";
  }
  try {
    const res = await fetch(API_BASE + "/rooms");
    if (!res.ok) throw new Error("Rooms " + res.status);
    const rooms = await res.json();
    if (!Array.isArray(rooms)) throw new Error("Invalid rooms response");
    rooms.forEach(function (room) {
      if (roomSelect) roomSelect.innerHTML += "<option value=\"" + room.room_id + "\">" + room.name + "</option>";
      if (addRoomSelect) addRoomSelect.innerHTML += "<option value=\"" + room.room_id + "\">" + room.name + "</option>";
      roomMap[room.room_id] = room.name;
    });
    if (addRoomSelect) addRoomSelect.innerHTML += "<option value=\"" + ADD_ROOM_VALUE + "\">➕ Add room...</option>";
  } catch (err) {
    console.warn("Load rooms failed:", err);
    loadDemoRooms();
  }
}

function loadDemoRooms() {
  var roomSelect = get("roomFilter");
  var addRoomSelect = document.querySelector("select[name='room_id']");
  if (roomSelect) roomSelect.innerHTML = "<option value=\"\">All Rooms</option>";
  if (addRoomSelect) {
    addRoomSelect.innerHTML = "<option value=\"\">Select one</option>";
    DEMO_ROOMS.forEach(function (r) {
      addRoomSelect.innerHTML += "<option value=\"" + r.room_id + "\">" + r.name + "</option>";
    });
    addRoomSelect.innerHTML += "<option value=\"" + ADD_ROOM_VALUE + "\">➕ Add room...</option>";
  }
  DEMO_ROOMS.forEach(function (r) {
    if (roomSelect) roomSelect.innerHTML += "<option value=\"" + r.room_id + "\">" + r.name + "</option>";
    roomMap[r.room_id] = r.name;
  });
}

function loadDemoCategories() {
  var catSelect = get("categoryFilter");
  var addCatSelect = document.querySelector("select[name='category_id']");
  if (catSelect) catSelect.innerHTML = "<option value=\"\">All Categories</option>";
  if (addCatSelect) {
    addCatSelect.innerHTML = "<option value=\"\">Select one</option>";
    DEMO_CATEGORIES.forEach(function (c) {
      addCatSelect.innerHTML += "<option value=\"" + c.category_id + "\">" + c.name + "</option>";
    });
    addCatSelect.innerHTML += "<option value=\"" + ADD_CATEGORY_VALUE + "\">➕ Add category...</option>";
  }
  DEMO_CATEGORIES.forEach(function (c) {
    if (catSelect) catSelect.innerHTML += "<option value=\"" + c.category_id + "\">" + c.name + "</option>";
    categoryMap[c.category_id] = c.name;
  });
}

async function loadCategories() {
  const catSelect = get("categoryFilter");
  if (catSelect) catSelect.innerHTML = "<option value=\"\">All Categories</option>";
  const addCatSelect = document.querySelector("select[name='category_id']");
  if (addCatSelect) {
    addCatSelect.innerHTML = "<option value=\"\">Select one</option>";
  }
  try {
    const res = await fetch(API_BASE + "/categories");
    if (!res.ok) throw new Error("Categories " + res.status);
    const categories = await res.json();
    if (!Array.isArray(categories)) throw new Error("Invalid categories response");
    categories.forEach(function (cat) {
      if (catSelect) catSelect.innerHTML += "<option value=\"" + cat.category_id + "\">" + cat.name + "</option>";
      if (addCatSelect) addCatSelect.innerHTML += "<option value=\"" + cat.category_id + "\">" + cat.name + "</option>";
      categoryMap[cat.category_id] = cat.name;
    });
    if (addCatSelect) addCatSelect.innerHTML += "<option value=\"" + ADD_CATEGORY_VALUE + "\">➕ Add category...</option>";
  } catch (err) {
    console.warn("Load categories failed:", err);
    loadDemoCategories();
  }
}

function showApiError(message) {
  const table = get("itemsTable");
  if (table) {
    table.innerHTML = `<tr><td colspan="6" class="p-6 text-center" style="color: #B36A5E;">${message}</td></tr>`;
  }
  updateStats([]);
}

async function loadItems(searchTerm) {
  if (typeof searchTerm !== "string") searchTerm = "";
  const roomSelect = get("roomFilter");
  const catSelect = get("categoryFilter");
  const roomId = roomSelect ? roomSelect.value : "";
  const catId = catSelect ? catSelect.value : "";

  let url = `${API_BASE}/items?limit=1000`;
  if (roomId) url += "&room_id=" + encodeURIComponent(roomId);
  if (catId) url += "&category_id=" + encodeURIComponent(catId);
  if (searchTerm) url += "&search=" + encodeURIComponent(searchTerm);

  const table = get("itemsTable");
  if (!table) return [];

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Items " + res.status);
    const data = await res.json();
    var items = Array.isArray(data) ? data : [];
    renderItems(items);
    return items;
  } catch (err) {
    console.warn("Load items failed:", err);
    demoMode = true;
    setStatus("Demo mode — backend unreachable (404). Filter, Add, Delete, Search, and New List work locally.");
    var items = DEMO_ITEMS.slice();
    if (roomId) items = items.filter(function (i) { return String(i.room_id) === String(roomId); });
    if (catId) items = items.filter(function (i) { return String(i.category_id) === String(catId); });
    if (searchTerm) {
      var q = searchTerm.toLowerCase();
      items = items.filter(function (i) { return (i.name || "").toLowerCase().indexOf(q) !== -1; });
    }
    renderItems(items);
    return items;
  }
}

function renderItems(items) {
  var table = get("itemsTable");
  if (!table) return;
  table.innerHTML = "";
  var borderCl = "#C89F9C";
  items.forEach(function (item) {
    table.innerHTML +=
      "<tr class=\"border-b transition hover:bg-[#EED7C5]\" style=\"border-color:" + borderCl + ";\">" +
      "<td class=\"p-3 border-r\" style=\"border-color:" + borderCl + ";\"><input type=\"checkbox\" class=\"select-item\" data-id=\"" + item.item_id + "\" /></td>" +
      "<td class=\"p-3 border-r\" style=\"border-color:" + borderCl + ";\">" + (item.name || "") + "</td>" +
      "<td class=\"p-3 border-r\" style=\"border-color:" + borderCl + ";\">" + (item.quantity != null ? item.quantity : "") + "</td>" +
      "<td class=\"p-3 border-r\" style=\"border-color:" + borderCl + ";\">" + (roomMap[item.room_id] || "—") + "</td>" +
      "<td class=\"p-3 border-r\" style=\"border-color:" + borderCl + ";\">" + (categoryMap[item.category_id] || "—") + "</td>" +
      "<td class=\"p-3\">" + (item.purchase_date || "—") + "</td>" +
      "</tr>";
  });
  updateStats(items);
}

function handleAddRoomChange() {
  var sel = document.querySelector("select[name='room_id']");
  if (!sel || sel.value !== ADD_ROOM_VALUE) return;
  var name = (prompt("New room name:") || "").trim();
  if (!name) { sel.value = ""; return; }
  if (demoMode) {
    var newId = DEMO_ROOMS.length ? Math.max.apply(null, DEMO_ROOMS.map(function (r) { return r.room_id; })) + 1 : 1;
    DEMO_ROOMS.push({ room_id: newId, name: name });
    roomMap[newId] = name;
    var roomFilter = get("roomFilter");
    if (roomFilter) roomFilter.innerHTML += "<option value=\"" + newId + "\">" + name + "</option>";
    sel.innerHTML = "<option value=\"\">Select one</option>";
    DEMO_ROOMS.forEach(function (r) {
      sel.innerHTML += "<option value=\"" + r.room_id + "\">" + r.name + "</option>";
    });
    sel.innerHTML += "<option value=\"" + ADD_ROOM_VALUE + "\">➕ Add room...</option>";
    sel.value = newId;
    return;
  }
  fetch(API_BASE + "/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name }) })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var id = data.room_id != null ? data.room_id : data.id;
      if (id != null) {
        roomMap[id] = name;
        var roomFilter = get("roomFilter");
        if (roomFilter) roomFilter.innerHTML += "<option value=\"" + id + "\">" + name + "</option>";
        sel.innerHTML = "<option value=\"\">Select one</option>";
        for (var rid in roomMap) { sel.innerHTML += "<option value=\"" + rid + "\">" + roomMap[rid] + "</option>"; }
        sel.innerHTML += "<option value=\"" + ADD_ROOM_VALUE + "\">➕ Add room...</option>";
        sel.value = String(id);
      } else { sel.value = ""; loadRooms(); }
    })
    .catch(function () { sel.value = ""; loadRooms(); });
}

function handleAddCategoryChange() {
  var sel = document.querySelector("select[name='category_id']");
  if (!sel || sel.value !== ADD_CATEGORY_VALUE) return;
  var name = (prompt("New category name:") || "").trim();
  if (!name) { sel.value = ""; return; }
  if (demoMode) {
    var newId = DEMO_CATEGORIES.length ? Math.max.apply(null, DEMO_CATEGORIES.map(function (c) { return c.category_id; })) + 1 : 1;
    DEMO_CATEGORIES.push({ category_id: newId, name: name });
    categoryMap[newId] = name;
    var catFilter = get("categoryFilter");
    if (catFilter) catFilter.innerHTML += "<option value=\"" + newId + "\">" + name + "</option>";
    sel.innerHTML = "<option value=\"\">Select one</option>";
    DEMO_CATEGORIES.forEach(function (c) {
      sel.innerHTML += "<option value=\"" + c.category_id + "\">" + c.name + "</option>";
    });
    sel.innerHTML += "<option value=\"" + ADD_CATEGORY_VALUE + "\">➕ Add category...</option>";
    sel.value = newId;
    return;
  }
  fetch(API_BASE + "/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name }) })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var id = data.category_id != null ? data.category_id : data.id;
      if (id != null) {
        categoryMap[id] = name;
        var catFilter = get("categoryFilter");
        if (catFilter) catFilter.innerHTML += "<option value=\"" + id + "\">" + name + "</option>";
        sel.innerHTML = "<option value=\"\">Select one</option>";
        for (var cid in categoryMap) { sel.innerHTML += "<option value=\"" + cid + "\">" + categoryMap[cid] + "</option>"; }
        sel.innerHTML += "<option value=\"" + ADD_CATEGORY_VALUE + "\">➕ Add category...</option>";
        sel.value = String(id);
      } else { sel.value = ""; loadCategories(); }
    })
    .catch(function () { sel.value = ""; loadCategories(); });
}

window.addEventListener("DOMContentLoaded", function () {
  var filterControls = get("filterControls");
  if (filterControls) filterControls.classList.add("hidden");

  var searchInput = get("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    });
  }

  var addRoomSel = document.querySelector("select[name='room_id']");
  if (addRoomSel) addRoomSel.addEventListener("change", handleAddRoomChange);
  var addCatSel = document.querySelector("select[name='category_id']");
  if (addCatSel) addCatSel.addEventListener("change", handleAddCategoryChange);

  loadRooms().then(function () {
    return loadCategories();
  }).then(function () {
    return loadItems("");
  }).then(function () {
    setStatus("Ready. If the table is empty, the backend may be unavailable (404).");
  }).catch(function (err) {
    console.warn("Initial load error:", err);
    setStatus("Ready. Backend unreachable — Filter, Add, Delete, and New List still work.");
  });
});

function toggleFilters() {
  const el = get("filterControls");
  if (!el) return;
  if (el.classList.contains("hidden")) {
    el.classList.remove("hidden");
    el.classList.add("flex");
  } else {
    el.classList.remove("flex");
    el.classList.add("hidden");
  }
}

function openAddModal() {
  showModal("add-modal");
}

function closeAddModal() {
  hideModal("add-modal");
  const msg = get("thank-you-message");
  if (msg) msg.style.display = "none";
}

async function handleAddItemSubmit(event) {
  event.preventDefault();
  var form = event.target;
  var formData = new FormData(form);
  var roomVal = formData.get("room_id");
  var catVal = formData.get("category_id");
  var payload = {
    name: (formData.get("name") || "").trim(),
    quantity: parseInt(formData.get("quantity"), 10) || 1,
    description: formData.get("description") || "",
    purchase_date: formData.get("purchase_date") || "",
    room_id: roomVal ? parseInt(roomVal, 10) : null,
    category_id: catVal ? parseInt(catVal, 10) : null
  };

  if (demoMode) {
    var newId = DEMO_ITEMS.length ? Math.max.apply(null, DEMO_ITEMS.map(function (i) { return i.item_id; })) + 1 : 1;
    DEMO_ITEMS.push({
      item_id: newId,
      name: payload.name,
      quantity: payload.quantity,
      room_id: payload.room_id || 0,
      category_id: payload.category_id || 0,
      purchase_date: payload.purchase_date || ""
    });
    form.reset();
    closeAddModal();
    var msg = get("thank-you-message");
    if (msg) msg.style.display = "block";
    loadItems("");
    return false;
  }

  try {
    var res = await fetch(API_BASE + "/items/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      form.reset();
      var msg = get("thank-you-message");
      if (msg) msg.style.display = "block";
      await loadItems("");
    } else {
      alert("Failed to add item.");
    }
  } catch (err) {
    console.error("Add item failed:", err);
    alert("Could not add item. Server may be unavailable.");
  }
  return false;
}

function updateStats(items) {
  if (!items || !Array.isArray(items)) items = [];
  const total = items.length;
  const rooms = total ? new Set(items.map(function (i) { return i.room_id; })).size : 0;
  const categories = total ? new Set(items.map(function (i) { return i.category_id; })).size : 0;
  var mostRecent = "—";
  if (total) {
    try {
      var maxDate = Math.max.apply(null, items.map(function (i) { return new Date(i.purchase_date).getTime(); }));
      mostRecent = new Date(maxDate).toLocaleDateString();
    } catch (e) {}
  }
  var el = get("stat-total"); if (el) el.innerText = total;
  el = get("stat-rooms"); if (el) el.innerText = rooms;
  el = get("stat-categories"); if (el) el.innerText = categories;
  el = get("stat-recent"); if (el) el.innerText = mostRecent;
}

function openNewListModal() {
  showModal("newListModal");
}

function closeNewListModal() {
  hideModal("newListModal");
}

function createList() {
  const titleEl = get("newListTitle");
  const title = titleEl ? titleEl.value.trim() : "";
  if (!title) return;
  const container = get("listsContainer");
  if (!container) return;
  const div = document.createElement("div");
  div.className = "p-3 rounded border";
  div.style.backgroundColor = "#EED7C5";
  div.style.borderColor = "#C89F9C";
  div.innerHTML = "<h4 class=\"font-bold\" style=\"color: #B36A5E;\">" + title + "</h4><ul class=\"text-sm text-[#270f03] pl-4 list-disc mt-2\"><li>(List is empty)</li></ul>";
  container.appendChild(div);
  closeNewListModal();
  if (titleEl) titleEl.value = "";
}

function openDeleteModal() {
  const checkboxes = document.querySelectorAll(".select-item:checked");
  const count = checkboxes.length;
  if (count === 0) {
    alert("Please select at least one item to delete.");
    return;
  }
  const countEl = get("delete-count");
  if (countEl) countEl.textContent = count;
  showModal("delete-modal");
}

function closeDeleteModal() {
  hideModal("delete-modal");
}

async function confirmDelete() {
  var checked = document.querySelectorAll(".select-item:checked");
  var idsToDelete = Array.from(checked).map(function (cb) { return parseInt(cb.getAttribute("data-id"), 10); });

  if (demoMode) {
    DEMO_ITEMS = DEMO_ITEMS.filter(function (i) { return idsToDelete.indexOf(i.item_id) === -1; });
    loadItems("");
    var successEl = get("delete-success-message");
    if (successEl) successEl.classList.remove("hidden");
    setTimeout(function () {
      closeDeleteModal();
      if (successEl) successEl.classList.add("hidden");
    }, 2000);
    return;
  }

  try {
    for (var i = 0; i < idsToDelete.length; i++) {
      await fetch(API_BASE + "/items/" + idsToDelete[i], { method: "DELETE" });
    }
    await loadItems("");
    var successEl = get("delete-success-message");
    if (successEl) successEl.classList.remove("hidden");
    setTimeout(function () {
      closeDeleteModal();
      if (successEl) successEl.classList.add("hidden");
    }, 2000);
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Something went wrong.");
  }
}

function handleSearch() {
  var searchInput = get("searchInput");
  var query = searchInput ? searchInput.value.trim() : "";
  loadItems(query);
}
