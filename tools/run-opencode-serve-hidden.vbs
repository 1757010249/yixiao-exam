' Launch the opencode HTTP server (port 4096) with NO visible console window.
'
' Same pattern as run-im-bridge-hidden.vbs: Task Scheduler runs wscript.exe
' (GUI-subsystem -> no console), which starts the server hidden (window style 0)
' in the user's interactive session, so it stays killable without elevation.
'
' Keep this file ASCII-only (see run-im-bridge-hidden.vbs).
Option Explicit
Dim sh, logDir
Set sh = CreateObject("WScript.Shell")
logDir = sh.ExpandEnvironmentStrings("%TEMP%") & "\opencode"
sh.CurrentDirectory = "C:\1xiangmu\yixiao"
sh.Run "cmd /c ""opencode serve --port 4096 >> " & logDir & "\serve-task.log 2>&1""", 0, True
