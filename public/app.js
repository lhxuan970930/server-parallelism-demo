// 換裝遊戲前端（純 HTML/CSS/JS）

const DEFAULT_WARDROBE = {
  baseModel: {
    front: "",
    back: "",
  },
  items: [],
};

// 分類順序（右側衣櫃）
const CATEGORY_ORDER = ["accessories", "top", "bottom", "socks", "shoes"];

// 每個分類一次顯示 5 個槽位（不足就補空白，點了不會有反應）
const PAGE_SIZE = 5;

const CATEGORY_LABELS = {
  accessories: "飾品",
  top: "上身衣物",
  bottom: "下身衣物",
  socks: "襪子",
  shoes: "鞋子",
};

// 飾品預設子分類（你也可以在 assets/wardrobe/accessories 下再加更多子資料夾，會自動出現）
const ACCESSORY_DEFAULTS = [
  { key: "headwear", label: "頭飾" },
  { key: "earrings", label: "耳飾" },
  { key: "necklace", label: "項鍊" },
  { key: "glasses", label: "眼鏡" },
  { key: "bag", label: "包包" },
];

const SLOT_BASE = [
  { key: "top", label: "上身衣物" },
  { key: "bottom", label: "下身衣物" },
  { key: "socks", label: "襪子" },
  { key: "shoes", label: "鞋子" },
];

const state = {
  wardrobe: null,
  itemsById: new Map(),

  // slotKey -> itemId | null
  equipped: new Map(),

  // slots: [{key,label,category}]
  slots: [],

  // accessories 子分類（headwear / earrings ...）
  activeAccessorySub: "headwear",

  // category:sub -> pageIndex
  pages: new Map(),

  // 人物視角（compare=false 時才有用）
  activeView: "front",

  // 預設同時顯示正反面（符合需求）
  compare: true,
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
    images: { front, back },
    thumbnail,
    zIndex: Number.isFinite(obj.zIndex) ? obj.zIndex : Number.isFinite(obj.z) ? obj.z : null,
  };
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
  } catch {
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
    .forEach((key) => {
      const label = key === "accessories" ? "其他" : titleCase(key);
      accessorySlots.push({ key, label, category: "accessories" });
    });

  const baseSlots = SLOT_BASE.map((s) => ({ ...s, category: s.key }));
  return [...accessorySlots, ...baseSlots];
}

function initEquipped(slots) {
  state.equipped = new Map();
  slots.forEach((slot) => state.equipped.set(slot.key, null));
}

function buildIndex(wardrobe) {
  state.itemsById = new Map();
  wardrobe.items.forEach((item) => state.itemsById.set(item.id, item));
}

function slotCategory(slotKey) {
  const slot = state.slots.find((s) => s.key === slotKey);
  return slot ? slot.category : slotKey;
}

function pageKey(category, accessorySub) {
  return `${category}:${accessorySub || ""}`;
}

function clampPage(page, maxPage) {
  return Math.max(0, Math.min(maxPage, page));
}

function setActiveAccessorySub(key) {
  state.activeAccessorySub = key;
  renderWardrobeShelves();
}

function equipItem(slotKey, itemId) {
  // 再點一次同一個物件＝脫掉
  const current = state.equipped.get(slotKey);
  state.equipped.set(slotKey, current === itemId ? null : itemId);
  render();
}

function renderEquippedChips() {
  const root = document.getElementById("equippedChips");
  if (!root) return;

  root.innerHTML = "";

  const equippedEntries = [];
  state.slots.forEach((slot) => {
    const itemId = state.equipped.get(slot.key);
    if (!itemId) return;
    equippedEntries.push({ slot, itemId });
  });

  if (!equippedEntries.length) {
    const empty = document.createElement("div");
    empty.className = "equipped-empty";
    empty.textContent = "尚未穿戴";
    root.appendChild(empty);
    return;
  }

  equippedEntries.forEach(({ slot, itemId }) => {
    const item = state.itemsById.get(itemId);

    const chip = document.createElement("div");
    chip.className = "equipped-chip";
    chip.tabIndex = 0;
    chip.setAttribute("role", "button");

    const label = document.createElement("span");
    label.className = "equipped-chip__label";
    label.textContent = `${slot.label}:`;

    const value = document.createElement("span");
    value.className = "equipped-chip__value";
    value.textContent = item ? item.name : itemId;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "equipped-chip__remove";
    remove.setAttribute("aria-label", `移除 ${slot.label}`);
    remove.textContent = "×";
    remove.addEventListener("click", (evt) => {
      evt.stopPropagation();
      state.equipped.set(slot.key, null);
      render();
    });

    const openShelf = () => {
      if (slot.category === "accessories") {
        setActiveAccessorySub(slot.key);
      }

      const shelf = document.querySelector(`.shelf[data-shelf="${slot.category}"]`);
      if (shelf) shelf.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    chip.addEventListener("click", openShelf);
    chip.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        openShelf();
      }
    });

    chip.appendChild(label);
    chip.appendChild(value);
    chip.appendChild(remove);
    root.appendChild(chip);
  });
}

