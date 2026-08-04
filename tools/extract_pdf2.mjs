import fs from 'fs';
import PDFParser from 'pdf2json';

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => {
  console.error('Parse error:', errData.parserError);
});

pdfParser.on('pdfParser_dataReady', pdfData => {
  console.log('Total pages:', pdfData.Pages?.length || pdfData.formImage?.Pages?.length);

  let allText = '';
  const pages = pdfData.Pages || pdfData.formImage?.Pages || [];
  pages.forEach((page, idx) => {
    const texts = page.Texts || [];
    // Sort texts by y then x
    const sorted = [...texts].sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) < 2) return a.x - b.x;
      return yDiff;
    });

    let pageText = '';
    let currentY = null;
    let currentLine = [];

    sorted.forEach(t => {
      const text = decodeURIComponent(t.R?.[0]?.T || '');
      const y = Math.round(t.y);
      if (currentY === null || Math.abs(y - currentY) < 5) {
        currentLine.push(text);
        if (currentY === null) currentY = y;
      } else {
        pageText += currentLine.join('') + '\n';
        currentLine = [text];
        currentY = y;
      }
    });
    if (currentLine.length > 0) pageText += currentLine.join('') + '\n';

    allText += `\n=== PAGE ${idx + 1} ===\n` + pageText;
  });

  const outPath = 'C:/Users/1/AppData/Local/Temp/lecture_full.txt';
  fs.writeFileSync(outPath, allText, 'utf8');
  console.log('Done. Total chars:', allText.length, 'Output:', outPath);
});

pdfParser.loadPDF('c:/1xiangmu/yixiao/materials/lectures/1号书26齐德龙技术实物防火篇.pdf');
