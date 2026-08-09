# WorkBuddy 建议处理规则

> 专项规则。处理 WorkBuddy（wb）提交的知识库建议时按此执行。
> wb 的建议文件在 `wb-suggestions/pending/`，本规则规定 Claude Code 如何认领、校验、写入、归档。

## 一、触发时机

- 每次任务开始时，检查 `wb-suggestions/pending/` 是否有新文件
- 每周同步时，清空全部 pending 积压
- 用户说"处理 wb 建议"时立即执行

## 二、认领前检查（git 白名单）

处理任何一批 pending 前，先运行：

```
git status --porcelain
```

判定：
- 仅出现 `?? wb-suggestions/pending/**`（未跟踪新文件）= **合规**，继续
- 出现 `M knowledge-base/**`、`M errors/**`、`M index.md`、`M materials/**` 等任何只读位置被改动 = **违规**
  - wb 未提交过任何内容，直接回滚：`git checkout -- <被改路径>`
  - 告知用户"wb 越权改动了 X，已回滚"，并把该案例记入 `wb-suggestions/README.md` 反例区
- 发现 `AGENTS.md`、`wb-suggestions/README.md` 等协作文件被改 = 违规，回滚

## 三、认领流程

1. 逐条读取 `wb-suggestions/pending/*.md`，**全部读取，禁止抽样**
2. 按 `knowledge-maintenance.md` 的"全量检验"要求，逐条回查讲义/规范原文确认内容一致，不得凭记忆或推断
3. 逐条判定：**接受** / **拒绝** / **需用户确认**

## 四、写入流程（接受时）

1. 按 `templates/knowledge-entry.md` 模板，把建议内容写入对应 knowledge-base 条目（或新增条目）
2. 填写完整 YAML frontmatter（module、tags、regulation_refs、related、weight、sources）
3. 同步更新 `knowledge-base/index.md` 的模块树和标签反向索引
4. 引用来源标注：讲义出处在前、规范条文编号在后

## 五、归档流程

- 处理完的文件从 `pending/` 移到 `archive/`
- **拒绝**的文件，头部 frontmatter 标 `status: rejected` + 在文件中注明拒绝原因
- **需用户确认**的文件，头部标 `status: pending-user`，待用户答复后处理
- 已接受并写入的文件，头部标 `status: accepted` + 写明写入的条目路径

## 六、交付与提交

- 每批处理完，输出一篇处理报告到 `SC-输出成果/`，文件名 `wb建议处理结果-YYYY-MM-DD.md`，说明：处理条数、接受/拒绝/需确认各几条、写入位置、检验方法（明确"已全部检验 N 条"）
- 报告确认无误后执行 git：`git add -A && git commit && git push`（复用 knowledge-maintenance.md 的 git 小节）

## 七、与其它规则的关系

- 知识索引维护：见 `knowledge-maintenance.md`
- 讲义与规范冲突：**以讲义为准记录并标注差异，交由用户判断**，不得擅自按规范修正（同 CLAUDE.md 通用规则）
- 校验必须全部检验，禁止抽样（同 CLAUDE.md 通用规则）
