// 查旧版基线 gap：对比 ctb.txt（旧版PDF提取）与 items 已录题，找出 items 缺失的题
const fs = require('fs');
const path = require('path');
const ROOT = 'c:/1xiangmu/yixiao';
const CTB = path.join(ROOT, 'tools/extracted/ctb.txt');
const ITEMS = path.join(ROOT, 'errors/items');

function normalize(s) {
  return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g, '');
}

// 解析 ctb.txt
function parseCtb() {
  const text = fs.readFileSync(CTB, 'utf8');
  const clean = text.replace(/===== 第 \d+ 页 =====/g, '\n');
  const parts = clean.split(/正确答案\s*[:：]\s*/);
  const qs = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const body = parts[i];
    const answer = normalize(parts[i + 1].split('\n')[0]).toUpperCase().replace(/[^A-E]/g, '');
    let m = body.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);
    if (!m) m = body.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);
    const no = m ? m[1] : '';
    let stem = m ? body.slice(m.index + m[0].length) : body;
    const oi = stem.search(/[A-EＡ-Ｅ]\s*[\.、．]/);
    if (oi >= 0) stem = stem.slice(0, oi);
    qs.push({ no, answer, normStem: normalize(stem), stem: stem.trim() });
  }
  return qs;
}

// 解析 items 所有文件
function parseItems() {
  const qs = [];
  const files = fs.readdirSync(ITEMS).filter(f => f.endsWith('.md'));
  for (const f of files) {
    const text = fs.readFileSync(path.join(ITEMS, f), 'utf8');
    // 按 "### N." 切分题块
    const blocks = text.split(/^### \d+\.\s*/m).slice(1);
    for (const b of blocks) {
      const lines = b.split('\n');
      const headLine = (lines[0] || '').replace(/\r$/, '');
      const m = headLine.match(/^题(\d*)\s*(.*)$/);
      if (!m) continue;
      const no = m[1];
      let stem = m[2];
      // 题干续行：直到选项行或答案行
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i];
        if (/^[A-EＡ-Ｅ]\s*[\.、．]/.test(l)) break; // 选项
        if (/^- \*\*正确答案/.test(l)) break; // 答案
        stem += l;
      }
      const answerM = b.match(/正确答案:\s*([A-E,，、 ]+)\*\*/);
      const answer = answerM ? normalize(answerM[1]).toUpperCase().replace(/[^A-E]/g, '') : '';
      qs.push({ no, answer, normStem: normalize(stem), stem: stem.trim(), file: f });
    }
  }
  return qs;
}

const ctb = parseCtb();
const items = parseItems();

// 去重 ctb
const seen = new Map();
const ctbUniq = [];
ctb.forEach(q => {
  const k = q.answer + '|' + q.normStem;
  if (!seen.has(k)) { seen.set(k, 1); ctbUniq.push(q); }
});

// items 的 (answer + normStem) 集合
const itemsKey = new Set(items.map(q => q.answer + '|' + q.normStem));

// 找 ctb 有、items 没有的题
const missing = ctbUniq.filter(q => !itemsKey.has(q.answer + '|' + q.normStem));

console.log(`ctb.txt 总题数: ${ctb.length}，去重后: ${ctbUniq.length}`);
console.log(`items 聚合题块数: ${items.length}`);
console.log(`ctb 有但 items 缺（精确匹配）: ${missing.length}\n`);

// 模糊匹配：对每道缺失题，在 items 找答案相同 + LCS 相似度最高的
function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let max = 0;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; if (dp[i][j] > max) max = dp[i][j]; }
  }
  return max;
}

let realGap = 0, fuzzyMatched = 0;
console.log('===== 缺失题逐一模糊核对 =====');
missing.forEach((q, i) => {
  const cands = items.filter(o => o.answer === q.answer);
  let best = null;
  for (const o of cands) {
    const l = lcs(q.normStem, o.normStem);
    const sim = l / Math.max(q.normStem.length, o.normStem.length, 1);
    if (!best || sim > best.sim) best = { o, sim, l };
  }
  if (best && best.sim > 0.5) {
    fuzzyMatched++;
    console.log(`[${i + 1}] 相似(=${best.sim.toFixed(2)}) 题${q.no} 答案${q.answer} -> items[${best.o.file.replace('2026-08-02-','')}] 题${best.o.no}`);
  } else {
    realGap++;
    console.log(`[${i + 1}] ★真缺失 题${q.no} 答案${q.answer} | ${q.stem.slice(0, 40)}`);
  }
});
console.log(`\n模糊匹配成功: ${fuzzyMatched}，真缺失(需人工再核): ${realGap}`);

