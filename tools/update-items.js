// items/ 批量更新：删除2题 + 新增134题 + 重编号 + 更新 error_count
// 用法: node update-items.js [--apply]
// 无 --apply 时 dry-run，只打印统计与解析结果
const fs = require('fs');
const path = require('path');

const ROOT = 'c:/1xiangmu/yixiao';
const DIFF = path.join(ROOT, 'tools/ctb-diff-底稿.md');
const ITEMS = path.join(ROOT, 'errors/items');
const APPLY = process.argv.includes('--apply');

// ===== 1. 解析底稿 =====
function parseDiff() {
  const text = fs.readFileSync(DIFF, 'utf8');
  const blocks = text.split(/### 新增-\d+ \[新idx=/).slice(1);
  const qs = [];
  for (const b of blocks) {
    const m = b.match(/^(\d+)\] 题号(\d*) 答案([A-E,]+)\n+\s*([\s\S]*?)(?=\n\n### 新增-|\n## |\s*$)/);
    if (!m) continue;
    const idx = parseInt(m[1], 10);
    const no = m[2];
    const answer = m[3];
    let body = m[4];
    qs.push({ idx, no, answer, body });
  }
  return qs;
}

// 提取题干+选项（干净）：找题号位置，丢弃其前残留，题号后到 body 末尾为内容
function extractContent(body) {
  let m = body.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);
  if (!m) m = body.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);
  if (!m) return { no: '', content: body.trim() };
  const afterNo = body.slice(m.index + m[0].length);
  return { no: m[1], content: afterNo.trim() };
}

// ===== 2. idx -> 知识点文件名 =====
const MAP = {};
const assign = (name, list) => list.forEach(i => MAP[i] = name);
assign('消防给水与水泵', [0,1,2,3,4,5,6,7,8,10,58,59,60,61,62,63,64,65,66,73,110]);
assign('消火栓', [9,86]);
assign('防火阀与分隔', [11]);
assign('耐火等级与构件', [12,13,15,16,23,52,55,108]);
assign('安全疏散', [14,19,20,21,22,24,28,29,30,31,32,39,40,41,71,80,93]);
assign('平面布置', [17,25,34,42,43,67,72,92,94]);
assign('防火间距与总平', [18,44,56,57]);
assign('装修与保温', [26,27,35,36,37,38,46,48,49,50,51,53,54,70,91,98,99,100,101,102,103,104,105,112,118,119,120,121,122]);
assign('消防电梯救援', [45,47,69,74,95,96,97,113,114,115,116,117]);
assign('其他规范', [68,82,83]);
assign('自动喷水灭火', [75,109]);
assign('材料燃烧与产物', [77,89]);
assign('电气防火', [78,111]);
assign('水喷雾细水雾', [79,84,234]);
assign('气体灭火', [81,85]);
assign('防排烟', [88]);
assign('其他', [90,106]);
assign('安全管理', [107,123,124,125,126,127,128,129,130,131,132,133,134]);
assign('火灾自动报警', [87]);

// ===== 3. 删除题 =====
const DELETE = {
  '其他': { no: '29', kw: '灭火和应急疏散预案' },
  '自动喷水灭火': { no: '40', kw: '上下层开口' },
};

// ===== 解析并分组 =====
const all = parseDiff();
const grouped = {}; // 文件名 -> [题]
let unknown = [];
for (const q of all) {
  if (q.idx === 254) continue; // 误判，旧版已有
  const name = MAP[q.idx];
  if (!name) { unknown.push(q); continue; }
  if (!grouped[name]) grouped[name] = [];
  grouped[name].push(q);
}

console.log(`解析得到 ${all.length} 题，排除误判 idx=254 后 ${all.length - 1} 题`);
console.log(`未映射: ${unknown.length}`);
unknown.forEach(q => console.log(`  idx=${q.idx} no=${q.no} ans=${q.answer} body=${q.body.slice(0,40)}`));
console.log(`分组知识点数: ${Object.keys(grouped).length}`);
for (const [name, list] of Object.entries(grouped)) console.log(`  ${name}: ${list.length}`);

