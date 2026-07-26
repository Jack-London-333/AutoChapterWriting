$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root "codex-zotero-bridge.xpi"
$zip = Join-Path $root "codex-zotero-bridge.zip"
if (Test-Path $out) {
    Remove-Item -LiteralPath $out
}
if (Test-Path $zip) {
    Remove-Item -LiteralPath $zip
}
Compress-Archive -Path (Join-Path $root "manifest.json"), (Join-Path $root "bootstrap.js") -DestinationPath $zip
Move-Item -LiteralPath $zip -Destination $out
Write-Host "Built $out"
