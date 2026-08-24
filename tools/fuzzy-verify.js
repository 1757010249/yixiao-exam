// 粘连题号修复 + 模糊匹配核对新增题
// 用法: node fuzzy-verify.js <旧版txt> <新版txt>
const fs = require('fs');
const [oldFile, newFile] = process.argv.slice(2);

function normalize(s) {
  return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g, '');
}

// 提取题干：去掉题号（支持粘连），取到选项前
function extractStem(body) {
  // 优先匹配 数字+标点 题号
  let m = body.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);
  if (m) {
    return { no: m[1], stem: body.slice(m.index + m[0].length) };
  }
  // 粘连题号：数字后紧跟汉字（如 43某、21下列）
  m = body.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);
  if (m) {
    return { no: m[1], stem: body.slice(m.index + m[0].length) };
  }
  return { no: '', stem: body };
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
    const { no, stem } = extractStem(body);
    // 题干截止到选项
    let stemCut = stem;
    const optIdx = stemCut.search(/[A-EＡ-Ｅ]\s*[\.、．]/);
    if (optIdx >= 0) stemCut = stemCut.slice(0, optIdx);
    const normStem = normalize(stemCut);
    qs.push({ no, answer, normStem, stem: stemCut });
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

const added = newQs.map((q, i) => ({ q, i })).filter(x => !newMatched[x.i]);

// 对每个疑似新增，用完整题干（修复后）在旧版找"答案相同"的高相似题
function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let max = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; if (dp[i][j] > max) max = dp[i][j]; }
    }
  }
  return max;
}

console.log(`疑似新增 ${added.length} 题，其中与旧版同答案题干高度相似的（可能误判）：\n`);
let cnt = 0;
added.forEach(({ q, i }) => {
  const candidates = oldQs.map((o, oi) => ({ o, oi })).filter(x => x.o.answer === q.answer);
  let best = null;
  for (const { o, oi } of candidates) {
    const l = lcs(q.normStem, o.normStem);
    const sim = l / Math.max(q.normStem.length, o.normStem.length, 1);
    if (!best || sim > best.sim) best = { o, oi, sim, l };
  }
  if (best && best.sim > 0.6) {
    cnt++;
    console.log(`[idx=${i}] 题号${q.no} 答案${q.answer} 相似度=${best.sim.toFixed(2)} LCS=${best.l}`);
    console.log(`  新: ${q.stem.trim().slice(0, 55)}`);
    console.log(`  旧: ${best.o.stem.trim().slice(0, 55)}`);
    console.log('');
  }
});
console.log(`共 ${cnt} 题与旧版高度相似（相似度>0.6，需人工判断是否重复）`);
