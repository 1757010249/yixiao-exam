---
name: error-book
description: 错题本运营。当用户涉及错题录入、每周真题错题更新、错题本版本对比（新PDF与旧版全文对比生成报告）、更新 errors/index.md 统计等任务时使用。常见触发词：录入错题、更新错题本、错题版本对比。
---

# 错题本运营

## 错题来源

- 已做真题的错题（2016/2017/2018/2020/2021 技术实务）已在 ctb_8.2.pdf 中

## 错题记录格式

- 错题记录**不记录作答选项和错误根因**（用户无作答记录），改为记录每条错题考察的**知识点**（knowledge_points），并按知识点维度进行汇总分析
- 每条错题文件记录。exam_source、module、sub_module、knowledge_points、correct_answer、difficulty
- 模板见 `templates/error-item.md`

## 录入后同步统计

- 每次录入错题后，同步更新 `errors/index.md` 的统计（按知识点和模块两个维度）

## 每周真题测试错题更新流程

- 用户每次完成一套真题后，将新增错题记入 errors/items/（文件命名 `日期-科目-序号.md`）
- 同步更新 errors/index.md 统计

## 错题本版本对比流程

- 用户会提供新的错题本 PDF（在旧版基础上已完成新增/删除）
- 每次拿到新版 PDF，与旧版 PDF 做全文对比。识别新增错题（新错题或重复仍错）、删除错题（重复答对），汇总知识点变化
- 更新错题本到最新版，并生成对比报告存 `errors/versions/对比报告-日期.md`（模板见 `templates/error-version-compare.md`）
- 核心对比知识点维度（各知识点错题数增减 + 新增/删除的知识点明细）
- 同步更新 errors/index.md 统计和 errors/weak-points-analysis.md 薄弱分析
