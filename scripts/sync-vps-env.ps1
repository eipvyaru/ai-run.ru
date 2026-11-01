$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\.env'
$target = Join-Path $PSScriptRoot '..\data\.env.vps'
$asrTarget = Join-Path $PSScriptRoot '..\data\.env.asr.vps'
if (!(Test-Path -LiteralPath $source)) { throw '.env not found' }
$content = Get-Content -LiteralPath $source -Raw
$secretMatch = [regex]::Match($content, '(?m)^ASR_SERVICE_TOKEN=(.*)$')
if (!$secretMatch.Success -or $secretMatch.Groups[1].Value.Length -lt 32 -or $secretMatch.Groups[1].Value -match '^replace-') {
  $randomBytes = [byte[]]::new(48)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
  $newToken = [Convert]::ToHexString($randomBytes).ToLowerInvariant()
  [Array]::Clear($randomBytes, 0, $randomBytes.Length)
  $tokenLine = "ASR_SERVICE_TOKEN=$newToken"
  if ($secretMatch.Success) {
    $content = [regex]::Replace($content, '(?m)^ASR_SERVICE_TOKEN=.*$', [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $tokenLine })
  } else {
    $content = $content.TrimEnd() + "`r`n$tokenLine`r`n"
  }
}
$values = [ordered]@{
  NODE_ENV = 'production'
  APP_ORIGIN = 'https://ai-run.ru'
  DATABASE_PATH = '/var/lib/ai-run.ru/ai-run.ru.sqlite'
  SYSTEM_PROMPT_PATH = '/var/lib/ai-run.ru/system_prompt.md'
  TRUSTED_PROXY = 'true'
  ASR_SERVICE_URL = 'http://127.0.0.1:8794'
  ASR_REQUEST_TIMEOUT_MS = '50000'
}
foreach ($entry in $values.GetEnumerator()) {
  $pattern = "(?m)^$([regex]::Escape($entry.Key))=.*$"
  if ([regex]::IsMatch($content, $pattern)) {
    $content = [regex]::Replace($content, $pattern, "$($entry.Key)=$($entry.Value)")
  } else {
    $content = $content.TrimEnd() + "`r`n$($entry.Key)=$($entry.Value)`r`n"
  }
}
[System.IO.File]::WriteAllText($source, $content, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($target, $content, [System.Text.UTF8Encoding]::new($false))
$asrToken = [regex]::Match($content, '(?m)^ASR_SERVICE_TOKEN=(.*)$').Groups[1].Value
$asrContent = @(
  'ASR_SERVICE_TOKEN=' + $asrToken
  'ASR_MODEL_DIR=/var/lib/ai-run.ru/asr/models/gigaam-v3-punct'
  'ASR_TEMP_DIR=/var/cache/ai-run.ru/asr'
  'ASR_FFMPEG_PATH=/usr/bin/ffmpeg'
  'ASR_MAX_AUDIO_SECONDS=60'
  'ASR_MAX_UPLOAD_BYTES=8388608'
  'ASR_NUM_THREADS=2'
  'ASR_REQUEST_TIMEOUT_SECONDS=45'
) -join "`n"
[System.IO.File]::WriteAllText($asrTarget, $asrContent + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Output 'VPS application and ASR environment files generated; secret values were not printed'
