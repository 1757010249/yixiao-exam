---
module: 消防设施
sub_module: 水系统
subjects: [实务, 综合, 案例]
tags: [水系统, 消防给水, 消火栓, 喷淋, 知识脉络]
weight: normal
sources: []
regulation_refs:
  - GB 50974-2014
  - GB 50084-2017
related:
  - ../overview.md
  - fire-hydrant.md
  - automatic-sprinkler.md
  - water-supply.md
---

# 水系统 — 模块总览

## 水系统构成

```mermaid
graph TD
    A[消防水源] --> B[消防水泵]
    B --> C[消防管网]
    C --> D[消火栓系统]
    C --> E[自动喷水灭火系统]
    C --> F[其他水系统]
    B --> G[稳压设施]
```

## 三大子系统

| 系统 | 核心文件 | 关键考点 |
|---|---|---|
| 消防给水 | water-supply.md | 供水方式、水泵接合器、流量压力 |
| 消火栓 | fire-hydrant.md | 室内外消火栓、充实水柱、栓口压力 |
| 自动喷水灭火 | automatic-sprinkler.md | 湿式/干式/预作用/雨淋、喷头选型、报警阀组 |

## 三合一关联

- 水系统的启动逻辑（泵的启动方式：连锁启动 vs 联动启动）是案例题故障分析的高频考点
- 报警阀组的工作状态是《综合》检测验收的重点

## 待填充条目

- fire-hydrant.md
- automatic-sprinkler.md
- water-supply.md
