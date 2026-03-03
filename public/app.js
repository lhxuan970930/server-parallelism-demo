// 換裝遊戲前端（純 HTML/CSS/JS）
// - 只支援正面（front）
// - 純靜態版：素材清單內建於 app.js（不使用 config.js）

(() => {
  // 內建素材清單（請把對應 PNG 放在 public/ 下的路徑）
  const WARDROBE_DATA = {
    baseModel: {
      front: "./模特兒/model.png",
    },
    items: [
      {
        id: "accessory_necklace",
        name: "項鍊",
        category: "首飾",
        front: "./裝扮/首飾/項鍊.png",
      },
      {
        id: "top_sweater",
        name: "毛衣",
        category: "上衣",
        front: "./裝扮/上衣/毛衣.png",
      },
      {
        id: "bottom_skirt",
        name: "裙子",
        category: "下身裝扮",
        front: "./裝扮/下身裝扮/裙子.png",
      },
      {
        id: "shoes_sneakers",
        name: "球鞋",
        category: "鞋子",
        front: "./裝扮/鞋子/球鞋.png",
      },
      {
        id: "socks_long",
        name: "長襪",
        category: "襪子",
        front: "./裝扮/襪子/長襪.png",
      },
    ],
  };

  const CATEGORIES = ["首飾", "上衣", "下身裝扮", "鞋子", "襪子"];
  const PAGE_SIZE = 5;

  // 圖層：鞋子必須在襪子上面
  const CATEGORY_Z_INDEX = {
    首飾: 10,
    上衣: 20,
    下身裝扮: 30,
    襪子: 40,
    鞋子: 50,
  };

  const state = {
    wardrobe: {
      baseModel: { front: "" },
      items: [],
    },

    // category -> itemId | null
    equipped: new Map(),

    // itemId -> item
    itemsById: new Map(),

    // category -> pageIndex (0-based)
    pageByCategory: new Map(),

    // category -> button element
    categoryButtons: new Map(),

    activeCategory: CATEGORIES[0],
    lastBaseFrontSrc: "",
  };

  function setStatus(text) {
    const el = document.getElementById("status");
    if (!el) return;
    el.textContent = text || "";
  }

  function ensureKnownCategory(category) {
    return CATEGORIES.includes(category) ? category : null;
  }

  function normalizeItem(raw, idx) {
    const obj = raw && typeof raw === "object" ? raw : {};

    const category = ensureKnownCategory(String(obj.category || "").trim());
    if (!category) return null;

    const front =
      obj.front ||
      obj.frontImage ||
      (obj.images && (obj.images.front || obj.images.Front)) ||
      "";

    const name = String(obj.name || obj.title || obj.label || "物件").trim();

    return {
      id: String(obj.id || `${category}__${name || "item"}_${idx}`),
      name: name || "物件",
      category,
      images: { front },
    };
  }

  function normalizeWardrobe(raw) {
    const obj = raw && typeof raw === "object" ? raw : {};
    const base = obj.baseModel || obj.base || obj.model || {};

    const items = Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.wardrobe)
        ? obj.wardrobe
        : [];

    return {
      baseModel: {
        front: base.front || base.frontImage || base.frontSrc || "",
      },
      items: items.map((it, idx) => normalizeItem(it, idx)).filter(Boolean),
    };
  }

  function initEquipped() {
    state.equipped = new Map();
    CATEGORIES.forEach((cat) => state.equipped.set(cat, null));
  }

  function initPagination() {
    state.pageByCategory = new Map();
    CATEGORIES.forEach((cat) => state.pageByCategory.set(cat, 0));
  }

  function rebuildIndex() {
    state.itemsById = new Map();
    state.wardrobe.items.forEach((item) => {
      state.itemsById.set(item.id, item);
    });
  }

  function applyBaseImage(src) {
    const viewEl = document.querySelector('#modelStage .model-view[data-view="front"]');
    if (!viewEl) return;

    const frameEl = viewEl.querySelector(".model-frame");
    if (!frameEl) return;

    const img = frameEl.querySelector(".model-base");
    const placeholder = frameEl.querySelector('.model-placeholder[data-kind="base"]');

    if (!img || !placeholder) return;

    img.onerror = null;

    if (!src) {
      img.removeAttribute("src");
      img.style.display = "none";
      placeholder.style.display = "grid";
      const text = placeholder.querySelector(".model-placeholder__text");
      if (text) text.textContent = "尚未放入人物底圖（正面）";
      state.lastBaseFrontSrc = "";
      return;
    }

    if (state.lastBaseFrontSrc === src && img.getAttribute("src") && img.style.display !== "none") {
      return;
    }

    img.style.display = "block";
    placeholder.style.display = "none";

    img.onerror = () => {
      img.style.display = "none";
      placeholder.style.display = "grid";
      const text = placeholder.querySelector(".model-placeholder__text");
      if (text) text.textContent = "人物底圖讀取失敗（正面）";
    };

    img.src = src;
    state.lastBaseFrontSrc = src;
  }

  function getOverlayImgSelector(category) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return `img[data-category="${window.CSS.escape(category)}"]`;
    }

    return `img[data-category="${category}"]`;
  }

  function updateModelOverlays() {
    const viewEl = document.querySelector('#modelStage .model-view[data-view="front"]');
    if (!viewEl) return;

    const overlays = viewEl.querySelector(".model-overlays");
    if (!overlays) return;

    CATEGORIES.forEach((cat) => {
      const existing = overlays.querySelector(getOverlayImgSelector(cat));
      const itemId = state.equipped.get(cat);

      if (!itemId) {
        if (existing) existing.remove();
        return;
      }

      const item = state.itemsById.get(itemId);
      const src = item && item.images && item.images.front;

      if (!src) {
        if (existing) existing.remove();
        return;
      }

      const img = existing || document.createElement("img");
      if (!existing) {
        img.alt = "";
        img.dataset.category = cat;
        img.addEventListener("error", () => img.remove());
        overlays.appendChild(img);
      }

      if (img.getAttribute("src") !== src) {
        img.src = src;
      }

      img.style.zIndex = String(CATEGORY_Z_INDEX[cat] ?? 0);
    });
  }

  function updateCategoryFiltersActiveState() {
    state.categoryButtons.forEach((btn, cat) => {
      const active = state.activeCategory === cat;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function setActiveCategory(category) {
    state.activeCategory = category;
    updateCategoryFiltersActiveState();
    renderShelf();
  }

  function initCategoryFilters() {
    const root = document.getElementById("categoryFilters");
    if (!root) return;

    root.innerHTML = "";
    state.categoryButtons = new Map();

    CATEGORIES.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "subcategory-button category-filter-button";
      btn.textContent = cat;
      btn.dataset.category = cat;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", "false");

      btn.addEventListener("click", () => setActiveCategory(cat));

      root.appendChild(btn);
      state.categoryButtons.set(cat, btn);
    });
  }

  function createSlotThumb(src, fallbackText = "空") {
    const thumb = document.createElement("div");
    thumb.className = "slot-thumb";

    if (!src) {
      const fallback = document.createElement("div");
      fallback.className = "slot-thumb__fallback";
      fallback.textContent = fallbackText;
      thumb.appendChild(fallback);
      return thumb;
    }

    const img = document.createElement("img");
    img.alt = "";
    img.src = src;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.remove();
      const fallback = document.createElement("div");
      fallback.className = "slot-thumb__fallback";
      fallback.textContent = fallbackText;
      thumb.appendChild(fallback);
    });

    thumb.appendChild(img);
    return thumb;
  }

  function safeLocaleCompare(a, b) {
    try {
      return a.localeCompare(b, "zh-Hant");
    } catch {
      return a.localeCompare(b);
    }
  }

  function getCategoryItems(category) {
    return state.wardrobe.items
      .filter((item) => item.category === category)
      .sort((a, b) => safeLocaleCompare(a.name, b.name));
  }

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function renderShelf() {
    const root = document.getElementById("wardrobeItems");
    if (!root) return;

    const category = state.activeCategory;
    const items = getCategoryItems(category);
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

    const currentPage = clamp(state.pageByCategory.get(category) ?? 0, 0, totalPages - 1);
    if (currentPage !== (state.pageByCategory.get(category) ?? 0)) {
      state.pageByCategory.set(category, currentPage);
    }

    const startIndex = currentPage * PAGE_SIZE;
    const pageItems = items.slice(startIndex, startIndex + PAGE_SIZE);

    const equippedId = state.equipped.get(category);

    root.innerHTML = "";

    const shelf = document.createElement("section");
    shelf.className = "shelf";

    const header = document.createElement("div");
    header.className = "shelf-header";

    const title = document.createElement("div");
    title.className = "shelf-title";

    const titleName = document.createElement("div");
    titleName.className = "shelf-title__name";
    titleName.textContent = category;

    const titleMeta = document.createElement("div");
    titleMeta.className = "shelf-title__meta";
    titleMeta.textContent = `第 ${currentPage + 1} / ${totalPages} 頁 · 共 ${items.length} 件`;

    title.appendChild(titleName);
    title.appendChild(titleMeta);

    const controls = document.createElement("div");
    controls.className = "shelf-controls";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "icon-button";
    prevBtn.textContent = "‹";
    prevBtn.setAttribute("aria-label", "上一頁");
    prevBtn.disabled = currentPage <= 0;
    prevBtn.addEventListener("click", () => {
      const page = state.pageByCategory.get(category) ?? 0;
      state.pageByCategory.set(category, Math.max(0, page - 1));
      renderShelf();
    });

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "icon-button";
    nextBtn.textContent = "›";
    nextBtn.setAttribute("aria-label", "下一頁");
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.addEventListener("click", () => {
      const page = state.pageByCategory.get(category) ?? 0;
      state.pageByCategory.set(category, Math.min(totalPages - 1, page + 1));
      renderShelf();
    });

    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);

    header.appendChild(title);
    header.appendChild(controls);

    const slots = document.createElement("div");
    slots.className = "shelf-slots";

    pageItems.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "slot-card" + (equippedId === item.id ? " is-selected" : "");
      card.setAttribute("aria-pressed", equippedId === item.id ? "true" : "false");

      card.appendChild(createSlotThumb(item.images.front));

      const name = document.createElement("div");
      name.className = "slot-name";
      name.textContent = item.name;
      card.appendChild(name);

      card.addEventListener("click", () => {
        toggleEquip(item.category, item.id);
      });

      slots.appendChild(card);
    });

    for (let i = pageItems.length; i < PAGE_SIZE; i += 1) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "slot-card";
      card.disabled = true;

      card.appendChild(createSlotThumb("", "空"));

      const name = document.createElement("div");
      name.className = "slot-name";
      name.textContent = "空格";
      card.appendChild(name);

      slots.appendChild(card);
    }

    shelf.appendChild(header);
    shelf.appendChild(slots);
    root.appendChild(shelf);
  }

  function toggleEquip(category, itemId) {
    const current = state.equipped.get(category);
    state.equipped.set(category, current === itemId ? null : itemId);
    renderEquippedChips();

    if (state.activeCategory === category) {
      renderShelf();
    }

    updateModelOverlays();
  }

  function renderEquippedChips() {
    const root = document.getElementById("equippedChips");
    if (!root) return;

    root.innerHTML = "";

    const equippedEntries = CATEGORIES.map((cat) => ({ cat, itemId: state.equipped.get(cat) })).filter(
      ({ itemId }) => !!itemId,
    );

    if (!equippedEntries.length) {
      const empty = document.createElement("div");
      empty.className = "equipped-empty";
      empty.textContent = "尚未穿戴";
      root.appendChild(empty);
      return;
    }

    equippedEntries.forEach(({ cat, itemId }) => {
      const item = state.itemsById.get(itemId);

      const chip = document.createElement("div");
      chip.className = "equipped-chip";
      chip.tabIndex = 0;
      chip.setAttribute("role", "button");

      const label = document.createElement("span");
      label.className = "equipped-chip__label";
      label.textContent = `${cat}:`;

      const value = document.createElement("span");
      value.className = "equipped-chip__value";
      value.textContent = item ? item.name : itemId;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "equipped-chip__remove";
      remove.setAttribute("aria-label", `移除 ${cat}`);
      remove.textContent = "×";

      remove.addEventListener("click", (evt) => {
        evt.stopPropagation();
        state.equipped.set(cat, null);
        renderEquippedChips();

        if (state.activeCategory === cat) {
          renderShelf();
        }

        updateModelOverlays();
      });

      const focusCategory = () => setActiveCategory(cat);

      chip.addEventListener("click", focusCategory);
      chip.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" || evt.key === " ") {
          evt.preventDefault();
          focusCategory();
        }
      });

      chip.appendChild(label);
      chip.appendChild(value);
      chip.appendChild(remove);
      root.appendChild(chip);
    });
  }

  function clearAll() {
    CATEGORIES.forEach((cat) => state.equipped.set(cat, null));
    renderEquippedChips();
    renderShelf();
    updateModelOverlays();
  }

  function randomWear() {
    const requiredCategories = new Set(["上衣", "下身裝扮", "鞋子"]);

    CATEGORIES.forEach((cat) => {
      const candidates = getCategoryItems(cat).filter((item) => {
        const src = item && item.images && item.images.front;
        return typeof src === "string" && src.trim().length > 0;
      });

      if (!candidates.length) {
        state.equipped.set(cat, null);
        return;
      }

      if (requiredCategories.has(cat)) {
        const pick = Math.floor(Math.random() * candidates.length);
        state.equipped.set(cat, candidates[pick].id);
        return;
      }

      // 0 = 不穿；1..n = 穿候選之一
      const pick = Math.floor(Math.random() * (candidates.length + 1));
      if (pick === 0) {
        state.equipped.set(cat, null);
        return;
      }

      state.equipped.set(cat, candidates[pick - 1].id);
    });

    renderEquippedChips();
    renderShelf();
    updateModelOverlays();
  }

  function initButtons() {
    const clearAllBtn = document.getElementById("clearAllBtn");
    if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

    const randomWearBtn = document.getElementById("randomWearBtn");
    if (randomWearBtn) randomWearBtn.addEventListener("click", randomWear);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEquipped();
    initPagination();

    state.wardrobe = normalizeWardrobe(WARDROBE_DATA);
    setStatus("已載入衣櫃資料");

    state.wardrobe.items = Array.isArray(state.wardrobe.items) ? state.wardrobe.items : [];
    rebuildIndex();

    initButtons();
    initCategoryFilters();
    updateCategoryFiltersActiveState();

    applyBaseImage(state.wardrobe.baseModel.front);

    renderEquippedChips();
    renderShelf();
    updateModelOverlays();
  });
})();
