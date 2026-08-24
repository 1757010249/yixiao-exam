// 错题本版本对比脚本
// 解析两版 ctb 文本，提取每道题（题号/答案/题干），按"答案+题干前缀"指纹匹配，输出新增/删除清单
// 用法: node compare-ctb.js <旧版txt> <新版txt>
const fs = require('fs');

const [oldFile, newFile] = process.argv.slice(2);

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

// 按"正确答案"切分，每段是一道题
function splitQuestions(text) {
  // 去掉页标记
  const clean = text.replace(/===== 第 \d+ 页 =====/g, '\n');
  const parts = clean.split(/正确答案\s*[:：]\s*/);
  const questions = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const body = parts[i];
    const answer = parts[i + 1].split('\n')[0].trim();
    questions.push({ body, answer });
  }
  return questions;
}

function normalize(s) {
  return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_]/g, '');
}

function extractNo(body) {
  // 题号出现在 body 开头（可能前面有页标记残留）
  const m = body.match(/(\d+)\s*[\.、．]/);
  return m ? m[1] : '';
}

function extractStem(body) {
  // 题干 = 题号之后到第一个选项（A. / A、）之前
  const m = body.match(/^\s*\d+\s*[\.、．]\s*(.*)$/s);
  if (!m) return body;
  let stem = m[1];
  const optIdx = stem.search(/[A-EＡ-Ｅ]\s*[\.、．]/);
  if (optIdx >= 0) stem = stem.slice(0, optIdx);
  return stem;
}

function parse(text) {
  const qs = splitQuestions(text);
  return qs.map(q => {
    const no = extractNo(q.body);
    const stem = extractStem(q.body);
    const normStem = normalize(stem);
    return {
      no,
      answer: normalize(q.answer).toUpperCase().replace(/[^A-E]/g, ''),
      stem,
      normStem,
      prefix: normStem.slice(0, 25),
    };
  });
}

const oldQs = parse(read(oldFile));
const newQs = parse(read(newFile));

console.log(`旧版题数: ${oldQs.length}`);
console.log(`新版题数: ${newQs.length}`);

// 指纹 = 答案 + 题干前缀(25字)。用于匹配
function key(q) {
  return q.answer + '|' + q.prefix;
}

const oldMap = new Map(); // key -> [indices]
oldQs.forEach((q, i) => {
  const k = key(q);
  if (!oldMap.has(k)) oldMap.set(k, []);
  oldMap.get(k).push(i);
});

// 匹配：先精确指纹，未匹配的再尝试仅答案+更短前缀
const newMatched = new Array(newQs.length).fill(false);
const oldMatched = new Array(oldQs.length).fill(false);

newQs.forEach((q, i) => {
  const k = key(q);
  const hits = oldMap.get(k);
  if (hits && hits.length > 0) {
    const oi = hits.shift();
    oldMatched[oi] = true;
    newMatched[i] = true;
  }
});

// 输出未匹配
function show(q, idx) {
  return `${idx}|题号${q.no}|答案${q.answer}|${q.stem.trim().slice(0, 40)}`;
}

const deleted = [];
const added = [];
oldQs.forEach((q, i) => { if (!oldMatched[i]) deleted.push({ q, i }); });
newQs.forEach((q, i) => { if (!newMatched[i]) added.push({ q, i }); });

console.log(`\n精确匹配后：`);
console.log(`  疑似删除(旧版有新版无): ${deleted.length}`);
console.log(`  疑似新增(新版有旧版无): ${added.length}`);

console.log(`\n===== 疑似删除 =====`);
deleted.forEach(({ q, i }) => console.log(show(q, i)));

console.log(`\n===== 疑似新增 =====`);
added.forEach(({ q, i }) => console.log(show(q, i)));
