param(
  [string]$AssetRoot = (Join-Path (Split-Path $PSScriptRoot -Parent) 'assets')
)

Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path -LiteralPath (Split-Path $PSScriptRoot -Parent)).Path
$assetRootPath = (Resolve-Path -LiteralPath $AssetRoot).Path
$derivativeRoot = Join-Path $assetRootPath '_derivatives'
$displayRoot = Join-Path $derivativeRoot 'display'
$thumbnailRoot = Join-Path $derivativeRoot 'thumbnails'
New-Item -ItemType Directory -Force -Path $displayRoot,$thumbnailRoot | Out-Null

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg' | Select-Object -First 1
$analysis = [ordered]@{}
$processed = 0
$skipped = 0

function Get-StableId([string]$value) {
  $sha = [System.Security.Cryptography.SHA1]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($value)
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant().Substring(0,16)
  } finally { $sha.Dispose() }
}

function Save-JpegDerivative($sourceBitmap,[string]$targetPath,[int]$maxWidth,[int]$maxHeight,[long]$quality) {
  $scale = [Math]::Min(1.0,[Math]::Min($maxWidth / $sourceBitmap.Width,$maxHeight / $sourceBitmap.Height))
  $width = [Math]::Max(1,[int][Math]::Round($sourceBitmap.Width * $scale))
  $height = [Math]::Max(1,[int][Math]::Round($sourceBitmap.Height * $scale))
  $canvas = New-Object System.Drawing.Bitmap($width,$height,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  try {
    $canvas.SetResolution(72,72)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
      $graphics.Clear([System.Drawing.Color]::White)
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($sourceBitmap,0,0,$width,$height)
    } finally { $graphics.Dispose() }
    $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
    try {
      $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,$quality)
      $canvas.Save($targetPath,$jpegCodec,$parameters)
    } finally { $parameters.Dispose() }
  } finally { $canvas.Dispose() }
}

function Get-BackgroundAnalysis($bitmap) {
  $samples = New-Object System.Collections.Generic.List[object]
  for($index=0;$index -lt 24;$index++) {
    $fraction = ($index + .5) / 24
    $x = [Math]::Min($bitmap.Width-1,[Math]::Max(0,[int][Math]::Round(($bitmap.Width-1)*$fraction)))
    $y = [Math]::Min($bitmap.Height-1,[Math]::Max(0,[int][Math]::Round(($bitmap.Height-1)*$fraction)))
    $edgeX = [Math]::Min($bitmap.Width-1,[Math]::Max(0,[int][Math]::Round(($bitmap.Width-1)*.025)))
    $edgeY = [Math]::Min($bitmap.Height-1,[Math]::Max(0,[int][Math]::Round(($bitmap.Height-1)*.025)))
    $farX = [Math]::Max(0,$bitmap.Width-1-$edgeX)
    $farY = [Math]::Max(0,$bitmap.Height-1-$edgeY)
    $samples.Add($bitmap.GetPixel($x,$edgeY));$samples.Add($bitmap.GetPixel($x,$farY))
    $samples.Add($bitmap.GetPixel($edgeX,$y));$samples.Add($bitmap.GetPixel($farX,$y))
  }
  $lightNeutral = 0
  $luminanceTotal = 0.0
  foreach($color in $samples) {
    $luminance = (.2126*$color.R)+(.7152*$color.G)+(.0722*$color.B)
    $spread = [Math]::Max($color.R,[Math]::Max($color.G,$color.B))-[Math]::Min($color.R,[Math]::Min($color.G,$color.B))
    $luminanceTotal += $luminance
    if($color.A -lt 32 -or ($luminance -gt 225 -and $spread -lt 34)) { $lightNeutral++ }
  }
  $ratio = if($samples.Count){$lightNeutral/$samples.Count}else{0}
  $average = if($samples.Count){$luminanceTotal/$samples.Count}else{0}
  return [ordered]@{
    edgeLuminance = [Math]::Round($average,1)
    lightNeutralRatio = [Math]::Round($ratio,3)
    backgroundTone = if($ratio -ge .68 -or ($ratio -ge .52 -and $average -ge 232)){'light'}elseif($average -lt 78){'dark'}else{'mixed'}
  }
}

$files = Get-ChildItem -LiteralPath $assetRootPath -Recurse -File | Where-Object {
  $_.FullName -notlike "$derivativeRoot*" -and $_.FullName -notlike "$(Join-Path $assetRootPath '_catalog')*" -and $_.Extension.ToLowerInvariant() -in @('.jpg','.jpeg','.png','.gif')
}

foreach($file in $files) {
  $relative = $file.FullName.Substring($projectRoot.Length+1).Replace('\','/')
  $id = Get-StableId $relative
  try {
    $bitmap = New-Object System.Drawing.Bitmap($file.FullName)
    try {
      $background = Get-BackgroundAnalysis $bitmap
      $analysis[$relative] = $background
      $displayPath = Join-Path $displayRoot "$id.jpg"
      $thumbnailPath = Join-Path $thumbnailRoot "$id.jpg"
      if(!(Test-Path $displayPath) -or (Get-Item $displayPath).LastWriteTimeUtc -lt $file.LastWriteTimeUtc) {
        $isVertical = $bitmap.Height -gt ($bitmap.Width*1.12)
        if($isVertical){Save-JpegDerivative $bitmap $displayPath 1440 2160 82}else{Save-JpegDerivative $bitmap $displayPath 2200 1440 82}
      }
      if(!(Test-Path $thumbnailPath) -or (Get-Item $thumbnailPath).LastWriteTimeUtc -lt $file.LastWriteTimeUtc) {
        Save-JpegDerivative $bitmap $thumbnailPath 360 260 74
      }
      $processed++
    } finally { $bitmap.Dispose() }
  } catch {
    $skipped++
    Write-Warning "Skipped $relative : $($_.Exception.Message)"
  }
  if(($processed+$skipped)%50 -eq 0){Write-Host "Processed $($processed+$skipped) / $($files.Count)"}
}

$analysisPath = Join-Path $assetRootPath 'media-analysis.json'
[System.IO.File]::WriteAllText($analysisPath,($analysis | ConvertTo-Json -Depth 5),[System.Text.UTF8Encoding]::new($false))
Write-Host "Optimised $processed images; skipped $skipped. Analysis saved to $analysisPath"
