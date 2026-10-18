# Non-blocking restart of the Feishu/IM bridge (scheduled task OpenCodeIMBridge).
# Safe to re-run. No elevation needed: the task runs Interactive in the user's
# own session (LogonType=Interactive), so bun.exe can be stopped by the same user.
#
# Why not run the bridge directly: it is a long-running server. Running it in the
# foreground blocks the shell/agent until timeout (looks like a frozen session).
# Always start/stop it through the scheduled task.
#
# NOTE: `schtasks /End` kills the cmd wrapper but can leave an orphaned bun.exe,
# so we explicitly stop stray bun processes. This ends ALL bun.exe on the machine
# (fine here: the bridge is the only bun workload).

$ErrorActionPreference = 'Continue'
$task = 'OpenCodeIMBridge'
$log = Join-Path $env:TEMP 'opencode\bridge-task.log'

Write-Host "Stopping $task ..."
schtasks /End /TN $task *> $null
Start-Sleep -Seconds 2

Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting $task ..."
schtasks /Run /TN $task *> $null

# Non-blocking: never wait for the server. Just confirm it came up, then return.
Start-Sleep -Seconds 6
$bun = Get-Process bun -ErrorAction SilentlyContinue
$state = (Get-ScheduledTask -TaskName $task).State
Write-Host ("task state: {0}; bun pid: {1}" -f $state, (($bun.Id) -join ','))
Write-Host "log: $log"
