#!/bin/bash
# 全并行 OCR：逐页并行转换(pdftoppm) + 并行 tesseract
# 用法: bash ocr-parallel.sh <pdf路径> [并行数]
# 每页一个独立任务：先转 PNG 再 OCR，用 JOBS 个并发
set -e

PDF="$1"
JOBS="${2:-8}"
BASE="$(basename "$PDF" .pdf)"
TMP="c:/1xiangmu/yixiao/tools/ocr-tmp/$BASE"
OUT="c:/1xiangmu/yixiao/tools/extracted/$BASE.ocr.txt"

TESS="C:/Program Files/Tesseract-OCR/tesseract.exe"
TESSDATA="c:/1xiangmu/yixiao/tools/tessdata"
POPPM="C:/Users/1/AppData/Local/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin/pdftoppm.exe"

mkdir -p "$TMP" "c:/1xiangmu/yixiao/tools/extracted"
find "$TMP" -type f 2>/dev/null -delete

# 获取总页数
PAGES=$(node -e "const fs=require('fs');const b=fs.readFileSync(process.argv[1]);const n=(b.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;console.log(n)" "$PDF" 2>/dev/null || echo "0")
if [ "$PAGES" = "0" ] || [ -z "$PAGES" ]; then
  PAGES="300"
fi
echo "==> 总页数: $PAGES，并行: $JOBS"

# 并行逐页处理：转换 + OCR
pids=()
for ((i=1; i<=PAGES; i++)); do
  num=$(printf "%03d" "$i")
  (
    "$POPPM" -png -r 150 -f "$i" -l "$i" "$PDF" "$TMP/p-$num" 2>/dev/null
    # 实际 PNG 文件名可能是 p-NNN-NNN.png，动态匹配
    PNG=$(ls "$TMP"/p-$num-*.png 2>/dev/null | head -1)
    if [ -n "$PNG" ]; then
      "$TESS" "$PNG" "$TMP/p-$num-out" --tessdata-dir "$TESSDATA" -l chi_sim >/dev/null 2>&1
    fi
  ) &
  pids+=($!)
  if [ ${#pids[@]} -ge "$JOBS" ]; then
    for p in "${pids[@]}"; do wait "$p" 2>/dev/null || true; done
    pids=()
    echo "  已处理 $i/$PAGES 页"
  fi
done
for p in "${pids[@]}"; do wait "$p" 2>/dev/null || true; done

echo "==> 合并结果"
> "$OUT"
for txt in "$TMP"/p-*-out.txt; do
  [ -f "$txt" ] || continue
  num=$(basename "$txt" | sed -E 's/p-([0-9]+)-out\.txt/\1/')
  pageno=$((10#$num))
  {
    echo "===== 第 $pageno 页 ====="
    cat "$txt"
    echo
  } >> "$OUT"
done

echo "==> 完成: $OUT"
