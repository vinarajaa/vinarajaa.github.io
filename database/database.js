const API_BASE = "https://house-inventory-c5c7cyfpfqe9e6gk.westus-01.azurewebsites.net";
const STORAGE_KEY = "hearth-inventory-demo-v2";
const ADD_ROOM_VALUE = "__add_room__";
const ADD_CATEGORY_VALUE = "__add_category__";
const fallbackRooms = [{room_id:1,name:"Living room"},{room_id:2,name:"Kitchen"},{room_id:3,name:"Bedroom"},{room_id:4,name:"Office"}];
const fallbackCategories = [{category_id:1,name:"Furniture"},{category_id:2,name:"Electronics"},{category_id:3,name:"Kitchenware"},{category_id:4,name:"Decor"},{category_id:5,name:"Books"}];
const fallbackItems = [
  {item_id:1,name:"Linen sofa",quantity:1,room_id:1,category_id:1,purchase_date:"2025-09-18",description:"Warm ivory, three seat"},
  {item_id:2,name:"Oak coffee table",quantity:1,room_id:1,category_id:1,purchase_date:"2025-10-04",description:"Round, natural finish"},
  {item_id:3,name:"Pour-over kettle",quantity:1,room_id:2,category_id:3,purchase_date:"2026-01-12",description:"Matte black"},
  {item_id:4,name:"Bedside lamp",quantity:2,room_id:3,category_id:4,purchase_date:"2025-11-21",description:"Rice paper shade"},
  {item_id:5,name:"Studio monitor",quantity:2,room_id:4,category_id:2,purchase_date:"2026-02-03",description:"Desktop speakers"},
  {item_id:6,name:"Design library",quantity:14,room_id:4,category_id:5,purchase_date:"2026-03-02",description:"Reference shelf"}
];
let rooms=[],categories=[],allItems=[],demoMode=false,selectedDeleteId=null;
const el=id=>document.getElementById(id);
const roomName=id=>rooms.find(room=>String(room.room_id)===String(id))?.name||"Unassigned";
const categoryName=id=>categories.find(category=>String(category.category_id)===String(id))?.name||"Uncategorized";
const escapeHtml=(value="")=>String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

function loadLocalData(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.items?.length)return saved}catch(_){}return{rooms:fallbackRooms,categories:fallbackCategories,items:fallbackItems}}
function saveLocalData(){if(demoMode)localStorage.setItem(STORAGE_KEY,JSON.stringify({rooms,categories,items:allItems}))}
async function fetchJson(path){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);try{const response=await fetch(API_BASE+path,{signal:controller.signal});if(!response.ok)throw new Error(String(response.status));return await response.json()}finally{clearTimeout(timer)}}

async function initialize(){bindEvents();try{const[roomData,categoryData,itemData]=await Promise.all([fetchJson("/rooms"),fetchJson("/categories"),fetchJson("/items?limit=1000")]);if(!Array.isArray(roomData)||!Array.isArray(categoryData)||!Array.isArray(itemData))throw new Error("Unexpected response");rooms=roomData;categories=categoryData;allItems=itemData;el("app-status").textContent="Connected to your live inventory."}catch(error){demoMode=true;const local=loadLocalData();rooms=local.rooms;categories=local.categories;allItems=local.items;el("app-status").textContent="Demo workspace · Changes are saved in this browser."}populateControls();applyFilters()}

function bindEvents(){
  el("searchInput").addEventListener("input",applyFilters);el("roomFilter").addEventListener("change",applyFilters);el("categoryFilter").addEventListener("change",applyFilters);el("clearFilters").addEventListener("click",clearAllFilters);el("addItemFormStyled").addEventListener("submit",handleAddItemSubmit);el("add-form-room").addEventListener("change",handleNewRoom);el("add-form-category").addEventListener("change",handleNewCategory);
  el("gridViewButton").addEventListener("click",()=>setView("grid"));el("listViewButton").addEventListener("click",()=>setView("list"));el("menuButton").addEventListener("click",toggleSidebar);el("sidebarScrim").addEventListener("click",closeSidebar);
  document.querySelector("[data-view='all']").addEventListener("click",()=>{el("roomFilter").value="";applyFilters();closeSidebar()});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeAddModal();closeDeleteModal();closeSidebar()}})
}

