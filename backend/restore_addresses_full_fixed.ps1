# per-id export loop (heredoc inside docker exec to avoid quoting hell)
$exported = 0
foreach ($id in $ids) {
    try {
        $remote        = "/tmp/orders_doc_$id.json"
        $tmpQueryPath  = "/tmp/query_$id.json"
        $local         = Join-Path $DiagDir "orders_doc_$id.json"
        $execLog       = Join-Path $DiagDir "exec_export_$id.out"
        $cpLog         = Join-Path $DiagDir "cp_export_$id.out"

        if (Test-Path $local) {
            Write-Host "[SKIP] $id -> already have $local" | Tee-Object -FilePath $GlobalLog -Append
            continue
        }

        "`n[EXPORT] id: $id" | Tee-Object -FilePath $execLog -Append

        # build JSON query content
        $tmpQueryContent = '{ "_id": { "$oid": "' + $id + '" } }'

        # write query file inside container using heredoc (bash)
        $heredoc = @"
cat > $tmpQueryPath <<'Q'
$tmpQueryContent
Q
"@

        & docker exec $MongoContainer bash -lc $heredoc 2>&1 | Tee-Object -FilePath $execLog -Append

        # validate JSON inside container (optional)
        & docker exec $MongoContainer bash -lc "python3 -m json.tool $tmpQueryPath >/dev/null 2>&1 && echo VALID || echo INVALID" 2>&1 | Tee-Object -FilePath $execLog -Append

        # run mongoexport using queryFile
        & docker exec $MongoContainer bash -lc "mongoexport --db=$MongoDb --collection=orders --queryFile=$tmpQueryPath --out=$remote --jsonArray" 2>&1 | Tee-Object -FilePath $execLog -Append

        # check remote file and copy to host
        $exists = (& docker exec $MongoContainer bash -lc "test -f $remote && echo exists || echo missing") 2>&1
        $exists | Tee-Object -FilePath $execLog -Append

        if ($exists -match 'exists') {
            & docker cp ("${MongoContainer}:$remote") $local 2>&1 | Tee-Object -FilePath $cpLog -Append
            "`n[COPIED] -> $local" | Tee-Object -FilePath $execLog -Append
            $exported++

            # cleanup inside container
            & docker exec $MongoContainer bash -lc "rm -f $remote $tmpQueryPath" 2>$null
        } else {
            "`n[FAILED] export inside container for id $id. See log: $execLog" | Tee-Object -FilePath $GlobalLog -Append
        }
    } catch {
        "`n[ERROR] id $id -> $_" | Tee-Object -FilePath $GlobalLog -Append
    }
}
