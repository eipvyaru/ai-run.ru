$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\.env'
$target = Join-Path $PSScriptRoot '..\data\.env.vps'
if (!(Test-Path -LiteralPath $source)) { throw '.env not found' }
$content = Get-Content -LiteralPath $source -Raw
$values = [ordered]@{
  NODE_ENV = 'production'
  APP_ORIGIN = 'https://ai-run.ru'
  DATABASE_PATH = '/var/lib/ai-run.ru/ai-run.ru.sqlite'
  SYSTEM_PROMPT_PATH = '/var/lib/ai-run.ru/system_prompt.md'
  TRUSTED_PROXY = 'true'
}
foreach ($entry in $values.GetEnumerator()) {
  $pattern = "(?m)^$([regex]::Escape($entry.Key))=.*$"
  if ([regex]::IsMatch($content, $pattern)) {
    $content = [regex]::Replace($content, $pattern, "$($entry.Key)=$($entry.Value)")
  } else {
    $content = $content.TrimEnd() + "`r`n$($entry.Key)=$($entry.Value)`r`n"
  }
}
[System.IO.File]::WriteAllText($target, $content, [System.Text.UTF8Encoding]::new($false))
Write-Output 'VPS environment generated'
