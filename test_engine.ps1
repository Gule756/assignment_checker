$baseUrl = 'http://localhost:3001'

function PrintSection($title, $color) {
    Write-Host ""
    Write-Host ("=" * 50) -ForegroundColor $color
    Write-Host "  $title" -ForegroundColor $color
    Write-Host ("=" * 50) -ForegroundColor $color
}

# ── TEST 1: ON_TIME submission ────────────────────────────────────
PrintSection "TEST 1: ON-TIME submission (CS401)" "Cyan"
$b1 = @{ studentId="STU-2024-001"; courseId="CS401"; assignmentHash="a3f1d2e4b9c7f1a2b3c4d5e6f7a8b9cd1e2f3a4b" } | ConvertTo-Json
$r1 = Invoke-RestMethod -Uri "$baseUrl/submit" -Method POST -Body $b1 -ContentType "application/json"
Write-Host "  success   : $($r1.success)" -ForegroundColor White
Write-Host "  receiptId : $($r1.receipt.receiptId)" -ForegroundColor White
Write-Host "  status    : $($r1.receipt.status)" -ForegroundColor Green
Write-Host "  message   : $($r1.receipt.message)" -ForegroundColor Gray

# ── TEST 2: LATE submission ───────────────────────────────────────
PrintSection "TEST 2: LATE submission (CS301 past deadline)" "Yellow"
$b2 = @{ studentId="STU-2024-002"; courseId="CS301"; assignmentHash="deadbeef1234abcd5678ef90abcdef1234567890" } | ConvertTo-Json
$r2 = Invoke-RestMethod -Uri "$baseUrl/submit" -Method POST -Body $b2 -ContentType "application/json"
Write-Host "  success   : $($r2.success)" -ForegroundColor White
Write-Host "  receiptId : $($r2.receipt.receiptId)" -ForegroundColor White
Write-Host "  status    : $($r2.receipt.status)" -ForegroundColor Yellow
Write-Host "  message   : $($r2.receipt.message)" -ForegroundColor Gray

# ── TEST 3: REJECTED — bad hash ──────────────────────────────────
PrintSection "TEST 3: REJECTED — invalid hash format" "Red"
$b3 = @{ studentId="STU-2024-003"; courseId="CS101"; assignmentHash="not-a-valid-hash!!!" } | ConvertTo-Json
try {
    $r3 = Invoke-WebRequest -Uri "$baseUrl/submit" -Method POST -Body $b3 -ContentType "application/json"
    $parsed = $r3.Content | ConvertFrom-Json
    Write-Host "  success   : $($parsed.success)" -ForegroundColor White
    Write-Host "  status    : $($parsed.receipt.status)" -ForegroundColor Red
    Write-Host "  message   : $($parsed.receipt.message)" -ForegroundColor Gray
} catch {
    $body = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  success   : $($body.success)" -ForegroundColor White
    Write-Host "  status    : $($body.receipt.status)" -ForegroundColor Red
    Write-Host "  message   : $($body.receipt.message)" -ForegroundColor Gray
}

# ── TEST 4: URL reference submission ─────────────────────────────
PrintSection "TEST 4: URL reference hash (CS201)" "Green"
$b4 = @{ studentId="STU-2024-004"; courseId="CS201"; assignmentHash="https://github.com/student/cs201-assignment" } | ConvertTo-Json
$r4 = Invoke-RestMethod -Uri "$baseUrl/submit" -Method POST -Body $b4 -ContentType "application/json"
Write-Host "  success   : $($r4.success)" -ForegroundColor White
Write-Host "  receiptId : $($r4.receipt.receiptId)" -ForegroundColor White
Write-Host "  status    : $($r4.receipt.status)" -ForegroundColor Green

# ── TEST 5: Missing fields ────────────────────────────────────────
PrintSection "TEST 5: REJECTED — missing fields" "Red"
$b5 = @{ studentId="STU-2024-005" } | ConvertTo-Json
try {
    $r5 = Invoke-WebRequest -Uri "$baseUrl/submit" -Method POST -Body $b5 -ContentType "application/json"
    $p5 = $r5.Content | ConvertFrom-Json
    Write-Host "  success   : $($p5.success)" -ForegroundColor White
    Write-Host "  status    : $($p5.receipt.status)" -ForegroundColor Red
} catch {
    $p5 = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  success   : $($p5.success)" -ForegroundColor White
    Write-Host "  status    : $($p5.receipt.status)" -ForegroundColor Red
}

# ── TEST 6: Stats ─────────────────────────────────────────────────
PrintSection "TEST 6: Stats endpoint" "Magenta"
$stats = Invoke-RestMethod -Uri "$baseUrl/submissions/stats"
Write-Host "  total    : $($stats.total)" -ForegroundColor White
Write-Host "  onTime   : $($stats.onTime)" -ForegroundColor Green
Write-Host "  late     : $($stats.late)" -ForegroundColor Yellow
Write-Host "  rejected : $($stats.rejected)" -ForegroundColor Red

# ── TEST 7: List all ─────────────────────────────────────────────
PrintSection "TEST 7: GET all submissions" "Cyan"
$all = Invoke-RestMethod -Uri "$baseUrl/submissions"
Write-Host "  Records returned: $($all.Count)" -ForegroundColor White
$all | ForEach-Object { Write-Host "    - $($_.receiptId) | $($_.studentId) | $($_.courseId) | $($_.status)" -ForegroundColor Gray }

Write-Host ""
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host "  ALL TESTS COMPLETE" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green
