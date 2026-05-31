$url = 'http://localhost:3001/submit'
$ct  = 'application/json'

Write-Host "--- TEST: Invalid hash format (expects REJECTED) ---"
$b = '{"studentId":"STU-999","courseId":"CS101","assignmentHash":"NOT_VALID!!!"}'
try {
    $r = Invoke-WebRequest -Uri $url -Method POST -Body $b -ContentType $ct
    $r.Content
} catch {
    $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "--- TEST: Missing fields (expects REJECTED) ---"
$b2 = '{"studentId":"STU-888"}'
try {
    $r2 = Invoke-WebRequest -Uri $url -Method POST -Body $b2 -ContentType $ct
    $r2.Content
} catch {
    $_.ErrorDetails.Message
}