function populateControls(){
  el("roomFilter").innerHTML='<option value="">All rooms</option>'+rooms.map(r=>`<option value="${r.room_id}">${escapeHtml(r.name)}</option>`).join("");
  el("categoryFilter").innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option value="${c.category_id}">${escapeHtml(c.name)}</option>`).join("");
  el("add-form-room").innerHTML='<option value="">Choose a room</option>'+rooms.map(r=>`<option value="${r.room_id}">${escapeHtml(r.name)}</option>`).join("")+`<option value="${ADD_ROOM_VALUE}">＋ Add a new room</option>`;
  el("add-form-category").innerHTML='<option value="">Choose a category</option>'+categories.map(c=>`<option value="${c.category_id}">${escapeHtml(c.name)}</option>`).join("")+`<option value="${ADD_CATEGORY_VALUE}">＋ Add a new category</option>`;
  el("roomNav").innerHTML=rooms.map(room=>`<button class="nav-item" type="button" data-room-id="${room.room_id}"><span aria-hidden="true">○</span>${escapeHtml(room.name)}</button>`).join("");
  el("roomNav").querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{el("roomFilter").value=button.dataset.roomId;applyFilters();closeSidebar()}))
}

function applyFilters(){const query=el("searchInput").value.trim().toLowerCase(),roomId=el("roomFilter").value,categoryId=el("categoryFilter").value;const filtered=allItems.filter(item=>(!query||[item.name,item.description,roomName(item.room_id),categoryName(item.category_id)].join(" ").toLowerCase().includes(query))&&(!roomId||String(item.room_id)===roomId)&&(!categoryId||String(item.category_id)===categoryId));renderItems(filtered);updateStats(allItems);setActiveRoom(roomId)}
function renderItems(items){
  el("resultCount").textContent=`${items.length} ${items.length===1?"belonging":"belongings"} shown`;el("emptyState").hidden=items.length>0;
  el("itemsGrid").innerHTML=items.map(item=>{const name=escapeHtml(item.name||"Untitled item"),room=escapeHtml(roomName(item.room_id)),category=escapeHtml(categoryName(item.category_id));return`<article class="item-card"><div class="item-top"><span class="item-glyph" aria-hidden="true">${name.charAt(0).toUpperCase()}</span><button class="item-menu" type="button" data-delete-id="${item.item_id}" aria-label="Delete ${name}" title="Delete item">×</button></div><div><h3>${name}</h3><p class="item-location">${room}${item.purchase_date?` · ${formatDate(item.purchase_date)}`:""}</p></div><div class="item-footer"><span class="category-pill">${category}</span><span class="quantity">Qty ${Number(item.quantity)||1}</span></div></article>`}).join("");
  el("itemsGrid").querySelectorAll("[data-delete-id]").forEach(button=>button.addEventListener("click",()=>openDeleteModal(Number(button.dataset.deleteId))))
}
function updateStats(items){el("stat-total").textContent=items.length;el("quantityDetail").textContent=`${items.reduce((sum,item)=>sum+(Number(item.quantity)||1),0)} total units`;el("stat-rooms").textContent=new Set(items.map(item=>item.room_id).filter(Boolean)).size;el("stat-categories").textContent=new Set(items.map(item=>item.category_id).filter(Boolean)).size;const dates=items.map(item=>item.purchase_date).filter(Boolean).sort();el("stat-recent").textContent=dates.length?formatDate(dates[dates.length-1],true):"—"}
function formatDate(value,short=false){const date=new Date(`${value}T12:00:00`);if(Number.isNaN(date.getTime()))return escapeHtml(value);return date.toLocaleDateString(undefined,short?{month:"short",year:"numeric"}:{month:"short",day:"numeric",year:"numeric"})}
function setView(mode){el("itemsGrid").classList.toggle("list-view",mode==="list");el("gridViewButton").classList.toggle("is-active",mode==="grid");el("listViewButton").classList.toggle("is-active",mode==="list")}
function clearAllFilters(){el("searchInput").value="";el("roomFilter").value="";el("categoryFilter").value="";applyFilters()}
function setActiveRoom(roomId){document.querySelectorAll(".side-nav .nav-item").forEach(button=>button.classList.toggle("is-active",roomId?button.dataset.roomId===roomId:button.dataset.view==="all"))}

function showModal(id){const modal=el(id);modal.hidden=false;modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden"}
function hideModal(id){const modal=el(id);modal.hidden=true;modal.setAttribute("aria-hidden","true");document.body.style.overflow=""}
function openAddModal(){showModal("add-modal");setTimeout(()=>el("addItemFormStyled").elements.name.focus(),0)}function closeAddModal(){hideModal("add-modal")}

async function handleAddItemSubmit(event){event.preventDefault();const form=event.currentTarget,data=new FormData(form);const payload={name:data.get("name").trim(),quantity:Number(data.get("quantity"))||1,purchase_date:data.get("purchase_date")||"",room_id:data.get("room_id")?Number(data.get("room_id")):null,category_id:data.get("category_id")?Number(data.get("category_id")):null,description:data.get("description").trim()};if(demoMode){payload.item_id=allItems.reduce((max,item)=>Math.max(max,Number(item.item_id)||0),0)+1;allItems.unshift(payload);saveLocalData()}else{try{const response=await fetch(API_BASE+"/items/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw new Error(String(response.status));const saved=await response.json();allItems.unshift({...payload,...saved})}catch(_){el("app-status").textContent="The item could not be saved. Please try again.";return false}}form.reset();closeAddModal();populateControls();applyFilters();el("app-status").textContent=demoMode?"Item saved in this browser.":"Item added to your inventory.";return false}
function handleNewRoom(event){handleNewOption(event,"room")}function handleNewCategory(event){handleNewOption(event,"category")}
function handleNewOption(event,type){const sentinel=type==="room"?ADD_ROOM_VALUE:ADD_CATEGORY_VALUE;if(event.target.value!==sentinel)return;const label=window.prompt(`Name your new ${type}:`)?.trim();if(!label){event.target.value="";return}const collection=type==="room"?rooms:categories,key=type==="room"?"room_id":"category_id",id=collection.reduce((max,item)=>Math.max(max,Number(item[key])||0),0)+1;collection.push({[key]:id,name:label});saveLocalData();populateControls();el(type==="room"?"add-form-room":"add-form-category").value=id}
function openDeleteModal(id){selectedDeleteId=id;const item=allItems.find(entry=>Number(entry.item_id)===id);el("deleteItemName").textContent=item?.name||"this item";showModal("delete-modal")}function closeDeleteModal(){selectedDeleteId=null;hideModal("delete-modal")}
async function confirmDelete(){if(selectedDeleteId==null)return;if(!demoMode){try{const response=await fetch(`${API_BASE}/items/${selectedDeleteId}`,{method:"DELETE"});if(!response.ok)throw new Error(String(response.status))}catch(_){el("app-status").textContent="The item could not be deleted. Please try again.";closeDeleteModal();return}}allItems=allItems.filter(item=>Number(item.item_id)!==selectedDeleteId);saveLocalData();closeDeleteModal();applyFilters();el("app-status").textContent=demoMode?"Item removed from this browser.":"Item removed from your inventory."}
function toggleSidebar(){const open=!document.querySelector(".sidebar").classList.contains("is-open");document.querySelector(".sidebar").classList.toggle("is-open",open);el("sidebarScrim").hidden=!open;el("menuButton").setAttribute("aria-expanded",String(open))}function closeSidebar(){document.querySelector(".sidebar").classList.remove("is-open");el("sidebarScrim").hidden=true;el("menuButton").setAttribute("aria-expanded","false")}
window.openAddModal=openAddModal;window.closeAddModal=closeAddModal;window.closeDeleteModal=closeDeleteModal;window.confirmDelete=confirmDelete;window.clearAllFilters=clearAllFilters;document.addEventListener("DOMContentLoaded",initialize);
