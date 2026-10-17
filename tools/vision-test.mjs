// vision-test.mjs — 测试 opencode-go 网关视觉调用（2026-10-17 起；原 Command Code 网关随订阅停用）
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

// API key：环境变量 VISION_BRIDGE_API_KEY 优先，其次读 opencode auth.json 里的 opencode-go key
function loadKey() {
  if (process.env.VISION_BRIDGE_API_KEY) return process.env.VISION_BRIDGE_API_KEY;
  try {
    const auth = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.local/share/opencode/auth.json'), 'utf8'));
    return auth['opencode-go']?.key || null;
  } catch { return null; }
}

const key = loadKey();
if (!key) {
  console.error('未找到视觉 API key（设置 VISION_BRIDGE_API_KEY，或先 /connect 登录 opencode-go）');
  process.exit(1);
}
const img = process.argv[2];
const out = process.argv[3];
const prompt = process.argv[4] || '逐字提取图中表格文字，保留所有数字和单位';

const bs = fs.readFileSync(img).toString('base64');
const resp = await fetch('https://opencode.ai/inference/go/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + key,
    'User-Agent': 'yixiao-vision/1.0',
    'x-opencode-session': randomUUID(),
  },
  body: JSON.stringify({
    model: 'mimo-v2.5',
    temperature: 0.2,
    max_tokens: 4000,
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,' + bs } },
    ]}],
  }),
});
console.log('HTTP', resp.status);
if (resp.ok) {
  const d = await resp.json();
  const t = d.choices?.[0]?.message?.content || '';
  fs.writeFileSync(out, '===== 视觉OCR =====\n' + t, 'utf8');
  console.log(t.slice(0, 1200));
} else {
  console.log((await resp.text()).slice(0, 400));
}
