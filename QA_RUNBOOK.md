# 本機 QA Runbook

## 1) 安裝依賴

```bash
npm install
```

> 如果你想確保依賴與 `package-lock.json` 完全一致，可用：
>
> ```bash
> npm ci
> ```

## 2) 啟動 Express 伺服器

```bash
npm run dev
# 預設 http://localhost:3000
```

或指定埠號：

```bash
PORT=3100 npm run dev
```

## 3) 用 curl 驗證 /api/wardrobe 回傳 JSON

```bash
curl -i http://localhost:3000/api/wardrobe
```

預期：
- `HTTP/1.1 200 OK`
- `Content-Type: application/json; charset=utf-8`
- Body 是 JSON，包含：`baseModel` 與 `items`

目前 repo 預設沒有放任何 PNG（`assets/` 只有資料夾），因此 `items` 會是空陣列，`baseModel.front/back` 也會是空字串。

## 3.5)（可選）驗證靜態衣櫃清單 /wardrobe.json

本專案也提供 `public/wardrobe.json` 作為「純靜態部署（例如 GitHub Pages）」的 fallback：

```bash
curl -i http://localhost:3000/wardrobe.json
```

預期：
- `HTTP/1.1 200 OK`
- `Content-Type: application/json`
- Body 是 JSON，包含：`baseModel` 與 `items`

## 4) 驗證 /assets 靜態路徑可取到示例 png（若 repo 中有）

如果 repo 內有 `assets/model/front.png`：

```bash
curl -I http://localhost:3000/assets/model/front.png
```

預期：
- `HTTP/1.1 200 OK`
- `Content-Type: image/png`

若檔案不存在，會回 `404`（這代表靜態路由有掛上，但沒有可用的 PNG）。

## 5) 驗證 SPA fallback 不會攔截 /api 與 /assets

`/api` 不存在的路由應該回 404（且不應是 index.html）：

```bash
curl -i http://localhost:3000/api/__qa_missing
```

`/assets` 不存在的路徑也應該回 404（且不應是 index.html）：

```bash
curl -i http://localhost:3000/assets/__qa_missing.png
```

而一般 SPA 深連結應該回 index.html：

```bash
curl -i http://localhost:3000/some/deep/link
```

## 6) 一鍵自動化 QA（會產生 QA_RESULTS.md）

```bash
npm run qa
```

此腳本會：
- 自動啟動 server（預設用 `QA_PORT=3100`）
- 檢查 `/api/wardrobe`、SPA fallback、以及 `/assets`（若有 PNG 會挑一張測）
- 輸出 `QA_RESULTS.md`
