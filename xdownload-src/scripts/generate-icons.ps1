Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
$assetDir = Join-Path $PSScriptRoot "..\assets"

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 128
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 16, 32, 29))
    $panelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $greenBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 118, 110))
    $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 34, 197, 94))
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

    $graphics.FillRectangle($bgBrush, 0, 0, $size, $size)
    $graphics.FillRectangle($accentBrush, 34 * $scale, 25 * $scale, 60 * $scale, 10 * $scale)
    $graphics.FillRectangle($panelBrush, 28 * $scale, 22 * $scale, 72 * $scale, 84 * $scale)

    $play = New-Object System.Drawing.Drawing2D.GraphicsPath
    $play.AddPolygon(@(
        [System.Drawing.PointF]::new(44 * $scale, 37 * $scale),
        [System.Drawing.PointF]::new(87 * $scale, 61 * $scale),
        [System.Drawing.PointF]::new(44 * $scale, 86 * $scale)
    ))
    $graphics.FillPath($greenBrush, $play)

    $arrow = New-Object System.Drawing.Drawing2D.GraphicsPath
    $arrow.AddPolygon(@(
        [System.Drawing.PointF]::new(62 * $scale, 48 * $scale),
        [System.Drawing.PointF]::new(72 * $scale, 48 * $scale),
        [System.Drawing.PointF]::new(72 * $scale, 73 * $scale),
        [System.Drawing.PointF]::new(83 * $scale, 73 * $scale),
        [System.Drawing.PointF]::new(67 * $scale, 91 * $scale),
        [System.Drawing.PointF]::new(51 * $scale, 73 * $scale),
        [System.Drawing.PointF]::new(62 * $scale, 73 * $scale)
    ))
    $graphics.FillPath($whiteBrush, $arrow)

    $output = Join-Path $assetDir "icon-$size.png"
    $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $bitmap.Dispose()
}
