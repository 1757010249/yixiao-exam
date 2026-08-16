// 错题本去重统计：解析每题，按"答案+规范化题干全文"做指纹，统计唯一题数并列出重复
// 用法: node dedup-ctb.js <txt文件>
const fs = require('fs');
const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');

const clean = text.replace(/===== 第 \d+ 页 =====/g, '\n');
const parts = clean.split(/正确答案\s*[:：]\s*/);

function normalize(s) {
  return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g, '');
}

const questions = [];
for (let i = 0; i < parts.length - 1; i++) {
  const body = parts[i];
  const answerRaw = parts[i + 1].split('\n')[0].trim();
  const answer = normalize(answerRaw).toUpperCase().replace(/[^A-E]/g, '');
  // 题号：body 开头（可含残留）找第一个 "数字 + 分隔符"
  const noM = body.match(/(\d+)\s*[\.、．]/);
  const no = noM ? noM[1] : '';
  // 题干：题号之后 到 第一个选项字母标记 之前
  let stem = body;
  if (noM) stem = body.slice(noM.index + noM[0].length);
  const optIdx = stem.search(/[A-EＡ-Ｅ]\s*[\.、．]/);
  if (optIdx >= 0) stem = stem.slice(0, optIdx);
  const normStem = normalize(stem);
  questions.push({ no, answer, normStem });
}

const seen = new Map();
const dups = [];
questions.forEach((q, i) => {
  const k = q.answer + '|' + q.normStem;
  if (seen.has(k)) {
    dups.push({ first: seen.get(k), second: i, q });
  } else {
    seen.set(k, i);
  }
});

console.log(`总题数(正确答案数): ${questions.length}`);
console.log(`唯一题数: ${seen.size}`);
console.log(`重复题数: ${dups.length}`);
console.log(`\n===== 重复题明细 =====`);
dups.forEach(d => {
  console.log(`[第${d.first}题 vs 第${d.second}题] 答案=${d.q.answer} 题干=${d.q.normStem.slice(0, 50)}`);
});
