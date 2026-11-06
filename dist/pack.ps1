param(
    [string]$SrcDir,
    [string]$OutZip,
    [string[]]$ExcludeDirs = @()
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $OutZip) { Remove-Item $OutZip -Force }

$srcFull = (Resolve-Path $SrcDir).Path
$fs = [System.IO.File]::Open($OutZip, 'Create')
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
$count = 0
$dirCount = 0
$buf = New-Object byte[] 1048576
# 显式目录 entry(部分解压器不自动建中间目录)
$dirs = New-Object 'System.Collections.Generic.HashSet[string]'
try {
    foreach ($f in Get-ChildItem -Path $srcFull -Recurse -File) {
        $rel = $f.FullName.Substring($srcFull.Length + 1)
        $parts = $rel -split '[\\/]'
        if ($ExcludeDirs -contains $parts[0]) { continue }
        for ($i = 1; $i -lt $parts.Length; $i++) {
            [void]$dirs.Add((($parts[0..($i-1)]) -join '/'))
        }
        $entryName = ($parts -join '/')
        $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        $es = $entry.Open()
        try {
            $rs = [System.IO.File]::OpenRead($f.FullName)
            try {
                while (($n = $rs.Read($buf, 0, $buf.Length)) -gt 0) { $es.Write($buf, 0, $n) }
            } finally { $rs.Dispose() }
        } finally { $es.Dispose() }
        $count++
    }
    foreach ($d in $dirs) {
        [void]$zip.CreateEntry(($d + '/'))
        $dirCount++
    }
} finally {
    $zip.Dispose()
    $fs.Dispose()
}
Write-Host "packed $count files + $dirCount dir-entries -> $OutZip"