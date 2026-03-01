param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl,

  [string]$Branch = "main",

  [string]$Message = "Initial commit"
)

$ErrorActionPreference = "Stop"

function Assert-ProjectRoot {
  $required = @(
    "index.js",
    "package.json",
    "public",
    "assets"
  )

  foreach ($p in $required) {
    if (-not (Test-Path -LiteralPath $p)) {
      throw "Not in project root. Missing: $p. Please 'cd' into the folder that contains index.js/public/assets/package.json."
    }
  }
}

Get-Command git | Out-Null
Assert-ProjectRoot

if (-not (Test-Path -LiteralPath ".git")) {
  git init
}

git add -A

$hasStagedChanges = $true
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  $hasStagedChanges = $false
}

if ($hasStagedChanges) {
  git commit -m $Message
}

git branch -M $Branch

& git remote get-url origin | Out-Null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $RemoteUrl
} else {
  git remote add origin $RemoteUrl
}

git push -u origin $Branch
