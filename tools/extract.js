// 从 PDF 提取文本。用 pdfjs-dist 处理内嵌 ToUnicode 映射，可读中文。
// 用法: node extract.js <pdf路径> [起始页] [结束页] [输出文件]
// 页从1开始编号，输出包含页码标记的纯文本。
const path = require('path');
const fs = require('fs');

async function main() {
  const pdfPath = path.resolve(process.argv[2]);
  const startPage = parseInt(process.argv[3] || '1', 10);
  const endPage = process.argv[4] ? parseInt(process.argv[4], 10) : startPage;
  const outFile = process.argv[5];

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, ignoreErrors: true }).promise;

  let result = '';
  for (let p = startPage; p <= Math.min(endPage, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // 按行聚合文本项
    const lines = new Map(); // y -> items
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push(item.str);
    }
    const lineTexts = [...lines.entries()]
      .sort((a, b) => b[0] - a[0]) // PDF y 轴向下，需反向
      .map(([, arr]) => arr.join(''));
    result += `\n===== 第 ${p} 页 =====\n` + lineTexts.join('\n') + '\n';
  }

  if (outFile) {
    fs.writeFileSync(path.resolve(outFile), result, 'utf8');
    console.log(`已提取 ${Math.min(endPage, doc.numPages) - startPage + 1} 页到 ${outFile}`);
  } else {
    process.stdout.write(result);
  }
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
