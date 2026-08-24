// 生成"被合并错题"清单：从 ctb.txt 提取 27 道历史被合并题的完整内容 + 定位 items 位置
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = 'c:/1xiangmu/yixiao';
const CTB = path.join(ROOT, 'tools/extracted/ctb.txt');
const ITEMS = path.join(ROOT, 'errors/items');
const OUT = path.join(ROOT, 'errors/待修复-被合并错题清单-2026-08-16.md');

function normalize(s) {
  return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g, '');
}

// 解析 ctb.txt：每题完整 body（题干+选项）+ 题号 + 答案
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
    qs.push({ no, answer, normStem: normalize(stem), body });
  }
  return qs;
}

// 解析 items：完整题干
function parseItems() {
  const qs = [];
  const files = fs.readdirSync(ITEMS).filter(f => f.endsWith('.md'));
  for (const f of files) {
    const text = fs.readFileSync(path.join(ITEMS, f), 'utf8');
    const blocks = text.split(/^### \d+\.\s*/m).slice(1);
    for (const b of blocks) {
      const lines = b.split('\n');
      const m = ((lines[0] || '').replace(/\r$/, '')).match(/^题(\d*)\s*(.*)$/);
      if (!m) continue;
      let stem = m[2];
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i];
        if (/^[A-EＡ-Ｅ]\s*[\.、．]/.test(l)) break;
        if (/^- \*\*正确答案/.test(l)) break;
        stem += l;
      }
      const ansM = b.match(/正确答案:\s*([A-E,，、 ]+)\*\*/);
      const answer = ansM ? normalize(ansM[1]).toUpperCase().replace(/[^A-E]/g, '') : '';
      qs.push({ no: m[1], answer, normStem: normalize(stem), file: f });
    }
  }
  return qs;
}

function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let max = 0;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; if (dp[i][j] > max) max = dp[i][j]; }
  }
  return max;
}

const ctb = parseCtb();
const items = parseItems();

// 去重 ctb
const seen = new Map();
const ctbUniq = [];
ctb.forEach(q => { const k = q.answer + '|' + q.normStem; if (!seen.has(k)) { seen.set(k, 1); ctbUniq.push(q); } });

const itemsKey = new Set(items.map(q => q.answer + '|' + q.normStem));

// 识别真缺失题（排除刚删除的题29应急预案、题40上下层开口，排除模糊匹配成功的）
const DELETE_NO = new Set(['29', '40']);
const gap = [];
for (const q of ctbUniq) {
  if (itemsKey.has(q.answer + '|' + q.normStem)) continue; // items 有
  // 模糊匹配检查
  const cands = items.filter(o => o.answer === q.answer);
  let best = null;
  for (const o of cands) {
    const l = lcs(q.normStem, o.normStem);
    const sim = l / Math.max(q.normStem.length, o.normStem.length, 1);
    if (!best || sim > best.sim) best = { o, sim };
  }
  if (best && best.sim > 0.5) continue; // OCR 差异，items 有
  if (DELETE_NO.has(q.no)) continue; // 刚删除
  gap.push(q);
}

// 定位每题在 items 哪个文件（用 Node fs 搜索题干关键词）
function locate(q) {
  const kw = q.normStem.slice(0, 12);
  if (kw.length < 4) return '（未定位）';
  const files = fs.readdirSync(ITEMS).filter(f => f.endsWith('.md'));
  const hits = [];
  for (const f of files) {
    const text = normalize(fs.readFileSync(path.join(ITEMS, f), 'utf8'));
    if (text.includes(kw)) hits.push(f.replace('2026-08-02-', '').replace('.md', ''));
  }
  return hits.length ? hits.join('、') : '（未定位）';
}

// 提取完整题干+选项（清理 body 开头残留）
function fullText(q) {
  let b = q.body;
  // 找题号位置，去掉之前的残留
  let m = b.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);
  if (!m) m = b.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);
  if (m) b = b.slice(m.index + m[0].length);
  // 清理开头冒号残留
  b = b.replace(/^[：:\s]+/, '');
  // 清理：去掉末尾空白
  return b.split('\n').map(s => s.trim()).filter(s => s.length > 0).join('\n');
}

// 生成清单
let out = `# 待修复：被合并错题清单

> 生成日期。2026-08-16
> 问题。ctb_8.2.pdf 里有 ${gap.length} 道题，在 errors/items 里被错误合并进了其他题块（无独立标题、答案丢失/错位），导致未计入统计。
> 本文档仅列清单，不修改 items。修复需逐题还原后单独处理。

## 清单（${gap.length} 题）

`;

gap.forEach((q, i) => {
  out += `### ${i + 1}. 题${q.no}（答案 ${q.answer}）\n\n`;
  out += `${fullText(q)}\n\n`;
  out += `- **正确答案: ${q.answer}**\n`;
  out += `- 疑似被合并到：${locate(q)}\n\n`;
});

fs.writeFileSync(OUT, out, 'utf8');
console.log(`已生成 ${OUT}`);
console.log(`历史被合并题数: ${gap.length}`);
