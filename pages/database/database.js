const API_BASE = "http://127.0.0.1:8000";  // Update if hosted differently
let roomMap = {};        // ✅ Declare this
let categoryMap = {};    

async function loadRooms() {
  const res = await fetch(`${API_BASE}/rooms`);
  const rooms = await res.json();
  const roomSelect = document.getElementById("roomFilter");
  roomSelect.innerHTML = `<option value="">All Rooms</option>`;
  rooms.forEach(room => {
    document.getElementById("roomFilter").innerHTML += `<option value="${room.room_id}">${room.name}</option>`;
    document.querySelector("select[name='room_id']").innerHTML += `<option value="${room.room_id}">${room.name}</option>`;
    roomMap[room.room_id] = room.name;
  });
//   document.querySelector("select[name='room_id']").innerHTML += `<option value="${room.room_id}">${room.name}</option>`;

}

async function loadCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  const categories = await res.json();
  const catSelect = document.getElementById("categoryFilter");
  catSelect.innerHTML = `<option value="">All Categories</option>`;
  categories.forEach(cat => {
    document.getElementById("categoryFilter").innerHTML += `<option value="${cat.category_id}">${cat.name}</option>`;
    document.querySelector("select[name='category_id']").innerHTML += `<option value="${cat.category_id}">${cat.name}</option>`;
    categoryMap[cat.category_id] = cat.name;
  });
//   document.querySelector("select[name='category_id']").innerHTML += `<option value="${cat.category_id}">${cat.name}</option>`;
}

async function loadItems() {
  const roomId = document.getElementById("roomFilter").value;
  const catId = document.getElementById("categoryFilter").value;

  let url = `${API_BASE}/items?limit=1000`;  // ← fetch up to 1000 items

  if (roomId) url += `&room_id=${roomId}`;
  if (catId) url += `&category_id=${catId}`;

  const res = await fetch(url);
  const items = await res.json();

  const table = document.getElementById("itemsTable");
  table.innerHTML = "";

  items.forEach(item => {
    table.innerHTML += `
  <tr class="border-b border-black hover:bg-[#fce2bc] transition">
    <td class="p-3 border-r border-black">${item.name}</td>
    <td class="p-3 border-r border-black">${item.quantity}</td>
    <td class="p-3 border-r border-black">${roomMap[item.room_id] || "Unknown"}</td>
    <td class="p-3 border-r border-black">${categoryMap[item.category_id] || "Unknown"}</td>
    <td class="p-3">${item.purchase_date}</td>
  </tr>
`;
  });
}

window.onload = async () => {
  await loadRooms();
  await loadCategories();
  await loadItems();
};


document.getElementById("addItemForm").addEventListener("submit", async function (e) {
    e.preventDefault();
  
    const form = e.target;
    const formData = new FormData(form);
  
    const payload = {
      name: formData.get("name"),
      quantity: parseInt(formData.get("quantity")),
      description: formData.get("description"),
      purchase_date: formData.get("purchase_date"),
      room_id: parseInt(formData.get("room_id")),
      category_id: parseInt(formData.get("category_id")),
    };
  
    try {
      const res = await fetch(`${API_BASE}/items/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
  
      if (res.ok) {
        alert("✅ Item added!");
        form.reset();
        loadItems();
      } else {
        alert("❌ Failed to add item.");
      }
    } catch (err) {
      console.error("❌ Error submitting item:", err);
    }
  });