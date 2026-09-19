$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\.env'
$target = Join-Path $PSScriptRoot '..\data\.env.vps'
if (!(Test-Path -LiteralPath $source)) { throw '.env not found' }
$content = Get-Content -LiteralPath $source -Raw
$content = $content -replace '(?m)^DATABASE_PATH=.*$', 'DATABASE_PATH=/var/lib/ai-run.ru/ai-run.ru.sqlite'
$content = $content -replace '(?m)^SYSTEM_PROMPT_PATH=.*$', 'SYSTEM_PROMPT_PATH=/var/lib/ai-run.ru/system_prompt.md'
[System.IO.File]::WriteAllText($target, $content, [System.Text.UTF8Encoding]::new($false))
Write-Output 'VPS environment generated'
