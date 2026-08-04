// vision-ocr-batch.mjs
// 用 vision-bridge（DashScope Qwen-VL）批量重跑图片版 PDF 的 OCR
// 用法: node tools/vision-ocr-batch.mjs <书名key> [起始页] [结束页]
// 书名key: 1haoshu | 3haoshu | 5haoshu | 6haoshu | qimen10 | qimen11 | kapai
// 输出: tools/extracted-vision/<书名>.ocr.txt （含 ===== 第 N 页 ===== 分隔符）
// 缓存: <cwd>/.ai/vision/*.md （复用 vision-bridge 的缓存格式，同图重复免付费）

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';

// ===== 配置 =====
const ROOT = 'C:/1xiangmu/yixiao';
const OUT_DIR = path.join(ROOT, 'tools/extracted-vision');
const TMP_DIR = path.join(os.tmpdir(), 'vocr');
const PPM = 'C:/Users/1/AppData/Local/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin/pdftoppm.exe';
const CONCURRENCY = 3; // 并发视觉调用数（实测 3 最稳）
const DPI = 150;

const BOOKS = {
  '1haoshu':  { pdf: 'materials/lectures/1号书26齐德龙技术实物防火篇.pdf', pages: 314, name: '1号书26齐德龙技术实物防火篇' },
  '3haoshu':  { pdf: 'materials/lectures/3号书设施篇.pdf', pages: 447, name: '3号书设施篇' },
  '5haoshu':  { pdf: 'materials/lectures/5号书消防综合能力内页.pdf', pages: 347, name: '5号书消防综合能力内页' },
  '6haoshu':  { pdf: 'materials/exercises/6号综合习题.pdf', pages: 256, name: '6号综合习题' },
  'qimen10':  { pdf: 'materials/qimen-dunjia/2026齐德龙消防10-齐门遁甲横向.pdf', pages: 280, name: '2026齐德龙消防10-齐门遁甲横向' },
  'qimen11':  { pdf: 'materials/qimen-dunjia/2026齐德龙消防11-齐门遁甲竖向.pdf', pages: 395, name: '2026齐德龙消防11-齐门遁甲竖向' },
  'kapai':    { pdf: 'materials/qimen-dunjia/26卡牌大师.pdf', pages: 100, name: '26卡牌大师' },
};

// ===== 读取 vision-bridge 配置（含 API key）=====
function loadConfig() {
  const cfg = JSON.parse(fs.readFileSync('C:/Users/1/.claude.json', 'utf8'));
  // 找 vision-bridge 配置（大写或小写路径键）
  const keys = ['C:/1xiangmu/yixiao', 'c:/1xiangmu/yixiao', 'C:/Users/1'];
  for (const k of keys) {
    const mcp = cfg.projects?.[k]?.mcpServers?.['vision-bridge'];
    if (mcp?.env) return mcp.env;
  }
  throw new Error('未找到 vision-bridge 配置');
}

