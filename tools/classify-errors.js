// 精确提取错题：逐行扫描，题号开始，答案行结束（第三版）
const fs = require('fs');

const t = fs.readFileSync('tools/extracted/ctb.txt', 'utf8');
const lines = t.split('\n');

const questions = [];
let cur = null;
for (const ln of lines) {
  const qStart = ln.match(/^\s*(\d{1,3})[\.、]\s*(.*)/);
  const ansMatch = ln.match(/^\s*正确答案[:：]\s*([A-E,，]+)\s*$/);
  if (qStart) {
    if (cur) questions.push(cur);
    cur = { no: +qStart[1], body: [qStart[2]], answer: null };
  } else if (cur && ansMatch) {
    cur.answer = ansMatch[1];
  } else if (cur && !/^===== 第 \d+ 页 =====/.test(ln)) {
    cur.body.push(ln);
  }
}
if (cur) questions.push(cur);

const withAns = questions.filter(q => q.answer);
console.log('总题数:', questions.length, '有答案题数:', withAns.length);

// 分类规则
const rules = [
  { kp: '火灾自动报警', module: '消防设施', sub: '电系统', re: /(探测器|报警控制器|联动控制|手动报警按钮|声光警报器|广播扬声器|可燃气体探测|电气火灾监控|火灾自动报警系统|防火卷帘|短路隔离器|报警区域|探测区域|点型感烟|感温火灾探测器|线型|吸气式|火焰探测器|消防联动控制器)/, exclude: /(自动喷水灭火|消火栓|防排烟|机械排烟|排烟系统)/ },
  { kp: '自动喷水灭火', module: '消防设施', sub: '水系统', re: /(自动喷水灭火系统|湿式自动|干式自动|预作用|雨淋|洒水喷头|喷头|报警阀|末端试水|水流指示器|喷水强度|水幕|直立型|下垂型|边墙型|隐蔽型|家用喷头)/, exclude: /(消火栓|消防给水|消防水泵|水喷雾|细水雾)/ },
  { kp: '消防给水与水泵', module: '消防设施', sub: '水系统', re: /(消防水泵|稳压泵|消防水池|高位水箱|水泵接合器|消防给水|吸水管|出水管|流量开关|低压压力开关|分区供水|柴油机泵|消防水泵控制柜|机械应急启动)/, exclude: /(喷头|报警阀组|喷淋泵)/ },
  { kp: '耐火等级与构件', module: '建筑防火', sub: '耐火等级', re: /(耐火等级|耐火极限|防火墙|防火隔墙|难燃性墙体|非承重外墙|燃烧性能分级|防火门)/, exclude: /(疏散|排烟|防火间距|保温|中间仓库|装修)/ },
  { kp: '消火栓', module: '消防设施', sub: '水系统', re: /(室内消火栓|室外消火栓|消火栓栓口|充实水柱|软管卷盘|消火栓固定接口)/, exclude: /(消防给水|水泵接合器|消防水泵)/ },
  { kp: '火灾危险性分类', module: '建筑防火', sub: '火灾危险性', re: /(根据《建筑设计防火规范》|火灾危险性|属于甲类|属于乙类|属于丙类|属于丁类|储存与生产|爆炸下限|闪点大于|闪点小于|易燃液体|Ⅱ级易燃液体)/, exclude: /(消火栓|排烟|水泵接合器|中间仓库|耐火|水喷雾|防火间距)/ },
  { kp: '安全疏散', module: '建筑防火', sub: '安全疏散', re: /(疏散楼梯|安全出口|疏散距离|袋形走道|疏散门|防烟楼梯|避难|户门|疏散总净宽度|百人|疏散宽度|疏散外门|剪刀楼梯)/, exclude: /(排烟|加压送风|防烟系统)/ },
  { kp: '防排烟', module: '消防设施', sub: '风系统', re: /(排烟|送风|防烟分区|挡烟垂壁|补风|加压送风|机械排烟|自然排烟|储烟仓|排烟口|排烟阀|排烟风机|防烟系统)/, exclude: /(疏散楼梯|安全出口)/ },
  { kp: '灭火器', module: '消防设施', sub: '其他', re: /(灭火器)/, exclude: /(疏散|罚款|拘留)/ },
  { kp: '平面布置', module: '建筑防火', sub: '平面布置', re: /(锅炉房|储油间|变压器室|柴油发电机|中间仓库|办公室|休息室|商业服务网点|设备用房|油浸变压器)/, exclude: /(疏散|防火间距|耐火|泡沫|细水雾)/ },
  { kp: '防火间距与总平', module: '建筑防火', sub: '总平面布局', re: /(防火间距|消防车道|登高|扑救面|回车场|消防救援口)/, exclude: /(耐火|保温)/ },
  { kp: '自动射流灭火', module: '消防设施', sub: '水系统', re: /(射流|自动跟踪)/ },
  { kp: '水喷雾细水雾', module: '消防设施', sub: '水系统', re: /(水喷雾|细水雾)/ },
  { kp: '电气防火', module: '建筑防火', sub: '电气防火', re: /(电气线路|配电|照明回路|绝缘电阻|防爆|直燃机房|烟囱|白炽灯|换气次数|电动机|锅炉通风)/ },
  { kp: '装修与保温', module: '建筑防火', sub: '装修保温', re: /(装修材料|保温|装饰层|外墙外保温|防火隔离带)/ },
  { kp: '应急照明', module: '消防设施', sub: '电系统', re: /(应急照明|疏散指示|标志灯|集中电源|灯具|集中控制型)/ },
  { kp: '气体灭火', module: '消防设施', sub: '其他', re: /(七氟丙烷|IG541|气体灭火|灭火剂|二氧化碳灭火系统|储瓶|全淹没)/ },
  { kp: '泡沫灭火', module: '消防设施', sub: '水系统', re: /(泡沫)/ },
  { kp: '消防电梯救援', module: '建筑防火', sub: '灭火救援', re: /(消防电梯|救援口|避难层|灭火救援)/ },
  { kp: '其他规范', module: '其他', sub: '其他', re: /(地铁|隧道|石油|加油加气|汽车库|储罐|飞机库|变电站|乡镇消防队|液氧)/ },
  { kp: '安全管理', module: '安全管理', sub: '综合', re: /(消防安全重点单位|应急疏散预案|消防技术服务机构|消防控制室值班|巡查记录|防火检查|维护管理|保养|月度|季度|年度|每周|每月|存档|抽查|抽样|验收|密封性能试验)/, exclude: /(探测器|报警|消火栓|排烟)/ },
  { kp: '法规处罚', module: '法律法规', sub: '处罚', re: /(罚款|拘留|行政处罚|虚假文件|处罚法)/ },
  { kp: '材料燃烧与产物', module: '建筑防火', sub: '燃烧基础', re: /(塑料类材料|电缆燃烧产物|燃烧产物|烟头|顶棚射流|白炽灯)/, exclude: /(探测器)/ },
  { kp: '防火阀与分隔', module: '消防设施', sub: '风系统', re: /(防火阀|排烟防火阀|防火阀漏烟|防火窗|防火卷帘)/, exclude: /(报警|探测器|自喷)/ },
  { kp: '建筑分类与高度', module: '建筑防火', sub: '建筑分类', re: /(建筑分类|建筑高度|避难层|高层民用建筑|一类高层|二类高层|裙房)/, exclude: /(疏散|防火间距|消防电梯)/ },
  { kp: '灭火救援设施', module: '建筑防火', sub: '灭火救援', re: /(救援口|消防救援|消防车登高|扑救面)/ },
];

function classify(text) {
  for (const r of rules) {
    if (r.re.test(text) && !(r.exclude && r.exclude.test(text))) return r;
  }
  return null;
}

const grouped = {};
for (const q of withAns) {
  const text = q.body.join(' ');
  const r = classify(text);
  const kp = r ? r.kp : '其他';
  if (!grouped[kp]) grouped[kp] = { rule: r || { module: '其他', sub: '其他' }, items: [] };
  grouped[kp].items.push(q);
}

console.log('=== 精确分类结果 ===');
for (const [k, g] of Object.entries(grouped).sort((a, b) => b[1].items.length - a[1].items.length)) {
  console.log(String(g.items.length).padStart(3), k);
}
fs.writeFileSync('tools/extracted/error-classified.json', JSON.stringify(grouped, null, 2), 'utf8');
console.log('已保存 error-classified.json');
