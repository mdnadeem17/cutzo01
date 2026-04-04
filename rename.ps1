$ErrorActionPreference = "Continue"

$allowedExts = @('.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md', '.java', '.xml', '.gradle', '.webmanifest')
$rootDir = "c:\Users\lenovo\Downloads\trimo-booking-hub-main\trimo-booking-hub-main"

$targets = @(
    Join-Path $rootDir "src",
    Join-Path $rootDir "convex",
    Join-Path $rootDir "public",
    Join-Path $rootDir "android\app\src\main",
    Join-Path $rootDir "capacitor.config.ts",
    Join-Path $rootDir "index.html",
    Join-Path $rootDir "README.md",
    Join-Path $rootDir "package.json",
    Join-Path $rootDir "android\app\build.gradle"
)

Write-Host "Starting replace..."

foreach ($t in $targets) {
    if (-not (Test-Path $t)) { continue }
    
    $items = @()
    if ((Get-Item $t).PSIsContainer) {
        $items = Get-ChildItem -Path $t -Recurse | Where-Object { -not $_.PSIsContainer -and ($allowedExts -contains $_.Extension) }
    } else {
        $items = @(Get-Item $t)
    }

    foreach ($item in $items) {
        try {
            $content = Get-Content $item.FullName -Raw -Encoding UTF8
            if ($null -ne $content) {
                $replaced = $content.Replace('trimo', 'cutzo').Replace('Trimo', 'Cutzo').Replace('TRIMO', 'CUTZO')
                if ($content -cne $replaced) {
                    Set-Content $item.FullName -Value $replaced -Encoding UTF8
                    Write-Host "Modified: $($item.FullName)"
                }
            }
        } catch {
            Write-Host "Error reading/writing $($item.FullName): $_"
        }
    }
}

Write-Host "Starting renames..."

$renames = @(
    @("src\components\vendor\TrimoHeader.tsx", "CutzoHeader.tsx"),
    @("src\components\trimo", "cutzo"),
    @("android\app\src\main\java\com\trimo", "cutzo")
)

foreach ($pair in $renames) {
    $oldPath = Join-Path $rootDir $pair[0]
    if (Test-Path $oldPath) {
        try {
            Rename-Item -Path $oldPath -NewName $pair[1]
            Write-Host "Renamed $oldPath to $($pair[1])"
        } catch {
            Write-Host "Error renaming $oldPath: $_"
        }
    }
}

Write-Host "Done"
