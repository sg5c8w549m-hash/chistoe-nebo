param(
  [int]$Count = 10,
  [string]$BaseUrl = "http://127.0.0.1:4000"
)

$types = @("mixed_waste","paper","plastic","metal","rubber","ash")
$streets = @("ул. Ленина","ул. Абая","ул. Тауелсыздык","ул. Гоголя","пр. Назарбаева","ул. Байзакова")
$rand = New-Object System.Random

Write-Host "Generating $Count orders to $BaseUrl/api/orders ..." -ForegroundColor Cyan

for ($i=1; $i -le $Count; $i++) {
    $type = $types[$rand.Next(0, $types.Count)]
    $qty  = [math]::Round(($rand.NextDouble() * 100) + 1, 2)  # 1..101 kg
    $addr = "$($streets[$rand.Next(0,$streets.Count)]), $((1 + $rand.Next(0,200)))"
    $phone = "+7" + ((10000000000 + $rand.Next(0,900000000)).ToString().Substring(1)) # makes +7XXXXXXXXXX

    $body = @{
        type = $type
        quantity = $qty
        address = $addr
        phone = $phone
    } | ConvertTo-Json

    try {
        $resp = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "[$i] CREATED id:" $resp._id " type:" $resp.type " qty:" $resp.quantity -ForegroundColor Green
    } catch {
        Write-Host "[$i] ERROR: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            try { $text = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd(); Write-Host $text -ForegroundColor Yellow } catch {}
        }
    }
    Start-Sleep -Milliseconds (100 + $rand.Next(0,500))
}
Write-Host "Done." -ForegroundColor Cyan
