# auto_fix_addresses_final.ps1
# Автоматическое исправление адресов в CSV экспортов (TryFixMojibake, пометки <<UNKNOWN_ADDRESS>>, сохранение UTF8-BOM)
param(
    [string]$ProjectRoot = (Get-Location).Path,
    [string[]]$Patterns = @('*from_json_utf8bom.csv','*_export_from_json_utf8bom.csv','*_export.csv','orders_export_from_json_utf8bom.csv'),
    [string]$ExportsDir = (Join-Path $ProjectRoot 'exports'),
    [string]$DiagDir    = (Join-Path $ProjectRoot 'diagnostics'),
    [int]$PreviewLimit  = 20
)

# --- utils ---
function Log($msg) { $t=(Get-Date).ToString("s"); "$t`t$msg" | Out-File -FilePath (Join-Path $DiagDir 'auto_fix_final.log') -Append -Encoding UTF8; Write-Host $msg }

function TryFixMojibake([string]$s) {
    if (-not $s) { return $s }
    # if already has Cyrillic  likely OK
    if ($s -match '[\p{IsCyrillic}]' -and -not ($s -match 'Р[а-яА-Я]|С[а-яА-Я]')) { return $s }
    $candidates = [System.Collections.Generic.List[string]]::new()
    try {
        $cp1251 = [System.Text.Encoding]::GetEncoding(1251)
        $cp866  = [System.Text.Encoding]::GetEncoding(866)
        $latin1 = [System.Text.Encoding]::GetEncoding('iso-8859-1')
        $utf8   = [System.Text.Encoding]::UTF8

        # 1) assume string currently interpreted as cp1251 bytes shown as Unicode -> re-interpret as cp1251->utf8
        $cand1 = $utf8.GetString($cp1251.GetBytes($s)); $candidates.Add($cand1)
        # 2) cp866 -> utf8
        $cand2 = $utf8.GetString($cp866.GetBytes($s)); $candidates.Add($cand2)
        # 3) latin1 -> utf8
        $cand3 = $utf8.GetString($latin1.GetBytes($s)); $candidates.Add($cand3)
        # 4) try reverse: treat as utf8 bytes then decode as cp1251
        $bytesUtf8 = $utf8.GetBytes($s)
        $cand4 = $cp1251.GetString($bytesUtf8); $candidates.Add($cand4)
        # 5) combination: decode cp1251 then cp866 etc
        $candidates.Add(($utf8.GetString($cp866.GetBytes($cand1))))
        $candidates.Add(($utf8.GetString($latin1.GetBytes($cand1))))
    } catch { }

    # scoring: prefer candidates with Cyrillic and fewer mojibake markers
    $best = $s; $bestScore = -999
    $uniq = $candidates | Where-Object { $_ } | Select-Object -Unique
    foreach ($cand in $uniq) {
        $score = 0
        if ($cand -match '[\p{IsCyrillic}]') { $score += 50 }
        # penalize typical mojibake characters sequences
        $score -= ([regex]::Matches($cand,'Р|С||\?').Count) * 2
        # penalize too short
        if ($cand.Length -gt 4) { $score += [math]::Min(10,$cand.Length/10) }
        if ($score -gt $bestScore) { $bestScore=$score; $best=$cand }
    }
    return $best
}

function NormalizeAddress([string]$addr) {
    if (-not $addr) { return $addr }
    $a = $addr.Trim()
    # detect lost placeholders like many question marks or obvious ascii placeholder
    if ($a -match '^\?{2,}$' -or $a -match '^\?+.*\?+$' -or $a -match '<<UNKNOWN>>' -or $a -match 'NULL|N/A') {
        return '<<UNKNOWN_ADDRESS>>'
    }
    # if contains a lot of replacement chars () or control sequences
    if ($a -match '' -or ($a -match '\?{3,}')) { return '<<UNKNOWN_ADDRESS>>' }
    return $a
}

# ensure folders
if (-not (Test-Path $ExportsDir)) { New-Item -Path $ExportsDir -ItemType Directory -Force | Out-Null }
if (-not (Test-Path $DiagDir))    { New-Item -Path $DiagDir -ItemType Directory -Force | Out-Null }

# start log
"" | Out-File (Join-Path $DiagDir 'auto_fix_final.log') -Encoding UTF8
Log "START auto_fix_addresses_final; Exports: $ExportsDir"

$processedSummary = @()

