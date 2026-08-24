// 清理 v2：删除 5 个归错知识点的题块（含错位答案）+ 删除保留题块内的"数字："被合并段落
// 用法: node fix-clean.js [--apply]
const fs = require('fs');
const path = require('path');
const ROOT = 'c:/1xiangmu/yixiao';
const ITEMS = path.join(ROOT, 'errors/items');
const APPLY = process.argv.includes('--apply');

// 5 个有独立标题但答案错位+归错知识点的题块（整体删除）
const DEL_BLOCKS = [
  { file: '2026-08-02-消火栓.md', no: '35', kw: '不履行组织疏散义务' },
  { file: '2026-08-02-安全疏散.md', no: '9', kw: '下沉式广场' },
  { file: '2026-08-02-火灾自动报警.md', no: '11', kw: '中庭部位' },
  { file: '2026-08-02-消防给水与水泵.md', no: '3', kw: '建筑材料及制品燃烧性能' },
  { file: '2026-08-02-耐火等级与构件.md', no: '4', kw: '办公室、休息室' },
];

const FILES = [
  '2026-08-02-其他.md',
  '2026-08-02-火灾自动报警.md',
  '2026-08-02-消火栓.md',
  '2026-08-02-消防给水与水泵.md',
  '2026-08-02-安全疏散.md',
  '2026-08-02-耐火等级与构件.md',
];

for (const f of FILES) {
  const file = path.join(ITEMS, f);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const out = [];
  let delBlock = false; // 是否在删除整个题块
  let delMerged = false; // 是否在删除"数字："段落
  let removedBlock = 0, removedMerged = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // 1. 有标题题块
    if (/^### \d+\./.test(l)) {
      const hit = DEL_BLOCKS.find(d => d.file === f && l.includes(`题${d.no}`) && l.includes(d.kw));
      if (hit) { delBlock = true; removedBlock++; continue; }
      delBlock = false;
      out.push(l);
      continue;
    }
    if (delBlock) { continue; } // 题块内全部删除（含选项、答案、被合并段落）

    // 2. "数字："段落（无标题被合并题）
    if (/^\s*\d{1,3}\s*：/.test(l)) { delMerged = true; removedMerged++; continue; }
    if (delMerged) {
      if (/^[A-EＡ-Ｅ]\s*[\.、．]/.test(l) || l.trim() === '') { continue; } // 选项/空行删除
      delMerged = false; // 遇到其他行，结束段落
      out.push(l);
      continue;
    }
    out.push(l);
  }

  if (APPLY) fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log(`${f}: 删题块 ${removedBlock}，删段落 ${removedMerged}`);
}
if (!APPLY) console.log('\n[dry-run] 加 --apply 写入');
