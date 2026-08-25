// verify-numbers.mjs — 新条目数字断言与提取原文全检
// 用法: node tools/verify-numbers.mjs
import fs from 'fs';

const sources = {
  jiangyi: fs.readFileSync('tools/extracted/技术实务小项讲义-文本版.txt', 'utf8').replace(/\s+/g, ''),
  xiaohongshu: fs.readFileSync('tools/extracted/小红书-文本版.txt', 'utf8').replace(/\s+/g, ''),
  dianzika: fs.readFileSync('tools/extracted/电子卡42章经-全量.md', 'utf8').replace(/\s+/g, ''),
};
const norm = (t) => t
  .replace(/％/g, '%').replace(/㎡/g, 'M2').replace(/m²/gi, 'M2').replace(/m³/gi, 'M3')
  .replace(/([0-9])m2/gi, '$1M2').replace(/([0-9])m3/gi, '$1M3')
  .replace(/[kK]㎡/g, 'KM2').replace(/[kK]m²/gi, 'KM2')
  .replace(/([0-9.]+)mpa/gi, '$1mpa').replace(/([0-9.]+)(s)\b/gi, '$1s');
for (const k of Object.keys(sources)) sources[k] = norm(sources[k]).toLowerCase();

const targets = [
  'knowledge-base/building-fire-protection/clean-workshop.md',
  'knowledge-base/building-fire-protection/ancient-buildings.md',
  'knowledge-base/building-fire-protection/utility-tunnel.md',
  'knowledge-base/building-fire-protection/civil-defense.md',
  'knowledge-base/building-fire-protection/gas-station.md',
  'knowledge-base/building-fire-protection/petrochemical.md',
  'knowledge-base/building-fire-protection/metro.md',
  'knowledge-base/building-fire-protection/garage.md',
  'knowledge-base/building-fire-protection/fire-rescue-force.md',
  'knowledge-base/fire-facilities/cross-summary.md',
];

// 白名单: 规范编号/常识性数值(年份、标准号、页码引用)
const whitelist = /^(50016|50073|50084|50098|50067|50151|50156|50160|50140|50174|50261|50838|50974|51298|50193|50370|50158|4968|152|2014|2017|2018|2021|2013|2010|2008|2009)$/;
const ctxWhitelist = /GB|规范|标准|讲义|P\d|第\d|口诀|来源|section|file|OCR|txt|pdf|xlsx|md/i;

let totalChecks = 0, missing = 0;
const report = [];
for (const f of targets) {
  const text = fs.readFileSync(f, 'utf8');
  // 提取断言行中的数字+单位（跳过 frontmatter）
  const body = text.replace(/^---[\s\S]*?---/, '');
  const lines = body.split('\n');
  const fileMiss = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (ctxWhitelist.test(line) && !/[不应不宜≥≤大于小于超过]/.test(line)) continue;
    for (const m of line.matchAll(/(\d+(?:\.\d+)?)(℃|MPa|MPA|min|h\b|s\b|lx|km|m\/s|L\/s|m³|m²|m\b|mm|cm|%|dB|V\b|W\b|kW|N\b|kg|t\b|具|只|个|块|台|辆|人|层|次|根|樘|分|秒)/g)) {
      const num = m[1];
      if (whitelist.test(num)) continue;
      if (/^[012]$/.test(num) && !/\./.test(num)) continue; // 单字符小整数太泛，跳过
      totalChecks++;
      const token = norm(num + m[2]).toLowerCase();
      const found = Object.values(sources).some((src) => src.includes(token));
      if (!found) { missing++; fileMiss.push(`L${li + 1}: ${token}  |行: ${line.trim().slice(0, 50)}`); }
    }
  }
  if (fileMiss.length) report.push({ file: f.split('/').pop(), miss: fileMiss });
}

console.log('检查数字断言:', totalChecks, '| 原文未找到:', missing);
for (const r of report) {
  console.log('\n##', r.file);
  for (const m of r.miss) console.log('  ', m);
}
