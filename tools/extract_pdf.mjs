import fs from 'fs';

async function main() {
  const m = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { getDocument } = m;

  const buffer = fs.readFileSync('c:/1xiangmu/yixiao/materials/lectures/1号书26齐德龙技术实物防火篇.pdf');
  const data = new Uint8Array(buffer);
  const cMapUrl = new URL('file:///c:/1xiangmu/yixiao/node_modules/pdfjs-dist/cmaps/');
  const doc = await getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    cMapUrl: cMapUrl,
    cMapPacked: true
  }).promise;
  const totalPages = doc.numPages;
  console.log('Total pages:', totalPages);

  let allText = '';
  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // items have .str and .transform (x,y coordinates)
    // Sort items by y position (descending = top to bottom), then x (left to right)
    const items = content.items;
    // Group by approximate y position (line)
    const lines = [];
    let currentLine = [];
    let currentY = null;
    const sorted = [...items].sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) < 5) return a.transform[4] - b.transform[4];
      return yDiff;
    });
    for (const item of sorted) {
      const y = item.transform[5];
      if (currentY === null || Math.abs(y - currentY) < 5) {
        currentLine.push(item.str);
        if (currentY === null) currentY = y;
      } else {
        lines.push(currentLine.join(''));
        currentLine = [item.str];
        currentY = y;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine.join(''));

    allText += `\n=== PAGE ${i} ===\n` + lines.join('\n');
    if (i % 50 === 0) console.log(`Processed ${i}/${totalPages} pages`);
  }
  const tmpDir = 'C:/Users/1/AppData/Local/Temp';
fs.writeFileSync(tmpDir + '/lecture_full.txt', allText, 'utf8');
  console.log('Done. Total chars:', allText.length);
}
main().catch(e => console.log('Error:', e.message, e.stack));
