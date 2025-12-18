<#
export_all.ps1
(скрипт экспорта коллекций  автоматически создаёт diagnostics/ и exports/)
#>
param(
    [Parameter(Mandatory=$true)][string[]]$Collections = @("orders"),
    [switch]$OpenExcel,
    [switch]$ToXlsx,
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$MongoContainerName = "chistoe_mongo",
    [string]$MongoUri = "mongodb://root:exampleRootPassword@mongo:27017/chistoe_nebo?authSource=admin"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$exportsDir = Join-Path $ProjectRoot "exports"
$diagDir    = Join-Path $ProjectRoot "diagnostics"
$tmpHost    = Join-Path $ProjectRoot "tmp"
foreach ($d in @($exportsDir,$diagDir,$tmpHost)) { if (-not (Test-Path $d)) { New-Item -Path $d -ItemType Directory -Force | Out-Null } }

function Remove-BOM-IfPresent([string]$path) {
    if (-not (Test-Path $path)) { return }
    try {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            [System.IO.File]::WriteAllBytes($path, $bytes[3..($bytes.Length - 1)])
            Write-Host "BOM removed: $path"
        }
    } catch { Write-Warning "Remove-BOM failed for $path : $($_.Exception.Message)" }
}

function Run-DockerExecAndLog { param($Container, $Cmd, $LogPath)
    Write-Host "-> docker exec $Container bash -lc `"$Cmd`""
    $out = & docker exec $Container bash -lc $Cmd 2>&1
    if ($null -eq $out) { $out = "" }
    try { $out | Out-File -FilePath $LogPath -Encoding UTF8 } catch { Write-Warning "Не удалось записать лог $LogPath : $($_.Exception.Message)" }
    if ($out -is [string]) { $lines = $out -split "`n" } else { $lines = $out }
    $lines | ForEach-Object { Write-Host $_ }
    return $out
}

function Convert-MongoJsonToCsv {
    param([Parameter(Mandatory=$true)][string]$JsonPath, [Parameter(Mandatory=$true)][string]$CsvPath, [string[]]$Fields = @("_id","quantity","unit","address","status","price","createdAt","photos"))
    if (-not (Test-Path $JsonPath)) { throw "JSON file not found: $JsonPath" }
    $raw = Get-Content $JsonPath -Raw -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($raw)) { throw "JSON file is empty: $JsonPath" }
    try {
        $j = ConvertFrom-Json -InputObject $raw
        if ($j -is [string] -and -not [string]::IsNullOrWhiteSpace($j)) { try { $j = ConvertFrom-Json -InputObject $j } catch {} }
    } catch { throw "JSON parse error: $($_.Exception.Message)" }
    if ($null -eq $j) { throw "After parsing JSON got null: $JsonPath" }
    if ($j -is [System.Collections.IEnumerable] -and -not ($j -is [string])) { $docs = @($j) } else { $docs = @($j) }

    $out = foreach ($doc in $docs) {
        function UnwrapOid($v) { if ($null -eq $v) { return $null }; if ($v -is [string]) { return $v }; if ($v -is [psobject] -or $v -is [hashtable]) { if ($v.PSObject.Properties.Name -contains '$oid') { return $v.'$oid' }; if ($v.PSObject.Properties.Name -contains 'oid')  { return $v.oid } }; return $v.ToString() }
        function UnwrapDate($v) { if ($null -eq $v) { return $null }; if ($v -is [string]) { return $v }; if ($v -is [psobject] -or $v -is [hashtable]) { if ($v.PSObject.Properties.Name -contains '$date') { return $v.'$date' }; if ($v.PSObject.Properties.Name -contains 'date')  { return $v.date } }; return $v.ToString() }

        $row = [ordered]@{}
        foreach ($f in $Fields) {
            switch ($f) {
                '_id' { $val=$null; if ($doc.PSObject.Properties.Name -contains '_id') { $val=$doc._id } elseif ($doc.PSObject.Properties.Name -contains 'id') { $val=$doc.id }; $row['_id']=UnwrapOid $val }
                'createdAt' { $val=$null; if ($doc.PSObject.Properties.Name -contains 'createdAt') { $val=$doc.createdAt } elseif ($doc.PSObject.Properties.Name -contains 'created_at') { $val=$doc.created_at }; $row['createdAt']=UnwrapDate $val }
                'photos' { $p=$null; if ($doc.PSObject.Properties.Name -contains 'photos') { $p=$doc.photos }; if ($null -eq $p) { $row['photos']=$null } else { if ($p -is [System.Collections.IEnumerable] -and -not ($p -is [string])) { try { $row['photos']=($p -join ';') } catch { $row['photos']=($p | ConvertTo-Json -Compress) } } else { $row['photos']=$p.ToString() } } }
                default { $v=$null; if ($doc.PSObject.Properties.Name -contains $f) { $v=$doc.$f }; $row[$f] = if ($null -eq $v) { $null } else { $v } }
            }
        }
        [PSCustomObject]$row
    }

    $destDir = Split-Path $CsvPath -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    $out | Export-Csv -Path $CsvPath -NoTypeInformation -Encoding UTF8
    Write-Host "Converted $JsonPath -> $CsvPath"
}

