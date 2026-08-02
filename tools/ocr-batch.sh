#!/bin/bash
# 批量并行 OCR 多本 PDF
# 用法: bash ocr-batch.sh 并行数
set -e
JOBS="${1:-16}"

cd c:/1xiangmu/yixiao

FILES=(
  "materials/qimen-dunjia/26卡牌大师.pdf"
  "materials/lectures/1号书26齐德龙技术实物防火篇.pdf"
  "materials/lectures/3号书设施篇.pdf"
  "materials/lectures/5号书消防综合能力内页.pdf"
  "materials/exercises/6号综合习题.pdf"
)

for f in "${FILES[@]}"; do
  base=$(basename "$f")
  echo "=====> 开始: $base"
  bash tools/ocr-parallel.sh "$f" "$JOBS" 2>&1 | tail -2
  echo "=====> 完成: $base"
done

echo "全部批量完成"
