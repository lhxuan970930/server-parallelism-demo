const DEFAULT_WARDROBE = {
  baseModel: {
    front: "",
    back: "",
  },
  items: [
    { id: "acc_headwear_beanie", name: "Beanie", category: "accessories", subcategory: "headwear" },
    { id: "acc_earrings_studs", name: "Stud Earrings", category: "accessories", subcategory: "earrings" },
    { id: "acc_necklace_chain", name: "Chain Necklace", category: "accessories", subcategory: "necklace" },
    { id: "top_tee", name: "T-Shirt", category: "top" },
    { id: "top_hoodie", name: "Hoodie", category: "top" },
    { id: "bottom_jeans", name: "Jeans", category: "bottom" },
    { id: "bottom_skirt", name: "Skirt", category: "bottom" },
    { id: "socks_ankle", name: "Ankle Socks", category: "socks" },
    { id: "shoes_sneakers", name: "Sneakers", category: "shoes" },
  ],
};

const CATEGORY_ORDER = ["accessories", "top", "bottom", "socks", "shoes"];

const CATEGORY_LABELS = {
  accessories: "飾品",
  top: "上身",
  bottom: "下身",
  socks: "襪子",
  shoes: "鞋子",
};

const ACCESSORY_DEFAULTS = [
  { key: "headwear", label: "頭飾" },
  { key: "earrings", label: "耳飾" },
  { key: "necklace", label: "項鍊" },
  { key: "glasses", label: "眼鏡" },
  { key: "bag", label: "包包" },
];

const SLOT_BASE = [
  { key: "top", label: "上身" },
  { key: "bottom", label: "下身" },
  { key: "socks", label: "襪子" },
  { key: "shoes", label: "鞋子" },
];

const state = {
  wardrobe: null,
  itemsById: new Map(),
  equipped: new Map(),
  slots: [],
  activeCategory: "accessories",
  activeAccessorySub: "headwear",
  activeView: "front",
  compare: false,
};

function flattenCategories(categories) {
  const items = [];

  categories.forEach((cat) => {
    const categoryName = String(cat.name || cat.category || cat.id || "").toLowerCase();
    const directItems = Array.isArray(cat.items) ? cat.items : [];

    directItems.forEach((it) => {
      items.push({ ...it, category: it.category || categoryName, subcategory: it.subcategory || "" });
    });

    const subcats = Array.isArray(cat.subcategories) ? cat.subcategories : [];
    subcats.forEach((sub) => {
      const subName = String(sub.name || sub.subcategory || sub.id || "").toLowerCase();
      const subItems = Array.isArray(sub.items) ? sub.items : [];
      subItems.forEach((it) => {
        items.push({ ...it, category: it.category || categoryName, subcategory: it.subcategory || subName });
      });
    });
  });

  return items;
}

function normalizeWardrobe(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};

  const items = Array.isArray(obj)
    ? obj
    : Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.wardrobe)
        ? obj.wardrobe
        : Array.isArray(obj.categories)
          ? flattenCategories(obj.categories)
          : [];

  const base = obj.baseModel || obj.base || obj.model || {};

  return {
    baseModel: {
      front: base.front || base.frontImage || base.frontSrc || "",
      back: base.back || base.backImage || base.backSrc || "",
    },
    items: items.map((item, idx) => normalizeItem(item, idx)),
  };
}

function normalizeItem(item, idx) {
  const obj = item && typeof item === "object" ? item : {};

  const category = String(obj.category || obj.type || obj.slot || "misc").toLowerCase();
  const subcategory = obj.subcategory || obj.subType || obj.sub || "";

  const front =
    obj.frontImage ||
    obj.front ||
    obj.imageFront ||
    (obj.images && (obj.images.front || obj.images.Front)) ||
    "";

  const back =
    obj.backImage ||
    obj.back ||
    obj.imageBack ||
    (obj.images && (obj.images.back || obj.images.Back)) ||
    "";

  const thumbnail = obj.thumbnail || obj.thumb || obj.preview || front || "";

  return {
    id: String(obj.id || obj.slug || `${category}_${idx}`),
    name: String(obj.name || obj.title || obj.label || obj.id || "物件"),
    category,
    subcategory: subcategory ? String(subcategory).toLowerCase() : "",
    slot: obj.slotKey || obj.slot || "",
    images: { front, back },
    thumbnail,
    zIndex: Number.isFinite(obj.zIndex) ? obj.zIndex : Number.isFinite(obj.z) ? obj.z : null,
  };
}

