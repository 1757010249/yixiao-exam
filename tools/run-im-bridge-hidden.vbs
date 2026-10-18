' Launch the Feishu/IM bridge with NO visible console window.
'
' Task Scheduler runs wscript.exe, a GUI-subsystem host, so no console window is
' created. This script then starts the bridge with window style 0 (hidden). It
' still runs in the user's own interactive session, so `Stop-Process` and
' `schtasks /End` keep working without elevation.
'
' Keep this file ASCII-only (same convention as tools\*.ps1): the bridge
' redirect (>> ... 2>&1) must stay raw cmd.exe, PS 5.1 would wrap native stderr
' as ErrorRecords and the heavy spam can kill the pipeline silently.
Option Explicit
Dim sh, logDir
Set sh = CreateObject("WScript.Shell")
logDir = sh.ExpandEnvironmentStrings("%TEMP%") & "\opencode"
sh.CurrentDirectory = "C:\1xiangmu\yixiao"
sh.Run "cmd /c ""opencode-im-bridge >> " & logDir & "\bridge-task.log 2>&1""", 0, True
