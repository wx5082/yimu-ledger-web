export const categories=['餐饮','购物','交通','生活缴费','住房','娱乐','医疗','教育','工资','理财','其他'];
export const types={expense:'支出',income:'收入',refund:'退款',repayment:'信用卡还款',transfer:'转账'};
export function dateString(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function dayAt(y,m,day){return new Date(y,m,Math.min(day,new Date(y,m+1,0).getDate()),12);}
export function cycle(card,ref=new Date(),offset=0){
 const y=ref.getFullYear(),m=ref.getMonth();let end=dayAt(y,m,card.billDay);
 if(dateString(ref)>dateString(end))end=dayAt(y,m+1,card.billDay);
 end=dayAt(end.getFullYear(),end.getMonth()+offset,card.billDay);
 const prev=dayAt(end.getFullYear(),end.getMonth()-1,card.billDay),start=new Date(prev);start.setDate(start.getDate()+1);
 const due=dayAt(end.getFullYear(),end.getMonth()+(card.dueDay<=card.billDay?1:0),card.dueDay);
 return {start:dateString(start),end:dateString(end),due:dateString(due)};
}
export function sum(rows,type){return rows.filter(r=>r.type===type).reduce((a,r)=>a+r.cents,0);}
// 日常收支将退款抵减消费一次，转账与还款不重复视为收入或消费。
export function totals(rows){const expense=sum(rows,'expense'),refund=sum(rows,'refund'),income=sum(rows,'income');return {expense:expense-refund,income,refund,balance:income-expense+refund};}
// 识别每笔账户流水的资金方向；旧转账没有方向时留待用户补充。
export function flowOf(row){if(row.direction==='in'||row.direction==='out')return row.direction;if(row.type==='income'||row.type==='refund'||row.type==='repayment')return 'in';if(row.type==='expense')return 'out';return null;}
// 入出账按真实流水口径计算，包含转账和还款，区别于日常消费口径。
export function cashflow(rows){let incoming=0,outgoing=0,unclassified=0;for(const row of rows){const flow=flowOf(row);if(flow==='in')incoming+=row.cents;else if(flow==='out')outgoing+=row.cents;else unclassified++;}return {incoming,outgoing,net:incoming-outgoing,count:rows.length,unclassified};}
// 从常见银行通知中识别发卡行，缺失时要求用户手动核对。
export function detectBank(raw){const banks=[['中国工商银行','工商银行','工行','ICBC'],['中国建设银行','建设银行','建行','CCB'],['中国农业银行','农业银行','农行'],['中国银行','中行','BOC'],['招商银行','招行','CMB'],['交通银行','交行','BOCOM'],['中国邮政储蓄银行','邮储银行','邮政储蓄','PSBC'],['中信银行','中信'],['中国光大银行','光大银行'],['中国民生银行','民生银行'],['兴业银行'],['浦发银行','上海浦东发展银行'],['平安银行'],['广发银行'],['华夏银行'],['北京银行'],['上海银行'],['江苏银行'],['南京银行'],['杭州银行'],['宁波银行']];const header=String(raw).slice(0,220).toLowerCase();return banks.find(names=>names.some(n=>header.includes(n.toLowerCase())))?.[0]||'';}
export function statement(rows,card,period){
 const entries=rows.filter(r=>r.cardId===card.id&&r.date>=period.start&&r.date<=period.end);
 const spent=Math.max(0,totals(entries).expense);
 const paid=rows.filter(r=>r.cardId===card.id&&r.type==='repayment'&&r.statementEnd===period.end).reduce((a,r)=>a+r.cents,0);
 return {entries,spent,paid,outstanding:Math.max(0,spent-paid)};
}
export function duplicate(rows,item){return rows.find(r=>r.id!==item.id&&r.date===item.date&&r.cents===item.cents&&r.type===item.type&&r.cardId===item.cardId&&r.title.trim()===item.title.trim());}
export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&dateString(new Date(value+'T12:00:00'))===value;}
export function inferCategory(text){for(const [c,re] of [['餐饮',/餐|饭|咖啡|奶茶|美团|饿了么|瑞幸/],['购物',/京东|淘宝|拼多多|商场|超市|购物/],['交通',/地铁|公交|滴滴|加油|停车|铁路/],['生活缴费',/电费|水费|燃气|话费|宽带/],['住房',/房租|物业/],['娱乐',/电影|游戏|视频|会员/],['医疗',/医院|药房|诊所/],['工资',/工资|薪资|薪酬/]])if(re.test(text))return c;return '其他';}
export function parseReceipt(raw,cards,now=new Date()){
 const text=raw.replace(/([\u4e00-\u9fff])[ \t]+(?=[\u4e00-\u9fff])/g,'$1').replace(/，/g,',').replace(/：/g,':');const lines=text.split(/\n|[,;；](?=[^\d\s])/).map(x=>x.trim()).filter(Boolean);
 const candidates=[];
 for(const line of lines){if(/余额|额度|可用|尾号|账号|卡号|积分/.test(line)&&!/交易金额|消费|支出|收入|入账|退款|还款/.test(line))continue;
 for(const match of line.matchAll(/(?:人民币|金额|消费|支出|收入|入账|退款|还款|CNY|RMB|[¥￥])\s*[:为]?\s*([+-]?\s*\d[\d,]*(?:\.\d{1,2})?)/gi)){const n=Number(match[1].replace(/[\s,]/g,''));if(Number.isFinite(n)&&n!==0)candidates.push(Math.round(Math.abs(n)*100));}
 if(!candidates.length){const match=line.match(/([+-]?\d[\d,]*\.\d{2})\s*元/);if(match)candidates.push(Math.round(Math.abs(Number(match[1].replace(/,/g,'')))*100));}}
 const dt=text.match(/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})/);const md=text.match(/(?:于|日期|时间)\s*(\d{1,2})[月/.-](\d{1,2})/);
 const date=dt?`${dt[1]}-${dt[2].padStart(2,'0')}-${dt[3].padStart(2,'0')}`:md?`${now.getFullYear()}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`:'';
 let type=/退款|退货/.test(text)?'refund':/信用卡还款|还款成功|还款金额/.test(text)?'repayment':/转账|转出|转入/.test(text)?'transfer':/收入|工资|入账|存入|到账/.test(text)&&!/消费|支出|支取/.test(text)?'income':'expense';
 // 同尾号可能属于不同银行；只有银行和卡尾号共同确定时才自动归卡。
 const tail=text.match(/(?:尾号|末四位|末4位)\D{0,8}(\d{4})/),bankName=detectBank(text);
 const matching=tail?cards.filter(c=>c.tail===tail[1]&&(!bankName||c.name===bankName||detectBank(c.name)===bankName)):[];
 const card=matching.length===1?matching[0]:null;
 const merchant=text.match(/(?:商户名称|交易商户|商户|交易摘要|交易说明|用途|摘要|收款方)\s*[:：]\s*([^\n]{1,60})/);
 const title=merchant?merchant[1].trim():'';
 const direction=type==='transfer'?(/转入|入账|收款/.test(text)&&!/转出|付款/.test(text)?'in':/转出|付款/.test(text)&&!/转入|入账|收款/.test(text)?'out':''):type==='income'||type==='refund'||type==='repayment'?'in':'out';
 const nonCny=/美元|美金|USD|港币|HKD|欧元|EUR/i.test(text);
 return {date:validDate(date)?date:'',cents:candidates[0]||0,type,direction,title,category:inferCategory(title||text),cardId:card?.id||'',bankName,recognizedTail:tail?.[1]||'',kindHint:/信用卡|贷记卡/.test(text)?'credit':/储蓄卡|借记卡/.test(text)?'debit':'',nonCny,raw,warnings:[...(!date?['未识别到完整日期，请核对']:[]),...(!card?['请选择或新建对应银行卡']:[]),...(matching.length>1?['有多张卡尾号相同，请确认发卡银行']:[]),...(!direction?['无法确定转账方向，请手动选择入账或出账']:[]),...(nonCny?['识别到外币，不能直接作为人民币入账']:[]),...(!title?['请补充交易内容']:[]),...(candidates.length>1?['检测到多个金额，请对照原图核对']:[]),...(!candidates.length?['未识别到交易金额，请手动填写']:[])]};
}
export function validateBackup(data){
 if(data?.version!==1||!Array.isArray(data.cards)||!Array.isArray(data.rows)||data.cards.length>100||data.rows.length>10000)throw new Error('备份格式不正确或数量超出限制');
 const ids=new Set();for(const c of data.cards){if(typeof c.id!=='string'||ids.has(c.id)||typeof c.name!=='string'||c.name.length>50||!['debit','credit'].includes(c.kind)||!/^\d{4}$/.test(c.tail)||c.kind==='credit'&&(!Number.isInteger(c.billDay)||c.billDay<1||c.billDay>31||!Number.isInteger(c.dueDay)||c.dueDay<1||c.dueDay>31))throw new Error('银行卡数据不完整');ids.add(c.id);}
 const rowIds=new Set();for(const r of data.rows){if(typeof r.id!=='string'||rowIds.has(r.id)||!validDate(r.date)||!Number.isSafeInteger(r.cents)||r.cents<=0||r.cents>1e12||!types[r.type]||!ids.has(r.cardId)||typeof r.title!=='string'||r.title.length>100||!categories.includes(r.category)||r.direction&&!['in','out'].includes(r.direction)||r.type==='repayment'&&(!validDate(r.statementEnd)||data.cards.find(c=>c.id===r.cardId)?.kind!=='credit')||r.image&&(!/^data:image\/(jpeg|png|webp);base64,/.test(r.image)||r.image.length>3000000))throw new Error('账单数据不完整');rowIds.add(r.id);}
 return {version:1,cards:data.cards,rows:data.rows};
}