function getSlotKeyForSelection(category, accessorySub) {
  if (category === "accessories") return accessorySub || "accessories";
  return category;
}

function getSlotKeyFromItem(item) {
  if (item.slot) return String(item.slot).toLowerCase();
  if (item.category === "accessories") return item.subcategory || "accessories";
  return item.category;
}

function guessZIndex(slotKey, idx) {
  if (slotKey === "socks") return 10;
  if (slotKey === "shoes") return 20;
  if (slotKey === "bottom") return 30;
  if (slotKey === "top") return 40;
  if (slotKey === "accessories") return 60;
  return 70 + idx;
}

function getItemImageForView(item, view) {
  const specific = item.images && item.images[view];
  if (specific) return specific;

  const other = item.images && item.images[view === "front" ? "back" : "front"];
  if (other) return other;

  return "";
}

function titleCase(str) {
  return String(str)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelForCategory(categoryKey) {
  return CATEGORY_LABELS[categoryKey] || titleCase(categoryKey);
}

function labelForSlot(slotKey) {
  const found = state.slots.find((s) => s.key === slotKey);
  return found ? found.label : titleCase(slotKey);
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text || "";
}

async function loadWardrobe() {
  try {
    const res = await fetch("/api/wardrobe", { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    setStatus("已載入衣櫃資料（/api/wardrobe）");
    return normalizeWardrobe(json);
  } catch (err) {
    setStatus("無法讀取 /api/wardrobe，改用內建範例資料");
    return normalizeWardrobe(DEFAULT_WARDROBE);
  }
}

function computeSlots(wardrobe) {
  const accessorySubs = new Set();

  wardrobe.items.forEach((item) => {
    if (item.category !== "accessories") return;
    const key = item.subcategory || "accessories";
    accessorySubs.add(key);
  });

  const accessorySlots = [];
  const defaultKeys = new Set(ACCESSORY_DEFAULTS.map((d) => d.key));

  ACCESSORY_DEFAULTS.forEach((d) => accessorySlots.push({ key: d.key, label: d.label, category: "accessories" }));
  Array.from(accessorySubs)
    .filter((key) => !defaultKeys.has(key))
    .sort()
    .forEach((key) => accessorySlots.push({ key, label: titleCase(key), category: "accessories" }));

  const baseSlots = SLOT_BASE.map((s) => ({ ...s, category: s.key }));
  return [...accessorySlots, ...baseSlots];
}

function initEquipped(slots) {
  state.equipped = new Map();
  slots.forEach((slot) => state.equipped.set(slot.key, null));
}

function setActiveCategory(category) {
  state.activeCategory = category;

  if (category !== "accessories") {
    renderSubcategories();
    renderItems();
    renderCategoryNav();
    return;
  }

  if (!state.activeAccessorySub) {
    const firstAcc = state.slots.find((s) => s.category === "accessories");
    state.activeAccessorySub = firstAcc ? firstAcc.key : "headwear";
  }

  renderSubcategories();
  renderItems();
  renderCategoryNav();
}

function setAccessorySubcategory(key) {
  state.activeAccessorySub = key;
  renderSubcategories();
  renderItems();
}

function equipItem(slotKey, itemId) {
  state.equipped.set(slotKey, itemId);
  renderEquippedPanel();
  renderModel();
  renderItems();
}

function renderCategoryNav() {
  const nav = document.getElementById("categoryNav");
  nav.innerHTML = "";

  const categories = CATEGORY_ORDER;

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-button" + (state.activeCategory === cat ? " is-active" : "");
    btn.textContent = labelForCategory(cat);
    btn.dataset.category = cat;
    btn.addEventListener("click", () => setActiveCategory(cat));
    nav.appendChild(btn);
  });
}

function renderSubcategories() {
  const subNav = document.getElementById("subcategoryNav");
  subNav.innerHTML = "";

  if (state.activeCategory !== "accessories") {
    subNav.style.display = "none";
    return;
  }

  subNav.style.display = "flex";

  const accessorySlots = state.slots.filter((s) => s.category === "accessories");
  accessorySlots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "subcategory-button" + (state.activeAccessorySub === slot.key ? " is-active" : "");
    btn.textContent = slot.label;
    btn.dataset.subcategory = slot.key;
    btn.addEventListener("click", () => setAccessorySubcategory(slot.key));
    subNav.appendChild(btn);
  });
}