foreach ($pattern in $Patterns) {
    $files = Get-ChildItem -Path $ExportsDir -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        $inPath = $f.FullName
        $outName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) + '_fixed_addresses_utf8bom.csv'
        $outPath = Join-Path $ExportsDir $outName
        Log "Processing: $inPath -> $outPath"

        try {
            $rows = Import-Csv -Path $inPath -Encoding UTF8
        } catch {
            Log "Failed to import CSV $inPath : $($_.Exception.Message)"
            continue
        }

        $total = 0; $changed = 0
        $changedList = @()
        $fixedRows = @()
        foreach ($r in $rows) {
            $total++
            # find address field (address or addr)
            $addrProp = $null
            if ($r.PSObject.Properties.Name -contains 'address') { $addrProp='address' } elseif ($r.PSObject.Properties.Name -contains 'addr') { $addrProp='addr' }

            $orig = $null
            if ($addrProp) { $orig = $r.$addrProp } else { $orig = $null }

            $new = $orig
            if ($orig) {
                $new = NormalizeAddress $orig
                if ($new -ne '<<UNKNOWN_ADDRESS>>') {
                    # try mojibake fixer if we see mojibake-like chars
                    if ($new -match 'Р[а-яА-Я]|С[а-яА-Я]|' -or ($new -notmatch '[\p{IsCyrillic}]' -and $new -match '[^\x00-\x7F]')) {
                        $cand = TryFixMojibake $new
                        if ($cand -and $cand -ne $new) { $new = $cand }
                    }
                }
            }

            if ($orig -ne $new) {
                $changed++
                $idVal = if ($r.PSObject.Properties.Name -contains '_id') { $r._id } else { $null }
                $changedList += [PSCustomObject]@{_id = $idVal; before = $orig; after = $new}
            }

            if ($addrProp) { $r.$addrProp = $new }
            $fixedRows += $r
        }

        # export CSV with UTF8 BOM
        $temp = [System.IO.Path]::GetTempFileName()
        $fixedRows | Export-Csv -Path $temp -NoTypeInformation -Encoding UTF8
        $utf8 = [System.Text.Encoding]::UTF8
        $all = Get-Content $temp -Raw
        [System.IO.File]::WriteAllBytes($outPath, $utf8.GetPreamble() + $utf8.GetBytes($all))
        Remove-Item $temp -Force -ErrorAction SilentlyContinue

        # try create xlsx with Excel COM
        $xlsxPath = [System.IO.Path]::ChangeExtension($outPath,'xlsx')
        $xlsxCreated = $false
        try {
            $excel = New-Object -ComObject Excel.Application -ErrorAction Stop
            $excel.Visible = $false
            # open as CSV (delimiter autodetect)
            $excel.Workbooks.OpenText($outPath,1,1,1,1,$false,$false,$false,$false,$false,$false,$false,$false)
            $wb = $excel.Workbooks.Item($excel.Workbooks.Count)
            $wb.SaveAs($xlsxPath,51)
            $wb.Close($false)
            $excel.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb) | Out-Null
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
            [GC]::Collect(); [GC]::WaitForPendingFinalizers()
            $xlsxCreated = $true
            Log "XLSX created: $xlsxPath"
        } catch {
            if ($excel) { try { $excel.Quit() } catch {} }
            Log "Excel COM not available or failed: $($_.Exception.Message)"
        }

        # log results
        Log ("File processed: {0}  rows={1} changed={2} out={3} xlsx={4}" -f $inPath,$total,$changed,$outPath,($xlsxCreated -as [string]))
        if ($changed -gt 0) {
            $reportPath = Join-Path $DiagDir ("changes_" + ([System.IO.Path]::GetFileNameWithoutExtension($f.Name)) + ".csv")
            $changedList | Export-Csv -Path $reportPath -NoTypeInformation -Encoding UTF8
            Log ("Saved changes list: $reportPath (first {0} shown below)" -f $PreviewLimit)
            $changedList | Select-Object -First $PreviewLimit | Format-Table | Out-String | ForEach-Object { $_ | Out-File -FilePath (Join-Path $DiagDir 'auto_fix_final.log') -Append -Encoding UTF8 }
        }
        $processedSummary += [PSCustomObject]@{Input=$inPath;Output=$outPath;Rows=$total;Changed=$changed;Xlsx=$xlsxCreated}
    }
}

# final summary
Log "=== SUMMARY ==="
$processedSummary | ForEach-Object { Log ("{0} -> {1}  rows={2} changed={3} xlsx={4}" -f $_.Input,$_.Output,$_.Rows,$_.Changed,$_.Xlsx) }
Log "Done. Check exports/ and diagnostics/auto_fix_final.log"
