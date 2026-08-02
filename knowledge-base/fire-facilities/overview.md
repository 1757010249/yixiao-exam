---
module: 消防设施
sub_module: 模块总览
subjects: [实务, 综合, 案例]
tags: [消防设施, 知识脉络, 联动]
weight: normal
sources: []
regulation_refs:
  - GB 50974-2014
  - GB 50084-2017
  - GB 50116-2013
  - GB 51251-2017
related:
  - fire-facilities/water/overview.md
  - fire-facilities/electrical/alarm.md
  - fire-facilities/hvac/smoke-control.md
---

# 消防设施 — 模块总览

## 设施联动总览

```mermaid
graph LR
    A[火灾探测器报警] --> B[火灾自动报警控制器]
    B --> C{消防联动控制器}
    C --> D[启动消防水泵]
    C --> E[启动防排烟风机]
    C --> F[启动应急照明]
    C --> G[开启防火卷帘/防火门]
    D --> H[喷淋灭火]
    E --> I[排烟]
    E --> J[送风]
    F --> K[疏散照明]
```

## 三大板块

### 水系统（water/）
- 消防给水（water-supply.md）
- 消火栓系统（fire-hydrant.md）
- 自动喷水灭火系统（automatic-sprinkler.md）

### 电系统（electrical/）
- 火灾自动报警系统（alarm.md）
- 应急照明与疏散指示（emergency-lighting.md）

### 风系统（hvac/）
- 防排烟系统（smoke-control.md）

## 三合一关联

- **《实务》**。考系统组成、工作原理、设计参数
- **《综合》**。考安装、检测、调试、维护管理
- **《案例》**。考联动逻辑和故障分析（如湿式报警阀误动作原因排查）

## 高频联动考点（待补充）

- 探测器报警 → 联动启动水泵/风机的触发条件
- 手动 vs 自动控制方式的优先级
- 各类系统的启动信号来源

## 待填充条目

- fire-facilities/water/fire-hydrant.md
- fire-facilities/water/automatic-sprinkler.md
- fire-facilities/water/water-supply.md
- fire-facilities/electrical/alarm.md
- fire-facilities/electrical/emergency-lighting.md
- fire-facilities/hvac/smoke-control.md
