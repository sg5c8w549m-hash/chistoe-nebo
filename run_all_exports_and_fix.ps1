# run_all_exports_and_fix.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# paths
$ProjectRoot = (Get-Location).Path
$diagDir  = Join-Path $ProjectRoot 'diagnostics'
$exportsDir = Join-Path $ProjectRoot 'exports'
if (-not (Test-Path $diagDir))  { New-Item -Path $diagDir -ItemType Directory -Force | Out-Null }
if (-not (Test-Path $exportsDir)) { New-Item -Path $exportsDir -ItemType Directory -Force | Out-Null }

$logFile = Join-Path $diagDir 'auto_fix.log'
function Log([string]$t) {
    $line = "{0:yyyy-MM-dd HH:mm:ss}    {1}" -f (Get-Date), $t
    $line | Out-File -FilePath $logFile -Encoding UTF8 -Append
    Write-Host $t
}

Log "=== START run_all_exports_and_fix ==="

# ---- helpers ----
function Get-MongoNetworkArg {
    param($containerName)
    try {
        $netsRaw = (& docker inspect $containerName --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}};{{end}}' 2>$null)
        if ($netsRaw) {
            $nets = $netsRaw -split ';' | Where-Object { $_ -ne '' }
            if ($nets.Count -gt 0) { return "--network " + $nets[0] }
        }
    } catch { }
    return "--network container:$containerName"
}

function TryFixMojibake([string]$s) {
    if (-not $s) { return $s }
    $orig = $s
    try { if ($s -match '[\p{IsCyrillic}]') { return $s } } catch {}
    $candidates = @()
    try {
        $cp1251 = [System.Text.Encoding]::GetEncoding(1251)
        $utf8   = [System.Text.Encoding]::UTF8
        $bytesA = $cp1251.GetBytes($s); $candidates += $utf8.GetString($bytesA)
    } catch {}
    try {
        $cp866 = [System.Text.Encoding]::GetEncoding(866)
        $bytesB = $cp866.GetBytes($s); $candidates += $utf8.GetString($bytesB)
    } catch {}
    try {
        $latin1 = [System.Text.Encoding]::GetEncoding('iso-8859-1')
        $bytesD = $latin1.GetBytes($s); $candidates += $utf8.GetString($bytesD)
    } catch {}

    foreach ($c in $candidates | Select-Object -Unique) {
        try {
            $b = $utf8.GetBytes($c)
            $maybe = $cp1251.GetString($b)
            $candidates += $maybe
        } catch {}
    }

    $best = $orig; $bestScore = -999
    foreach ($cand in $candidates | Select-Object -Unique) {
        if (-not $cand) { continue }
        $score = 0
        if ($cand -match '[\p{IsCyrillic}]') { $score += 50 }
        $score -= ([regex]::Matches($cand,'Р|С| |\?').Count) * 2
        if ($cand.Length -gt 4) { $score += [math]::Min(10,$cand.Length/10) }
        if ($score -gt $bestScore) { $bestScore = $score; $best = $cand }
    }
    return $best
}

function NormalizeAddress([string]$a) {
    if (-not $a) { return $a }
    $t = $a.Trim()
    if ($t -match '\?{2,}' -or $t -match ' ') { return '<<UNKNOWN_ADDRESS>>' }
    return $t
}

# ---- export orders (fallback run using mongo:6.0) ----
$MongoUri = "mongodb://root:exampleRootPassword@mongo:27017/chistoe_nebo?authSource=admin"
$MongoContainer = "chistoe_mongo"
$safeCol = "orders"
$containerJson = "/data/${safeCol}_export.json"
$hostJson = Join-Path $diagDir "${safeCol}_export.json"
$fallbackOut = Join-Path $diagDir 'fallback_run.out'

$networkArg = Get-MongoNetworkArg -containerName $MongoContainer
Log "Using docker network arg: $networkArg"

# run fallback mongoexport in temporary mongo image (writes to diagnostics)
$runCmd = "docker run --rm $networkArg -v `"$PWD\diagnostics`":/data mongo:6.0 bash -lc `"mongoexport --uri='$MongoUri' --collection='$safeCol' --out='$containerJson' --jsonArray`""
Log "Running fallback export..."
try {
    Invoke-Expression $runCmd 2>&1 | Tee-Object -FilePath $fallbackOut
    Start-Sleep -Seconds 1
} catch {
    Log "Fallback docker run failed: $($_.Exception.Message)"
}

if (Test-Path $hostJson) {
    Log "SUCCESS: JSON exported to diagnostics: $hostJson"
} else {
    Log "FAILED: diagnostics/$($safeCol)_export.json not found. Check $fallbackOut and mongoexport logs in diagnostics/"
    exit 1
}

# ---- convert JSON -> CSV (handle $oid/$date) ----
Log "Converting JSON -> CSV..."
try {
    $jraw = Get-Content $hostJson -Raw
    $j = ConvertFrom-Json $jraw -Depth 50
} catch {
    Log "JSON parse failed: $($_.Exception.Message)"; exit 1
}

$rows = $j | ForEach-Object {
    $idval = $null
    if ($_.PSObject.Properties.Name -contains '_id') { $idval = $_._id } elseif ($_.PSObject.Properties.Name -contains 'id') { $idval = $_.id }
    $idout = if ($idval -and ($idval.PSObject.Properties.Name -contains '$oid')) { $idval.'$oid' } else { $idval }
    $created = $null
    if ($_.PSObject.Properties.Name -contains 'createdAt') { $created = $_.createdAt }
    elseif ($_.PSObject.Properties.Name -contains 'created_at') { $created = $_.created_at }
    $createdOut = if ($created -and ($created.PSObject.Properties.Name -contains '$date')) { $created.'$date' } else { $created }

    [PSCustomObject]@{
        _id = $idout
        quantity = ($_.quantity)
        unit = ($_.unit)
        address = ($_.address)
        status = ($_.status)
        price = ($_.price)
        createdAt = $createdOut
        photos = ($_.photos -join ';')
    }
}

