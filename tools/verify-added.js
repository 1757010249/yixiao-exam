// 二次核对：对疑似新增题，用"题号+答案"在旧版中查找，标记可能误判（旧版已有同题号同答案）
// 用法: node verify-added.js <旧版txt> <新版txt>
const fs = require('fs');
const [oldFile, newFile] = process.argv.slice(2);

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
    qs.push({ no, answer, normStem, stem });
  }
  return qs;
}

const oldQs = parse(oldFile);
const newQs = parse(newFile);

function key(q) { return q.answer + '|' + q.normStem; }
const oldMap = new Map();
oldQs.forEach((q, i) => { const k = key(q); if (!oldMap.has(k)) oldMap.set(k, []); oldMap.get(k).push(i); });

// 旧版 "题号+答案" 索引
const oldNoAns = new Map();
oldQs.forEach((q, i) => {
  if (!q.no) return;
  const k = q.no + '|' + q.answer;
  if (!oldNoAns.has(k)) oldNoAns.set(k, []);
  oldNoAns.get(k).push({ i, stem: q.stem });
});

const newMatched = new Array(newQs.length).fill(false);
const oldMatched = new Array(oldQs.length).fill(false);
newQs.forEach((q, i) => { const k = key(q); const h = oldMap.get(k); if (h && h.length > 0) { oldMatched[h.shift()] = true; newMatched[i] = true; } });

const added = newQs.map((q, i) => ({ q, i })).filter(x => !newMatched[x.i]);

// 对每个新增题，用题号+答案在旧版找
console.log(`疑似新增 ${added.length} 题，其中题号+答案在旧版有匹配的（可能误判）：\n`);
let cnt = 0;
added.forEach(({ q, i }) => {
  if (!q.no) return;
  const hits = oldNoAns.get(q.no + '|' + q.answer);
  if (hits && hits.length > 0) {
    cnt++;
    console.log(`[新增idx=${i}] 题号${q.no} 答案${q.answer}`);
    console.log(`  新题干: ${q.stem.trim().slice(0, 50)}`);
    hits.forEach(h => console.log(`  旧题干: ${h.stem.trim().slice(0, 50)}`));
    console.log('');
  }
});
console.log(`共 ${cnt} 题可能误判（题号+答案重合）`);
