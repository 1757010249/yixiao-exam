// 从 error-classified.json 生成聚合错题文件
const fs = require('fs');
const path = require('path');

const grouped = JSON.parse(fs.readFileSync('tools/extracted/error-classified.json', 'utf8'));
const outDir = path.resolve('errors/items');
fs.mkdirSync(outDir, { recursive: true });

// 清空旧文件
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith('.md')) fs.unlinkSync(path.join(outDir, f));
}

let summary = [];
for (const [kp, g] of Object.entries(grouped).sort((a, b) => b[1].items.length - a[1].items.length)) {
  const count = g.items.length;
  const rule = g.rule;
  if (kp === '其他' && count < 5) continue;
  const file = path.join(outDir, `2026-08-02-${kp}.md`);
  const body = g.items.map((q, i) => {
    const ans = q.answer;
    const rest = q.body.join('\n');
    return `### ${i + 1}. 题${q.no} ${rest}\n\n- **正确答案: ${ans}**\n`;
  }).join('\n');
  const content = `---
module: ${rule.module}
sub_module: ${rule.sub}
knowledge_points: [${kp}]
error_count: ${count}
exam_sources: [2016-2021实务真题混合]
last_updated: 2026-08-02
---

# 错题聚合 - ${kp}

> 共 ${count} 题。本文件聚合该知识点的错题，用于薄弱知识点分析。

## 错题明细

${body}
`;
  fs.writeFileSync(file, content, 'utf8');
  summary.push(`${count}\t${kp}`);
}

console.log('已生成聚合文件：');
console.log(summary.sort((a, b) => +b.split('\t')[0] - +a.split('\t')[0]).join('\n'));