function createSlotThumb(item, emptyLabel) {
  const thumb = document.createElement("div");
  thumb.className = "slot-thumb";

  const src = item && item.thumbnail;
  if (src) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = src;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.remove();
      const fallback = document.createElement("div");
      fallback.className = "slot-thumb__fallback";
      fallback.textContent = "圖片不存在";
      thumb.appendChild(fallback);
    });
    thumb.appendChild(img);
    return thumb;
  }

  const fallback = document.createElement("div");
  fallback.className = "slot-thumb__fallback";
  fallback.textContent = emptyLabel;
  thumb.appendChild(fallback);
  return thumb;
}

function renderShelf(category) {
  const shelf = document.createElement("section");
  shelf.className = "shelf";
  shelf.dataset.shelf = category;

  const header = document.createElement("div");
  header.className = "shelf-header";

  const title = document.createElement("div");
  title.className = "shelf-title";

  const titleName = document.createElement("div");
  titleName.className = "shelf-title__name";
  titleName.textContent = labelForCategory(category);

  const titleMeta = document.createElement("div");
  titleMeta.className = "shelf-title__meta";

  title.appendChild(titleName);
  title.appendChild(titleMeta);

  const controls = document.createElement("div");
  controls.className = "shelf-controls";

  let accessorySub = "";
  if (category === "accessories") accessorySub = state.activeAccessorySub || "accessories";

  const shelfItems = state.wardrobe.items
    .filter((item) => {
      if (item.category !== category) return false;
      if (category !== "accessories") return true;
      return (item.subcategory || "accessories") === accessorySub;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const key = pageKey(category, accessorySub);
  const total = shelfItems.length;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const currentPage = clampPage(state.pages.get(key) || 0, maxPage);
  state.pages.set(key, currentPage);

  const slotKey = category === "accessories" ? accessorySub : category;
  const equippedId = state.equipped.get(slotKey);
  const equippedItem = equippedId ? state.itemsById.get(equippedId) : null;

  const metaParts = [];
  metaParts.push(equippedItem ? `已穿戴：${equippedItem.name}` : "未穿戴");
  metaParts.push(total ? `第 ${currentPage + 1}/${maxPage + 1} 頁` : "0 件");
  titleMeta.textContent = metaParts.join(" ・ ");

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "icon-button";
  prev.textContent = "‹";
  prev.disabled = currentPage <= 0;
  prev.addEventListener("click", () => {
    state.pages.set(key, clampPage(currentPage - 1, maxPage));
    renderWardrobeShelves();
  });

  const next = document.createElement("button");
  next.type = "button";
  next.className = "icon-button";
  next.textContent = "›";
  next.disabled = currentPage >= maxPage;
  next.addEventListener("click", () => {
    state.pages.set(key, clampPage(currentPage + 1, maxPage));
    renderWardrobeShelves();
  });

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "text-button";
  clear.textContent = "清除";
  clear.disabled = !equippedId;
  clear.addEventListener("click", () => {
    state.equipped.set(slotKey, null);
    render();
  });

  controls.appendChild(prev);
  controls.appendChild(next);
  controls.appendChild(clear);

  header.appendChild(title);
  header.appendChild(controls);

  shelf.appendChild(header);

  // accessories 子分類按鈕（頭飾/耳飾...）
  if (category === "accessories") {
    const subnav = document.createElement("div");
    subnav.className = "shelf-subnav";

    state.slots
      .filter((s) => s.category === "accessories")
      .forEach((slot) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "subcategory-button" + (accessorySub === slot.key ? " is-active" : "");
        btn.textContent = slot.label;
        btn.addEventListener("click", () => setActiveAccessorySub(slot.key));
        subnav.appendChild(btn);
      });

    shelf.appendChild(subnav);
  }

  const slotsRow = document.createElement("div");
  slotsRow.className = "shelf-slots";
  slotsRow.setAttribute("role", "list");

  const start = currentPage * PAGE_SIZE;
  const slice = shelfItems.slice(start, start + PAGE_SIZE);

  for (let i = 0; i < PAGE_SIZE; i += 1) {
    const item = slice[i];

    const card = document.createElement("button");
    card.type = "button";
    card.className = "slot-card";

    if (!item) {
      card.disabled = true;
      card.setAttribute("aria-disabled", "true");
      card.appendChild(createSlotThumb(null, "空白"));

      const name = document.createElement("div");
      name.className = "slot-name";
      name.textContent = "（空）";
      card.appendChild(name);

      slotsRow.appendChild(card);
      continue;
    }

    card.classList.toggle("is-selected", equippedId === item.id);
    card.appendChild(createSlotThumb(item, "沒有預覽"));

    const name = document.createElement("div");
    name.className = "slot-name";
    name.textContent = item.name;

    card.appendChild(name);
    card.addEventListener("click", () => equipItem(slotKey, item.id));

    slotsRow.appendChild(card);
  }

  shelf.appendChild(slotsRow);
  return shelf;
}

function renderWardrobeShelves() {
  const root = document.getElementById("wardrobeShelves");
  if (!root) return;

  root.innerHTML = "";
  CATEGORY_ORDER.forEach((category) => root.appendChild(renderShelf(category)));
}

function guessZIndex(slotKey, idx) {
  const cat = slotCategory(slotKey);

  if (cat === "socks") return 10;
  if (cat === "shoes") return 20;
  if (cat === "bottom") return 30;
  if (cat === "top") return 40;
  if (cat === "accessories") return 60;

  return 70 + idx;
}

function getItemImageForView(item, view) {
  // 若沒有提供背面（back.png），背面就不顯示（符合：沒圖片就不要出現）
  const specific = item.images && item.images[view];
  return specific || "";
}

function applyBaseImage(frameEl, view, src) {
  const img = frameEl.querySelector(".model-base");
  const placeholder = frameEl.querySelector('.model-placeholder[data-kind="base"]');

  img.onerror = null;

  if (!src) {
    img.removeAttribute("src");
    img.style.display = "none";
    placeholder.style.display = "grid";
    placeholder.querySelector(".model-placeholder__text").textContent = `尚未放入人物底圖（${view === "front" ? "正面" : "背面"}）`;
    return;
  }

  img.style.display = "block";
  placeholder.style.display = "none";

  img.onerror = () => {
    img.style.display = "none";
    placeholder.style.display = "grid";
    placeholder.querySelector(".model-placeholder__text").textContent = `人物底圖讀取失敗（${view === "front" ? "正面" : "背面"}）`;
  };

  img.src = src;
}

function renderModel() {
  const stage = document.getElementById("modelStage");
  if (!stage) return;

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
      img.addEventListener("error", () => img.remove());

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
  if (!compareToggle) return;

  compareToggle.checked = state.compare;
  compareToggle.addEventListener("change", () => {
    state.compare = compareToggle.checked;
    renderModel();
  });
}

function render() {
  renderEquippedChips();
  renderWardrobeShelves();
  renderModel();
}

function mount() {
  initViewControls();
  render();
}

document.addEventListener("DOMContentLoaded", async () => {
  state.wardrobe = await loadWardrobe();
  state.wardrobe.items = Array.isArray(state.wardrobe.items) ? state.wardrobe.items : [];

  state.slots = computeSlots(state.wardrobe);
  initEquipped(state.slots);
  buildIndex(state.wardrobe);

  const firstAcc = state.slots.find((s) => s.category === "accessories");
  state.activeAccessorySub = firstAcc ? firstAcc.key : "headwear";

  mount();
});
