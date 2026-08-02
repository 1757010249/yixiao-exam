# 知识库索引

> 本文件是知识库的总入口。维护规则。
> 1. 每次新增或更新知识条目后，同步更新下方"按模块树"和"按标签反向索引"两处
> 2. 覆盖状态标注：空（未创建）/ 骨架（已建目录待填充）/ 已完成
> 3. 奇门遁甲来源的条目在文件名后标注 ⚑（weight: high）

## 按模块树

### 建筑防火

| 文件 | 覆盖状态 | 说明 |
|---|---|---|
| building-fire-protection/overview.md | 已完成 | 模块概览 + 知识脉络图 |
| building-fire-protection/fire-classification.md ⚑ | 已完成 | 火灾危险性分类（口诀+易混点） |
| building-fire-protection/fire-resistance.md ⚑ | 已完成 | 耐火等级（构件表+放宽） |
| building-fire-protection/site-layout.md ⚑ | 已完成 | 总平面布局（防火间距+消防车道） |
| building-fire-protection/building-plane.md ⚑ | 已完成 | 平面布置（设备用房+功能用房） |
| building-fire-protection/evacuation.md ⚑ | 已完成 | 安全疏散（楼梯间+宽度+距离） |
| building-fire-protection/decoration.md ⚑ | 已完成 | 装修防火（材料分级+保温） |

### 消防设施

| 文件 | 覆盖状态 | 说明 |
|---|---|---|
| fire-facilities/overview.md | 已完成 | 设施联动总览 |
| fire-facilities/water/overview.md | 已完成 | 水系统 |
| fire-facilities/water/fire-hydrant.md ⚑ | 已完成 | 消火栓系统 |
| fire-facilities/water/automatic-sprinkler.md ⚑ | 已完成 | 自动喷水灭火系统 |
| fire-facilities/water/water-supply.md ⚑ | 已完成 | 消防给水+消防水泵 |
| fire-facilities/electrical/alarm.md ⚑ | 已完成 | 火灾自动报警系统 |
| fire-facilities/electrical/emergency-lighting.md ⚑ | 已完成 | 应急照明与疏散指示 |
| fire-facilities/hvac/smoke-control.md ⚑ | 已完成 | 防排烟系统 |
| fire-facilities/gas-extinguishing.md ⚑ | 已完成 | 气体灭火系统（七氟丙烷/IG541/CO2） |
| fire-facilities/water/water-mist.md ⚑ | 已完成 | 水喷雾与细水雾 |
| fire-facilities/fire-extinguisher.md | 已完成 | 灭火器 |

### 安全管理

| 文件 | 覆盖状态 | 说明 |
|---|---|---|
| safety-management/overview.md | 已完成 | 模块概览 |
| safety-management/responsibility.md | 已完成 | 消防安全责任制 |
| safety-management/inspection.md | 已完成 | 检查与维护 |

### 法律法规

| 文件 | 覆盖状态 | 说明 |
|---|---|---|
| laws-regulations/overview.md | 已完成 | 模块概览 |
| laws-regulations/penalties.md | 已完成 | 法律责任与处罚 |

## 按标签反向索引

> 维护规则。知识条目新增 tag 后在此登记，一个 tag 对应多个文件用逗号分隔。

| 标签 | 相关文件 |
|---|---|
| 火灾危险性分类 | fire-classification.md |
| 耐火等级 | fire-resistance.md, fire-classification.md |
| 防火间距 | site-layout.md |
| 总平面布局 | site-layout.md |
| 平面布置 | building-plane.md |
| 设备用房 | building-plane.md |
| 装修防火 | decoration.md |
| 建筑保温 | decoration.md |
| 安全疏散 | evacuation.md |
| 疏散楼梯 | evacuation.md |
| 消防给水 | water-supply.md |
| 消防水泵 | water-supply.md |
| 自动喷水灭火 | automatic-sprinkler.md |
| 湿式/干式/预作用/雨淋 | automatic-sprinkler.md |
| 消火栓 | fire-hydrant.md |
| 火灾自动报警 | alarm.md |
| 应急照明 | emergency-lighting.md |
| 防排烟 | smoke-control.md |
| 消防安全责任 | responsibility.md |
| 消防安全重点单位 | responsibility.md |
| 防火检查/巡查 | inspection.md |
| 消防档案 | inspection.md |
| 行政处罚 | penalties.md |
| 消防技术服务机构 | penalties.md |

## 奇门遁甲来源条目

> 自动同步自 `materials/qimen-dunjia/`。凡在答题中引用此列表条目，必须附规范条文编号。
> 完整索引见 [[materials/qimen-dunjia/INDEX.md]]（横竖版+总结版+卡牌大师）。
> 口诀已按模块拆分到 [[materials/qimen-dunjia/mnemonics/]]（10个分组文件，75条口诀，来源为奇门遁甲总结）。横竖版口诀因 OCR 质量差经用户决定不拆分。

| 口诀/总结 | 来源文件 | 关联规范 |
|---|---|---|
| 火灾危险性分类口诀（缺心眼琳姐...） | 奇门遁甲总结 P10-12 | GB 50016 第3.1节 |
| 耐火等级构件表 | 奇门遁甲总结 P13-21 | GB 50016 第5.1节 |
| 设备用房布置口诀（二墙一楼半） | 奇门遁甲总结 P22-24 | GB 50016 第5.4节 |
| 防火间距计算 S=A+B1+B2 | 奇门遁甲总结 P29-31 | GB 50016 第3.4节 |
| 安全疏散口诀（录像1展览0.75歌0.5） | 奇门遁甲总结 P40-50 | GB 50016 第5.5节 |
| 装修材料分级口诀（铜铁石泥土） | 奇门遁甲总结 P62-66 | GB 50222-2017 |
| 自喷系统联动方式 | 奇门遁甲总结 P87-102 | GB 50084-2017 |
| 水泵启动三兄弟（流量/压力/报警阀压力开关） | 奇门遁甲总结 P74-75 | GB 50974 第11.0节 |

## OCR 处理状态

> 维护规则。图片版 PDF 经 OCR 后登记，文本存于 `tools/extracted/`，文件名 `原名.ocr.txt`。

| 文件 | 页数 | OCR 状态 | 文本文件 |
|---|---|---|---|
| 奇门遁甲横向 | 280 | ✅ 完成 | tools/extracted/2026齐德龙消防10-齐门遁甲横向.ocr.txt |
| 奇门遁甲竖向 | 392 | ✅ 完成 | tools/extracted/2026齐德龙消防11-齐门遁甲竖向.ocr.txt |
| 卡牌大师 | 100 | ✅ 完成 | tools/extracted/26卡牌大师.ocr.txt |
| 1号书防火篇 | 314 | ✅ 完成 | tools/extracted/1号书26齐德龙技术实物防火篇.ocr.txt |
| 3号书设施篇 | 447 | ✅ 完成 | tools/extracted/3号书设施篇.ocr.txt |
| 5号书综合能力 | 347 | ✅ 完成 | tools/extracted/5号书消防综合能力内页.ocr.txt |
| 6号综合习题 | 256 | ✅ 完成 | tools/extracted/6号综合习题.ocr.txt |
