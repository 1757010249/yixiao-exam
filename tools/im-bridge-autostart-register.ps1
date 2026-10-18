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

# Headless services must not pop a visible console window. The task action runs
# wscript.exe (a GUI-subsystem host, so no console is created) which starts the
# service hidden (window style 0) through tools\run-*-hidden.vbs. The vbs keeps
# raw cmd.exe redirection (>> ... 2>&1): PS 5.1 wraps native stderr lines as
# ErrorRecords, and heavy stderr spam (wechat typing status) can kill the
# pipeline, making the process die silently with exit code 0 (no auto-restart).
# NOTE: powershell "-WindowStyle Hidden" is blocked by security software here
# (observed exit -1 / 0xFFFD0000), so wscript + vbs is used instead.
$serveLauncher  = Join-Path $projectDir 'tools\run-opencode-serve-hidden.vbs'
$bridgeLauncher = Join-Path $projectDir 'tools\run-im-bridge-hidden.vbs'

function New-BridgeTask {
    param(
        [string]$TaskName,
        [string]$Launcher,
        [string]$Delay
    )
    if ([string]::IsNullOrEmpty($Launcher)) { throw "Launcher for $TaskName is empty" }

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

    # wscript.exe hosts the (hidden) service: GUI-subsystem => no console window.
    # The vbs waits on the child, so the task stays "Running" while the service
    # lives and the RestartCount setting still kicks in if it dies.
    $action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\wscript.exe" -Argument ('//B //Nologo "' + $Launcher + '"')
    if ($null -eq $action) { throw "Failed to create action for $TaskName" }
    # Interactive = run in the user's own session while logged on (not session 0).
    # Chosen over S4U so `schtasks /End` reliably terminates the whole process
    # tree (no orphaned bun.exe) and so a non-elevated shell can Stop-Process it.
    # The visible-console downside of Interactive is removed by the hidden vbs.
    $principal = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType Interactive

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    Write-Host "Registered task: $TaskName"
}

New-BridgeTask -TaskName 'OpenCodeServe'     -Launcher $serveLauncher  -Delay ''
New-BridgeTask -TaskName 'OpenCodeIMBridge'  -Launcher $bridgeLauncher -Delay 'PT30S'

Write-Host "Log dir: $logDir"
