// 換裝遊戲前端（純 HTML/CSS/JS）
// - 只支援正面（front）
// - 不再 fetch wardrobe.json 或 /api/wardrobe，避免 file:// 限制

(() => {
  const CATEGORIES = ["首飾", "上衣", "下身裝扮", "鞋子", "襪子", "其他裝扮"];

  const CATEGORY_Z_INDEX = {
    "襪子": 10,
    "鞋子": 20,
    "下身裝扮": 30,
    "上衣": 40,
    "其他裝扮": 50,
    "首飾": 60,
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

    activeCategory: CATEGORIES[0],

    // URL.createObjectURL 管理（避免多次載入資料夾後記憶體累積）
    objectUrls: [],
  };

  function setStatus(text) {
    const el = document.getElementById("status");
    if (!el) return;
    el.textContent = text || "";
  }

  function ensureKnownCategory(category) {
    return CATEGORIES.includes(category) ? category : "其他裝扮";
  }

  function normalizeItem(raw, idx) {
    const obj = raw && typeof raw === "object" ? raw : {};

    const category = ensureKnownCategory(String(obj.category || "其他裝扮").trim());

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
      items: items.map((it, idx) => normalizeItem(it, idx)),
    };
  }

  function initEquipped() {
    state.equipped = new Map();
    CATEGORIES.forEach((cat) => state.equipped.set(cat, null));
  }

  function rebuildIndex() {
    state.itemsById = new Map();
    state.wardrobe.items.forEach((item) => {
      state.itemsById.set(item.id, item);
    });
  }

  function revokeObjectUrls() {
    state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    state.objectUrls = [];
  }

  function createObjectUrl(file) {
    const url = URL.createObjectURL(file);
    state.objectUrls.push(url);
    return url;
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
  }

  function renderModel() {
    const viewEl = document.querySelector('#modelStage .model-view[data-view="front"]');
    if (!viewEl) return;

    const overlays = viewEl.querySelector(".model-overlays");
    if (!overlays) return;

    overlays.innerHTML = "";
    applyBaseImage(state.wardrobe.baseModel.front);

    const equippedItems = [];
    CATEGORIES.forEach((cat) => {
      const itemId = state.equipped.get(cat);
      if (!itemId) return;

      const item = state.itemsById.get(itemId);
      const src = item && item.images && item.images.front;
      if (!src) return;

      equippedItems.push({
        category: cat,
        src,
        z: CATEGORY_Z_INDEX[cat] ?? 0,
      });
    });

    equippedItems
      .sort((a, b) => a.z - b.z)
      .forEach(({ category, src, z }) => {
        const img = document.createElement("img");
        img.alt = "";
        img.src = src;
        img.style.zIndex = String(z);
        img.dataset.category = category;
        img.addEventListener("error", () => img.remove());
        overlays.appendChild(img);
      });
  }

  function setActiveCategory(category) {
    state.activeCategory = category;
    render();
  }

  function renderCategoryFilters() {
    const root = document.getElementById("categoryFilters");
    if (!root) return;

    root.innerHTML = "";

    CATEGORIES.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "subcategory-button category-filter-button" + (state.activeCategory === cat ? " is-active" : "");
      btn.textContent = cat;
      btn.dataset.category = cat;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", state.activeCategory === cat ? "true" : "false");

      btn.addEventListener("click", () => setActiveCategory(cat));
      root.appendChild(btn);
    });
  }

  function createItemThumb(src) {
    const thumb = document.createElement("div");
    thumb.className = "item-thumb";

    if (!src) {
      const fallback = document.createElement("div");
      fallback.className = "item-thumb__fallback";
      fallback.textContent = "沒有圖片";
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
      fallback.className = "item-thumb__fallback";
      fallback.textContent = "圖片不存在";
      thumb.appendChild(fallback);
    });

    thumb.appendChild(img);
    return thumb;
  }

  function toggleEquip(category, itemId) {
    const current = state.equipped.get(category);
    state.equipped.set(category, current === itemId ? null : itemId);
    render();
  }

  function safeLocaleCompare(a, b) {
    try {
      return a.localeCompare(b, "zh-Hant");
    } catch {
      return a.localeCompare(b);
    }
  }

  function renderWardrobeItems() {
    const root = document.getElementById("wardrobeItems");
    if (!root) return;

    root.innerHTML = "";

    const items = state.wardrobe.items
      .filter((item) => item.category === state.activeCategory)
      .sort((a, b) => safeLocaleCompare(a.name, b.name));

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "equipped-empty";
      empty.textContent = "此分類沒有素材";
      root.appendChild(empty);
      return;
    }

    const equippedId = state.equipped.get(state.activeCategory);

    items.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "item-card" + (equippedId === item.id ? " is-selected" : "");

      card.appendChild(createItemThumb(item.images.front));

      const name = document.createElement("div");
      name.className = "item-name";
      name.textContent = item.name;
      card.appendChild(name);

      card.addEventListener("click", () => toggleEquip(item.category, item.id));

      root.appendChild(card);
    });
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
        render();
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

  function render() {
    renderCategoryFilters();
    renderWardrobeItems();
    renderEquippedChips();
    renderModel();
  }

  function clearAll() {
    CATEGORIES.forEach((cat) => state.equipped.set(cat, null));
    render();
  }

  function randomWear() {
    CATEGORIES.forEach((cat) => {
      const candidates = state.wardrobe.items.filter((item) => item.category === cat);
      if (!candidates.length) {
        state.equipped.set(cat, null);
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

    render();
  }

  function initButtons() {
    const clearAllBtn = document.getElementById("clearAllBtn");
    if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

    const randomWearBtn = document.getElementById("randomWearBtn");
    if (randomWearBtn) randomWearBtn.addEventListener("click", randomWear);
  }

  function scanSelectedFolder(fileList) {
    const files = Array.from(fileList || []);

    revokeObjectUrls();

    const wardrobe = {
      baseModel: { front: "" },
      items: [],
    };

    const idSet = new Set();
    const baseRegex = /(?:^|\/)模特兒\/model\.png$/i;

    files.forEach((file) => {
      const rawPath = String(file.webkitRelativePath || file.name || "");
      const path = rawPath.replace(/\\/g, "/");

      if (!/\.png$/i.test(path)) return;

      if (!wardrobe.baseModel.front && baseRegex.test(path)) {
        wardrobe.baseModel.front = createObjectUrl(file);
        return;
      }

      const parts = path.split("/").filter(Boolean);
      const outfitIndex = parts.lastIndexOf("裝扮");
      if (outfitIndex < 0) return;

      const category = parts[outfitIndex + 1];
      const filename = parts[outfitIndex + 2];
      if (!category || !filename) return;

      // 只吃：裝扮/<分類>/<檔名>.png（不往下遞迴）
      if (outfitIndex + 3 !== parts.length) return;

      if (!CATEGORIES.includes(category)) return;

      const name = filename.replace(/\.png$/i, "");

      let id = `${category}__${name}`;
      if (idSet.has(id)) {
        let n = 2;
        while (idSet.has(`${id}_${n}`)) n += 1;
        id = `${id}_${n}`;
      }
      idSet.add(id);

      wardrobe.items.push({
        id,
        name,
        category,
        images: { front: createObjectUrl(file) },
      });
    });

    wardrobe.items.sort((a, b) => safeLocaleCompare(a.name, b.name));

    state.wardrobe = wardrobe;
    initEquipped();
    rebuildIndex();

    if (!wardrobe.baseModel.front) {
      setStatus("已載入資料夾，但找不到 模特兒/model.png（只支援 PNG）");
    } else {
      setStatus(`已從資料夾載入素材（${wardrobe.items.length} 件）`);
    }

    render();
  }

  function initAssetFolderInput() {
    const input = document.getElementById("assetFolderInput");
    const btn = document.getElementById("reloadAssetsBtn");

    if (btn && input) {
      btn.addEventListener("click", () => {
        input.value = "";
        input.click();
      });
    }

    if (input) {
      input.addEventListener("change", () => {
        if (!input.files || !input.files.length) return;
        scanSelectedFolder(input.files);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEquipped();

    const config = window.WARDROBE_CONFIG;
    if (config && typeof config === "object") {
      state.wardrobe = normalizeWardrobe(config);
      setStatus("已載入衣櫃資料（config.js）");
    } else {
      state.wardrobe = { baseModel: { front: "" }, items: [] };
      setStatus("尚未提供 config.js，請用「載入素材資料夾」選擇素材");
    }

    state.wardrobe.items = Array.isArray(state.wardrobe.items) ? state.wardrobe.items : [];
    initEquipped();
    rebuildIndex();

    initButtons();
    initAssetFolderInput();

    render();
  });
})();