function createThumb(item) {
  const thumb = document.createElement("div");
  thumb.className = "item-thumb";

  const src = item.thumbnail;
  if (src) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = src;
    img.loading = "lazy";

    img.addEventListener("error", () => {
      img.remove();
      const fallback = document.createElement("div");
      fallback.className = "item-thumb__fallback";
      fallback.textContent = "圖片不存在";
      thumb.appendChild(fallback);
    });

    thumb.appendChild(img);
    return thumb;
  }

  const fallback = document.createElement("div");
  fallback.className = "item-thumb__fallback";
  fallback.textContent = "沒有預覽";
  thumb.appendChild(fallback);
  return thumb;
}

function renderItems() {
  const grid = document.getElementById("itemsGrid");
  grid.innerHTML = "";

  const slotKey = getSlotKeyForSelection(state.activeCategory, state.activeAccessorySub);
  const equippedId = state.equipped.get(slotKey);

  const noneCard = document.createElement("button");
  noneCard.type = "button";
  noneCard.className = "item-card" + (!equippedId ? " is-selected" : "");
  noneCard.dataset.none = "true";
  noneCard.innerHTML = `
    <div class="item-thumb"><div class="item-thumb__fallback">無</div></div>
    <div>
      <div class="item-name">無</div>
      <div class="item-meta">從 ${labelForSlot(slotKey)} 移除</div>
    </div>
  `;
  noneCard.addEventListener("click", () => equipItem(slotKey, null));
  grid.appendChild(noneCard);

  const items = state.wardrobe.items
    .filter((item) => {
      if (state.activeCategory !== item.category) return false;
      if (state.activeCategory !== "accessories") return true;
      return (item.subcategory || "accessories") === slotKey;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "item-card";
    empty.style.cursor = "default";
    empty.innerHTML = `
      <div class="item-thumb"><div class="item-thumb__fallback">空</div></div>
      <div>
        <div class="item-name">這個分類目前沒有物件</div>
        <div class="item-meta">把 PNG 放到 assets/wardrobe 後，重新整理頁面即可看到</div>
      </div>
    `;
    grid.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "item-card" + (equippedId === item.id ? " is-selected" : "");
    card.appendChild(createThumb(item));

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name;
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = item.images.back ? "正面＋背面" : item.images.front ? "只有正面" : "沒有圖片";
    text.appendChild(name);
    text.appendChild(meta);

    card.appendChild(text);
    card.addEventListener("click", () => equipItem(slotKey, item.id));
    grid.appendChild(card);
  });
}

