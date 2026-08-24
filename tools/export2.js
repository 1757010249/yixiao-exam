// 改进版对比：支持"数字："粘连题号，输出准确的新增/删除清单
// 用法: node export2.js <旧版txt> <新版txt> <输出md>
const fs = require('fs');
const [oldFile, newFile, outFile] = process.argv.slice(2);

function normalize(s) { return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g, ''); }

function extractStem(body) {
  let m = body.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);
  if (m) return { no: m[1], stem: body.slice(m.index + m[0].length) };
  m = body.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);
  if (m) return { no: m[1], stem: body.slice(m.index + m[0].length) };
  return { no: '', stem: body };
}

function parse(file) {
  const text = fs.readFileSync(file, 'utf8');
  const clean = text.replace(/===== 第 \d+ 页 =====/g, '\n');
  const parts = clean.split(/正确答案\s*[:：]\s*/);
  const qs = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const body = parts[i];
    const answer = normalize(parts[i + 1].split('\n')[0]).toUpperCase().replace(/[^A-E]/g, '');
    const { no, stem } = extractStem(body);
    let sc = stem; const oi = sc.search(/[A-EＡ-Ｅ]\s*[\.、．]/); if (oi >= 0) sc = sc.slice(0, oi);
    qs.push({ no, answer, normStem: normalize(sc), body });
  }
  return qs;
}

const oldQs = parse(oldFile);
const newQs = parse(newFile);
function key(q) { return q.answer + '|' + q.normStem; }

const oldMap = new Map();
oldQs.forEach((q, i) => { const k = key(q); if (!oldMap.has(k)) oldMap.set(k, []); oldMap.get(k).push(i); });

const newMatched = new Array(newQs.length).fill(false);
const oldMatched = new Array(oldQs.length).fill(false);
newQs.forEach((q, i) => { const k = key(q); const h = oldMap.get(k); if (h && h.length > 0) { oldMatched[h.shift()] = true; newMatched[i] = true; } });

const deleted = oldQs.map((q, i) => ({ q, i })).filter(x => !oldMatched[x.i]);
const added = newQs.map((q, i) => ({ q, i })).filter(x => !newMatched[x.i]);

let out = `# 准确对比结果（改进版解析）\n\n旧版 ${oldQs.length}，新版 ${newQs.length}，相同 ${newQs.length - added.length}，删除 ${deleted.length}，新增 ${added.length}\n\n`;
out += `## 删除 ${deleted.length}\n\n`;
deleted.forEach(({ q, i }) => { out += `- 题${q.no} 答案${q.answer} | ${q.normStem.slice(0, 40)}\n`; });
out += `\n## 新增 ${added.length}（idx=新版全文索引）\n\n`;
added.forEach(({ q, i }) => { out += `- [idx=${i}] 题${q.no} 答案${q.answer} | ${q.normStem.slice(0, 45)}\n`; });

fs.writeFileSync(outFile, out, 'utf8');
console.log(`已写 ${outFile}，删除${deleted.length}，新增${added.length}`);
