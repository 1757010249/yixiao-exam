// 新增28道历史被合并题到正确知识点
// 用法: node fix-add.js [--apply]
const fs = require('fs');
const path = require('path');
const ROOT = 'c:/1xiangmu/yixiao';
const OLD = path.join(ROOT, 'tools/extracted/ctb.txt');
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

// 28题：题号+答案+题干关键词 -> 知识点
const MERGED = [
  { no: '35', answer: 'B', kw: '不履行组织疏散义务', k: '安全疏散' },
  { no: '11', answer: 'A', kw: '维修确认检验', k: '灭火器' },
  { no: '22', answer: 'A', kw: '消火栓固定接口', k: '消火栓' },
  { no: '19', answer: 'C', kw: '联动控制功能进行测试', k: '火灾自动报警' },
  { no: '7', answer: 'D', kw: '线型可燃气体探测器', k: '火灾自动报警' },
  { no: '16', answer: 'A', kw: '酒店火灾自动报警', k: '火灾自动报警' },
  { no: '22', answer: 'A', kw: '线型探测器敏感部件', k: '火灾自动报警' },
  { no: '21', answer: 'B', kw: '线型光束感烟', k: '火灾自动报警' },
  { no: '15', answer: 'B', kw: '吸气式感烟', k: '火灾自动报警' },
  { no: '9', answer: 'C', kw: '下沉式广场', k: '平面布置' },
  { no: '16', answer: 'B', kw: '网吧配置的灭火器', k: '灭火器' },
  { no: '11', answer: 'D', kw: '中庭部位的防火分隔宽度', k: '防火阀与分隔' },
  { no: '12', answer: 'AB', kw: '细水雾灭火系统进行维护管理', k: '水喷雾细水雾' },
  { no: '3', answer: 'C', kw: '细水雾喷头进行安装前', k: '水喷雾细水雾' },
  { no: '16', answer: 'B', kw: '环管支架', k: '水喷雾细水雾' },
  { no: '15', answer: 'ABCD', kw: '干式自动喷水灭火系统进行检查', k: '自动喷水灭火' },
  { no: '12', answer: 'BCE', kw: '自动喷水灭火系统应每月', k: '自动喷水灭火' },
  { no: '26', answer: 'BDE', kw: '医院综合楼', k: '自动喷水灭火' },
  { no: '25', answer: 'BCD', kw: '报警阀主排水口', k: '自动喷水灭火' },
  { no: '23', answer: 'BCE', kw: '系统调试主控项目', k: '自动喷水灭火' },
  { no: '21', answer: 'A', kw: '不属于湿式自动喷水', k: '自动喷水灭火' },
  { no: '18', answer: 'D', kw: '打开末端试水装置', k: '自动喷水灭火' },
  { no: '15', answer: 'B', kw: '喷头型号规格设置场所进行抽查', k: '自动喷水灭火' },
  { no: '3', answer: 'A', kw: '建筑材料及制品燃烧性能', k: '材料燃烧与产物' },
  { no: '17', answer: 'BDE', kw: '分区供水方式', k: '消防给水与水泵' },
  { no: '16', answer: 'ABD', kw: '消防水池采用两路消防供水', k: '消防给水与水泵' },
  { no: '4', answer: 'C', kw: '办公室休息室设置', k: '平面布置' },
  { no: '11', answer: 'A', kw: '消防控制室值班记录表', k: '安全管理' },
];

const oldQs = parse(OLD);

// 从 ctb.txt 找到28题的完整内容
const found = [];
for (const m of MERGED) {
  const hit = oldQs.find(q => q.no === m.no && q.answer === m.answer && q.normStem.includes(m.kw));
  if (!hit) { console.log(`未找到: 题${m.no} ${m.answer} ${m.kw}`); continue; }
  found.push({ ...hit, k: m.k });
}

// 分组
const grouped = {};
found.forEach(q => { if (!grouped[q.k]) grouped[q.k] = []; grouped[q.k].push(q); });

console.log(`找到 ${found.length}/28 题`);
for (const [k, l] of Object.entries(grouped)) console.log(`  ${k}: ${l.length}`);

if (!APPLY) { console.log('\n[dry-run] 加 --apply 写入'); process.exit(0); }

function content(q) {
  let b = q.body;
  let m = b.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);
  if (!m) m = b.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);
  if (m) b = b.slice(m.index + m[0].length);
  b = b.replace(/^[：:\s]+/, '');
  return b.split('\n').map(s => s.trim()).filter(s => s.length > 0).join('\n');
}

function rebuildFile(name, list) {
  const file = path.join(ITEMS, `2026-08-02-${name}.md`);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  let fmEnd = 0;
  if (lines[0].trim() === '---') fmEnd = lines.indexOf('---', 1) + 1;
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

  const addBlocks = list.map(q => {
    const { no } = extractStem(q.body);
    const c = content(q);
    const clines = c.split('\n');
    const head = `### 1. 题${no} ${clines[0] || ''}`;
    const ls = [];
    if (clines.length > 1) ls.push(clines.slice(1).join('\n'));
    ls.push('');
    ls.push(`- **正确答案: ${q.answer}**`);
    ls.push('');
    return { head, lines: ls };
  });

  const all = blocks.concat(addBlocks);
  const out = [];
  out.push(fm);
  out.push(...header.slice(0, header.length - 1));
  out.push('');
  out.push('## 错题明细');
  out.push('');
  all.forEach((b, i) => {
    out.push(b.head.replace(/^### \d+\./, `### ${i + 1}.`));
    out.push(...b.lines);
  });
  let txt = out.join('\n');
  txt = txt.replace(/error_count:\s*\d+/, `error_count: ${all.length}`);
  txt = txt.replace(/共 \d+ 题/, `共 ${all.length} 题`);
  fs.writeFileSync(file, txt, 'utf8');
  return all.length;
}

for (const [name, list] of Object.entries(grouped)) {
  rebuildFile(name, list);
}
console.log('\n新增完成');
