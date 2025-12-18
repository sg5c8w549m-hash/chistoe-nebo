# export_collections_and_open.ps1
# Robust export script (fixed variable-interpolation issues)
param(
    [Parameter(Mandatory=$true)][string[]]$Collections,
    [switch]$OpenExcel,
    [switch]$ToXlsx,
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$MongoContainerName = "chistoe_mongo",
    [string]$MongoUri = "mongodb://root:exampleRootPassword@mongo:27017/chistoe_nebo?authSource=admin"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Directories
$exportsDir = Join-Path $ProjectRoot "exports"
$diagDir    = Join-Path $ProjectRoot "diagnostics"
$tmpHost    = Join-Path $ProjectRoot "tmp"

foreach ($d in @($exportsDir, $diagDir, $tmpHost)) {
    if (-not (Test-Path $d)) { New-Item -Path $d -ItemType Directory -Force | Out-Null }
}

function Write-Diag {
    param($s)
    $t = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    "$t`t$s" | Tee-Object -FilePath (Join-Path $diagDir "script.log") -Append | Out-Null
    Write-Host $s
}

function Remove-BOM-IfPresent {
    param([string]$path)
    if (-not (Test-Path $path)) { return }
    try {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            [System.IO.File]::WriteAllBytes($path, $bytes[3..($bytes.Length - 1)])
            Write-Diag ("BOM removed: {0}" -f $path)
        }
    } catch {
        Write-Warning ("Remove-BOM failed for {0}: {1}" -f $path, $_.Exception.Message)
    }
}

function Run-DockerExecAndLogSafe {
    param(
        [string]$Container,
        [string]$Cmd,
        [string]$LogPath
    )
    Write-Diag ("-> docker exec {0} bash -lc ""{1}""" -f $Container, $Cmd)
    $out = ""
    try {
        $out = & docker exec $Container bash -lc $Cmd 2>&1 | Out-String
    } catch {
        $ex = $_
        $out = $ex.Exception.Message
        try { $out += "`n" + ($ex.Exception.ResponseData -as [string]) } catch {}
    }
    try {
        $out | Out-File -FilePath $LogPath -Encoding UTF8 -Force
    } catch {
        Write-Warning ("Cannot write log {0}: {1}" -f $LogPath, $_.Exception.Message)
    }
    $previewLines = ($out -split "`n")
    $preview = $previewLines[0..([Math]::Min(39, $previewLines.Count - 1))] -join "`n"
    Write-Host $preview
    return $out
}

