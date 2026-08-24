// 找出旧版 parse 误判为新增的题（改进版 parse 实际能匹配旧版）
const fs = require('fs');
function normalize(s){return s.replace(/[\s　，。、：；！？（）()《》【】\[\]"'“”‘’.,:;!?\-—_/\\|]/g,'');}
function extractOld(body){const m=body.match(/(\d+)\s*[\.、．]/);if(!m)return{no:'',stem:body};return{no:m[1],stem:body.slice(m.index+m[0].length)};}
function extractNew(body){let m=body.match(/(?:^|\n)\s*(\d{1,3})\s*[\.、．]/);if(m)return{no:m[1],stem:body.slice(m.index+m[0].length)};m=body.match(/(?:^|\n)\s*(\d{1,3})(?=[一-龥（(：:])/);if(m)return{no:m[1],stem:body.slice(m.index+m[0].length)};return{no:'',stem:body};}
function parse(file,ext){const text=fs.readFileSync(file,'utf8');const clean=text.replace(/===== 第 \d+ 页 =====/g,'\n');const parts=clean.split(/正确答案\s*[:：]\s*/);const qs=[];for(let i=0;i<parts.length-1;i++){const body=parts[i];const answer=normalize(parts[i+1].split('\n')[0]).toUpperCase().replace(/[^A-E]/g,'');const{no,stem}=ext(body);let sc=stem;const oi=sc.search(/[A-EＡ-Ｅ]\s*[\.、．]/);if(oi>=0)sc=sc.slice(0,oi);qs.push({no,answer,normStem:normalize(sc)});}return qs;}
function key(q){return q.answer+'|'+q.normStem;}

const oldQ = parse('tools/extracted/ctb.txt', extractNew);
const newQ_new = parse('tools/extracted/ctb_8.16.txt', extractNew);
const newQ_old = parse('tools/extracted/ctb_8.16.txt', extractOld);

// 改进版匹配结果
const oldMap = new Map();
oldQ.forEach(q=>{const k=key(q);if(!oldMap.has(k))oldMap.set(k,[]);oldMap.get(k).push(1);});
const newMatched = new Array(newQ_new.length).fill(false);
newQ_new.forEach((q,i)=>{const k=key(q);if(oldMap.has(k)&&oldMap.get(k).length>0){oldMap.get(k).pop();newMatched[i]=true;}});

// 旧版 parse 的 key 去旧版匹配（重新建 map）
const oldMap2 = new Map();
oldQ.forEach(q=>{const k=key(q);if(!oldMap2.has(k))oldMap2.set(k,[]);oldMap2.get(k).push(1);});

console.log('=== 改进版匹配=true 但旧parse不匹配 的题（旧parse误判为新增）===');
let cnt=0;
newQ_old.forEach((q,i)=>{
  const k=key(q);
  const oldMatched = oldMap2.has(k) && oldMap2.get(k).length>0;
  if(!oldMatched && newMatched[i]){
    cnt++;
    console.log(`idx=${i} 改进no=${newQ_new[i].no} 旧parse no=${q.no} ans=${q.answer} | ${newQ_new[i].normStem.slice(0,30)}`);
  }
});
console.log('误判新增数:', cnt);
