$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../dist/icons'))
[System.IO.Directory]::CreateDirectory($iconDirectory) | Out-Null

function New-RoundedRectangle([single]$size, [single]$radius) {
    $shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $shape.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $shape.AddArc($size - $diameter, 0, $diameter, $diameter, 270, 90)
    $shape.AddArc($size - $diameter, $size - $diameter, $diameter, $diameter, 0, 90)
    $shape.AddArc(0, $size - $diameter, $diameter, $diameter, 90, 90)
    $shape.CloseFigure()
    return $shape
}

function Write-PlaygroundIcon([string]$name, [int]$size, [bool]$fullBleed, [bool]$maskable) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $paper = [System.Drawing.ColorTranslator]::FromHtml('#f8f7ef')
    $lime = [System.Drawing.ColorTranslator]::FromHtml('#d9ed9d')
    $ink = [System.Drawing.ColorTranslator]::FromHtml('#173f39')
    $orange = [System.Drawing.ColorTranslator]::FromHtml('#f7bc66')
    $graphics.Clear($(if ($fullBleed) { $lime } else { $paper }))
    $limeBrush = [System.Drawing.SolidBrush]::new($lime)
    $orangeBrush = [System.Drawing.SolidBrush]::new($orange)
    $tile = $null
    if (-not $fullBleed) {
        $tile = New-RoundedRectangle $size ($size * 0.28125)
        $graphics.FillPath($limeBrush, $tile)
    }
    $center = [single]($size / 2)
    # A maskable icon keeps the complete eight-ray mark inside the central 80% circle.
    $ray = [single]($size * $(if ($maskable) { 0.265625 } else { 0.34375 }))
    $thickness = [single]($size * $(if ($maskable) { 0.09375 } else { 0.140625 }))
    $pen = [System.Drawing.Pen]::new($ink, $thickness)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Flat
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Flat
    foreach ($angle in @(0, ([Math]::PI / 4), ([Math]::PI / 2), ([Math]::PI * 3 / 4))) {
        $dx = [single]([Math]::Cos($angle) * $ray)
        $dy = [single]([Math]::Sin($angle) * $ray)
        $graphics.DrawLine($pen, $center - $dx, $center - $dy, $center + $dx, $center + $dy)
    }
    $heartRadius = [single]($size * $(if ($maskable) { 0.125 } else { 0.15625 }))
    $graphics.FillEllipse($orangeBrush, $center - $heartRadius, $center - $heartRadius, $heartRadius * 2, $heartRadius * 2)
    $bitmap.Save((Join-Path $iconDirectory $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose()
    $limeBrush.Dispose()
    $orangeBrush.Dispose()
    if ($tile) { $tile.Dispose() }
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-PlaygroundIcon 'icon-192.png' 192 $false $false
Write-PlaygroundIcon 'icon-512.png' 512 $false $false
Write-PlaygroundIcon 'icon-maskable-512.png' 512 $true $true
Write-PlaygroundIcon 'apple-touch-icon.png' 180 $true $false

foreach ($fileName in @('icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png')) {
    $bitmap = [System.Drawing.Bitmap]::new((Join-Path $iconDirectory $fileName))
    $transparent = 0
    $markRadius = 0.0
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
        for ($x = 0; $x -lt $bitmap.Width; $x++) {
            $pixel = $bitmap.GetPixel($x, $y)
            if ($pixel.A -ne 255) { $transparent++ }
            if ($fileName -eq 'icon-maskable-512.png' -and ($pixel.R -ne 217 -or $pixel.G -ne 237 -or $pixel.B -ne 157)) {
                $distance = [Math]::Sqrt([Math]::Pow($x + 0.5 - 256, 2) + [Math]::Pow($y + 0.5 - 256, 2))
                $markRadius = [Math]::Max($markRadius, $distance)
            }
        }
    }
    if ($transparent -ne 0) { throw "Icon opacity: $fileName contains $transparent non-opaque pixels" }
    if ($fileName -eq 'icon-maskable-512.png' -and $markRadius -gt 204.8) { throw 'Maskable icon: the mark exceeds its safe circle' }
    [pscustomobject]@{ File = $fileName; Width = $bitmap.Width; Height = $bitmap.Height; NonOpaque = $transparent; MarkRadius = [Math]::Round($markRadius, 2) }
    $bitmap.Dispose()
}