$csvPath = Join-Path $exportsDir "${safeCol}_export_from_json_utf8bom.csv"
$rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
# add BOM
$utf8 = [System.Text.Encoding]::UTF8
$all = Get-Content $csvPath -Raw
[System.IO.File]::WriteAllBytes($csvPath, $utf8.GetPreamble() + $utf8.GetBytes($all))
Log "CSV created: $csvPath"

# ---- Fix addresses in CSV(s) ----
function FixCsvAddresses([string]$inPath, [string]$outPath) {
    Log "Processing: $inPath -> $outPath"
    $rows = Import-Csv -Path $inPath -Encoding UTF8
    $changed = 0; $total = 0
    $fixedRows = @()
    foreach ($r in $rows) {
        $total++
        $addr = $null
        if ($r.PSObject.Properties.Name -contains 'address') { $addr = $r.address }
        elseif ($r.PSObject.Properties.Name -contains 'addr') { $addr = $r.addr }
        $orig = $addr
        if ($addr) {
            $addr = $addr.Trim()
            $addr = NormalizeAddress $addr
            if ($addr -ne '<<UNKNOWN_ADDRESS>>') {
                if ($addr -match 'Р[а-яА-Я]|С[а-яА-Я]') {
                    $cand = TryFixMojibake $addr
                    if ($cand -and $cand -ne $addr) { $addr = $cand }
                } elseif ($addr -notmatch '[\p{IsCyrillic}]' -and $addr -match '[^\x00-\x7F]') {
                    $cand = TryFixMojibake $addr
                    if ($cand -and $cand -ne $addr) { $addr = $cand }
                }
            }
        }
        if ($orig -ne $addr) { $changed++ }
        if ($r.PSObject.Properties.Name -contains 'address') { $r.address = $addr } elseif ($r.PSObject.Properties.Name -contains 'addr') { $r.addr = $addr }
        $fixedRows += $r
    }
    $temp = [System.IO.Path]::GetTempFileName()
    $fixedRows | Export-Csv -Path $temp -NoTypeInformation -Encoding UTF8
    $all = Get-Content $temp -Raw
    [System.IO.File]::WriteAllBytes($outPath, $utf8.GetPreamble() + $utf8.GetBytes($all))
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
    Log "Finished: $inPath -> $outPath  (rows: $total, changed: $changed)"
    return @{Total=$total;Changed=$changed}
}

$fixedCsv = Join-Path $exportsDir "${safeCol}_export_fixed_addresses_utf8bom.csv"
$res = FixCsvAddresses -inPath $csvPath -outPath $fixedCsv

# try create xlsx via Excel COM
function TryCreateXlsx([string]$csvPath, [string]$xlsxPath) {
    try { $excel = New-Object -ComObject Excel.Application -ErrorAction Stop } catch { Log "Excel COM not available, skipping XLSX"; return $false }
    try {
        $excel.Visible = $false
        # OpenText with defaults (may need tweaking for delimiters in other locales)
        $excel.Workbooks.OpenText($csvPath, [Type]::Missing, 1, 1, 1, 1, $false)
        $wb = $excel.Workbooks.Item($excel.Workbooks.Count)
        $wb.SaveAs($xlsxPath, 51)
        $wb.Close($false)
        $excel.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb) | Out-Null
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
        [GC]::Collect(); [GC]::WaitForPendingFinalizers()
        Log "XLSX created: $xlsxPath"
        return $true
    } catch {
        Log "Excel COM error: $($_.Exception.Message)"
        try { $excel.Quit() } catch {}
        return $false
    }
}

$xlsxPath = Join-Path $exportsDir "${safeCol}_export_fixed_addresses.xlsx"
TryCreateXlsx -csvPath $fixedCsv -xlsxPath $xlsxPath | Out-Null

# if Excel COM not available, optionally try ImportExcel (module)
if (-not (Test-Path $xlsxPath)) {
    if (Get-Command Import-Excel -ErrorAction SilentlyContinue) {
        try {
            Import-Csv $fixedCsv | Export-Excel -Path $xlsxPath -WorksheetName data -AutoSize
            Log "XLSX created with ImportExcel: $xlsxPath"
        } catch { Log "ImportExcel failed: $($_.Exception.Message)" }
    } else {
        Log "ImportExcel module not installed and Excel COM not available. To create XLSX install ImportExcel or MS Excel."
    }
}

# ---- archive results ----
$ts = (Get-Date).ToString('yyyyMMdd_HHmm')
$zipPath = "$env:USERPROFILE\Documents\Chistoe_Nebo_exports_$ts.zip"
try { Compress-Archive -Path (Join-Path $exportsDir '*') -DestinationPath $zipPath -Force; Log "Archive created: $zipPath" } catch { Log "Archive failed: $($_.Exception.Message)" }

# final summary
Log "=== SUMMARY ==="
Get-ChildItem $exportsDir -File | Select Name,Length,LastWriteTime | Format-Table | Out-String | ForEach-Object { Log $_ }
Get-ChildItem $diagDir -File | Where-Object { $_.Name -match 'orders_export|fallback|mongoexport|script.log|auto_fix' } | Select Name,Length,LastWriteTime | Format-Table | Out-String | ForEach-Object { Log $_ }

Log "Done. Check $exportsDir and $diagDir. Log: $logFile"
