// ec-compare.mjs — 电子卡149卡与知识库覆盖率初筛
// 用法: node tools/ec-compare.mjs
import fs from 'fs';

const strip = (t) => t.replace(/[\s，。；：、（）()【】[\]①②③④⑤⑥⑦⑧⑨⑩\-—~～'"“”·,.;:!?？<>《》%]/g, '');
const norm = (t) => strip(
  String(t)
    .replace(/m2/gi, 'M2').replace(/m3/gi, 'M3')
    .replace(/[㎡²]/g, 'M2').replace(/³/g, 'M3')
    .replace(/[kK][mM]2/g, 'KM2')
    .replace(/<br\s*\/?>/gi, '')
);

const kbFiles = [];
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + f.name;
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith('.md')) kbFiles.push(p);
  }
}
walk('knowledge-base');
let kb = '';
for (const f of kbFiles) kb += fs.readFileSync(f, 'utf8');
const kbNorm = norm(kb);
console.log('知识库文件:', kbFiles.length, '规范字符:', kbNorm.length);

const md = fs.readFileSync('tools/extracted/电子卡42章经-全量.md', 'utf8');
const sheets = md.split(/\n## /).slice(1);
const titleRe = /^(防火|设施|综合|表格|表)\s*\d*/;
const isMnemonic = (l) => /(口诀|谐音|记：|联想)/.test(l);
const results = [];

for (const s of sheets) {
  const name = s.slice(0, s.indexOf('\n')).trim();
  const lines = s.slice(s.indexOf('\n')).split('\n')
    .map((l) => l.replace(/\|/g, '').trim())
    .filter((l) => l.length >= 10 && !/^---/.test(l));
  let hitLines = 0, eff = 0;
  const missExamples = [];
  for (const line of lines) {
    if (titleRe.test(line) && !/\d{2,}/.test(line.replace(titleRe, ''))) continue;
    const hasRealNum = [...line.matchAll(/\d+(?:\.\d+)?/g)].some((m) => parseFloat(m[0]) >= 2 || m[0].includes('.'));
    if (!hasRealNum) continue;
    eff++;
    let hit = false;
    for (const m of line.matchAll(/\d+(?:\.\d+)?/g)) {
      const a = norm(line.slice(Math.max(0, m.index - 3), Math.min(line.length, m.index + m[0].length + 3)));
      if (a.length >= 4 && kbNorm.includes(a)) { hit = true; break; }
    }
    if (!hit) {
      for (const m of line.matchAll(/\d+(?:\.\d+)?(?:℃|MPa|MPA|lx|min|h|s|km|m|mm|cm|L\/s|m\/s|%|级|倍|层|个|具|只|人|辆|台|块|次)/gi)) {
        if (kbNorm.includes(norm(m[0]))) { hit = true; break; }
      }
    }
    if (hit) hitLines++;
    else if (missExamples.length < 3 && !isMnemonic(line)) missExamples.push(line.slice(0, 55));
  }
  results.push({ name, eff, hit: hitLines, pct: eff ? Math.round(hitLines / eff * 100) : 100, miss: missExamples });
}

results.sort((a, b) => a.pct - b.pct);
console.log('\n=== 内容行覆盖率最低40张 ===');
for (const r of results.filter((r) => r.eff >= 3).slice(0, 40))
  console.log(String(r.pct).padStart(3) + '% ' + r.hit + '/' + r.eff + '  ' + r.name + (r.miss[0] ? '  例:' + r.miss[0] : ''));
console.log('');
console.log('高≥80%:', results.filter((r) => r.eff >= 3 && r.pct >= 80).length,
  '中50-79:', results.filter((r) => r.eff >= 3 && r.pct >= 50 && r.pct < 80).length,
  '低<50%:', results.filter((r) => r.eff >= 3 && r.pct < 50).length,
  '(样本不足行<3的卡:', results.filter((r) => r.eff < 3).length + ')');
fs.writeFileSync('.ai/ec-compare.json', JSON.stringify(results, null, 1), 'utf8');
