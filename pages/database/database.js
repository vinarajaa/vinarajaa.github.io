const API_BASE = "https://house-inventory-c5c7cyfpfqe9e6gk.westus-01.azurewebsites.net/";  // Update if hosted differently
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


async function loadItems(searchTerm = "") {
  const roomId = document.getElementById("roomFilter").value;
  const catId = document.getElementById("categoryFilter").value;

  let url = `${API_BASE}/items?limit=1000`;

  if (roomId) url += `&room_id=${roomId}`;
  if (catId) url += `&category_id=${catId}`;
  if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

  const res = await fetch(url);
  const items = await res.json();

  const table = document.getElementById("itemsTable");
  table.innerHTML = "";

  items.forEach(item => {
    table.innerHTML += `
      <tr class="border-b border-black hover:bg-[#fce2bc] transition">
        <td class="p-3 border-r border-black"><input type="checkbox" class="select-item" data-id="${item.item_id}" /></td>
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
  document.getElementById("filterControls").classList.add("hidden");
  await loadRooms();
  await loadCategories();
  await loadItems();
};


// document.getElementById("addItemForm").addEventListener("submit", async function (e) {
//     e.preventDefault();
  
//     const form = e.target;
//     const formData = new FormData(form);
  
//     const payload = {
//       name: formData.get("name"),
//       quantity: parseInt(formData.get("quantity")),
//       description: formData.get("description"),
//       purchase_date: formData.get("purchase_date"),
//       room_id: parseInt(formData.get("room_id")),
//       category_id: parseInt(formData.get("category_id")),
//     };
  
//     try {
//       const res = await fetch(`${API_BASE}/items/`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify(payload)
//       });
  
//       if (res.ok) {
//         alert("✅ Item added!");
//         form.reset();
//         await loadRooms();
// await loadCategories();
//         loadItems();
//       } else {
//         alert("❌ Failed to add item.");
//       }
//     } catch (err) {
//       console.error("❌ Error submitting item:", err);
//     }
//   });

function toggleFilters() {
  const el = document.getElementById("filterControls");
  if (el.classList.contains("hidden")) {
    el.classList.remove("hidden");
    el.classList.add("flex");
  } else {
    el.classList.remove("flex");
    el.classList.add("hidden");
  }
}
  function openAddModal() {
    document.getElementById("add-modal").style.display = "flex";
  }
  
  function closeAddModal() {
    document.getElementById("add-modal").style.display = "none";
    document.getElementById("thank-you-message").style.display = "none";
  }
  
  async function handleAddItemSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
  
    const payload = {
      name: formData.get("name"),
      quantity: parseInt(formData.get("quantity")),
      description: formData.get("description"),
      purchase_date: formData.get("purchase_date"),
      room_id: parseInt(formData.get("room_id")),
      category_id: parseInt(formData.get("category_id"))
    };
  
    const res = await fetch(`${API_BASE}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  
    if (res.ok) {
      form.reset();
      document.getElementById("thank-you-message").style.display = "block";
      await loadItems();
    } else {
      alert("❌ Failed to add item.");
    }
  
    return false;
  }

  async function updateStats(items) {
    const total = items.length;
    const rooms = new Set(items.map(i => i.room_id)).size;
    const categories = new Set(items.map(i => i.category_id)).size;
  
    let mostRecent = items.length
      ? new Date(Math.max(...items.map(i => new Date(i.purchase_date)))).toLocaleDateString()
      : "—";
  
    document.getElementById("stat-total").innerText = total;
    document.getElementById("stat-rooms").innerText = rooms;
    document.getElementById("stat-categories").innerText = categories;
    document.getElementById("stat-recent").innerText = mostRecent;
  }

  function openNewListModal() {
    document.getElementById("newListModal").style.display = "flex";
  }
  
  function closeNewListModal() {
    document.getElementById("newListModal").style.display = "none";
  }
  
  function createList() {
    const title = document.getElementById("newListTitle").value.trim();
    if (!title) return;
  
    const container = document.getElementById("listsContainer");
    const div = document.createElement("div");
    div.className = "bg-[#f9e3ca] p-3 rounded border border-black";
    div.innerHTML = `<h4 class="font-bold">${title}</h4><ul class="text-sm text-[#270f03] pl-4 list-disc mt-2"><li>(List is empty)</li></ul>`;
    container.appendChild(div);
  
    closeNewListModal();
    document.getElementById("newListTitle").value = "";
  }

  function openDeleteModal() {
    const checkboxes = document.querySelectorAll(".item-checkbox:checked");
    const count = checkboxes.length;
  
    if (count === 0) {
      alert("Please select at least one item to delete.");
      return;
    }
  
    document.getElementById("delete-count").textContent = count;
    document.getElementById("delete-modal").style.display = "flex";
  }
  
  function closeDeleteModal() {
    document.getElementById("delete-modal").style.display = "none";
  }
  
  async function confirmDelete() {
    const checked = document.querySelectorAll(".item-checkbox:checked");
    const idsToDelete = Array.from(checked).map(cb => parseInt(cb.value));
  
    try {
      for (let id of idsToDelete) {
        await fetch(`${API_BASE}/items/${id}`, {
          method: "DELETE"
        });
      }
  
      closeDeleteModal();
      loadItems();
      document.getElementById("delete-success-message").classList.remove("hidden");

setTimeout(() => {
  document.getElementById("delete-modal").classList.add("hidden");
  document.getElementById("delete-success-message").classList.add("hidden");
}, 2000);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("❌ Something went wrong.");
    }
  }

  function handleSearch() {
    const query = document.getElementById("searchInput").value.trim();
    loadItems(query);
  }

  document.getElementById("searchInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      handleSearch();
    }
  });