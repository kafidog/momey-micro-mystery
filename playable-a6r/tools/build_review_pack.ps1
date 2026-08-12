[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$DeliveryRoot = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'MOMEY_PLAYABLE_A6R_DELIVERY_2026-08-12'),
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$FinalRuntimeCommit,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$FinalHead,
    [Parameter(Mandatory = $true)]
    [string]$DeploymentStatus,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$DeployedUrl,
    [string]$PackagingStatus = 'CREATED_AND_VERIFIED',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$runtimeRoot = (Resolve-Path (Join-Path $RepoRoot 'playable-a6r')).Path
$desktopRoot = [System.IO.Path]::GetFullPath([Environment]::GetFolderPath('Desktop'))
$resolvedDelivery = [System.IO.Path]::GetFullPath($DeliveryRoot)
$expectedFolderName = 'MOMEY_PLAYABLE_A6R_DELIVERY_2026-08-12'

if ([System.IO.Path]::GetFileName($resolvedDelivery) -ne $expectedFolderName) {
    throw "Delivery folder must be named $expectedFolderName"
}
if (-not [System.IO.Path]::GetDirectoryName($resolvedDelivery).Equals($desktopRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Delivery folder must remain under the current user Desktop.'
}

$packName = 'MOMEY_PLAYABLE_A6R_REVIEW_PACK_2026-08-12'
$packRoot = Join-Path $resolvedDelivery $packName
$zipPath = Join-Path $resolvedDelivery ($packName + '.zip')

$requiredDocs = @(
    '00_A6R_OVERVIEW.md',
    '01_OWNER_FIRST_RUN_FINDINGS.md',
    '02_A6_TO_A6R_UX_DECISION.md',
    '03_PROGRESSIVE_DISCLOSURE_ARCHITECTURE.md',
    '04_ENTRY_FLOW.md',
    '05_ROLE_STAGE_FLOW.md',
    '06_EVENT_SEED_HIDING.md',
    '07_OPERATOR_TEXT_ONLY_DESIGN.md',
    '08_AUDIO_REMOVAL.md',
    '09_EVIDENCE_REFERENCE_DRAWER.md',
    '10_FIRST_RUN_SYNTHETIC_TEST.md',
    '11_READ_AHEAD_TEST.md',
    '12_MOBILE_FLOW_AUDIT.md',
    '13_SOL_HIGH_ADVERSARIAL_REVIEW.md',
    '14_DEFECT_REPORT.md',
    '15_PLAYTEST_INSTRUCTIONS.md',
    '16_KNOWN_LIMITATIONS.md',
    '17_AGENT_EXECUTION_RECORD.md',
    'README.md',
    'SCREENSHOT_INDEX.md',
    'VOICE_AUDITION_REPORT.md'
)

foreach ($name in $requiredDocs) {
    $source = Join-Path $runtimeRoot $name
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Missing review document: $name"
    }
}

$executionRecord = Get-Content -LiteralPath (Join-Path $runtimeRoot '17_AGENT_EXECUTION_RECORD.md') -Raw
$metadata = [ordered]@{
    '__FINAL_RUNTIME_COMMIT__' = $FinalRuntimeCommit
    '__FINAL_HEAD__' = $FinalHead
    '__DEPLOYMENT_STATUS__' = $DeploymentStatus
    '__DEPLOYED_URL__' = $DeployedUrl
    '__PACKAGING_STATUS__' = $PackagingStatus
}
foreach ($placeholder in $metadata.Keys) {
    if (-not $executionRecord.Contains($placeholder)) {
        throw "Missing packaging metadata placeholder: $placeholder"
    }
    $executionRecord = $executionRecord.Replace($placeholder, $metadata[$placeholder])
}
$staleTokens = @(
    'PENDING; no commit made',
    'PENDING; no deploy attempted',
    'DEPLOYED_URL: PENDING',
    'PACKAGING_STATUS: PENDING',
    '__FINAL_',
    '__DEPLOY'
)
foreach ($token in $staleTokens) {
    if ($executionRecord.Contains($token)) {
        throw "Refusing to package unresolved metadata: $token"
    }
}

