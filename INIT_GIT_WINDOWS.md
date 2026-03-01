# Windows（CMD / PowerShell）初始化 Git 與上傳 GitHub 指南

本文件特別針對你在 Windows CMD 遇到的錯誤：

```
fatal: not a git repository (or any of the parent directories): .git
```

## 1) 最可能原因（依常見程度排序）

1. **你目前所在的資料夾不是專案根目錄**（例如你在 `public/` 或其他資料夾內就直接執行 `git status`）。
2. **你的專案資料夾根本沒有 `.git/`**（例如你是用「下載 ZIP」或「複製資料夾」取得專案，`.git` 不會包含在內）。
3. **Windows CMD 沒有切換磁碟機**：
   - 例如你原本在 `C:`，然後輸入 `cd D:\work\project` 其實沒有切到 D 槽（CMD 常見陷阱）。
4. （較少）你在 OneDrive/網路磁碟/權限受限路徑，導致 `.git` 資料夾被同步工具改動或被隱藏/刪除。

## 2) 如何確認你在「專案根目錄」

你必須在該資料夾下看到 **至少** 這些項目：

- `index.js`
- `package.json`
- `public\`（底下有 `index.html`、`app.js`、`styles.css`）
- `assets\`

### 方法：CMD 逐步檢查

1) 顯示目前路徑：

```bat
cd
```

2) 列出目前資料夾內容（必須看到 `index.js` / `public` / `assets`）：

```bat
dir
```

3) 你也可以直接用 `dir public` 來確認：

```bat
dir public
```

應該看到：`index.html`、`app.js`、`styles.css`

### 檢查 `.git` 是否存在（注意它可能是隱藏的）

```bat
dir /a
```

如果是已初始化的 git repo，通常會看到 `.git`（資料夾）。

> 如果你看不到 `.git`，那就不是 git repository（或是你拿到的是 ZIP 版本）。

### 常見陷阱：跨磁碟機 `cd`

在 CMD 跨磁碟機要用：

```bat
cd /d D:\path\to\project
```

或先切換磁碟機再 `cd`：

```bat
D:
cd \path\to\project
```

## 3) 流程 A：用 git CLI 初始化並 push（CMD 版）

### A-0) 前置：確認 Git 安裝

```bat
git --version
```

### A-1) 到專案根目錄

（請替換為你的實際路徑）

```bat
cd /d D:\path\to\dress-up-game
```

用 `dir` 確認看得到 `index.js`、`public`、`assets`。

### A-2) 初始化（若 `.git` 不存在）

```bat
git init
```

### A-3) 建立 commit

```bat
git add -A
git status
git commit -m "Initial commit"
```

> 如果顯示 `nothing to commit` 代表沒有變更，這是正常的。

### A-4) 在 GitHub 建立空 repo

到 GitHub 新建 repo 時建議：
- **不要勾**「Add a README file」（因為本專案已經有 `README.md`）
- **不要勾**「Add .gitignore」

### A-5) 設定 remote 並推上去

```bat
git branch -M main

git remote add origin https://github.com/<owner>/<repo>.git
REM 若上一行失敗（remote 已存在），改用：
REM git remote set-url origin https://github.com/<owner>/<repo>.git

git push -u origin main
```

### A-6) 推送後檢查

到 GitHub repo 介面確認至少存在：
- `index.js`
- `public/index.html`
- `assets/`

> 注意：Git 不會保留空資料夾。本 repo 已補上 `assets/**/.gitkeep` 來保留資料夾結構；若你未包含這些檔案，空資料夾上傳後會消失。

## 4) 流程 B：不用 git CLI，上傳到 GitHub

### B-1) GitHub Desktop（推薦，比 Web 上傳可靠）

1) 安裝 GitHub Desktop
2) `File` → `Add local repository...`
   - 若你的資料夾內 **沒有 `.git`**：
     - 用 `File` → `New repository...` 建一個 repo（選擇此專案資料夾），再 commit & publish。
3) 確認 `Changes` 清單中包含：
   - `index.js`、`public/`、`assets/`、`package.json`、`README.md` 等
4) Commit（例如 `Initial commit`）
5) `Publish repository` → 選擇 GitHub 帳號與 repo 名稱

注意事項：
- `.gitignore` 會讓 `node_modules/` 不被提交（建議不要手動勾進去）。
- 空資料夾如果沒有檔案仍不會被提交；請確認 `.gitkeep` 有被一起 commit。

### B-2) GitHub Web UI（Upload files）

GitHub → 進入 repo → `Add file` → `Upload files`

建議至少上傳：
- `index.js`
- `package.json`
- `package-lock.json`（若有）
- `public/`（含 `index.html`、`app.js`、`styles.css`）
- `assets/`（注意空資料夾不會保留）
- `README.md`
- `.gitignore`

注意事項：
- Web 上傳 **不會保留空資料夾**（即使你上傳了 `assets/`，若裡面沒有檔案，GitHub 會看不到該資料夾）。
- 若你需要保留結構，請確保 `assets/**/.gitkeep` 這類占位檔有一併上傳。

## 5) 一鍵腳本（可選）

repo 內提供 `init-git.ps1`（PowerShell）協助你：
- 檢查是否在專案根目錄
- `git init`（若需要）
- `git add/commit`
- 設定 remote 與 `git push`

用法（PowerShell）：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\init-git.ps1 -RemoteUrl "https://github.com/<owner>/<repo>.git"
```
