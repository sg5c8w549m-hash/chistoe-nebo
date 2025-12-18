<#
restore_addresses_universal_final.ps1
Исправленная и финальная версия  готова к запуску.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Mongo config
$mongoUser = 'root'
$mongoPass = 'exampleRootPassword'
$mongoDB   = 'chistoe_nebo'
$mongoHost = 'localhost'
$authSource= 'admin'

$inputCsv  = Join-Path $PWD 'exports\orders_export_fixed_addresses_utf8bom.csv'
$outputCsv = Join-Path $PWD 'exports\orders_export_with_orig_address_utf8bom.csv'
$diagnDir  = Join-Path $PWD 'diagnostics'

$maxRetries = 2
$sleepBetween = 500

if (-not (Test-Path $diagnDir)) { New-Item -ItemType Directory -Path $diagnDir | Out-Null }
$logFile = Join-Path $diagnDir 'restore_log.txt'
"{0}    === Запуск restore_addresses_universal_final.ps1 ===" -f (Get-Date -Format o) | Out-File $logFile -Encoding utf8

function Log {
    param([string]$msg)
    $line = "{0}`t{1}" -f (Get-Date -Format o), $msg
    $line | Tee-Object -FilePath $logFile -Append
}

if (-not (Test-Path $inputCsv)) {
    Log ("ОШИБКА: входной CSV не найден: {0}" -f $inputCsv)
    throw "Input CSV not found: $inputCsv"
}
Log ("Найден входной CSV: {0}" -f $inputCsv)

try {
    $rows = Import-Csv -Path $inputCsv
} catch {
    Log ("Ошибка Import-Csv: {0}. Попытка перезаписать файл в UTF8 и прочитать снова." -f $_.ToString())
    $content = [System.IO.File]::ReadAllText($inputCsv, [System.Text.Encoding]::UTF8)
    $tmp = Join-Path $diagnDir 'tmp_input_utf8.csv'
    [System.IO.File]::WriteAllText($tmp, $content, [System.Text.Encoding]::UTF8)
    $rows = Import-Csv -Path $tmp
}

if ($rows.Count -eq 0) {
    Log "Входной CSV пустой. Прерываем."
    throw "Empty input CSV"
}

$allColumns = @()
foreach ($prop in $rows[0].psobject.properties) { $allColumns += $prop.Name }
if ($allColumns -notcontains 'orig_address') { $allColumns += 'orig_address' }

$results = @()

function Export-OrderById {
    param(
        [string]$idHex,
        [string]$outJsonPath,
        [int]$attempt = 0
    )
    $attempt = [int]$attempt

    $query = '{ "_id": { "$oid": "' + $idHex + '" } }'
    $queryFile = Join-Path $diagnDir ("query_{0}.json" -f $idHex)
    [System.IO.File]::WriteAllBytes($queryFile, [System.Text.Encoding]::UTF8.GetBytes($query))

    $scriptLeaf = "export_{0}.sh" -f $idHex
    $scriptFile = Join-Path $diagnDir $scriptLeaf
    $outLeaf = [System.IO.Path]::GetFileName($outJsonPath)
    $queryLeaf = [System.IO.Path]::GetFileName($queryFile)

    $uri = "mongodb://$($mongoUser):$($mongoPass)@$($mongoHost):27017/$($mongoDB)?authSource=$($authSource)"

    $sh = "#!/bin/bash`nset -e`nmongoexport --uri='$uri' --collection=orders --queryFile=/work/$queryLeaf --out=/work/$outLeaf --jsonArray --pretty`n"
    $shUnix = $sh -replace "`r`n","`n"
    $bytesSh = [System.Text.Encoding]::UTF8.GetBytes($shUnix)
    [System.IO.File]::WriteAllBytes($scriptFile, $bytesSh)

    $args = @('run','--rm','--network','container:chistoe_mongo','-v',"$($diagnDir):/work",'mongo:6','bash',"/work/$scriptLeaf")

    try {
        Log ("RUN docker {0}" -f ($args -join ' '))
        $p = Start-Process -FilePath 'docker' -ArgumentList $args -Wait -NoNewWindow -PassThru
        if (Test-Path $outJsonPath) { return $true } else { throw "mongoexport did not create $outJsonPath" }
    } catch {
        Log ("Ошибка mongoexport id={0} attempt={1} : {2}" -f $idHex, $attempt, $_.ToString())
        if ($attempt -lt $maxRetries) {
            Start-Sleep -Milliseconds $sleepBetween
            return Export-OrderById -idHex $idHex -outJsonPath $outJsonPath -attempt ($attempt + 1)
        } else { return $false }
    }
}

