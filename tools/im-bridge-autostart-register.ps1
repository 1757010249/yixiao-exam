# Register OpenCodeServe / OpenCodeIMBridge logon-trigger scheduled tasks
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\im-bridge-autostart-register.ps1
#
# NOTE: keep this file ASCII-only. PowerShell 5.1 reads BOM-less files as ANSI,
# and non-ASCII comments get mis-decoded, which silently breaks parsing.
# NOTE: task action must use plain readable -Command form. -EncodedCommand and
# the "-ExecutionPolicy Bypass -WindowStyle Hidden" combo get blocked by
# security software (observed exit code -1 / 0xFFFD0000).
# NOTE: do NOT wrap the -Command payload in double quotes here.
# Register-ScheduledTask strips embedded double quotes together with the whole
# payload (stored as: -NoProfile -Command ""). Without quotes, powershell.exe
# treats the rest of the argument line as script text; single-quoted paths are safe.
$ErrorActionPreference = 'Stop'

$projectDir = 'C:\1xiangmu\yixiao'
$logDir = Join-Path $env:TEMP 'opencode'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# cmd.exe raw redirection instead of powershell *>>: PS 5.1 wraps native stderr
# lines as ErrorRecords; heavy stderr spam (wechat typing status) can kill the
# pipeline and the process dies silently with exit code 0 (no auto-restart).
$serveCmd  = "cd /d $projectDir && opencode serve --port 4096 >> $logDir\serve-task.log 2>&1"
$bridgeCmd = "cd /d $projectDir && opencode-im-bridge >> $logDir\bridge-task.log 2>&1"

function New-BridgeTask {
    param(
        [string]$TaskName,
        [string]$Command,
        [string]$Delay
    )
    if ([string]::IsNullOrEmpty($Command)) { throw "Command for $TaskName is empty" }

    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    if ($Delay) { $trigger.Delay = $Delay }

    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -MultipleInstances IgnoreNew `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -StartWhenAvailable

    $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $Command + '"')
    if ($null -eq $action) { throw "Failed to create action for $TaskName" }
    # S4U = "run whether user is logged on or not" without stored password.
    # Runs headless in session 0: no console window to close by accident.
    # If security software blocks S4U, revert to Interactive (visible window).
    $principal = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType S4U

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    Write-Host "Registered task: $TaskName"
}

New-BridgeTask -TaskName 'OpenCodeServe'     -Command $serveCmd  -Delay ''
New-BridgeTask -TaskName 'OpenCodeIMBridge'  -Command $bridgeCmd -Delay 'PT30S'

Write-Host "Log dir: $logDir"
