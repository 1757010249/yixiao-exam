# ima 知识库同步与建议回流规则

> 专项规则。让本地一消知识库在手机 ima App 上使用（手机问答 + 建议回流），由 opencode 执行。
> 工具：`tools/ima-sync.ps1`（同步）、`tools/ima-pull-suggestions.ps1`（回流）、`C:\Users\1\go\bin\ima-go.exe`（ima 官方 OpenAPI 的 Go CLI）。

## 一、架构与角色边界

- **手机端只读 + 建议回流**，绝不直接改本地知识库。
- **opencode 唯一写入方**：`knowledge-base/`、`errors/`、`index.md`、`wb-suggestions/pending/` 的写入都由 opencode 完成；ima 云端只存内容与建议笔记。
- **凭证安全**：Client ID + API Key 存 `.opencode/ima-sync.config` 与 `~/.ima/config.yaml`，均已 `.gitignore`，不入库、不进知识库、不进产物。

## 二、关键能力限制（必须先记住）

ima 官方 OpenAPI（`/openapi/wiki/v1`）**没有 update / delete / 建文件夹接口**；笔记 API（`/openapi/note/v1`）**没有 move / delete / 改标题接口**。由此决定：

| 能力 | ima 是否支持 |
|---|---|
| 新增文件/笔记 | 支持 |
| 更新已有条目 | **不支持**（重传=新增同名重复条目） |
| 删除条目 | **不支持**（只能 PC 端手动删） |
| 程序化建文件夹 | **不支持**（只能 PC 端手动建） |
| 移动/删除/改名笔记 | **不支持** |

## 三、知识库 → ima 同步（`tools/ima-sync.ps1`）

1. **前置**：用户在 ima PC 端创建知识库，把 KB ID 填进 `.opencode/ima-sync.config` 的 `default_kb`；首次全量用 PC 端「上传文件夹」导入 `knowledge-base/`、`errors/`、`materials/qimen-dunjia/`（保留层级）。
2. **触发**：opencode 每次 git commit 后手动运行 `tools/ima-sync.ps1`（先 `-DryRun` 预览再实跑）。
3. **行为**：SHA-256 增量检测。
   - **新增** .md → 自动上传到 ima 对应 folder（按 `.opencode/ima-folder-map.json` 映射，缺省传根目录）。
   - **内容修改** → **只告警不上传**，列出变更文件，提示去 ima PC 端手动删旧条目再重传（因无 update 接口）。
   - 未变 → 跳过。
4. **白名单只传**：`knowledge-base/`、`errors/`、`materials/qimen-dunjia/` 三个目录的 .md。
5. **排除清单（防御）**：`materials/exercises/`、`materials/past-exams/`、`materials/lectures/`、`materials/mind-maps/`、`materials/*.pdf`、`tools/**` 一律不同步——**题眼/讲义/导图 PDF 永不进依据库**。
6. **题眼隔离**：`materials/` 下的题眼 PDF（习题/真题/模拟/讲义/思维导图）已从 ima 依据库移出（2026-08-20 用户 PC 端手动删除，ima 无 delete API 无法自动删）。依据库仅剩 85 个 .md（`knowledge-base/` 42 + `errors/` 32 + `materials/qimen-dunjia/` 11）。
7. 失败只告警，不阻断 commit。

## 四、手机端问答入口（WorkBuddy App ☁️ 云端模式连 ima）

1. **入口**：手机用 WorkBuddy App，切「☁️ 云端工作」，连接 ima「一消备考知识库」作检索源（不再用 ima App 直答）。
2. **问答约定**（告知用户如此使用）：
   - 把题（题眼）贴进 WorkBuddy 对话，明确说明「这是一道题，请基于知识库作答」。
   - 要求引用讲义页码（.md frontmatter 的 `sources.section`）与规范条文（`regulation_refs`）。
   - **角色分工**：题目=要答对象，知识库=依据，**不得把题目当依据**。
3. **额度**：WorkBuddy 云端走其模型消耗额度（非 ima 免费 DeepSeek R1），用户已知悉并接受。
4. 本规则不替代 WorkBuddy 侧配置，仅记录约定与边界。

## 五、ima 建议笔记 → 本地回流（`tools/ima-pull-suggestions.ps1`）

1. **约定标记**：用户存建议时笔记标题前缀 `[建议]`（或标签 `wb-suggestion`）。
2. **来源**：优先手机 ima 存笔记；若 WorkBuddy 不能直接写 ima 笔记，退而存 WorkBuddy 资料库在线文档，回电脑后手动转贴到 ima 笔记。
3. **触发**：opencode 回电脑后运行 `tools/ima-pull-suggestions.ps1`（先 `-DryRun` 预览）。
4. **行为**：拉取带 `[建议]` 前缀的笔记 → 与 `.opencode/ima-pulled-notes.json`（已回流 docid 清单）去重 → 每条生成 `wb-suggestions/pending/YYYY-MM-DD-序号-主题.md`（frontmatter 按 `wb-suggestions/templates/blindspot-suggestion.md`）→ 登记 `wb-suggestions/待处理清单.md`。
5. **去重靠本地台账**（ima 端无法 move/delete 笔记，不能云端标记）。
6. **后续**：按 `wb-suggestion-processing.md` 逐条回查讲义/规范原文（全量检验）→ 接受写入 `knowledge-base/` 并更新 `index.md`，或归档 `archive/`。

## 六、git 白名单

- 同步/回流脚本只允许：在 `wb-suggestions/pending/**` 产生新建议文件、写 `.opencode/ima-*.json` 本地状态（已 gitignore）、操作 ima 云端。
- 不得改动 `knowledge-base/`、`errors/`、`index.md` 等只读位置（除非走正式写入流程并全量检验）。
- 运行同步前跑 `git status --porcelain` 检查，异常回滚并反馈。

## 七、故障排查

- `ima-go` 无法 `go install`（其 go.mod 有 `replace => ../ima-sdk-go` 本地路径 bug）：改用 clone 源码本地 build，产物已部署到 `C:\Users\1\go\bin\ima-go.exe`。
- 联网走 `GOPROXY=https://goproxy.cn,direct`（`proxy.golang.org` 本机不可达）。
- 凭证失效/额度不足：访问 https://ima.qq.com/agent-interface 重新生成，更新 `.opencode/ima-sync.config` 与 `~/.ima/config.yaml`。