$total = $rows.Count
$idx = 0

foreach ($row in $rows) {
    $idx++
    $rawId = $null
    if ($row.PSObject.Properties.Name -contains '_id') { $rawId = $row._id }
    elseif ($row.PSObject.Properties.Name -contains 'id') { $rawId = $row.id }
    else {
        foreach ($n in $row.PSObject.Properties.Name) { if ($n -match '[iI]d') { $rawId = $row.$n; break } }
    }

    $id = $null
    if ($rawId -ne $null) {
        $raw = [string]$rawId
        if ($raw -match 'ObjectId\(\s*([0-9a-fA-F]{24})\s*\)') { $id = $matches[1] }
        elseif ($raw -match '([0-9a-fA-F]{24})') { $id = $matches[1] }
        else {
            $cand = ($raw -replace '[^0-9a-fA-F]', '')
            if ($cand.Length -ge 24) { $id = $cand.Substring(0,24) } else { $id = $cand }
        }
    }

    if ([string]::IsNullOrWhiteSpace($id)) {
        Log ("WARN: строка {0}/{1} без корректного _id  пропуск." -f $idx, $total)
        $newObj = @{}
        foreach ($c in $allColumns) { if ($row.PSObject.Properties[$c] -ne $null) { $newObj[$c] = $row.$c } else { $newObj[$c] = '' } }
        $newObj['orig_address'] = ''
        $results += (New-Object PSObject -Property $newObj)
        continue
    }

    Log ("[{0}/{1}] Обработка id={2}" -f $idx, $total, $id)

    $outJsonPath = Join-Path $diagnDir ("order_{0}.json" -f $id)
    if (Test-Path $outJsonPath) { Remove-Item $outJsonPath -Force -ErrorAction SilentlyContinue }

    $ok = Export-OrderById -idHex $id -outJsonPath $outJsonPath
    $origAddress = ''

    if ($ok -and (Test-Path $outJsonPath)) {
        try {
            $jsonText = Get-Content $outJsonPath -Raw
            $j = ConvertFrom-Json $jsonText
            if ($j -is [System.Array]) { $doc = $j[0] } else { $doc = $j }
            if ($doc -ne $null -and $doc.PSObject.Properties.Name -contains 'address') { $origAddress = $doc.address -as [string] }
        } catch {
            Log ("Ошибка чтения JSON id={0} : {1}" -f $id, $_.ToString())
        }
    } else {
        Log ("ERROR: экспорт не выполнен id={0}" -f $id)
    }

    $newObj = @{}
    foreach ($c in $allColumns) { if ($c -eq 'orig_address') { $newObj[$c] = $origAddress } elseif ($row.PSObject.Properties[$c] -ne $null) { $newObj[$c] = $row.$c } else { $newObj[$c] = '' } }
    $results += (New-Object PSObject -Property $newObj)
}

function Write-Csv-BOM {
    param($data,$path,$columns)
    $sb = New-Object System.Text.StringBuilder
    $sb.AppendLine(($columns -join ',')) | Out-Null
    foreach ($i in $data) {
        $vals = @()
        foreach ($c in $columns) {
            $s = ''
            if ($i.PSObject.Properties[$c] -ne $null) { $s = [string]$i.$c }
            if ($s -match '[`"",\r\n]') { $s = $s.Replace('"','""'); $s = '"' + $s + '"' }
            $vals += $s
        }
        $sb.AppendLine(($vals -join ',')) | Out-Null
    }
    $bytes = [System.Text.Encoding]::UTF8.GetPreamble() + [System.Text.Encoding]::UTF8.GetBytes($sb.ToString())
    [System.IO.File]::WriteAllBytes($path,$bytes)
}

Write-Csv-BOM -data $results -path $outputCsv -columns $allColumns
Log ("Готово. Итоговый CSV: {0}" -f $outputCsv)