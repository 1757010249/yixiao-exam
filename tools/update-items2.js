// items/ 批量更新 v2：改进版解析（支持"数字："粘连），准确删除2题+新增134题
// 用法: node update-items2.js [--apply]
const fs = require('fs');
const path = require('path');
const ROOT = 'c:/1xiangmu/yixiao';
const OLD = path.join(ROOT, 'tools/extracted/ctb.txt');
const NEW = path.join(ROOT, 'tools/extracted/ctb_8.16.txt');
const ITEMS = path.join(ROOT, 'errors/items');
const APPLY = process.argv.includes('--apply');

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

const oldQs = parse(OLD);
const newQs = parse(NEW);
function key(q) { return q.answer + '|' + q.normStem; }

const oldMap = new Map();
oldQs.forEach((q, i) => { const k = key(q); if (!oldMap.has(k)) oldMap.set(k, []); oldMap.get(k).push(i); });

const newMatched = new Array(newQs.length).fill(false);
const oldMatched = new Array(oldQs.length).fill(false);
newQs.forEach((q, i) => { const k = key(q); const h = oldMap.get(k); if (h && h.length > 0) { oldMatched[h.shift()] = true; newMatched[i] = true; } });

const deleted = oldQs.map((q, i) => ({ q, i })).filter(x => !oldMatched[x.i]);
const added = newQs.map((q, i) => ({ q, i })).filter(x => !newMatched[x.i] && x.i !== 254);

// ===== idx -> 知识点（idx=新版全文索引）=====
const MAP = {};
const assign = (name, list) => list.forEach(i => MAP[i] = name);
assign('消防给水与水泵', [0,1,2,3,4,5,6,7,8,10,58,59,60,61,62,63,64,65,66,73,110]);
assign('消火栓', [9,86]);
assign('防火阀与分隔', [11]);
assign('耐火等级与构件', [12,13,15,16,23,52,55,108]);
assign('安全疏散', [14,19,20,21,22,24,28,29,30,31,32,33,39,40,41,71,80,93]);
assign('平面布置', [17,25,34,42,43,67,72,92,94]);
assign('防火间距与总平', [18,44,56,57]);
assign('装修与保温', [26,27,35,36,37,38,46,48,49,50,51,53,54,70,91,98,99,100,101,102,103,104,105,112,118,119,120,121,122]);
assign('消防电梯救援', [45,47,69,74,95,96,97,113,114,115,116,117]);
assign('其他规范', [68,82,83]);
assign('自动喷水灭火', [75,109]);
assign('材料燃烧与产物', [77,89]);
assign('电气防火', [78,111]);
assign('水喷雾细水雾', [79,84]);
assign('气体灭火', [81,85]);
assign('防排烟', [88]);
assign('其他', [90,106]);
assign('安全管理', [107,123,124,125,126,127,128,129,130,131,132,133,134]);
assign('火灾自动报警', [87]);

const DELETE = {
  '其他': { no: '29', kw: '灭火和应急疏散预案' },
  '自动喷水灭火': { no: '40', kw: '上下层开口' },
};

// 分组
const grouped = {};
let unknown = [];
for (const { q, i } of added) {
  const name = MAP[i];
  if (!name) { unknown.push({ q, i }); continue; }
  if (!grouped[name]) grouped[name] = [];
  grouped[name].push({ q, i });
}

console.log(`新增 ${added.length} 题（排除idx254），未映射 ${unknown.length}`);
unknown.forEach(x => console.log(`  idx=${x.i} 题${x.q.no} ${x.q.normStem.slice(0,30)}`));
for (const [n, l] of Object.entries(grouped)) console.log(`  ${n}: ${l.length}`);

if (!APPLY) { console.log('\n[dry-run] 加 --apply 写入'); process.exit(0); }

// 提取题干+选项（干净）
function content(q) {
  let b = q.body;
  let m = b.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);
  if (!m) m = b.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);
  if (m) b = b.slice(m.index + m[0].length);
  b = b.replace(/^[：:\s]+/, '');
  return b.split('\n').map(s => s.trim()).filter(s => s.length > 0).join('\n');
}

function rebuildFile(name, toAdd, del) {
  const file = path.join(ITEMS, `2026-08-02-${name}.md`);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  let fmEnd = 0;
  if (lines[0] === '---') fmEnd = lines.indexOf('---', 1) + 1;
  const fm = lines.slice(0, fmEnd).join('\n');
  let bodyStart = fmEnd;
  const header = [];
  while (bodyStart < lines.length && !lines[bodyStart].startsWith('## ')) { header.push(lines[bodyStart]); bodyStart++; }
  const blocks = [];
  let cur = null;
  for (let i = bodyStart; i < lines.length; i++) {
    const l = lines[i];
    if (/^### \d+\./.test(l)) { if (cur) blocks.push(cur); cur = { head: l, lines: [] }; }
    else if (cur) cur.lines.push(l);
  }
  if (cur) blocks.push(cur);

  const kept = blocks.filter(b => !(del && b.head.includes(del.kw) && b.head.includes(`题${del.no}`)));

  const addBlocks = toAdd.map(({ q }) => {
    const { no } = extractStem(q.body);
    const c = content(q);
    const clines = c.split('\n');
    const first = clines[0] || '';
    const rest = clines.slice(1).join('\n');
    const head = `### ${1}. 题${no} ${first}`;
    const ls = [];
    if (rest) ls.push(rest);
    ls.push('');
    ls.push(`- **正确答案: ${q.answer}**`);
    ls.push('');
    return { head, lines: ls };
  });

  const allBlocks = kept.concat(addBlocks);
  const out = [];
  out.push(fm);
  out.push(...header.slice(0, header.length - 1));
  out.push('');
  out.push('## 错题明细');
  out.push('');
  allBlocks.forEach((b, i) => {
    const reHead = b.head.replace(/^### \d+\./, `### ${i + 1}.`);
    out.push(reHead);
    out.push(...b.lines);
  });

  const newCount = allBlocks.length;
  let outText = out.join('\n');
  outText = outText.replace(/error_count:\s*\d+/, `error_count: ${newCount}`);
  outText = outText.replace(/共 \d+ 题/, `共 ${newCount} 题`);
  fs.writeFileSync(file, outText, 'utf8');
  return newCount;
}

const results = [];
for (const [name, list] of Object.entries(grouped)) {
  const del = DELETE[name] || null;
  const n = rebuildFile(name, list, del);
  results.push(`${name}: ${n}`);
}
for (const [name, del] of Object.entries(DELETE)) {
  if (!grouped[name]) rebuildFile(name, [], del);
}
console.log('\n写入完成');
