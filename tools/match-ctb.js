// 错题本跨版本精确匹配：按"答案+完整规范化题干"指纹
// 用法: node match-ctb.js <旧版txt> <新版txt>
const fs = require('fs');
const [oldFile, newFile] = process.argv.slice(2);

function normalize(s) {
  return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g, '');
}

function parse(file) {
  const text = fs.readFileSync(file, 'utf8');
  const clean = text.replace(/===== 第 \d+ 页 =====/g, '\n');
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

// 精确指纹 = 答案 + 完整normStem
function key(q) { return q.answer + '|' + q.normStem; }

const oldMap = new Map();
oldQs.forEach((q, i) => {
  const k = key(q);
  if (!oldMap.has(k)) oldMap.set(k, []);
  oldMap.get(k).push(i);
});

const newMatched = new Array(newQs.length).fill(false);
const oldMatched = new Array(oldQs.length).fill(false);

newQs.forEach((q, i) => {
  const k = key(q);
  const hits = oldMap.get(k);
  if (hits && hits.length > 0) {
    const oi = hits.shift();
    oldMatched[oi] = true;
    newMatched[i] = true;
  }
});

const deleted = oldQs.map((q, i) => ({ q, i })).filter(x => !oldMatched[x.i]);
const added = newQs.map((q, i) => ({ q, i })).filter(x => !newMatched[x.i]);

console.log(`旧版题数: ${oldQs.length}`);
console.log(`新版题数: ${newQs.length}`);
console.log(`精确匹配(相同题): ${newQs.length - added.length}`);
console.log(`疑似删除(旧版有新版无): ${deleted.length}`);
console.log(`疑似新增(新版有旧版无): ${added.length}`);

function fmt(q, i) { return `[${i}] 题号${q.no} 答案${q.answer} | ${q.stem.trim().slice(0, 45)}`; }

console.log(`\n===== 疑似删除 ${deleted.length} 条 =====`);
deleted.forEach(({ q, i }) => console.log(fmt(q, i)));

console.log(`\n===== 疑似新增 ${added.length} 条 =====`);
added.forEach(({ q, i }) => console.log(fmt(q, i)));
