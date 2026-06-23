Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
$assetDir = Join-Path $PSScriptRoot "..\assets"

if (!(Test-Path $assetDir)) {
    New-Item -ItemType Directory -Path $assetDir -Force | Out-Null
}

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 128
    
    # Brushes
    $redBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 0, 51))
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 13, 13, 20))
    
    # 1. Draw rounded red background
    $rect = New-Object System.Drawing.RectangleF (2 * $scale), (2 * $scale), (124 * $scale), (124 * $scale)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radius = 28 * $scale
    
    # Add rounded rectangle paths
    $path.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
    $path.AddArc(($rect.Right - $radius), $rect.Y, $radius, $radius, 270, 90)
    $path.AddArc(($rect.Right - $radius), ($rect.Bottom - $radius), $radius, $radius, 0, 90)
    $path.AddArc($rect.X, ($rect.Bottom - $radius), $radius, $radius, 90, 90)
    $path.CloseFigure()
    
    $graphics.FillPath($redBrush, $path)

    # 2. Draw white play button in center-leftish
    # We want it to look like a YouTube logo
    $play = New-Object System.Drawing.Drawing2D.GraphicsPath
    $play.AddPolygon(@(
        [System.Drawing.PointF]::new(46 * $scale, 38 * $scale),
        [System.Drawing.PointF]::new(90 * $scale, 64 * $scale),
        [System.Drawing.PointF]::new(46 * $scale, 90 * $scale)
    ))
    $graphics.FillPath($whiteBrush, $play)

    # 3. Draw a glowing download arrow on top of the play symbol
    # Arrow coordinates:
    # Stem: X=60 to 68, Y=25 to 55
    # Head: X=50 to 78, Y=55 to 75
    # Bar: X=45 to 83, Y=85 to 91
    # We draw the arrow in dark color or with a white stroke to make it pop
    $arrow = New-Object System.Drawing.Drawing2D.GraphicsPath
    $arrow.AddPolygon(@(
        [System.Drawing.PointF]::new(59 * $scale, 35 * $scale),
        [System.Drawing.PointF]::new(69 * $scale, 35 * $scale),
        [System.Drawing.PointF]::new(69 * $scale, 58 * $scale),
        [System.Drawing.PointF]::new(78 * $scale, 58 * $scale),
        [System.Drawing.PointF]::new(64 * $scale, 78 * $scale),
        [System.Drawing.PointF]::new(50 * $scale, 58 * $scale),
        [System.Drawing.PointF]::new(59 * $scale, 58 * $scale)
    ))
    # Draw arrow with a thin white outline to separate it
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 0, 51)), (3 * $scale)
    $graphics.FillPath($darkBrush, $arrow)
    $graphics.DrawPath($pen, $arrow)

    # Draw bottom bar of download
    $barBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 13, 13, 20))
    $graphics.FillRectangle($barBrush, 45 * $scale, 86 * $scale, 38 * $scale, 8 * $scale)
    $graphics.DrawRectangle($pen, 45 * $scale, 86 * $scale, 38 * $scale, 8 * $scale)

    $output = Join-Path $assetDir "icon-$size.png"
    $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

    # Clean up
    $pen.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-Host "Successfully generated icons in: $assetDir"