foreach ($col in $Collections) {
    $safeCol = $col.Trim()
    if ([string]::IsNullOrWhiteSpace($safeCol)) { continue }
    Write-Host "`n-- Export collection: $safeCol --"
    $containerCsv = "/data/${safeCol}_export.csv"; $containerJson = "/data/${safeCol}_export.json"; $containerOrderById = "/data/${safeCol}_order_by_id.json"
    $hostCsv = Join-Path $exportsDir ("${safeCol}_export.csv"); $hostJson = Join-Path $exportsDir ("${safeCol}_export.json"); $hostOrderById = Join-Path $diagDir ("${safeCol}_order_by_id.json")
    $diagCsvLog = Join-Path $diagDir ("mongoexport_${safeCol}_csv.log"); $diagJsonLog = Join-Path $diagDir ("mongoexport_${safeCol}_json.log"); $diagByIdLog = Join-Path $diagDir ("mongoexport_${safeCol}_byid.log")

    $fields = "_id,quantity,unit,address,status,price,createdAt"
    $csvCmd = "mongoexport --uri=`"$MongoUri`" --collection=`"$safeCol`" --type=csv --fields=`"$fields`" --out=$containerCsv"
    $jsonCmd = "mongoexport --uri=`"$MongoUri`" --collection=`"$safeCol`" --out=$containerJson --jsonArray"

    Write-Host "Running (in container) CSV export..."
    Run-DockerExecAndLog -Container $MongoContainerName -Cmd $csvCmd -LogPath $diagCsvLog | Out-Null
    Write-Host "Running (in container) JSON export..."
    Run-DockerExecAndLog -Container $MongoContainerName -Cmd $jsonCmd -LogPath $diagJsonLog | Out-Null

    try { & docker cp ("${MongoContainerName}:$containerCsv") $hostCsv; if (Test-Path $hostCsv) { Write-Host "Copied CSV -> $hostCsv"; Remove-BOM-IfPresent -Path $hostCsv } else { Write-Warning "Copied but $hostCsv not found after docker cp." } } catch { Write-Warning "docker cp CSV failed: $($_.Exception.Message)" }
    try { & docker cp ("${MongoContainerName}:$containerJson") $hostJson; if (Test-Path $hostJson) { Write-Host "Copied JSON -> $hostJson"; Remove-BOM-IfPresent -Path $hostJson } else { Write-Warning "Copied but $hostJson not found after docker cp." } } catch { Write-Warning "docker cp JSON failed: $($_.Exception.Message)" }

    if (Test-Path $hostJson) {
        try {
            $arr = ConvertFrom-Json -InputObject (Get-Content $hostJson -Raw)
            if ($arr -is [System.Collections.IEnumerable] -and $arr.Count -gt 0) {
                $normalized = $arr | ForEach-Object { $created=$_.createdAt; if ($created -is [psobject] -and $created.PSObject.Properties.Name -contains '$date') { $iso=$created.'$date' } else { $iso=$created }; $_ | Add-Member -NotePropertyName __created_iso -NotePropertyValue $iso -Force; $_ }
                $last = $normalized | Sort-Object -Property { try { [datetime]::Parse($_.__created_iso) } catch { [datetime] '1970-01-01' } } -Descending | Select-Object -First 1
                $lastJson = ($last | ConvertTo-Json -Depth 10)
                Set-Content -Path $hostOrderById -Value ("[" + $lastJson + "]") -Encoding UTF8
                Remove-BOM-IfPresent -Path $hostOrderById
                Write-Host "Saved last document -> $hostOrderById"
            } else { Write-Warning "Parsed JSON but array empty." }
        } catch { Write-Warning "Parsing exported JSON failed: $($_.Exception.Message)" }
    }

    if (Test-Path $hostJson) { try { $outCsvFromJson = Join-Path $exportsDir ("${safeCol}_export_from_json.csv"); Convert-MongoJsonToCsv -JsonPath $hostJson -CsvPath $outCsvFromJson } catch { Write-Warning "Convert JSON->CSV failed for $hostJson : $($_.Exception.Message)" } }
    if (Test-Path $hostOrderById) { try { $outCsvById = Join-Path $exportsDir ("${safeCol}_order_by_id.csv"); Convert-MongoJsonToCsv -JsonPath $hostOrderById -CsvPath $outCsvById } catch { Write-Warning "Convert JSON->CSV failed for $hostOrderById : $($_.Exception.Message)" } }
}

if ($ToXlsx) {
    try {
        if (-not (Get-Module -ListAvailable -Name ImportExcel)) { Install-Module -Name ImportExcel -Scope CurrentUser -Force -AcceptLicense -ErrorAction Stop }
        foreach ($csv in Get-ChildItem $exportsDir -Filter "*_export.csv" -File) {
            $xlsx = [IO.Path]::ChangeExtension($csv.FullName, ".xlsx")
            Import-Csv $csv.FullName | Export-Excel -Path $xlsx -WorksheetName 'data' -AutoSize -Verbose:$false
            Write-Host "Converted to XLSX: $xlsx"
        }
    } catch { Write-Warning "XLSX conversion failed: $($_.Exception.Message)" }
}

if ($OpenExcel) {
    $openList = Get-ChildItem $exportsDir -Filter "*_export.csv" -File | Select-Object -ExpandProperty FullName
    if ($openList.Count -eq 0) { Write-Warning "Нет файлов для открытия." } else {
        foreach ($f in $openList) { try { Start-Process -FilePath "excel.exe" -ArgumentList "`"$f`"" -ErrorAction Stop } catch { Start-Process -FilePath $f }; Write-Host "Opened: $f" }
    }
}

Write-Host "`nDone. Diagnostics: $diagDir`nExports: $exportsDir"