function Convert-MongoJsonToCsv {
    param(
        [Parameter(Mandatory=$true)][string]$JsonPath,
        [Parameter(Mandatory=$true)][string]$CsvPath,
        [string[]]$Fields = @("_id","quantity","unit","address","status","price","createdAt","photos")
    )
    if (-not (Test-Path $JsonPath)) { throw "JSON file not found: $JsonPath" }
    $raw = Get-Content $JsonPath -Raw -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($raw)) { throw "JSON file is empty: $JsonPath" }

    try {
        $j = ConvertFrom-Json -InputObject $raw
        if ($j -is [string] -and -not [string]::IsNullOrWhiteSpace($j)) {
            try { $j = ConvertFrom-Json -InputObject $j } catch {}
        }
    } catch {
        throw "JSON parse error: $($_.Exception.Message)"
    }
    if ($null -eq $j) { throw "After parsing JSON got null: $JsonPath" }

    if ($j -is [System.Collections.IEnumerable] -and -not ($j -is [string])) { $docs = @($j) } else { $docs = @($j) }

    $outRows = foreach ($doc in $docs) {
        function UnwrapOid($v) {
            if ($null -eq $v) { return $null }
            if ($v -is [string]) { return $v }
            if ($v -is [psobject] -or $v -is [hashtable]) {
                if ($v.PSObject.Properties.Name -contains '$oid') { return $v.'$oid' }
                if ($v.PSObject.Properties.Name -contains 'oid')  { return $v.oid }
            }
            return $v.ToString()
        }
        function UnwrapDate($v) {
            if ($null -eq $v) { return $null }
            if ($v -is [string]) { return $v }
            if ($v -is [psobject] -or $v -is [hashtable]) {
                if ($v.PSObject.Properties.Name -contains '$date') { return $v.'$date' }
                if ($v.PSObject.Properties.Name -contains 'date')  { return $v.date }
            }
            return $v.ToString()
        }

        $row = [ordered]@{}
        foreach ($f in $Fields) {
            switch ($f) {
                '_id' {
                    $val = $null
                    if ($doc.PSObject.Properties.Name -contains '_id') { $val = $doc._id }
                    elseif ($doc.PSObject.Properties.Name -contains 'id') { $val = $doc.id }
                    $row['_id'] = UnwrapOid $val
                }
                'createdAt' {
                    $val = $null
                    if ($doc.PSObject.Properties.Name -contains 'createdAt') { $val = $doc.createdAt }
                    elseif ($doc.PSObject.Properties.Name -contains 'created_at') { $val = $doc.created_at }
                    $row['createdAt'] = UnwrapDate $val
                }
                'photos' {
                    $p = $null
                    if ($doc.PSObject.Properties.Name -contains 'photos') { $p = $doc.photos }
                    if ($null -eq $p) { $row['photos'] = $null } else {
                        if ($p -is [System.Collections.IEnumerable]) {
                            try { $row['photos'] = ($p -join ';') } catch { $row['photos'] = ($p | ConvertTo-Json -Compress) }
                        } else { $row['photos'] = $p.ToString() }
                    }
                }
                default {
                    $v = $null
                    if ($doc.PSObject.Properties.Name -contains $f) { $v = $doc.$f }
                    $row[$f] = if ($null -eq $v) { $null } else { $v }
                }
            }
        }
        [PSCustomObject]$row
    }

    $destDir = Split-Path $CsvPath -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

    # write UTF-8 no BOM first, then add BOM to final file
    $tempCsv = "$CsvPath.tmp"
    $outRows | Export-Csv -Path $tempCsv -NoTypeInformation -Encoding UTF8
    $utf8 = [System.Text.Encoding]::UTF8
    $all = Get-Content $tempCsv -Raw
    [System.IO.File]::WriteAllBytes($CsvPath, $utf8.GetPreamble() + $utf8.GetBytes($all))
    Remove-Item $tempCsv -Force -ErrorAction SilentlyContinue

    Write-Diag ("Converted {0} -> {1}" -f $JsonPath, $CsvPath)
}

