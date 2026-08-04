# 知识索引维护与新增内容规则

> 专项规则。处理"新增/更新知识条目、新增真题或总结、输出成果归档"任务时按此执行。
> 本文档整合自原 CLAUDE.md 第4、7条与《知识库维护操作指南-2026-08-02》，为唯一事实源。

## 一、知识索引维护

- 每次新增或更新知识条目后，同步更新 `knowledge-base/index.md` 的模块树和标签反向索引
- 知识条目必须填写完整的 YAML frontmatter（module、tags、regulation_refs、related 等）
- 条目模板见 `templates/knowledge-entry.md`

## 二、新增内容流程

### 场景1。新增真题（新的一套卷子）

1. **放 PDF**。真题 PDF 放入 `materials/past-exams/`（命名 `年份-科目真题.pdf`）
2. **提取文本**。告诉 Claude 文件路径，自动提取到 `tools/extracted/`（文字版用 extract.js，图片版用 ocr-parallel.sh）
3. **登记成绩**。做完后把得分、用时告诉 Claude，更新 `errors/exam-records.md` 成绩追踪表
4. **更新索引**。knowledge-base/index.md 的 OCR 处理状态表补充该真题

### 场景2。新增总结（笔记/口诀/知识点）

- **用户自己的学习笔记**。原始笔记存 `notes/`，让 Claude 按知识库依据规则逐条校验，输出到 `SC-输出成果/笔记校验结果-日期.md`；校验中发现知识库盲区 → 补知识条目
- **新的口诀/总结资料**。放 `materials/` 对应目录（如奇门遁甲类放 materials/qimen-dunjia/），Claude 提取知识点写入 knowledge-base/ 并标注来源页码；需拆分到 mnemonics/ 时先评估 OCR 质量（图片版质量差慎重）
- **补充单个知识点**。直接告诉 Claude 要补充什么，Claude 在对应知识条目中补充并更新索引

### 通用要求（任何新增）

- 知识条目必须。完整 YAML frontmatter（module、tags、regulation_refs、related）+ 来源页码
- 新增后更新 `knowledge-base/index.md` 的模块树和标签反向索引
- 输出型成果存 `SC-输出成果/`，用户原始输入存 `notes/`

## 三、输出成果归档（详细格式）

- 所有"输出型成果"（笔记校验结果、知识汇总、分析报告等）统一存放到 `SC-输出成果/` 文件夹
- 文件名格式。`主题-日期.md`（如 `笔记校验结果-2026-08-02.md`）
- 输出成果中引用知识库内容时，标注来源（知识库文件 + 规范条文编号 + 原始资料页码）
- 需要用户留存对照的原始输入（如用户笔记原文），存到 `notes/` 文件夹，与输出成果分开

## 四、GitHub 备份（可选）

- 更新完成后，若需备份，Claude 执行 `git add -A && git commit && git push`
- git 已配置代理和身份，直接可用
- 注。大 PDF 用 LFS 管理，改动会自动走 LFS

## 五、每次更新的检查清单

新增任何内容后，检查：
- [ ] knowledge-base/index.md 是否更新（模块树 + 标签反向索引 + OCR状态）
- [ ] errors/index.md 是否更新（错题统计）
- [ ] errors/exam-records.md 是否更新（成绩）
- [ ] 输出成果是否在 SC-输出成果/（不在 notes/ 混放）
- [ ] 知识条目是否有完整 frontmatter 和来源页码