if (!APPLY) {
  console.log('\n[dry-run] 未写入文件。加 --apply 实际写入。');
  // 打印几个解析样本
  console.log('\n===== 解析样本（前3题）=====');
  all.slice(0, 3).forEach(q => {
    const { no, content } = extractContent(q.body);
    console.log(`idx=${q.idx} no=${no} ans=${q.answer}\n  ${content.slice(0, 80)}...\n`);
  });
  process.exit(0);
}

// ===== 4. 实际写入 =====
function rebuildFile(name, toAdd, del) {
  const file = path.join(ITEMS, `2026-08-02-${name}.md`);
  const text = fs.readFileSync(file, 'utf8');
  // 按题块拆分（### N. 开头）
  const lines = text.split('\n');
  // 定位 frontmatter 结束
  let fmEnd = 0;
  if (lines[0] === '---') { fmEnd = lines.indexOf('---', 1) + 1; }
  const fm = lines.slice(0, fmEnd).join('\n');
  // 提取标题行（# 和 > 说明）
  let bodyStart = fmEnd;
  const header = [];
  while (bodyStart < lines.length) {
    const l = lines[bodyStart];
    if (l.startsWith('## ')) break;
    header.push(l);
    bodyStart++;
  }
  // 现有题块
  const blocks = [];
  let cur = null;
  for (let i = bodyStart; i < lines.length; i++) {
    const l = lines[i];
    if (/^### \d+\./.test(l)) {
      if (cur) blocks.push(cur);
      cur = { head: l, lines: [] };
    } else if (cur) {
      cur.lines.push(l);
    }
  }
  if (cur) blocks.push(cur);

  // 过滤删除题
  const kept = blocks.filter(b => !(del && b.head.includes(del.kw) && b.head.includes(`题${del.no}`)));

  // 组装新增题块
  const addBlocks = toAdd.map((q, i) => {
    const { no, content } = extractContent(q.body);
    // content 第一行作为题干，接在 "### N. 题XX " 后
    const clines = content.split('\n');
    const first = clines[0] || '';
    const rest = clines.slice(1).join('\n');
    const head = `### ${i + 1}. 题${no} ${first}`;
    const lines = [];
    if (rest) lines.push(rest);
    lines.push('');
    lines.push(`- **正确答案: ${q.answer}**`);
    lines.push('');
    return { head, lines };
  });

  // 合并：旧 kept 块 + 新 addBlocks，重新编号
  const allBlocks = kept.concat(addBlocks);
  const out = [];
  out.push(fm);
  out.push(...header.slice(0, header.length - 1)); // 去掉最后的空行
  out.push('');
  out.push('## 错题明细');
  out.push('');
  allBlocks.forEach((b, i) => {
    // 重新编号 ### N.
    const reHead = b.head.replace(/^### \d+\./, `### ${i + 1}.`);
    out.push(reHead);
    out.push(...b.lines);
  });

  // 更新 error_count 与 > 共 N 题
  const oldCount = (fm.match(/error_count:\s*(\d+)/) || [])[1];
  const newCount = allBlocks.length;
  let outText = out.join('\n');
  outText = outText.replace(/error_count:\s*\d+/, `error_count: ${newCount}`);
  outText = outText.replace(/共 \d+ 题/, `共 ${newCount} 题`);
  fs.writeFileSync(file, outText, 'utf8');
  return { name, oldCount: parseInt(oldCount || '0', 10), del: del ? 1 : 0, add: toAdd.length, newCount };
}

const results = [];
for (const [name, list] of Object.entries(grouped)) {
  const del = DELETE[name] || null;
  results.push(rebuildFile(name, list, del));
}
// 有删除但无新增的文件也要处理
for (const [name, del] of Object.entries(DELETE)) {
  if (!grouped[name]) results.push(rebuildFile(name, [], del));
}

console.log('\n===== 写入结果 =====');
results.forEach(r => console.log(`  ${r.name}: 原${r.oldCount} -${r.del} +${r.add} = ${r.newCount}`));
