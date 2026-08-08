# scripts/setup-firebase.ps1
# Usage: Open PowerShell, navigate to repo root and run:
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-firebase.ps1

function Read-EnvLocal {
  $envPath = Join-Path -Path (Get-Location) -ChildPath ".env.local"
  if (-not (Test-Path $envPath)) { Write-Error ".env.local not found in repo root."; exit 2 }
  $lines = Get-Content $envPath | Where-Object { $_ -and -not ($_.TrimStart().StartsWith('#')) }
  $hash = @{}
  foreach ($line in $lines) {
    if ($line -match '^\s*([^=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      # Strip surrounding quotes
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1,$v.Length-2) }
      $hash[$k] = $v
    }
  }
  return $hash
}

Write-Host "Reading .env.local..."
$vars = Read-EnvLocal
if (-not $vars.NEXT_PUBLIC_FIREBASE_PROJECT_ID) { Write-Error "NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in .env.local"; exit 2 }
if (-not $vars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) { Write-Error "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not found in .env.local"; exit 2 }

$project = $vars.NEXT_PUBLIC_FIREBASE_PROJECT_ID
$bucket = $vars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

Write-Host "Project: $project"
Write-Host "Bucket: $bucket"

# Check required tools
$missing = @()
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) { $missing += 'gcloud (Google Cloud SDK)' }
if (-not (Get-Command gsutil -ErrorAction SilentlyContinue)) { $missing += 'gsutil (part of Cloud SDK)' }
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) { $missing += 'firebase (Firebase CLI)' }

if ($missing.Count -gt 0) {
  Write-Host "Missing tools: $($missing -join ', ')" -ForegroundColor Yellow
  Write-Host "Please install the missing tools and authenticate them before running this script. See:" -ForegroundColor Yellow
  Write-Host "  https://cloud.google.com/sdk/docs/install"
  Write-Host "  https://firebase.google.com/docs/cli"
  exit 3
}

Write-Host "Ensure you are logged in to Google Cloud and Firebase. Attempting to run 'gcloud auth login' now..."
& gcloud auth login
if ($LASTEXITCODE -ne 0) { Write-Error "gcloud auth login failed"; exit 4 }

Write-Host "Setting gcloud project to $project"
& gcloud config set project $project
if ($LASTEXITCODE -ne 0) { Write-Error "gcloud config set project failed"; exit 4 }

# Apply CORS
$corsFile = Join-Path -Path (Get-Location) -ChildPath "cors.json"
if (-not (Test-Path $corsFile)) {
  Write-Host "cors.json not found in project root. Create one containing allowed origins (e.g., http://localhost:3000)." -ForegroundColor Red
  exit 5
}

Write-Host "Applying CORS to bucket gs://$bucket"
& gsutil cors set $corsFile "gs://$bucket"
if ($LASTEXITCODE -ne 0) { Write-Error "gsutil cors set failed"; exit 6 }
Write-Host "CORS applied successfully. Current CORS config:"
& gsutil cors get "gs://$bucket"

# Deploy Firestore rules
Write-Host "Deploying Firestore rules (firestore.rules) using Firebase CLI..."
& firebase deploy --only firestore:rules --project $project
if ($LASTEXITCODE -ne 0) { Write-Error "firebase deploy failed"; exit 7 }

Write-Host "All done. Restart your dev server and test uploads." -ForegroundColor Green
Write-Host "Run: npm run dev"
