param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$RepoRoot = "C:\1xiangmu\yixiao"
$ImaGo = "C:\Users\1\go\bin\ima-go.exe"
$PendingDir = Join-Path $RepoRoot "wb-suggestions\pending"
$LedgerFile = Join-Path $RepoRoot "wb-suggestions\待处理清单.md"
$PulledFile = Join-Path $RepoRoot ".opencode\ima-pulled-notes.json"

function Read-Pulled {
    if (Test-Path $PulledFile) {
        return @((Get-Content $PulledFile -Raw | ConvertFrom-Json))
    }
    return @()
}

function Next-Seq {
    $today = Get-Date -Format "yyyy-MM-dd"
    $files = Get-ChildItem -Path $PendingDir -Filter "$today-*.md" -File -ErrorAction SilentlyContinue
    return ($files.Count + 1)
}

function Safe-Title {
    param([string]$Title)
    $t = $Title -replace '^\[建议\]\s*', ''
    $t = $t -replace '[\\/:*?"<>|#\[\]]', ''
    $t = $t.Trim()
    if ($t -eq "") { $t = "未命名建议" }
    if ($t.Length -gt 40) { $t = $t.Substring(0, 40) }
    return $t
}

$pulled = Read-Pulled
$raw = & $ImaGo note list --format json 2>&1 | Out-String

$notes = $null
try {
    $notes = $raw | ConvertFrom-Json
} catch {
    Write-Output "无法解析 note list 输出，可能没有笔记或输出异常"
    Write-Output $raw
    exit 0
}

if ($null -eq $notes) {
    Write-Output "当前 ima 端无笔记。"
    exit 0
}

$noteArray = @($notes)
$suggestNotes = @($noteArray | Where-Object { $_.title -match '^\[建议\]' })

if ($suggestNotes.Count -eq 0) {
    Write-Output "未发现带 [建议] 前缀的笔记。"
    exit 0
}

$newCount = 0
$today = Get-Date -Format "yyyy-MM-dd"

foreach ($n in $suggestNotes) {
    $docId = $n.docid
    if ($pulled -contains $docId) {
        Write-Output "[跳过] 已回流过: $($n.title)"
        continue
    }

    $content = (& $ImaGo note cat $docId 2>&1 | Out-String).TrimEnd()
    if ($content -eq "") {
        Write-Output "[警告] 笔记内容为空，跳过: $($n.title)"
        continue
    }

    $seq = Next-Seq
    $title = Safe-Title $n.title
    $fileName = "$today-{0:D2}-$title.md" -f $seq
    $filePath = Join-Path $PendingDir $fileName

    $body = @"
---
date: $today
source_qa: ima 笔记回流（docid: $docId，标题: $($n.title)）
suggest_type: 新增 / 修正 / 存疑复核
status: pending
---

# $title

## 建议内容
$content

## 拟写入位置
（待 opencode 核对后填写）

## 拟依据规范条文
（待核实）

## 相关已收录条目
（待 opencode 核对后填写）
"@

    if ($DryRun) {
        Write-Output "[预览] 将生成 $fileName"
    } else {
        Set-Content -Path $filePath -Value $body -Encoding UTF8
        Write-Output "[已生成] $fileName"

        $row = "| {0} | {1} | {2} | {3} | 待处理（ima 笔记回流） |" -f "X", $today, $title, $fileName
        Add-Content -Path $LedgerFile -Value $row -Encoding UTF8

        $pulled += $docId
        $newCount++
    }
}

if (-not $DryRun -and $newCount -gt 0) {
    $pulled | ConvertTo-Json | Set-Content -Path $PulledFile -Encoding UTF8
}

Write-Output ""
Write-Output "=== 回流汇总 ==="
Write-Output "新回流建议: $newCount 条"
if (-not $DryRun -and $newCount -gt 0) {
    Write-Output "已登记台账 $LedgerFile（# 序号占位为 X，请人工补齐序号）"
}
