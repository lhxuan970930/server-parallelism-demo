const path = require('path');
const fs = require('fs/promises');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(__dirname, 'assets');

app.use(express.json());

// Frontend
app.use(express.static(PUBLIC_DIR));

// PNG assets (model + wardrobe)
app.use('/assets', express.static(ASSETS_DIR));

function isPng(filename) {
  return typeof filename === 'string' && filename.toLowerCase().endsWith('.png');
}

function toAssetUrl(relativePathFromAssets) {
  const segs = String(relativePathFromAssets)
    .split(path.sep)
    .filter(Boolean)
    .map((s) => encodeURIComponent(s));

  return `/assets/${segs.join('/')}`;
}

function humanize(name) {
  return String(name)
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readdirSafe(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    // Keep output stable across OS/filesystems
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  } catch {
    return [];
  }
}

async function fileExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function folderContainsPng(absDir) {
  const entries = await readdirSafe(absDir);
  return entries.some((e) => e.isFile() && isPng(e.name));
}

async function readMetaJson(absItemDir) {
  const absMeta = path.join(absItemDir, 'meta.json');
  if (!(await fileExists(absMeta))) return null;

  try {
    const raw = await fs.readFile(absMeta, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function parseItemDir({ absItemDir, category, subcategory }) {
  const dirEntries = await readdirSafe(absItemDir);
  const itemKey = path.basename(absItemDir);

  const files = dirEntries.filter((e) => e.isFile() && isPng(e.name));
  const lowerNameToReal = new Map(files.map((f) => [f.name.toLowerCase(), f.name]));

  const thumbName =
    lowerNameToReal.get('thumb.png') ||
    lowerNameToReal.get('thumbnail.png') ||
    lowerNameToReal.get('preview.png') ||
    null;

  const frontName = lowerNameToReal.get('front.png') || null;
  const backName = lowerNameToReal.get('back.png') || null;

  const nonThumbFiles = files
    .map((f) => f.name)
    .filter((n) => n.toLowerCase() !== 'thumb.png' && n.toLowerCase() !== 'thumbnail.png' && n.toLowerCase() !== 'preview.png')
    .sort((a, b) => a.localeCompare(b));

  // 若使用者沒特別命名 front.png/back.png：
  // - 優先用 front.png
  // - 否則挑第一個「不是 back.png」的檔案當作 front
  //   （避免只有 back.png 時，把背面誤當正面）
  const fallbackFront = nonThumbFiles.find((n) => n.toLowerCase() !== 'back.png') || null;

  const resolvedFront = frontName || fallbackFront;
  // 背面只有在提供 back.png 時才回傳（符合：沒圖片就不要出現）
  const resolvedBack = backName || null;

  const meta = await readMetaJson(absItemDir);

  const frontUrl = resolvedFront
    ? toAssetUrl(path.relative(ASSETS_DIR, path.join(absItemDir, resolvedFront)))
    : '';
  const backUrl = resolvedBack
    ? toAssetUrl(path.relative(ASSETS_DIR, path.join(absItemDir, resolvedBack)))
    : '';
  const thumbUrl = thumbName
    ? toAssetUrl(path.relative(ASSETS_DIR, path.join(absItemDir, thumbName)))
    : frontUrl || backUrl;

  const name = (meta && meta.name) || humanize(itemKey);

  return {
    id: String((meta && meta.id) || `${category}_${subcategory ? `${subcategory}_` : ''}${itemKey}`),
    name,
    category,
    subcategory: subcategory || '',
    images: { front: frontUrl, back: backUrl },
    thumbnail: thumbUrl,
    zIndex: meta && Number.isFinite(meta.zIndex) ? meta.zIndex : undefined,
  };
}

function parseItemFile({ absFile, category, subcategory }) {
  const base = path.basename(absFile);
  const name = humanize(base);
  const url = toAssetUrl(path.relative(ASSETS_DIR, absFile));

  return {
    id: `${category}_${subcategory ? `${subcategory}_` : ''}${base}`,
    name,
    category,
    subcategory: subcategory || '',
    images: { front: url, back: '' },
    thumbnail: url,
  };
}

async function scanFolder({ absDir, category, subcategory, items, depth }) {
  const entries = await readdirSafe(absDir);

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '__MACOSX') continue;

    const absEntry = path.join(absDir, entry.name);

    if (entry.isFile() && isPng(entry.name)) {
      items.push(parseItemFile({ absFile: absEntry, category, subcategory }));
      continue;
    }

    if (!entry.isDirectory()) continue;

    const hasPng = await folderContainsPng(absEntry);

    if (hasPng) {
      items.push(await parseItemDir({ absItemDir: absEntry, category, subcategory }));
      continue;
    }

    // If this folder doesn't contain PNGs itself, treat it as a grouping folder.
    // - If we don't yet have a subcategory, use this folder name as subcategory.
    // - Otherwise, keep the existing subcategory.
    if (depth >= 4) continue;

    const nextSub = subcategory || entry.name;
    await scanFolder({ absDir: absEntry, category, subcategory: nextSub, items, depth: depth + 1 });
  }
}

async function buildWardrobe() {
  // base model
  const baseFrontAbs = path.join(ASSETS_DIR, 'model', 'front.png');
  const baseBackAbs = path.join(ASSETS_DIR, 'model', 'back.png');

  const baseFront = (await fileExists(baseFrontAbs)) ? toAssetUrl('model/front.png') : '';
  // 若背面底圖不存在，保持空字串，前端會顯示「尚未放入人物底圖（背面）」
  const baseBack = (await fileExists(baseBackAbs)) ? toAssetUrl('model/back.png') : '';

  // wardrobe items
  const absWardrobeDir = path.join(ASSETS_DIR, 'wardrobe');
  const categories = await readdirSafe(absWardrobeDir);

  const items = [];

  for (const categoryEntry of categories) {
    if (!categoryEntry.isDirectory()) continue;
    if (categoryEntry.name.startsWith('.')) continue;

    const category = categoryEntry.name.toLowerCase();
    const absCategory = path.join(absWardrobeDir, categoryEntry.name);

    await scanFolder({ absDir: absCategory, category, subcategory: '', items, depth: 0 });
  }

  return {
    baseModel: { front: baseFront, back: baseBack },
    items,
  };
}

// Wardrobe API: auto-scans ./assets
app.get('/api/wardrobe', async (req, res) => {
  try {
    const wardrobe = await buildWardrobe();
    res.json(wardrobe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to build wardrobe manifest.' });
  }
});

// SPA fallback (keeps deep links working).
// Express 5 uses path-to-regexp v6; a RegExp route is the simplest catch-all.
app.get(/^\/(?!api(?:\/|$)|assets(?:\/|$)).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = { app, buildWardrobe };
