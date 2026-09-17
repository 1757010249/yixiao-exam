// vision-test.mjs — 测试 Command Code 网关视觉调用（2026-09-17 起，原 opencode zen 网关已停用）
import fs from 'fs';

const key = process.env.CMD_API_KEY || process.env.VISION_BRIDGE_API_KEY;
const img = process.argv[2];
const out = process.argv[3];
const prompt = process.argv[4] || '逐字提取图中表格文字，保留所有数字和单位';

const bs = fs.readFileSync(img).toString('base64');
const resp = await fetch('https://api.commandcode.ai/provider/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
  body: JSON.stringify({
    model: 'google/gemini-3.8-flash',
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
