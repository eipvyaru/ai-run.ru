$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtime = Join-Path $root 'data\asr-runtime\.venv312'
$python = Join-Path $runtime 'Scripts\python.exe'
if (Test-Path -LiteralPath $python) {
  & $python -c "import importlib.metadata as m, platform; expected={'fastapi':'0.121.3','imageio-ffmpeg':'0.6.0','python-multipart':'0.0.20','sherpa-onnx':'1.13.8','sherpa-onnx-core':'1.13.8','uvicorn':'0.38.0'}; assert platform.python_version() == '3.12.3'; assert all(m.version(k) == v for k,v in expected.items())"
  if ($LASTEXITCODE -eq 0) {
    Write-Output 'Pinned ASR runtime is already installed and verified'
    exit 0
  }
}
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
