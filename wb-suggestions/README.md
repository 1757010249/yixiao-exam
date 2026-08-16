# wb-suggestions — 问答 Agent 建议回流目录

> 本目录是 **问答 Agent（原 WorkBuddy「wb」，现由 DeepSeek 承担）** 与 **Claude Code** 之间的协作接缝。
> 问答 agent 在问答中发现知识库盲区/疑误时，只在这里**新建**建议文件；Claude Code 认领、校验后决定是否写入知识库。

## 文件生命周期

```
wb-suggestions/pending/  ← 问答 agent 新建建议文件（YYYY-MM-DD-序号-主题.md）
        │  Claude Code 登记到待处理清单.md（台账）
        ▼
wb-suggestions/待处理清单.md  ← 定期与用户一起处理（建议每周）
        │  认领：逐条读取 + 回查讲义/规范原文（全量检验）
        ▼
  知识库写入（接受）         或                归档（拒绝/需确认）
  knowledge-base/ 对应条目 + index.md 更新            archive/（头部标 status）
        │                                        │
        ▼                                        ▼
  wb-suggestions/archive/（处理完留档）       清单"待处理"移到"已处理"
```

> 台账 = `wb-suggestions/待处理清单.md`。所有问答 agent 建议先登记到清单，不随时处理、定期一起处理。

## 谁写谁读

| 目录/文件 | 问答 agent | Claude Code |
|---|---|---|
| `pending/` | 只新建 | 读 + 校验后移走 |
| `archive/` | 只读 | 写入（处理完归档） |
| `templates/` | 只读 | 维护 |
| `README.md` | 只读 | 维护 |

## 建议文件命名

`YYYY-MM-DD-序号-主题.md`，序号为当天第几条（如 `2026-08-09-01-喷头下方障碍物增设喷头.md`）。

模板见 `templates/blindspot-suggestion.md`。

## 处理约定

- 问答 agent 写建议后告知用户"已提交建议，将由 Claude Code 校验"。**问答 agent 不得自己写入 knowledge-base/ 或更新 index.md**。
- Claude Code 处理规则见 `.claude/rules/wb-suggestion-processing.md`。
- Claude Code 每次处理前跑 git 白名单检查：仅允许 `wb-suggestions/pending/**` 出现未跟踪新文件；若发现知识库被改动，回滚并反馈用户。