$manifestPath = Join-Path $runtimeRoot 'assets\audio\voice-manifest.json'
$voiceManifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$audioFiles = @(Get-ChildItem -LiteralPath (Join-Path $runtimeRoot 'assets\audio\kokoro-zm-010') -File -Filter '*.mp3')
if ($voiceManifest.entries.Count -ne 22 -or $audioFiles.Count -ne 22) {
    throw "Voice inventory mismatch: manifest=$($voiceManifest.entries.Count), mp3=$($audioFiles.Count)"
}
foreach ($entry in $voiceManifest.entries) {
    $entryPath = Join-Path $runtimeRoot ($entry.audioFile -replace '/', '\')
    if (-not (Test-Path -LiteralPath $entryPath -PathType Leaf)) {
        throw "Missing voice asset: $($entry.audioFile)"
    }
}

$screens = @(Get-ChildItem -LiteralPath (Join-Path $runtimeRoot 'screenshots') -File -Filter '*.png')
if ($screens.Count -lt 12 -or $screens.Count -gt 16) {
    throw "Screenshot inventory must be 12-16; found $($screens.Count)."
}

if (Test-Path -LiteralPath $resolvedDelivery) {
    if (-not $Force) {
        throw "Delivery already exists: $resolvedDelivery. Re-run with -Force only after verifying this exact target."
    }
    Remove-Item -LiteralPath $resolvedDelivery -Recurse -Force
}

New-Item -ItemType Directory -Path $packRoot -Force | Out-Null
foreach ($name in $requiredDocs) {
    Copy-Item -LiteralPath (Join-Path $runtimeRoot $name) -Destination (Join-Path $packRoot $name)
}
Set-Content -LiteralPath (Join-Path $packRoot '17_AGENT_EXECUTION_RECORD.md') -Value $executionRecord -Encoding utf8
Copy-Item -LiteralPath (Join-Path $runtimeRoot 'screenshots') -Destination (Join-Path $packRoot 'screenshots') -Recurse

$snapshotRoot = Join-Path $packRoot 'source_snapshot'
New-Item -ItemType Directory -Path $snapshotRoot -Force | Out-Null
foreach ($name in @('index.html', 'role-1.html', 'role-2.html', 'role-3.html')) {
    Copy-Item -LiteralPath (Join-Path $runtimeRoot $name) -Destination (Join-Path $snapshotRoot $name)
}
foreach ($name in @('assets', 'tests', 'tools')) {
    Copy-Item -LiteralPath (Join-Path $runtimeRoot $name) -Destination (Join-Path $snapshotRoot $name) -Recurse
}

Compress-Archive -Path (Join-Path $packRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $entries = @($archive.Entries)
    foreach ($entry in $entries) {
        $name = $entry.FullName.Replace('\', '/')
        if ($name.StartsWith('/') -or $name.Contains('../') -or $name.Contains('/..')) {
            throw "Unsafe ZIP entry: $name"
        }
    }
    $zipFileCount = @($entries | Where-Object { -not [string]::IsNullOrEmpty($_.Name) }).Count
}
finally {
    $archive.Dispose()
}

$zipInfo = Get-Item -LiteralPath $zipPath
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
$packFileCount = @(Get-ChildItem -LiteralPath $packRoot -Recurse -File).Count

[ordered]@{
    DELIVERY_FOLDER = $resolvedDelivery
    PACK_FOLDER = $packRoot
    ZIP_PATH = $zipPath
    PACK_FILE_COUNT = $packFileCount
    ZIP_FILE_COUNT = $zipFileCount
    ZIP_SIZE = $zipInfo.Length
    ZIP_SHA256 = $zipHash
    SCREENSHOT_COUNT = $screens.Count
    AUDIO_FILE_COUNT = $audioFiles.Count
} | ConvertTo-Json
