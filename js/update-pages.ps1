# Syncs all TFC HTML pages with latest layout assets, fonts, and scripts
$root = Split-Path $PSScriptRoot -Parent

$fontOld = 'family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=Lobster'
$fontNew = 'family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Lobster'

$sidebarLink = '  <link rel="stylesheet" href="{{BASE}}css/sidebar.css">'

$scrollScripts = @'
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
  <script src="{{BASE}}js/scroll-effects.js"></script>
  <script src="{{BASE}}js/film-previews.js"></script>
  <script src="{{BASE}}js/crew-bts.js"></script>
  <script src="{{BASE}}js/main.js"></script>
'@

$files = Get-ChildItem -Path $root -Recurse -Filter "*.html" |
    Where-Object { $_.Name -ne 'tfc.html' }

$updated = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $orig = $content
    $isFilm = $file.DirectoryName -like "*\films"
    $base = if ($isFilm) { '../' } else { '' }

    # Editorial font on all pages
    if ($content -match [regex]::Escape($fontOld)) {
        $content = $content.Replace($fontOld, $fontNew)
    }

    # Sidebar CSS
    if ($content -notmatch 'sidebar\.css') {
        $link = $sidebarLink.Replace('{{BASE}}', $base)
        $content = $content -replace '(<link rel="stylesheet" href="[^"]*pages\.css">)', "`$1`n$link"
    }

    # Core scroll + interaction scripts
    if ($content -notmatch 'scroll-effects\.js') {
        $scripts = $scrollScripts.Replace('{{BASE}}', $base)
        $content = $content -replace '(<script src="[^"]*layout\.js"></script>)', "`$1`n$scripts"
    }

    # film-previews.js
    if ($content -match 'scroll-effects\.js' -and $content -notmatch 'film-previews\.js') {
        $previewScript = "  <script src=`"${base}js/film-previews.js`"></script>"
        $content = $content -replace '(<script src="[^"]*scroll-effects\.js"></script>)', "`$1`n$previewScript"
    }

    # crew-bts.js (hover BTS on crew cards)
    if ($content -match 'film-previews\.js' -and $content -notmatch 'crew-bts\.js') {
        $crewScript = "  <script src=`"${base}js/crew-bts.js`"></script>"
        $content = $content -replace '(<script src="[^"]*film-previews\.js"></script>)', "`$1`n$crewScript"
    }

    # main.js — ensure present after crew-bts or film-previews
    if ($content -notmatch 'main\.js') {
        if ($content -match 'crew-bts\.js') {
            $mainScript = "  <script src=`"${base}js/main.js`"></script>"
            $content = $content -replace '(<script src="[^"]*crew-bts\.js"></script>)', "`$1`n$mainScript"
        } elseif ($content -match 'film-previews\.js') {
            $mainScript = "  <script src=`"${base}js/main.js`"></script>"
            $content = $content -replace '(<script src="[^"]*film-previews\.js"></script>)', "`$1`n$mainScript"
        }
    }

    # Remove duplicate main.js if script block was partially patched before
    $mainMatches = [regex]::Matches($content, '<script src="[^"]*main\.js"></script>')
    if ($mainMatches.Count -gt 1) {
        $seen = $false
        $content = [regex]::Replace($content, '(?m)^  <script src="[^"]*main\.js"></script>\r?\n', {
            param($m)
            if ($seen) { return '' }
            $seen = $true
            return $m.Value
        })
    }

    if ($content -ne $orig) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        $updated++
    }
}

Write-Host "Updated $updated HTML files."