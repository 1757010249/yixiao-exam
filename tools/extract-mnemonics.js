// 从奇门遁甲总结提取口诀，按模块分组生成文件
const fs = require('fs');

const src = 'tools/extracted/qimen-奇门遁甲总结.txt';
const t = fs.readFileSync(src, 'utf8');
const blocks = t.split(/===== 第 (\d+) 页 =====/).slice(1);

// 页→模块映射（按奇门遁甲总结的章节结构）
function moduleOf(no) {
  if (no <= 2) return '燃烧与火灾基础';
  if (no <= 21) return '建筑防火';
  if (no <= 31) return '建筑防火';
  if (no <= 50) return '建筑防火';
  if (no <= 61) return '建筑防火';
  if (no <= 70) return '建筑防火';
  if (no <= 86) return '消防给水';
  if (no <= 102) return '自动喷水';
  if (no <= 120) return '气体灭火';
  if (no <= 126) return '火灾自动报警';
  if (no <= 132) return '灭火器与照明';
  if (no <= 136) return '应急照明';
  if (no <= 143) return '防排烟';
  return '水喷雾细水雾';
}

// 收集口诀条目
const mnemonics = [];
for (let i = 0; i < blocks.length; i += 2) {
  const no = +blocks[i], body = blocks[i + 1] || '';
  const lines = body.split('\n');
  for (let j = 0; j < lines.length; j++) {
    const cur = lines[j].trim();
    if (!/口诀/.test(cur)) continue;
    // 口诀文本 = 口诀词之后的内容；若"记忆口诀"后空则取下一行
    let text = cur.replace(/^.*?口诀[\s:：]*/, '').trim();
    if (text.length < 4) {
      for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
        const nx = lines[k].trim();
        if (nx && !/=====/.test(nx) && !/^\d+$/.test(nx)) { text = nx; break; }
      }
    }
    // 若口诀词后是"），xxx"结构（口诀嵌句中），取口诀核心部分
    // 例："过氧化钠...（口诀：杨过甲级高帅）；含过氧基..." → 保留"杨过甲级高帅"
    text = text.split('；')[0].split('。')[0];
    // 清洗
    text = text.replace(/\s+\d+\s*$/, '')  // 尾部页码
               .replace(/[）\)]\s*$/, '')    // 尾部括号
               .trim();
    // 跳过标题残留（口诀词后是" 变压器容量""柴油发电机房"这类纯标题）
    if (/^(变压器容量|柴油发电机房|布置位置|营业厅展览厅|教学建筑食堂菜市场|消防控制室|消防水泵房|小气包乙级门|三级不超2|住院不地下)$/.test(text)) continue;
    // 跳过纯残留（如"记忆口诀"后跟单个字）
    if (!text || text.length < 4 || /^[\d.]*$/.test(text)) continue;
    mnemonics.push({ module: moduleOf(no), page: no, text });
  }
}

// 分组
const grouped = {};
for (const m of mnemonics) {
  if (!grouped[m.module]) grouped[m.module] = [];
  grouped[m.module].push(m);
}

// 生成文件
const outDir = 'materials/qimen-dunjia/mnemonics';
fs.mkdirSync(outDir, { recursive: true });

let summary = [];
for (const [mod, items] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
  const file = `${outDir}/${mod}.md`;
  const body = items.map((m, i) =>
    `### ${i + 1}. ${m.text}\n\n（来源：奇门遁甲总结 P${m.page}）\n`
  ).join('\n');
  const content = `# ${mod} — 口诀

> 提取自奇门遁甲总结。答题引用口诀后必须附对应规范条文编号。
> 共 ${items.length} 条。

${body}
`;
  fs.writeFileSync(file, content, 'utf8');
  summary.push(`${items.length}\t${mod}`);
}

console.log('已生成口诀分组文件：');
console.log(summary.sort((a, b) => +b.split('\t')[0] - +a.split('\t')[0]).join('\n'));
console.log('总口诀数:', mnemonics.length);
