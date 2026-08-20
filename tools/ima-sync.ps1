param(
    [switch]$DryRun,
    [switch]$InitState
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$RepoRoot = "C:\1xiangmu\yixiao"
$ImaGo = "C:\Users\1\go\bin\ima-go.exe"
$ConfigFile = Join-Path $RepoRoot ".opencode\ima-sync.config"
$FolderMapFile = Join-Path $RepoRoot ".opencode\ima-folder-map.json"
$StateFile = Join-Path $RepoRoot ".opencode\ima-sync-state.tsv"

$SyncDirs = @("knowledge-base", "errors", "materials\qimen-dunjia")

$ExcludePrefixes = @(
    "materials/exercises/",
    "materials/past-exams/",
    "materials/lectures/",
    "materials/mind-maps/"
)

function Read-KbId {
    if (-not (Test-Path $ConfigFile)) {
        throw "缺少配置文件 $ConfigFile，请先配置 ima 凭证与 default_kb"
    }
    $raw = Get-Content $ConfigFile -Raw
    foreach ($line in $raw -split "`r?`n") {
        if ($line -match '^default_kb:\s*"?([^"#]*)"?\s*(#.*)?$') {
            $v = $Matches[1].Trim()
            if ($v -ne "") { return $v }
        }
    }
    return ""
}

function Read-FolderMap {
    if (Test-Path $FolderMapFile) {
        return (Get-Content $FolderMapFile -Raw | ConvertFrom-Json)
    }
    return $null
}

function Read-State {
    $files = @{}
    if (Test-Path $StateFile) {
        foreach ($line in Get-Content $StateFile) {
            $parts = $line -split "`t", 2
            if ($parts.Count -eq 2) {
                $files[$parts[1]] = $parts[0]
            }
        }
    }
    return $files
}

function Write-State {
    param($Files)
    $lines = foreach ($k in $Files.Keys) {
        "$($Files[$k])`t$k"
    }
    Set-Content -Path $StateFile -Value $lines -Encoding UTF8
}

function Resolve-FolderId {
    param($RelPath, $FolderMap)

    if ($null -eq $FolderMap) { return "" }

    $bestKey = ""
    $bestId = ""
    foreach ($prop in $FolderMap.PSObject.Properties) {
        $key = $prop.Name
        if ($RelPath -like "$key*" -and $key.Length -gt $bestKey.Length) {
            $bestKey = $key
            $bestId = $prop.Value.folder_id
        }
    }
    return $bestId
}

$kbId = Read-KbId
if ($kbId -eq "") {
    throw "default_kb 未配置。请先在 ima PC 端创建知识库，把 KB ID 填入 $ConfigFile 的 default_kb 字段"
}

$folderMap = Read-FolderMap
$files = Read-State

$newCount = 0
$changedCount = 0
$unchangedCount = 0
$failCount = 0
$initCount = 0
$excludeCount = 0
$changedFiles = @()

foreach ($dir in $SyncDirs) {
    $fullDir = Join-Path $RepoRoot $dir
    if (-not (Test-Path $fullDir)) {
        Write-Output "[跳过] 目录不存在: $dir"
        continue
    }
    $mdFiles = Get-ChildItem -Path $fullDir -Recurse -File -Filter *.md
    foreach ($f in $mdFiles) {
        $relPath = $f.FullName.Substring($RepoRoot.Length + 1).Replace("\", "/")

        $excluded = $false
        foreach ($pre in $ExcludePrefixes) {
            if ($relPath.StartsWith($pre)) {
                $excluded = $true
                break
            }
        }
        if ($excluded) {
            $excludeCount++
            continue
        }

        $hash = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash

        if ($InitState) {
            $files[$relPath] = $hash
            $initCount++
            continue
        }

        if (-not $files.ContainsKey($relPath)) {
            $newCount++
            $folderId = Resolve-FolderId $relPath $folderMap
            if ($DryRun) {
                Write-Output "[新增] $relPath"
            } else {
                Write-Output "[新增] 上传 $relPath ..."
                $out = & $ImaGo kb upload $kbId $f.FullName --folder $folderId 2>&1 | Out-String
                Write-Output $out.Trim()
                if ($LASTEXITCODE -eq 0) {
                    $files[$relPath] = $hash
                } else {
                    $failCount++
                }
            }
        } elseif ($files[$relPath] -ne $hash) {
            $changedCount++
            $changedFiles += $relPath
        } else {
            $unchangedCount++
        }
    }
}

if ($InitState) {
    Write-State $files
} elseif (-not $DryRun -and $newCount -gt 0) {
    Write-State $files
}

Write-Output ""
Write-Output "=== 同步汇总 ==="
if ($InitState) {
    Write-Output "已初始化 state: $initCount 个文件（标记为已同步，不实际上传）"
    Write-Output "用途：手动在 PC 端上传文件夹后，对齐本地 state，避免后续同步重复上传"
} else {
    Write-Output "新增上传: $newCount 个"
    Write-Output "内容未变: $unchangedCount 个"
    Write-Output "修改待处理: $changedCount 个"
    Write-Output "失败: $failCount 个"
    Write-Output "排除(题眼/讲义/导图目录): $excludeCount 个"
}

if ($changedCount -gt 0) {
    Write-Output ""
    Write-Output "以下文件内容已修改，ima API 无更新接口，需手动处理（去 ima PC 端删除旧条目后重新上传，或忽略）："
    foreach ($cf in $changedFiles) {
        Write-Output "  - $cf"
    }
}

if ($DryRun) {
    Write-Output ""
    Write-Output "(dry-run 模式，未做任何上传)"
}