# main loop
foreach ($col in $Collections) {
    $safeCol = $col.Trim()
    if ([string]::IsNullOrWhiteSpace($safeCol)) { continue }

    Write-Diag ("`n== Export collection: {0} ==" -f $safeCol)

    $containerCsv = "/data/${safeCol}_export.csv"
    $containerJson = "/data/${safeCol}_export.json"
    $containerOrderById = "/data/${safeCol}_order_by_id.json"

    $hostCsv = Join-Path $exportsDir ("${safeCol}_export.csv")
    $hostJson = Join-Path $diagDir ("${safeCol}_export.json")
    $hostOrderById = Join-Path $diagDir ("${safeCol}_order_by_id.json")
    $diagCsvLog = Join-Path $diagDir ("mongoexport_${safeCol}_csv.log")
    $diagJsonLog = Join-Path $diagDir ("mongoexport_${safeCol}_json.log")
    $diagByIdLog = Join-Path $diagDir ("mongoexport_${safeCol}_byid.log")

    $fields = "_id,quantity,unit,address,status,price,createdAt"
    $csvCmd = "mongoexport --uri=`"$MongoUri`" --collection=`"$safeCol`" --type=csv --fields=`"$fields`" --out=$containerCsv"
    $jsonCmd = "mongoexport --uri=`"$MongoUri`" --collection=`"$safeCol`" --out=$containerJson --jsonArray"

    Run-DockerExecAndLogSafe -Container $MongoContainerName -Cmd $csvCmd -LogPath $diagCsvLog | Out-Null
    Run-DockerExecAndLogSafe -Container $MongoContainerName -Cmd $jsonCmd -LogPath $diagJsonLog | Out-Null

    try {
        & docker cp ("{0}:{1}" -f $MongoContainerName, $containerCsv) $hostCsv
        Write-Diag ("Copied CSV -> {0}" -f $hostCsv)
        Remove-BOM-IfPresent -path $hostCsv
    } catch {
        Write-Warning ("docker cp CSV failed: {0}" -f $_.Exception.Message)
    }

    try {
        & docker cp ("{0}:{1}" -f $MongoContainerName, $containerJson) $hostJson
        Write-Diag ("Copied JSON -> {0}" -f $hostJson)
        Remove-BOM-IfPresent -path $hostJson
    } catch {
        Write-Warning ("docker cp JSON failed: {0}" -f $_.Exception.Message)
    }

    if (Test-Path $hostJson) {
        try {
            $arr = ConvertFrom-Json -InputObject (Get-Content $hostJson -Raw)
            if ($arr -is [System.Collections.IEnumerable] -and $arr.Count -gt 0) {
                $normalized = $arr | ForEach-Object {
                    $created = $_.createdAt
                    if ($created -is [psobject] -and $created.PSObject.Properties.Name -contains '$date') { $iso = $created.'$date' } else { $iso = $created }
                    $_ | Add-Member -NotePropertyName __created_iso -NotePropertyValue $iso -Force
                    $_
                }
                $last = $normalized | Sort-Object -Property { try { [datetime]::Parse($_.__created_iso) } catch { [datetime] '1970-01-01' } } -Descending | Select-Object -First 1
                $lastJson = ($last | ConvertTo-Json)
                Set-Content -Path $hostOrderById -Value ("[" + $lastJson + "]") -Encoding UTF8
                Remove-BOM-IfPresent -Path $hostOrderById
                Write-Diag ("Saved last document -> {0}" -f $hostOrderById)
            } else { Write-Warning ("Parsed JSON but array empty for {0}" -f $hostJson) }
        } catch {
            Write-Warning ("Parsing exported JSON failed: {0}" -f $_.Exception.Message)
        }
    }

    # convert JSON -> CSV (exports)
    if (Test-Path $hostJson) {
        try {
            $outCsvFromJson = Join-Path $exportsDir ("${safeCol}_export_from_json_utf8bom.csv")
            Convert-MongoJsonToCsv -JsonPath $hostJson -CsvPath $outCsvFromJson
            # produce CP1251 copy as well
            $rows = Get-Content $outCsvFromJson -Raw
            $lines = $rows -split "`n"
            [System.IO.File]::WriteAllLines( (Join-Path $exportsDir ("${safeCol}_export_from_json_1251.csv")), $lines, [System.Text.Encoding]::GetEncoding(1251) )
        } catch {
            Write-Warning ("Convert JSON->CSV failed for {0} : {1}" -f $hostJson, $_.Exception.Message)
        }
    }
    if (Test-Path $hostOrderById) {
        try {
            $outCsvById = Join-Path $exportsDir ("${safeCol}_order_by_id_utf8bom.csv")
            Convert-MongoJsonToCsv -JsonPath $hostOrderById -CsvPath $outCsvById
            $lines = (Get-Content $outCsvById -Raw) -split "`n"
            [System.IO.File]::WriteAllLines( (Join-Path $exportsDir ("${safeCol}_order_by_id_1251.csv")), $lines, [System.Text.Encoding]::GetEncoding(1251) )
        } catch {
            Write-Warning ("Convert JSON->CSV failed for {0} : {1}" -f $hostOrderById, $_.Exception.Message)
        }
    }
}

# Optional: convert to XLSX using ImportExcel if requested
if ($ToXlsx) {
    try {
        if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
            Write-Diag "ImportExcel not found. Installing..."
            Install-Module -Name ImportExcel -Scope CurrentUser -Force -AcceptLicense -ErrorAction Stop
        }
        foreach ($csv in Get-ChildItem $exportsDir -Filter "*_utf8bom.csv" -File) {
            $xlsx = [IO.Path]::ChangeExtension($csv.FullName, ".xlsx")
            Import-Csv $csv.FullName | Export-Excel -Path $xlsx -WorksheetName 'data' -AutoSize -Verbose:$false
            Write-Diag ("Converted to XLSX: {0}" -f $xlsx)
        }
    } catch {
        Write-Warning ("XLSX conversion failed: {0}" -f $_.Exception.Message)
    }
}

# Optional: open Excel
if ($OpenExcel) {
    $openList = Get-ChildItem $exportsDir -Filter "*_utf8bom.csv" -File | Select-Object -ExpandProperty FullName
    if ($openList.Count -eq 0) { Write-Warning "No files to open." } else {
        foreach ($f in $openList) {
            try { Start-Process -FilePath "excel.exe" -ArgumentList "`"$f`"" -ErrorAction Stop } catch { Start-Process -FilePath $f }
            Write-Diag ("Opened: {0}" -f $f)
        }
    }
}

Write-Diag ("`nDone. Diagnostics: {0}`nExports: {1}" -f $diagDir, $exportsDir)

