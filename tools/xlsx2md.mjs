// xlsx2md.mjs — 将 xlsx 工作簿全部 sheet 转为单个 markdown 文件
// 用法: node tools/xlsx2md.mjs <输入.xlsx> <输出.md>
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error('用法: node tools/xlsx2md.mjs <输入.xlsx> <输出.md>'); process.exit(1); }

const TMP = path.join(process.env.TEMP || '/tmp', 'xlsx2md_' + Date.now());
fs.mkdirSync(TMP, { recursive: true });
const zip = path.resolve(input).replace(/\\/g, '/');
execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zip}', '${TMP.replace(/\\/g, "/")}')"`);

function readXml(p) { return fs.readFileSync(path.join(TMP, p), 'utf8'); }
function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&(?!amp;)/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}
function tagText(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g');
  let m; while ((m = re.exec(xml))) out.push(decode(m[1]));
  return out;
}

// sharedStrings
const ssXml = readXml('xl/sharedStrings.xml');
const shared = [];
{
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(ssXml))) {
    const ts = [];
    const tre = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t; while ((t = tre.exec(m[1]))) ts.push(decode(t[1]));
    shared.push(ts.join(''));
  }
}

// workbook sheets + rels
const wb = readXml('xl/workbook.xml');
const rels = readXml('xl/_rels/workbook.xml.rels');
const ridToFile = {};
{
  const re = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g;
  let m; while ((m = re.exec(rels))) ridToFile[m[1]] = m[2].replace(/^\/xl\//, '').replace(/^\//, 'xl/');
}
const sheets = [];
{
  const re = /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g;
  let m; while ((m = re.exec(wb))) sheets.push({ name: decode(m[1]), file: ridToFile[m[2]] });
}
// 兼容 r:id 与 id 属性顺序不同的情况
if (sheets.length === 0) {
  const re = /<sheet[^>]*>/g;
  let m; while ((m = re.exec(wb))) {
    const tag = m[0];
    const nm = tag.match(/name="([^"]+)"/), rid = tag.match(/(?:r:)?id="([^"]+)"/);
    if (nm && rid) sheets.push({ name: decode(nm[1]), file: ridToFile[rid[1]] });
  }
}

// 列号转序号
function colIdx(ref) { const s = ref.match(/^[A-Z]+/)[0]; let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }

let md = `# 电子卡全量导出\n\n> 来源: ${path.basename(input)}\n> sheet 总数: ${sheets.length}\n`;
for (const sh of sheets) {
  if (!sh.file || !fs.existsSync(path.join(TMP, 'xl', sh.file.replace(/^xl\//, '')))) { md += `\n## ${sh.name}\n\n(缺失)\n`; continue; }
  const xml = readXml(path.join('xl', sh.file.replace(/^xl\//, '')).replace(/\\/g, '/'));
  md += `\n## ${sh.name}\n\n`;
  const rows = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = [];
    const cRe = /<c([^>]*)\/>|<c([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cRe.exec(rm[1]))) {
      const attrs = cm[1] || cm[2] || '';
      const inner = cm[3] || '';
      const ref = attrs.match(/r="([A-Z]+\d+)"/);
      const type = attrs.match(/t="([^"]+)"/);
      const v = inner.match(/<v>([\s\S]*?)<\/v>/);
      const is = inner.match(/<is>([\s\S]*?)<\/is>/);
      let val = '';
      if (type && type[1] === 's' && v) val = shared[+v[1]] ?? '';
      else if (type && type[1] === 'inlineStr' && is) { const ts = []; const tre = /<t[^>]*>([\s\S]*?)<\/t>/g; let t; while ((t = tre.exec(is[1]))) ts.push(decode(t[1])); val = ts.join(''); }
      else if (v) val = decode(v[1]);
      cells[colIdx(ref ? ref[1] : 'A')] = val;
    }
    rows.push(cells);
  }
  // 表格化: 首行作表头(若非空)
  const nonEmpty = rows.filter(r => r.some(c => (c || '').trim()));
  if (nonEmpty.length === 0) { md += '(空表)\n'; continue; }
  const width = Math.max(...nonEmpty.map(r => r.length));
  const esc = (s) => (s == null ? '' : String(s)).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  md += '| ' + Array.from({ length: width }, (_, i) => esc(nonEmpty[0][i]) || ' ').join(' | ') + ' |\n';
  md += '|' + Array.from({ length: width }, () => '---').join('|') + '|\n';
  for (const r of nonEmpty.slice(1)) md += '| ' + Array.from({ length: width }, (_, i) => esc(r[i]) || ' ').join(' | ') + ' |\n';
}
fs.writeFileSync(output, md, 'utf8');
console.log(`${output} 写入 ${sheets.length} sheet, ${md.length} 字符`);
fs.rmSync(TMP, { recursive: true, force: true });