function renderEquippedPanel() {
  const panel = document.getElementById("equippedPanel");
  panel.innerHTML = "";

  state.slots.forEach((slot) => {
    const wrap = document.createElement("div");
    wrap.className = "equipped-slot";

    const top = document.createElement("div");
    top.className = "equipped-slot__top";

    const label = document.createElement("div");
    label.className = "slot-label";
    label.textContent = slot.label;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "移除";

    const equippedId = state.equipped.get(slot.key);
    remove.disabled = !equippedId;
    remove.addEventListener("click", () => equipItem(slot.key, null));

    top.appendChild(label);
    top.appendChild(remove);

    const value = document.createElement("div");
    value.className = "slot-value";

    if (!equippedId) {
      value.textContent = "無";
    } else {
      const item = state.itemsById.get(equippedId);
      value.textContent = item ? item.name : equippedId;
    }

    wrap.appendChild(top);
    wrap.appendChild(value);
    panel.appendChild(wrap);
  });
}

function applyBaseImage(frameEl, view, src) {
  const img = frameEl.querySelector(".model-base");
  const placeholder = frameEl.querySelector('.model-placeholder[data-kind="base"]');

  if (!src) {
    img.removeAttribute("src");
    img.style.display = "none";
    placeholder.style.display = "grid";
    placeholder.querySelector(".model-placeholder__text").textContent = `尚未放入人物底圖（${view === "front" ? "正面" : "背面"}）`;
    return;
  }

  img.style.display = "block";
  img.src = src;
  placeholder.style.display = "none";

  img.addEventListener(
    "error",
    () => {
      img.style.display = "none";
      placeholder.style.display = "grid";
      placeholder.querySelector(".model-placeholder__text").textContent = `人物底圖讀取失敗（${view === "front" ? "正面" : "背面"}）`;
    },
    { once: true }
  );
}

function renderModel() {
  const stage = document.getElementById("modelStage");
  stage.dataset.mode = state.compare ? "compare" : "single";
  stage.dataset.activeView = state.activeView;

  const equippedItems = [];
  let i = 0;
  for (const [slotKey, itemId] of state.equipped.entries()) {
    if (!itemId) continue;
    const item = state.itemsById.get(itemId);
    if (!item) continue;
    const z = item.zIndex ?? guessZIndex(slotKey, i);
    equippedItems.push({ slotKey, item, z, i });
    i += 1;
  }

  equippedItems.sort((a, b) => a.z - b.z || a.i - b.i);

  stage.querySelectorAll(".model-view").forEach((viewEl) => {
    const view = viewEl.dataset.view;
    const frame = viewEl.querySelector(".model-frame");
    const overlays = viewEl.querySelector(".model-overlays");

    overlays.innerHTML = "";
    applyBaseImage(frame, view, state.wardrobe.baseModel[view]);

    equippedItems.forEach(({ slotKey, item, z }) => {
      const src = getItemImageForView(item, view);
      if (!src) return;

      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
      img.style.zIndex = String(z);
      img.dataset.slot = slotKey;

      img.addEventListener("error", () => {
        img.remove();
      });

      overlays.appendChild(img);
    });
  });
}

function setActiveView(view) {
  state.activeView = view;

  document.querySelectorAll(".segmented-button").forEach((btn) => {
    const isActive = btn.dataset.view === view;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  renderModel();
}

function initViewControls() {
  document.querySelectorAll(".segmented-button").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });

  const compareToggle = document.getElementById("compareToggle");
  compareToggle.addEventListener("change", () => {
    state.compare = compareToggle.checked;
    renderModel();
  });
}

function buildIndex(wardrobe) {
  state.itemsById = new Map();
  wardrobe.items.forEach((item) => state.itemsById.set(item.id, item));
}

function mount() {
  initViewControls();

  // setActiveCategory() 內會觸發：renderSubcategories + renderItems + renderCategoryNav
  setActiveCategory(state.activeCategory);

  renderEquippedPanel();
  renderModel();
}

document.addEventListener("DOMContentLoaded", async () => {
  state.wardrobe = await loadWardrobe();
  buildIndex(state.wardrobe);

  state.slots = computeSlots(state.wardrobe);
  initEquipped(state.slots);

  const firstAcc = state.slots.find((s) => s.category === "accessories");
  state.activeAccessorySub = firstAcc ? firstAcc.key : "headwear";

  mount();
});
