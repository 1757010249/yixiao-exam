// 输出疑似新增/删除题的完整原始文本，供人工核对知识点与是否真新增
// 用法: node export-diff.js <旧版txt> <新版txt> <输出md>
const fs = require('fs');
const [oldFile, newFile, outFile] = process.argv.slice(2);

function normalize(s) {
  return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g, '');
}

function parse(file) {
  const text = fs.readFileSync(file, 'utf8');
  const clean = text.replace(/===== 第 \d+ 页 =====/g, '');
  const parts = clean.split(/正确答案\s*[:：]\s*/);
  const qs = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const body = parts[i];
    const answerRaw = parts[i + 1].split('\n')[0].trim();
    const answer = normalize(answerRaw).toUpperCase().replace(/[^A-E]/g, '');
    const noM = body.match(/(\d+)\s*[\.、．]/);
    const no = noM ? noM[1] : '';
    let stem = body;
    if (noM) stem = body.slice(noM.index + noM[0].length);
    const optIdx = stem.search(/[A-EＡ-Ｅ]\s*[\.、．]/);
    if (optIdx >= 0) stem = stem.slice(0, optIdx);
    const normStem = normalize(stem);
    qs.push({ no, answer, normStem, body });
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

let out = `# 错题本版本对比 - 原始差异底稿\n\n`;
out += `旧版题数 ${oldQs.length}，新版题数 ${newQs.length}，相同 ${newQs.length - added.length}，删除 ${deleted.length}，新增 ${added.length}\n\n`;

function cleanBody(b) {
  return b.replace(/[ \t]+/g, ' ').split('\n').map(s => s.trim()).filter(s => s.length > 0).join('\n');
}

out += `## 疑似删除 ${deleted.length} 条\n\n`;
deleted.forEach(({ q, i }) => {
  out += `### 删除-${i + 1} 题号${q.no} 答案${q.answer}\n\n${cleanBody(q.body)}\n\n`;
});

out += `\n## 疑似新增 ${added.length} 条\n\n`;
added.forEach(({ q, i }) => {
  out += `### 新增-${i + 1} [新idx=${i}] 题号${q.no} 答案${q.answer}\n\n${cleanBody(q.body)}\n\n`;
});

fs.writeFileSync(outFile, out, 'utf8');
console.log(`已写入 ${outFile}`);
console.log(`删除 ${deleted.length}，新增 ${added.length}`);
