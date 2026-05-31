Write-Host "=== TEST: Invalid hash format ===" -ForegroundColor Cyan
try {
    $body = '{"studentId":"STU-999","courseId":"CS101","assignmentHash":"NOT_VALID"}'
    Invoke-WebRequest -Uri 'http://localhost:3001/submit' -Method POST -Body $body -ContentType 'application/json' | Out-Null
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host $responseBody -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== TEST: Missing required fields ===" -ForegroundColor Cyan
try {
    $body2 = '{"studentId":"STU-888"}'
    Invoke-WebRequest -Uri 'http://localhost:3001/submit' -Method POST -Body $body2 -ContentType 'application/json' | Out-Null
} catch {
    $stream2 = $_.Exception.Response.GetResponseStream()
    $reader2 = New-Object System.IO.StreamReader($stream2)
    Write-Host ($reader2.ReadToEnd()) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== FINAL: Check submissions.json on disk ===" -ForegroundColor Cyan
$json = Get-Content '..\shared\data\submissions.json' | ConvertFrom-Json
Write-Host "Records persisted to disk: $($json.Count)" -ForegroundColor Green
$json | ForEach-Object { Write-Host "  $($_.receiptId) | $($_.studentId) | $($_.courseId) | $($_.status)" }
