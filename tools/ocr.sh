#!/bin/bash
# 批量 OCR 图片版 PDF：先 pdftoppm 转 PNG，再 tesseract 中文 OCR
# 用法: bash ocr.sh <pdf路径> [分辨率]
# 输出: 与 pdf 同名的 .ocr.txt 到 tools/extracted/
set -e

PDF="$1"
DPI="${2:-200}"
BASE="$(basename "$PDF" .pdf)"
OUT_DIR="c:/1xiangmu/yixiao/tools/extracted"
TMP="c:/1xiangmu/yixiao/tools/ocr-tmp"

TESS="C:/Program Files/Tesseract-OCR/tesseract.exe"
TESSDATA="c:/1xiangmu/yixiao/tools/tessdata"
POPPM="C:/Users/1/AppData/Local/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin/pdftoppm.exe"

mkdir -p "$OUT_DIR" "$TMP"
rm -f "$TMP/$BASE"*.png "$TMP/$BASE"*.txt

echo "==> 转换 PDF 为图片: $BASE"
"$POPPM" -png -r "$DPI" "$PDF" "$TMP/$BASE"

echo "==> OCR 中..."
"$TESS" "$TMP/$BASE-%03d.png" "$TMP/$BASE-out" --tessdata-dir "$TESSDATA" -l chi_sim

# 合并所有页输出
> "$OUT_DIR/$BASE.ocr.txt"
for f in "$TMP/$BASE-out"*.txt; do
  page="$(basename "$f" | grep -oE '[0-9]+' | head -1)"
  {
    echo "===== 第 ${page#0} 页 ====="
    cat "$f"
    echo
  } >> "$OUT_DIR/$BASE.ocr.txt"
done

echo "==> 完成: $OUT_DIR/$BASE.ocr.txt"
rm -f "$TMP/$BASE"*.png "$TMP/$BASE"*.txt
