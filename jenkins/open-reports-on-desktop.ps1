# Jenkins desktop auto-open helper.
#
# Runs as the logged-on user (via the interactive 'zincbank-open-reports'
# scheduled task) and opens the two freshly built reports in that user's
# browser. The Jenkinsfile triggers it with `schtasks /run` inside post{always}
# after EVERY completed build (manual, cron or SCM-poll).
#
# Why a scheduled task? The Jenkins controller runs as a Windows service in
# session 0, so a plain `start` from the pipeline would open a browser nobody
# can see. A task registered with an Interactive principal runs in the logged-on
# user's session instead.
#
# The request file is written by the pipeline into the job workspace right
# before this task is started. Its content:
#   { cucumberHtml, allureUrl, allureHtml, buildNumber }
#
# Best-effort only: this script never fails the build (every exit is 0) and
# logs to <workspace>/open-reports-desktop.log for troubleshooting.

$ErrorActionPreference = 'SilentlyContinue'

$workspaceRoot = Split-Path -Parent $PSScriptRoot   # <workspace>/jenkins -> <workspace>
$requestFile   = Join-Path $workspaceRoot 'open-reports-request.json'
$logFile       = Join-Path $workspaceRoot 'open-reports-desktop.log'

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch { }
    Write-Host $line
}

Write-Log "open-reports-on-desktop started (user=$env:USERNAME session=$env:SESSIONNAME)"

if (-not (Test-Path $requestFile)) {
    Write-Log "No request file found ($requestFile) - skipping."
    exit 0
}

$req = $null
try { $req = Get-Content $requestFile -Raw | ConvertFrom-Json } catch { $req = $null }
if (-not $req) {
    Write-Log "Request file unreadable - skipping."
    exit 0
}

$opened = 0

# 1) Cucumber HTML report - self-contained static HTML, opens fine over file://
$cucumber = [string]$req.cucumberHtml
if ($cucumber -and (Test-Path $cucumber)) {
    try {
        Start-Process $cucumber
        $opened++
        Write-Log "Opened Cucumber report: $cucumber"
    } catch {
        Write-Log "Failed to open Cucumber report: $($_.Exception.Message)"
    }
} else {
    Write-Log "Cucumber report not found: $cucumber"
}

# 2) Allure report - prefer the Jenkins Allure-plugin URL of this build (served
#    over HTTP, so it renders). The local file renders blank over file://
#    (Allure loads its data with fetch(), which browsers block on file://).
$allureUrl = [string]$req.allureUrl
if ($allureUrl) {
    try {
        Start-Process $allureUrl
        $opened++
        Write-Log "Opened Allure report URL: $allureUrl"
    } catch {
        Write-Log "Failed to open Allure URL: $($_.Exception.Message)"
    }
} else {
    $allureHtml = [string]$req.allureHtml
    if ($allureHtml -and (Test-Path $allureHtml)) {
        try {
            Start-Process $allureHtml
            $opened++
            Write-Log "Opened Allure report file: $allureHtml"
        } catch {
            Write-Log "Failed to open Allure file: $($_.Exception.Message)"
        }
    } else {
        Write-Log "Allure report not found."
    }
}

Write-Log "Finished - opened $opened report(s)."
exit 0
