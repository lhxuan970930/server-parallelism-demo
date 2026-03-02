# 換裝遊戲（Dress Up Game）

這是一個用 **Express** 直接提供的換裝遊戲：

- **左半邊**：人物模型（支援 **正面 / 背面**，也可「同時顯示」）
- **右半邊**：衣櫃（飾品/上身衣物/下身衣物/襪子/鞋子）
  - 每個分類一次顯示 **5 個槽位**（可翻頁）
  - 點選物件即可穿上；**再點一次同個物件可脫掉**
- 圖片皆使用你提供的 **去背 PNG** 疊圖（只要圖片對齊即可）
- 若未提供 `back.png`，背面不會顯示該物件（不會用正面圖片代替）

## 🚀 啟動

```bash
npm install
npm run dev
# 打開 http://localhost:3000
```

## 圖片放置方式（你上傳到 GitHub 的檔案）

伺服器會自動掃描 `./assets` 產生 `/api/wardrobe`，前端會自動載入。

### 1) 人物底圖

請放到：

```
assets/model/front.png
assets/model/back.png
```

### 2) 衣櫃物件

基本結構：

```
assets/wardrobe/<category>/...
```

建議類別（資料夾名請用英文小寫，前端內建對應）：

- `accessories`（飾品）
- `top`（上身）
- `bottom`（下身）
- `socks`（襪子）
- `shoes`（鞋子）

#### 推薦：用「物件資料夾」放正背面

例如：

```
assets/wardrobe/top/hoodie/front.png
assets/wardrobe/top/hoodie/back.png

assets/wardrobe/bottom/jeans/front.png
assets/wardrobe/bottom/jeans/back.png
```

#### 飾品（accessories）建議再分子分類

例如頭飾/耳飾：

```
assets/wardrobe/accessories/headwear/beanie/front.png
assets/wardrobe/accessories/headwear/beanie/back.png

assets/wardrobe/accessories/earrings/studs/front.png
assets/wardrobe/accessories/earrings/studs/back.png
```

> 飾品會以「子分類」當作不同槽位，因此可以同時穿戴頭飾+耳飾+項鍊等。

#### 可選：縮圖與設定

如果你想讓衣櫃卡片顯示更漂亮的縮圖，可在物件資料夾內加：

- `thumb.png` 或 `thumbnail.png` 或 `preview.png`

如果想指定顯示名稱 / 疊圖層級（z-index），可加 `meta.json`：

```json
{
  "name": "我的帽子",
  "zIndex": 80
}
```

## API

- `GET /api/wardrobe`：掃描 `assets/` 後回傳衣櫃 JSON
- 靜態檔案：
  - 前端：`/`（由 `public/` 提供）
  - 圖片：`/assets/...`（由 `assets/` 提供）
