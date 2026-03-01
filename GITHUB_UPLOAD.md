# GitHub 上傳指南（包含 public/index.html 等前端檔案）

此專案已包含：
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `index.js`（Express server + `/api/wardrobe`）

> 目前這個代管執行環境無法直接完成對 GitHub 的 `git push`（會出現 upstream provider error / 權限與網路限制），因此需要你在本機或有 GitHub 權限的環境執行推送。

## 方法 A：用 git 指令推送（推薦，能保留空資料夾結構/ .gitkeep）

1) 在 GitHub 建立一個空 repo（不要勾 README/License）。
2) 在此專案根目錄執行：

```bash
# 檢查目前有哪些檔案會被提交
git status

# 全部加入（包含 public/index.html 等）
git add -A

# 建立 commit
git commit -m "feat: dress-up game (Express + frontend + wardrobe API + QA)" || true

# 設定 remote（把 <repo_url> 換成你的）
# HTTPS: https://github.com/<owner>/<repo>.git
# SSH:   git@github.com:<owner>/<repo>.git

git remote add origin <repo_url> 2>/dev/null || git remote set-url origin <repo_url>

# 推到 main
git branch -M main
git push -u origin main
```

## 方法 B：GitHub 網頁介面 Upload files（不想用 git）

GitHub → Repo → Add file → Upload files，至少上傳：
- `public/`
- `assets/`
- `index.js`
- `package.json`
- `README.md`

> 注意：GitHub 網頁上傳不會保留空資料夾；如果你希望 `assets/` 的空結構也被保留，請用方法 A。

## 推送完成後如何驗證

到 GitHub repo 檢查是否存在：
- `public/index.html`
- `public/styles.css`
- `public/app.js`

以及可用 raw URL 直接驗證：
- `https://raw.githubusercontent.com/<owner>/<repo>/main/public/index.html`
