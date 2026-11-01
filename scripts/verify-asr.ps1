$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$python = Join-Path $root 'data\asr-runtime\.venv312\Scripts\python.exe'
if (!(Test-Path -LiteralPath $python)) { throw 'ASR test runtime is missing; run scripts/setup-asr-runtime.ps1 first' }
$actualVersion = & $python -c 'import platform; print(platform.python_version())'
if ($LASTEXITCODE -ne 0 -or $actualVersion.Trim() -ne '3.12.3') { throw "Expected Python 3.12.3, got $actualVersion" }
& $python -m unittest discover -s (Join-Path $root 'asr') -p 'test_*.py' -v
if ($LASTEXITCODE -ne 0) { throw "Python ASR boundary tests failed with exit code $LASTEXITCODE" }
