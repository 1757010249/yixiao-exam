#!/usr/bin/env python3
# vision-ocr-batch.py
# 用 PyMuPDF 渲染 PDF 页 + qwen3.7-plus 视觉 OCR 重跑图片版 PDF
# 用法: python tools/vision-ocr-batch.py <书名key> [起始页] [结束页]
# 书名key: 3haoshu | 5haoshu | 6haoshu
# 输出: tools/extracted-vision/<书名>.ocr.txt （含 ===== 第 N 页 ===== 分隔符）
# 缓存: <cwd>/.ai/vision/*.md （与 vision-bridge / 原 node 脚本同格式，同图重复免付费）
# 断点续跑: 检查输出文件已有的页号，跳过已完成页
# 中止保护: 连续 5 次 HTTP 403/429/超时 即中止（额度耗尽），下次续跑

import sys, os, json, hashlib, base64, re, time, threading, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import fitz  # PyMuPDF
except ImportError:
    print('请先 pip install PyMuPDF'); sys.exit(1)

ROOT = 'C:/1xiangmu/yixiao'
OUT_DIR = os.path.join(ROOT, 'tools/extracted-vision')
VISION_CACHE_DIR = os.path.join(ROOT, '.ai/vision')
CONCURRENCY = 3
DPI = 150
ABORT_FAIL_STREAK = 5  # 连续失败阈值

BOOKS = {
    '3haoshu': {'pdf': 'materials/lectures/3号书设施篇.pdf', 'pages': 447, 'name': '3号书设施篇'},
    '5haoshu': {'pdf': 'materials/lectures/5号书消防综合能力内页.pdf', 'pages': 347, 'name': '5号书消防综合能力内页'},
    '6haoshu': {'pdf': 'materials/exercises/6号综合习题.pdf', 'pages': 256, 'name': '6号综合习题'},
}

def load_config():
    cfg = json.load(open('C:/Users/30828/.claude.json', 'r', encoding='utf-8'))
    for p in cfg.get('projects', {}):
        m = cfg['projects'][p].get('mcpServers', {}).get('vision-bridge')
        if m and m.get('env'): return m['env']
    raise Exception('未找到 vision-bridge 配置')

