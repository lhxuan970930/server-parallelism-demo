# GitHub 上傳指南（包含 public/index.html 等前端檔案）

此專案已包含：
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `index.js`（Express server + `/api/wardrobe`）

> 目前這個代管執行環境無法直接完成對 GitHub 的 `git push`（會出現 upstream provider error / 權限與網路限制），因此需要你在本機或有 GitHub 權限的環境執行推送。

> 安全提醒：請勿上傳/提交 `node_modules/`、`.env*`、任何 token/密碼/私鑰檔；這些應只留在本機（本 repo 的 `.gitignore` 已預設忽略）。

## 常見錯誤：`fatal: not a git repository`

### 最可能原因

1) 你沒有在「專案資料夾」內執行 git（例如你在上一層目錄，或開錯資料夾）。
2) 你是用「下載 ZIP / 複製檔案」拿到專案，資料夾裡沒有 `.git/`（正常，因為 ZIP 通常不含 `.git`）。
3) `.git/` 被刪掉或被某些同步/壓縮工具漏掉（`.git` 是隱藏資料夾）。

### 自我驗證（建議先做）

在你準備執行 `git add/commit/push` 前，先跑：

```bash
git status
```

- 如果看到 `fatal: not a git repository`，代表你「不在 repo 裡」或「repo 還沒初始化」。

再用這個確認你目前位在 repo 的哪裡（成功時會回傳專案根目錄路徑）：

```bash
git rev-parse --show-toplevel
```

### 可直接複製貼上的修正步驟（Windows PowerShell）

> 把 `C:\path\to\project` 換成你的專案資料夾（要看得到 `package.json` / `index.js` / `public/` 那一層）。

```powershell
cd "C:\path\to\project"

# 如果你是下載 ZIP / 沒有 .git，請先初始化
if (!(Test-Path .git)) { git init }

git add -A

git commit -m "feat: dress-up game (Express + frontend + wardrobe API + QA)"

git branch -M main

# 設定 remote（把 <repo_url> 換成你的）
# HTTPS: https://github.com/<owner>/<repo>.git
# SSH:   git@github.com:<owner>/<repo>.git
$repoUrl = "<repo_url>"
$null = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) { git remote set-url origin $repoUrl } else { git remote add origin $repoUrl }

git push -u origin main
```

### 可直接複製貼上的修正步驟（Windows CMD）

> 跨磁碟機請用 `cd /d`，否則你可能還停留在原本的 `C:`，然後就會一直看到 `not a git repository`。

```bat
cd /d "C:\path\to\project"

REM 如果你是下載 ZIP / 沒有 .git，請先初始化
if not exist .git git init

git add -A

git commit -m "feat: dress-up game (Express + frontend + wardrobe API + QA)"

git branch -M main

REM 設定 remote（把 <repo_url> 換成你的）
REM HTTPS: https://github.com/<owner>/<repo>.git
REM SSH:   git@github.com:<owner>/<repo>.git

git remote add origin <repo_url>
REM 如果你看到 remote 已存在，改用：
REM git remote set-url origin <repo_url>

git push -u origin main
```

### 可直接複製貼上的修正步驟（Git Bash / macOS / Linux）

```bash
cd /path/to/project

# 如果你是下載 ZIP / 沒有 .git，請先初始化
[ -d .git ] || git init

git add -A

git commit -m "feat: dress-up game (Express + frontend + wardrobe API + QA)"

git branch -M main

# 設定 remote（把 <repo_url> 換成你的）
# HTTPS: https://github.com/<owner>/<repo>.git
# SSH:   git@github.com:<owner>/<repo>.git
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin <repo_url>
else
  git remote add origin <repo_url>
fi

git push -u origin main
```

## 常見錯誤：`git commit` 失敗（Please tell me who you are）

當你在執行 `git commit` 時看到類似訊息：

```
Author identity unknown

*** Please tell me who you are.
```

代表 Git 尚未設定你的提交身分。請執行（只要一次）：

```bash
git config --global user.name "你的名字"
git config --global user.email "you@example.com"
```

可用下列指令確認是否已生效：

```bash
git config --global --get user.name
git config --global --get user.email
```

設定完成後，回到原本的流程重新執行 `git commit ...` 即可。

## 方法 A：用 git 指令推送（推薦，能保留空資料夾結構/ .gitkeep）

1) 在 GitHub 建立一個空 repo（不要勾 README/License）。
2) 在專案根目錄執行（Windows 建議用上面的 PowerShell 版本）：

```bash
# 檢查目前有哪些檔案會被提交
git status

# 全部加入（包含 public/index.html 等）
git add -A

# 建立 commit
git commit -m "feat: dress-up game (Express + frontend + wardrobe API + QA)"

# 設定 remote（把 <repo_url> 換成你的）
# HTTPS: https://github.com/<owner>/<repo>.git
# SSH:   git@github.com:<owner>/<repo>.git

git remote add origin <repo_url>

# 推到 main
git branch -M main
git push -u origin main
```

> 如果你看到 `remote origin already exists.`：
> 
> - 改用：`git remote set-url origin <repo_url>`

## 方法 B：GitHub 網頁介面 Upload files（不想用 git）

GitHub → Repo → Add file → Upload files，至少上傳：
- `public/`
- `assets/`
- `index.js`
- `package.json`
- `README.md`

> 注意：GitHub 網頁上傳不會保留空資料夾；如果你希望 `assets/` 的空結構也被保留，請用方法 A。

## 推送完成後如何驗證

### 在本機驗證

```bash
git status
git rev-parse --show-toplevel
git remote -v
```

### 在 GitHub 驗證

到 GitHub repo 檢查是否存在：
- `public/index.html`
- `public/styles.css`
- `public/app.js`

以及可用 raw URL 直接驗證：
- `https://raw.githubusercontent.com/<owner>/<repo>/main/public/index.html`
