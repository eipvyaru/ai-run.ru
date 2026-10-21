$ErrorActionPreference = 'Stop'
$previousDatabasePath = $env:DATABASE_PATH
$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempDirectory = Join-Path $tempRoot ("ai-run-release-" + [guid]::NewGuid().ToString('N'))
if (!$tempDirectory.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Temporary release database path is outside the system temp directory'
}
New-Item -ItemType Directory -Path $tempDirectory | Out-Null
$env:DATABASE_PATH = Join-Path $tempDirectory 'release.sqlite'

function Invoke-CheckedNpm([string]$ScriptName) {
  if ($ScriptName -eq 'test') {
    npm test
  } else {
    npm run $ScriptName
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Release check '$ScriptName' failed with exit code $LASTEXITCODE"
  }
}

try {
  Invoke-CheckedNpm 'db:migrate'
  Invoke-CheckedNpm 'lint'
  Invoke-CheckedNpm 'typecheck'
  Invoke-CheckedNpm 'test'
  npm audit --omit=dev --audit-level=moderate
  if ($LASTEXITCODE -ne 0) {
    throw "Production dependency audit failed with exit code $LASTEXITCODE"
  }
  Invoke-CheckedNpm 'build'
  Write-Output 'Release verification passed'
} finally {
  if ($null -eq $previousDatabasePath) {
    Remove-Item Env:DATABASE_PATH -ErrorAction SilentlyContinue
  } else {
    $env:DATABASE_PATH = $previousDatabasePath
  }
  $resolvedTempDirectory = [System.IO.Path]::GetFullPath($tempDirectory)
  if ($resolvedTempDirectory.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTempDirectory)) {
    Remove-Item -LiteralPath $resolvedTempDirectory -Recurse -Force
  }
}