ENV = load_config()
BASE_URL = ENV.get('VISION_BRIDGE_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
MODELS = [m for m in (ENV.get('VISION_BRIDGE_MODELS', 'qwen-vl-max')).split(',') if not re.search(r'realtime', m, re.I)]
API_KEY = ENV['VISION_BRIDGE_API_KEY']

PROMPT = 'Extract ALL visible text verbatim. Preserve line breaks and structure. Output ONLY the text content, no commentary.'

# 中止信号
abort_event = threading.Event()
fail_streak = 0
streak_lock = threading.Lock()
write_lock = threading.Lock()

def cache_key(source, mode, question):
    return hashlib.sha256(f'{source}|{mode}|{question or ""}'.encode()).hexdigest()[:16]

def read_cache(key):
    f = os.path.join(VISION_CACHE_DIR, f'{key}.md')
    if not os.path.exists(f): return None
    content = open(f, 'r', encoding='utf-8').read()
    m = re.match(r'^---\n[\s\S]*?\n---\n([\s\S]*)$', content)
    return m.group(1) if m else None

def write_cache(key, source, mode, model, body):
    os.makedirs(VISION_CACHE_DIR, exist_ok=True)
    f = os.path.join(VISION_CACHE_DIR, f'{key}.md')
    open(f, 'w', encoding='utf-8').write(f'---\nsource: {source}\nmode: {mode}\nmodel: {model}\n---\n{body}')

def render_page(pdf_path, page_num):
    doc = fitz.open(pdf_path)
    page = doc[page_num - 1]
    mat = fitz.Matrix(DPI / 72, DPI / 72)
    pix = page.get_pixmap(matrix=mat)
    png = pix.tobytes('png')
    doc.close()
    return png

def call_vision(png_bytes):
    data_url = 'data:image/png;base64,' + base64.b64encode(png_bytes).decode()
    body = json.dumps({
        'model': None, 'temperature': 0.2, 'max_tokens': 4096,
        'messages': [{'role': 'user', 'content': [
            {'type': 'text', 'text': PROMPT},
            {'type': 'image_url', 'image_url': {'url': data_url}},
        ]}],
    })
    last_err = None
    for model in MODELS:
        payload = body.replace('"model": null', f'"model": "{model}"')
        try:
            req = urllib.request.Request(BASE_URL + '/chat/completions', data=payload.encode('utf-8'),
                                         headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {API_KEY}'})
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                text = (data.get('choices', [{}])[0].get('message', {}).get('content') or '').strip()
                if text: return {'text': text, 'model': data.get('model', model)}
                last_err = f'模型 {model} 返回空内容'
        except urllib.error.HTTPError as e:
            last_err = f'HTTP {e.code}: {e.read().decode("utf-8", "ignore")[:300]}'
            # 403/429 视为额度/限流，记入连续失败
            if e.code in (403, 429): raise
        except Exception as e:
            last_err = f'{type(e).__name__}: {e}'
            raise  # 超时等也记入连续失败
    raise Exception(last_err or '所有模型均失败')

def process_page(book_key, book, page, book_out):
    global fail_streak
    if abort_event.is_set(): return ('skip', page)
    pdf_path = os.path.join(ROOT, book['pdf'])
    source = f'{book["name"]}_p{page}'
    key = cache_key(source, 'ocr', '')
    try:
        text = read_cache(key)
        model = 'cache'
        if text is None:
            png = render_page(pdf_path, page)
            res = call_vision(png)
            text = res['text']; model = res['model']
            write_cache(key, source, 'ocr', model, text)
        block = f'\n===== 第 {page} 页 =====\n\n{text}\n'
        with write_lock:
            with open(book_out, 'a', encoding='utf-8') as f: f.write(block)
        with streak_lock:
            fail_streak = 0
        return ('ok', page, model, len(text))
    except Exception as e:
        with streak_lock:
            fail_streak += 1
            cur = fail_streak
        if cur >= ABORT_FAIL_STREAK:
            abort_event.set()
        return ('fail', page, str(e)[:200], cur)

def main():
    book_key = sys.argv[1] if len(sys.argv) > 1 else ''
    start_page = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    end_page = int(sys.argv[3]) if len(sys.argv) > 3 else 9999
    book = BOOKS.get(book_key)
    if not book: print(f'未知书名key: {book_key} 可用: {",".join(BOOKS)}'); sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    book_out = os.path.join(OUT_DIR, f'{book["name"]}.ocr.txt')

    # 断点续跑
    done = set()
    if os.path.exists(book_out):
        for m in re.finditer(r'===== 第 (\d+) 页 =====', open(book_out, 'r', encoding='utf-8').read()):
            done.add(int(m.group(1)))

    pages = [p for p in range(start_page, min(end_page, book['pages']) + 1) if p not in done]
    print(f'[{book_key}] 需处理 {len(pages)} 页 (共 {book["pages"]} 页, 已完成 {len(done)} 页)', flush=True)
    if not pages: print('全部完成'); return

    t0 = time.time(); ok = 0; fail = 0
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {ex.submit(process_page, book_key, book, p, book_out): p for p in pages}
        for fut in as_completed(futs):
            r = fut.result()
            if r[0] == 'ok':
                ok += 1
                elapsed = time.time() - t0
                eta = (elapsed / ok * (len(pages) - ok) / 60) if ok else 0
                print(f'[{book_key}] 页{r[1]}/{book["pages"]} 完成 ({r[2]}, {r[3]}字) 已用{elapsed:.0f}s 预计剩{eta:.1f}分钟', flush=True)
            elif r[0] == 'fail':
                fail += 1
                print(f'[{book_key}] 页{r[1]} 失败(连续{r[3]}): {r[2]}', flush=True)
                if abort_event.is_set():
                    print(f'[{book_key}] 连续失败达{ABORT_FAIL_STREAK}次，中止。已成功{ok}失败{fail}，可断点续跑', flush=True)
                    for f in futs:
                        if not f.done(): f.cancel()
                    break
    print(f'[{book_key}] 结束: 成功{ok} 失败{fail} 总耗时{time.time()-t0:.0f}s', flush=True)

if __name__ == '__main__':
    main()