// ===== DashScope 调用（OpenAI 兼容）=====
async function callVision(dataUrl) {
  const env = loadConfig();
  const baseUrl = env.VISION_BRIDGE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const models = (env.VISION_BRIDGE_MODELS || 'qwen-vl-max').split(',');
  const apiKey = env.VISION_BRIDGE_API_KEY;
  const prompt = 'Extract ALL visible text verbatim. Preserve line breaks and structure. Output ONLY the text content, no commentary.';

  let lastErr;
  for (const model of models) {
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 4096,
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ]}],
        }),
      });
      if (!resp.ok) {
        lastErr = new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        continue;
      }
      const data = await resp.json();
      return { text: data.choices?.[0]?.message?.content?.trim() || '', model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ===== 缓存 =====
function cacheKey(source, mode, question) {
  return createHash('sha256').update(`${source}|${mode}|${question ?? ''}`).digest('hex').slice(0, 16);
}
function readCache(dir, key) {
  const f = path.join(dir, `${key}.md`);
  if (!fs.existsSync(f)) return null;
  const content = fs.readFileSync(f, 'utf8');
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  return m ? m[2] : null;
}
function writeCache(dir, key, source, mode, model, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${key}.md`), `---\nsource: ${source}\nmode: ${mode}\nmodel: ${model}\n---\n${body}`, 'utf8');
}

// ===== 渲染 PDF 页为 PNG =====
function renderPage(pdf, pageNum, outPath) {
  const base = outPath.replace(/\.png$/, '');
  // pdftoppm 输出为 <base>-NNN.png，需清理旧文件后渲染再定位
  for (const old of fs.existsSync(path.dirname(base)) ? fs.readdirSync(path.dirname(base)) : []) {
    if (old.startsWith(path.basename(base))) {
      try { fs.unlinkSync(path.join(path.dirname(base), old)); } catch {}
    }
  }
  const res = spawnSync(PPM, ['-png', '-r', String(DPI), '-f', String(pageNum), '-l', String(pageNum), pdf, base], { encoding: 'utf8' });
  const match = fs.existsSync(path.dirname(base)) ? fs.readdirSync(path.dirname(base)).find(f => f.startsWith(path.basename(base)) && f.endsWith('.png')) : null;
  return match ? path.join(path.dirname(base), match) : null;
}

// ===== 主流程 =====
async function main() {
  const bookKey = process.argv[2];
  const startPage = parseInt(process.argv[3] || '1', 10);
  const endPage = parseInt(process.argv[4] || '9999', 10);
  const book = BOOKS[bookKey];
  if (!book) { console.error('未知书名key:', bookKey, '可用:', Object.keys(BOOKS).join(',')); process.exit(1); }

  const env = loadConfig();
  Object.assign(process.env, env);
  const VISION_CACHE_DIR = path.join(ROOT, '.ai/vision');
  const bookOut = path.join(OUT_DIR, `${book.name}.ocr.txt`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const mode = 'ocr';
  const question = ''; // 固定为空，保证同图缓存命中

  // 已完成的页（断点续跑：检查输出文件里已有的分隔符）
  const donePages = new Set();
  if (fs.existsSync(bookOut)) {
    const existing = fs.readFileSync(bookOut, 'utf8');
    const re = /===== 第 (\d+) 页 =====/g;
    let m;
    while ((m = re.exec(existing))) donePages.add(parseInt(m[1], 10));
  }

  const pageRange = [];
  for (let p = startPage; p <= Math.min(endPage, book.pages); p++) {
    if (!donePages.has(p)) pageRange.push(p);
  }
  console.log(`[${bookKey}] 需处理 ${pageRange.length} 页 (共 ${book.pages} 页, 已完成 ${donePages.size} 页)`);
  if (pageRange.length === 0) { console.log('全部完成'); process.exit(0); }

  const t0 = Date.now();
  let ok = 0, fail = 0;

  // 并发处理（每页：渲染→视觉OCR→写结果）
  let idx = 0;
  async function worker() {
    while (idx < pageRange.length) {
      const page = pageRange[idx++];
      const pngBase = path.join(TMP_DIR, `${bookKey}_p${page}.png`);
      try {
        const png = renderPage(path.join(ROOT, book.pdf), page, pngBase);
        if (!png) { console.error(`页${page} 渲染失败`); fail++; continue; }

        const key = cacheKey(png, mode, question);
        let text = readCache(VISION_CACHE_DIR, key);
        let model = 'cache';
        if (text === null) {
          const bs = fs.readFileSync(png).toString('base64');
          const dataUrl = `data:image/png;base64,${bs}`;
          const res = await callVision(dataUrl);
          text = res.text;
          model = res.model;
          writeCache(VISION_CACHE_DIR, key, png, mode, model, text);
        }

        // 追加到输出文件
        const block = `\n===== 第 ${page} 页 =====\n\n${text}\n`;
        fs.appendFileSync(bookOut, block);
        ok++;
        const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
        const eta = ok > 0 ? (elapsed / ok * (pageRange.length - ok) / 60).toFixed(1) : '?';
        console.log(`[${bookKey}] 页${page}/${book.pages} 完成 (${model}, ${text.length}字) 已用${elapsed}s 预计剩${eta}分钟`);
        fs.unlinkSync(png); // 清理临时 PNG
      } catch (e) {
        console.error(`[${bookKey}] 页${page} 失败: ${e.message}`);
        fail++;
        try { if (fs.existsSync(png)) fs.unlinkSync(png); } catch {}
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const total = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`[${bookKey}] 完成: 成功${ok} 失败${fail} 总耗时${total}s`);
}

main().catch(e => { console.error('致命错误:', e.message); process.exit(1); });
