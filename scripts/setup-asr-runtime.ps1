$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtime = Join-Path $root 'data\asr-runtime\.venv312'
$python = Join-Path $runtime 'Scripts\python.exe'
$uv = Get-Command uv -ErrorAction SilentlyContinue
if (!$uv) { throw 'Install uv, then rerun scripts/setup-asr-runtime.ps1' }

& uv python install 3.12.3
if ($LASTEXITCODE -ne 0) { throw 'Could not install Python 3.12.3 with uv' }
if (!(Test-Path -LiteralPath $python)) {
  & uv venv $runtime --python 3.12.3
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the pinned ASR virtual environment' }
}
& uv pip install --python $python --requirement (Join-Path $root 'asr\requirements.lock')
if ($LASTEXITCODE -ne 0) { throw 'Could not install pinned ASR dependencies' }
$actualVersion = & $python -c 'import platform; print(platform.python_version())'
if ($LASTEXITCODE -ne 0 -or $actualVersion.Trim() -ne '3.12.3') { throw "Expected Python 3.12.3, got $actualVersion" }
Write-Output 'Pinned ASR runtime installed in ignored data/asr-runtime/.venv312'
