/* =========================================================
   🧭 ФІНАНСОВИЙ РАДНИК для Financial Strategy 2026 PRO
   Підключення: <script src="advisor.js"></script> перед </body>
   (або вставте весь цей код у <script>…</script> перед </body>)
========================================================= */
(function(){
var G=function(id){return document.getElementById(id);};
var P_CUSH="Подушка безпеки",P_INV="Вкладення (депозит/ОВДП)",P_OTH="Інше";

function fz(){if(!Array.isArray(S.freeze))S.freeze=[];return S.freeze;}
function frozen(){return fz().filter(function(f){return f.active;}).reduce(function(s,f){return s+f.amount;},0);}
function frozenBy(p){return fz().filter(function(f){return f.active&&f.purpose===p;}).reduce(function(s,f){return s+f.amount;},0);}
function addD(ds,n){var d=new Date(ds+"T00:00:00");d.setDate(d.getDate()+n);return fmtDate(d);}
function adv(l,t){return '<div class="item adv '+l+'">'+({r:"🔴",y:"🟡",b:"🔵",g:"🟢"}[l])+' '+esc(t)+'</div>';}

/* середні витрати за останні 90 днів */
function avgDaily(){
 var t=today(),from=addD(t,-90);
 var ex=S.transactions.filter(function(x){return x.type==="expense"&&x.date<=t&&x.date>=from&&x.category!=="Погашення боргу";});
 if(!ex.length)return{d:0,n:0};
 var first=ex.reduce(function(m,x){return x.date<m?x.date:m;},t);
 var span=Math.max(7,days(first,t));
 return{d:ex.reduce(function(s,x){return s+amt(x);},0)/span,n:days(first,t)};
}
function cushMonths(){var A=avgDaily();return A.d>0?frozenBy(P_CUSH)/(A.d*30):0;}
function oweList(){
 return S.debts.filter(function(d){return d.type==="i_owe"&&debtRemaining(d)>0;})
  .sort(function(a,b){return (a.deadline||"9999")<(b.deadline||"9999")?-1:1;});
}
function goalList(){
 return S.goals.filter(function(g){return g.active!==false&&goalRemaining(g)>0;})
  .sort(function(a,b){return (a.deadline||"9999")<(b.deadline||"9999")?-1:1;});
}

/* ---------- план розподілу доходу ---------- */
function plan(inc){
 var A=avgDaily(),bal=totalBalance(),free=bal-frozen();
 var t=today(),end=S.settings.periodEnd;
 var left=(end&&t<=end)?Math.max(1,days(t,end)):30;
 var pct=Number(S.settings.advPct)||20;
 var want=Math.round(inc*pct/100);
 var cm=cushMonths(),live=A.d*left;
 var owe=oweList(),debtAmt=0,debtName="";
 if(owe.length){
  debtName=owe[0].name;
  debtAmt=Math.min(debtRemaining(owe[0]),inc*0.1,Math.max(0,free-live));
  debtAmt=Math.floor(debtAmt/10)*10;
 }
 var freeze=want,capped=false;
 if(A.d>0){
  var cap=free-live-debtAmt;
  if(cap<freeze){freeze=Math.max(0,cap);capped=true;}
 }
 freeze=Math.floor(freeze/10)*10;
 var goals=goalList(),purpose;
 if(cm<3)purpose=P_CUSH;
 else if(goals.length)purpose="Ціль: "+goals[0].name;
 else purpose=P_INV;
 var after=free-freeze-debtAmt;
 return{A:A,pct:pct,want:want,freeze:freeze,capped:capped,debtAmt:debtAmt,debtName:debtName,purpose:purpose,after:after,left:left,cm:cm,live:live,low:A.n<7};
}

/* ---------- вікно «надійшов дохід» / ручне заморожування ---------- */
function modal(tx){
 var inc=tx?amt(tx):0,p=plan(inc),L=[];
 var opts=[P_CUSH].concat(goalList().map(function(g){return "Ціль: "+g.name;}),[P_INV,P_OTH]);
 if(tx){
  L.push(["g","Правило «спершу заплати собі»: відкладайте "+p.pct+"% від доходу одразу, поки гроші не розійшлись. Пропоную заморозити "+money(p.freeze)+" — призначення «"+p.purpose+"»."]);
  if(p.capped&&p.freeze>0)L.push(["y","Суму зменшено з "+money(p.want)+": до кінця періоду ("+p.left+" дн.) на життя потрібно ≈"+money(p.live)+" (ваші середні витрати "+money(p.A.d)+"/день)."]);
  if(p.capped&&p.freeze===0)L.push(["y","Зараз усі кошти потрібні на життя до кінця періоду, тож заморожування не рекомендую. Відкладіть частину з наступного доходу."]);
  if(p.debtAmt>0)L.push(["b","Борги: спрямуйте ≈"+money(p.debtAmt)+" на «"+p.debtName+"» — це зменшує навантаження швидше, ніж накопичення."]);
  if(p.A.d>0)L.push(["b","Подушка безпеки: "+p.cm.toFixed(1)+" міс. з 3 (ідеально 6). Ваші витрати ≈"+money(p.A.d*30)+"/міс."]);
  else L.push(["b","Даних про витрати ще мало — після 7+ днів записів радник точніше порахує суму та подушку."]);
  L.push([p.after>0?"g":"y","Після цього на життя лишається ≈"+money(Math.max(0,p.after))+" (≈"+money(Math.max(0,p.after)/p.left)+"/день)."]);
 }
 G("modal").style.display="flex";
 G("modalContent").innerHTML=
  "<h2>🧭 "+(tx?"Радник: надійшов дохід":"Заморозити кошти")+"</h2>"+
  (tx?'<div class="muted small" style="margin-bottom:10px">+'+money(inc)+" • "+esc(tx.category||"")+"</div>":"")+
  L.map(function(x){return adv(x[0],x[1]);}).join("")+
  '<div class="field" style="margin-top:12px"><label>Скільки заморозити</label><input id="advAmt" type="number" step="0.01" min="0" value="'+(tx&&p.freeze>0?p.freeze:"")+'"></div>'+
  '<div class="field"><label>Призначення</label><select id="advPurpose">'+opts.map(function(o){return '<option value="'+esc(o)+'"'+(o===p.purpose?" selected":"")+">"+esc(o)+"</option>";}).join("")+"</select></div>"+
  '<div class="small muted" style="margin-bottom:10px">Заморожені кошти не враховуються в «Можна витратити сьогодні». Щоб не було спокуси, переведіть їх на окремий рахунок чи депозит у банку.</div>'+
  '<div class="row"><button class="btn green" onclick="advDoFreeze()">❄️ Заморозити</button>'+
  (tx&&p.debtAmt>0?'<button class="btn yellow" onclick="closeModal();go(\'debts\')">💸 До боргів</button>':"")+
  '<button class="btn" onclick="closeModal()">Пізніше</button></div>';
}
function doFreeze(){
 var a=Number(G("advAmt").value),pu=G("advPurpose").value;
 if(!a||a<=0){alert("Введіть суму");return;}
 var free=totalBalance()-frozen();
 if(a>free+0.001&&!confirm("Сума більша за доступний залишок ("+money(Math.max(0,free))+"). Все одно заморозити?"))return;
 fz().push({id:uid(),date:today(),amount:Math.round(a*100)/100,purpose:pu,active:true});
 markDirty();closeModal();refresh();
}
function release(id){
 var f=fz().find(function(x){return x.id===id;});if(!f)return;
 var v=prompt("Скільки розморозити? (макс. "+f.amount+")",f.amount);
 if(v===null)return;
 v=Number(String(v).replace(",","."));
 if(!v||v<=0)return;
 if(v>=f.amount-0.001){f.active=false;f.released=today();}
 else f.amount=Math.round((f.amount-v)*100)/100;
 markDirty();refresh();
}
function savePct(){
 var v=Number(G("advPct").value);
 if(G("advPct").value===""||!v)delete S.settings.advPct;
 else if(v<1||v>90){alert("Вкажіть від 1 до 90 %");return;}
 else S.settings.advPct=v;
 markDirty();refresh();
}

/* ---------- поради радника ---------- */
function tips(){
 var out=[],a=analytics(),d=calculateSpend(),bal=totalBalance(),fr=frozen(),A=avgDaily(),cm=cushMonths();
 var ended=!!(S.settings.periodEnd&&today()>S.settings.periodEnd);
 if(A.n<7)out.push(["b","Записів про витрати ще мало (менше 7 днів). Вносьте всі витрати — тоді радник точно порахує, скільки можна заморожувати."]);
 if(fr>Math.max(0,bal)+0.01)out.push(["r","Заморожено ("+money(fr)+") більше, ніж є на рахунках ("+money(bal)+"). Розморозьте частину або перевірте, чи внесено всі доходи."]);
 if(a.income>0&&a.result<a.income*0.1)out.push(["y","Із доходу періоду лишається лише "+Math.max(0,(a.result/a.income*100)).toFixed(0)+"%. Мета — хоча б 10–20%: почніть із малого, але відкладайте одразу після надходження."]);
 if(!ended&&d.daysLeft>0&&d.daysLeft<=3&&d.carry>0)out.push(["g","До кінця періоду лишилось "+d.daysLeft+" дн., а невикористаний запас ліміту — "+money(d.carry)+". Заморозьте частину, поки вона не розійшлась."]);
 if(ended&&Math.max(0,bal-fr)>0)out.push(["y","Період завершився. Підсумуйте його й заморозьте частину залишку перед стартом нового."]);
 if(A.d>0&&cm<1)out.push(["b","Перша мета — подушка на 1 місяць витрат (≈"+money(A.d*30)+"). Зараз покрито "+cm.toFixed(1)+" міс."]);
 if(!out.length)out.push(["g","Усе стабільно. Продовжуйте відкладати з кожного доходу за правилом «спершу заплати собі»."]);
 return out;
}

/* ---------- відображення ---------- */
function render(){
 if(typeof S==="undefined"||!S||!G("advKpi"))return;
 var bal=totalBalance(),fr=frozen(),av=Math.max(0,bal-fr),A=avgDaily(),cm=cushMonths(),owe=oweList(),goals=goalList();
 var ccls=cm>=3?"green":(cm>=1?"yellow":"red");
 var steps=[
  [A.n>=14,"Облік","Вносьте всі доходи й витрати хоча б 2 тижні — радник спирається на ваші середні витрати."],
  [cm>=1,"Подушка на 1 місяць","Перший буфер: "+(A.d>0?"≈"+money(A.d*30):"сума з'явиться після запису витрат")+"."],
  [!owe.length,"Борги","Залишок: "+money(owe.reduce(function(s,d){return s+debtRemaining(d);},0))+". Погашайте спершу найближчі за терміном."],
  [cm>=3,"Подушка на 3 місяці","Захист від втрати доходу (ідеально — 6 міс.)."],
  [goals.length===0&&S.goals.length>0,"Цілі",goals.length?"Активних цілей: "+goals.length+". Заморожуйте під ціль «Ціль: …».":"Створіть ціль із дедлайном у розділі «Цілі»."],
  [false,"Вкладення","Депозит чи ОВДП — лише коли пункти вище виконано (див. нижче)."]
 ];
 var first=-1;steps.forEach(function(s,i){if(first<0&&!s[0])first=i;});
 var stepsHtml=steps.map(function(s,i){
  var ic=s[0]?"✅":(i===first?"👉":(i>first&&first>=0&&i===5?"🔒":"⬜"));
  return '<div class="item"><div class="itemTitle">'+ic+" "+(i+1)+". "+s[1]+'</div><div class="small muted">'+esc(s[2])+"</div></div>";
 }).join("");
 var list=fz().filter(function(f){return f.active;});
 var fHtml=list.length?list.map(function(f){
  return '<div class="item"><div class="row" style="justify-content:space-between"><div><b>❄️ '+money(f.amount)+'</b> <span class="badge">'+esc(f.purpose)+'</span><div class="small muted">з '+fd(f.date)+'</div></div><button class="btn smallBtn" onclick="advRelease(\''+f.id+'\')">🔓 Розморозити</button></div></div>';
 }).join(""):'<div class="empty">Заморожених коштів немає</div>';
 G("advKpi").innerHTML=
  '<div class="grid grid4">'+
  '<div class="kpi"><div class="label">ЗАГАЛЬНИЙ БАЛАНС</div><div class="value" style="font-size:20px">'+money(bal)+"</div></div>"+
  '<div class="kpi"><div class="label">❄️ ЗАМОРОЖЕНО</div><div class="value cyan" style="font-size:20px">'+money(fr)+"</div></div>"+
  '<div class="kpi"><div class="label">ДОСТУПНО</div><div class="value green" style="font-size:20px">'+money(av)+"</div></div>"+
  '<div class="kpi"><div class="label">🛟 ПОДУШКА</div><div class="value '+ccls+'" style="font-size:20px">'+cm.toFixed(1)+' з 3 міс.</div><div class="progress" style="margin-top:8px"><div style="width:'+Math.min(100,cm/3*100)+'%"></div></div></div>'+
  "</div>";
 G("advTips").innerHTML=tips().map(function(x){return adv(x[0],x[1]);}).join("");
 G("advSteps").innerHTML=stepsHtml;
 G("advFrozen").innerHTML='<div class="head"><h3 style="margin:0">❄️ Заморожені кошти</h3><button class="btn cyan smallBtn" onclick="advManual()">+ Заморозити</button></div>'+fHtml;
 var ok=cm>=3&&!owe.length;
 var lk=G("advLock");
 if(lk){lk.textContent=ok?"🟢 Можна розглядати":"🔒 Спершу: подушка 3 міс. і борги";lk.className="badge "+(ok?"green":"yellow");}
 if(G("advPct"))G("advPct").placeholder="авто (20)";
 try{renderTransfer();}catch(e){}
}

/* ---------- побудова розділу ---------- */
function link(u){return '<a href="https://'+u+'" target="_blank" rel="noopener" style="color:var(--c);font-weight:bold">'+u+"</a>";}
var TITLE_PANEL="📊 Огляд періоду"; /* назва першого згорнутого блоку на «Головній» — змінюйте тут */
var P={};
function mk(html,id){var d=document.createElement("div");d.className="card";if(id)d.id=id;d.innerHTML=html;return d;}
function renderTransfer(){
 var box=G("advTransferBox");
 if(!box||typeof S==="undefined"||!S)return;
 var active=(S.accounts||[]).filter(function(a){return a.active!==false;});
 if(active.length<2){
  box.innerHTML='<div class="empty">Для переказу потрібно щонайменше два активні рахунки. Створіть ще один у розділі «Рахунки».</div>';
  return;
 }
 var from=G("advTransferFrom")&&G("advTransferFrom").value;
 var to=G("advTransferTo")&&G("advTransferTo").value;
 var options=active.map(function(a){return '<option value="'+esc(a.id)+'">'+esc(a.name)+' — '+money(accountBalance(a.id))+'</option>';}).join("");
 var todayVal=today();
 box.innerHTML=
  '<div class="small muted" style="margin-bottom:12px">Переказ змінює баланси двох рахунків, але не рахується доходом або витратою у фінансовій статистиці.</div>'+
  '<div class="grid grid2">'+
   '<div class="field"><label>З рахунку</label><select id="advTransferFrom">'+options+'</select></div>'+
   '<div class="field"><label>На рахунок</label><select id="advTransferTo">'+options+'</select></div></div>'+
  '<div class="field"><label>Сума переказу, ₴</label><input id="advTransferAmount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Наприклад, 1500"></div>'+
  '<div class="grid grid2"><div class="field"><label>Дата</label><input id="advTransferDate" type="date" value="'+todayVal+'"></div>'+
   '<div class="field"><label>Коментар (необов’язково)</label><input id="advTransferMemo" maxlength="180" placeholder="Наприклад, на заощадження"></div></div>'+
  '<div class="row"><button class="btn cyan" onclick="advDoTransfer()">↔️ Виконати переказ</button></div>'+
  '<div id="advTransferMessage" class="small muted" style="margin-top:8px"></div>'+
  '<h3 style="margin:16px 0 8px">Останні перекази</h3>'+
  '<div id="advTransferRecent"></div>';
 if(from&&active.some(function(a){return a.id===from;}))G("advTransferFrom").value=from;
 if(to&&active.some(function(a){return a.id===to;}))G("advTransferTo").value=to;
 if(active.length>1&&G("advTransferFrom").value===G("advTransferTo").value)G("advTransferTo").value=active.find(function(a){return a.id!==G("advTransferFrom").value;}).id;
 var list=(S.transactions||[]).filter(function(t){return t.type==="transfer";}).slice().sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""));}).slice(0,10);
 var recent=G("advTransferRecent");
 if(recent)recent.innerHTML=list.length?list.map(function(t){
  var fa=(S.accounts||[]).find(function(a){return a.id===t.fromAccountId;}),ta=(S.accounts||[]).find(function(a){return a.id===t.toAccountId;});
  return '<div class="item"><div class="itemTitle">↗ '+money(amt(t))+'</div><div class="small muted">'+esc(fa?fa.name:"Рахунок видалено")+' → '+esc(ta?ta.name:"Рахунок видалено")+' • '+esc(fd(t.date||today()))+'</div>'+(t.memo?'<div class="small">'+esc(t.memo)+'</div>':"")+'</div>';
 }).join(""):'<div class="empty">Переказів поки немає</div>';
}
function doTransfer(){
 if(typeof S==="undefined"||!S||!Array.isArray(S.accounts)||!Array.isArray(S.transactions)){alert("Не вдалося отримати дані рахунків. Оновіть застосунок і спробуйте ще раз.");return;}
 var fromId=G("advTransferFrom")&&G("advTransferFrom").value;
 var toId=G("advTransferTo")&&G("advTransferTo").value;
 var raw=G("advTransferAmount")&&G("advTransferAmount").value;
 var amount=Number(String(raw||"").replace(",","."));
 var date=G("advTransferDate")&&G("advTransferDate").value;
 var memo=(G("advTransferMemo")&&G("advTransferMemo").value||"").trim();
 var from=S.accounts.find(function(a){return a.id===fromId&&a.active!==false;});
 var to=S.accounts.find(function(a){return a.id===toId&&a.active!==false;});
 if(!from||!to){alert("Оберіть два активні рахунки.");return;}
 if(fromId===toId){alert("Рахунок списання та рахунок зарахування мають бути різними.");return;}
 if(!Number.isFinite(amount)||amount<=0){alert("Введіть суму переказу, більшу за нуль.");return;}
 amount=Math.round(amount*100)/100;
 if(!date){alert("Вкажіть дату переказу.");return;}
 var balance=accountBalance(fromId);
 if(amount>balance+0.001){alert("Недостатньо коштів на рахунку «"+from.name+"». Доступно: "+money(Math.max(0,balance))+".");return;}
 if(!confirm("Підтвердити переказ "+money(amount)+" з «"+from.name+"» на «"+to.name+"»?"))return;
 S.transactions.push({id:uid(),type:"transfer",amount:amount,amt:amount,date:date,fromAccountId:fromId,toAccountId:toId,category:"Переказ між рахунками",memo:memo,group:"transfer"});
 markDirty();
 if(G("advTransferAmount"))G("advTransferAmount").value="";
 if(G("advTransferMemo"))G("advTransferMemo").value="";
 try{refresh();}catch(e){try{render();renderTransfer();}catch(_){}}
 alert("Переказ успішно збережено. Баланси рахунків оновлено.");
}
window.advDoTransfer=doTransfer;

function build(){
 if(P.kpi)return;
 P.kpi=document.createElement("div");P.kpi.id="advKpi";
 P.tips=mk('<div id="advTips"></div>');
 P.chat=mk("","advChat");P.chat.classList.add("aiCard");
 P.steps=mk('<div id="advSteps"></div>');
 P.frozen=mk('<div id="advFrozen"></div>');
 P.settings=mk(
  '<div class="grid grid2"><div class="field" style="margin:0"><label>Відкладати з кожного доходу, % (порожньо = авто, 20%)</label><input id="advPct" type="number" min="1" max="90" step="1"></div>'+
  '<div style="align-self:end"><button class="btn green" onclick="advSavePct()">💾 Зберегти</button></div></div>'+
  '<div class="small muted" style="margin-top:10px">Радник працює локально: усі розрахунки робляться в застосунку, дані нікуди не передаються. Це орієнтири, а не індивідуальна фінансова чи інвестиційна консультація.</div>');
 P.transfer=mk('<div id="advTransferBox"></div>','advTransferCard');
 var dt='<div class="small muted" style="line-height:1.7;margin-top:8px">';
 P.invest=mk(
  '<div class="head"><span class="small muted">Статус розділу</span><span class="badge" id="advLock">—</span></div>'+
  '<div class="small muted" style="margin-bottom:12px">Лише після подушки ≥ 3 міс. і без боргів. Умови, ставки й податки змінюються: перед рішенням перевіряйте на офіційних сайтах. Нижче реальні канали та організації.</div>'+
  '<details class="item"><summary class="itemTitle" style="cursor:pointer">🏦 Банківський депозит (простіше й ліквідніше)</summary>'+dt+
   '1. Оберіть банк, що є учасником Фонду гарантування вкладів: перелік банків і поточна сума гарантії на '+link("fg.gov.ua")+'; ліцензії та реєстр банків на '+link("bank.gov.ua")+' (НБУ).<br>'+
   '2. Порівняйте ставки на офіційних сайтах і в застосунках банків: '+link("privatbank.ua")+', '+link("oschadbank.ua")+', '+link("monobank.ua")+', '+link("pumb.ua")+', '+link("raiffeisen.ua")+'. Для швидкого порівняння є агрегатор '+link("minfin.com.ua")+' (комерційний сайт, не офіційне джерело).<br>'+
   '3. Дивіться на строк, виплату відсотків, можливість поповнення та дострокового зняття.<br>'+
   '4. Тримайте суму в межах гарантії або розділіть між банками. Податок на відсотки уточніть на '+link("tax.gov.ua")+'.<br>'+
   '5. Відкрийте депозит у застосунку банку, збережіть договір, а тут позначте заморожену суму як «Вкладення».</div></details>'+
  '<details class="item"><summary class="itemTitle" style="cursor:pointer">🇺🇦 ОВДП / військові облігації</summary>'+dt+
   '1. Найпростіше через «Дію» ('+link("diia.gov.ua")+'): Послуги → «Військові облігації» → оберіть тип, банк чи брокера → підпишіть документи електронним підписом.<br>'+
   '2. Або напряму в застосунку банку: ПриватБанк (Приват24 → «Облігації», '+link("privatbank.ua")+'), Ощадбанк ('+link("oschadbank.ua")+'), monobank (розділ «Накопичення», '+link("monobank.ua")+'), Райффайзен ('+link("raiffeisen.ua")+'), ПУМБ ('+link("pumb.ua")+'), Укрексімбанк ('+link("eximb.com")+'), Укргазбанк ('+link("ukrgasbank.com")+'), ОТП Банк ('+link("otpbank.com.ua")+'). Перелік банків і опції змінюються, актуальне дивіться в застосунку.<br>'+
   '3. Умови випусків і результати аукціонів: '+link("mof.gov.ua")+' (Мінфін).<br>'+
   '4. За публікаціями 2026 року дохід фізосіб від ОВДП не оподатковується ПДФО та військовим збором; поточний режим перевірте на '+link("mof.gov.ua")+' або '+link("tax.gov.ua")+'.<br>'+
   '5. Ставка зазвичай фіксована: тримайте до погашення; продаж раніше можливий лише за ринковою ціною.</div></details>'+
  '<details class="item"><summary class="itemTitle" style="cursor:pointer">🧾 Де перевірити компанію чи платформу</summary>'+dt+
   '• Банки та фінансові установи: реєстри НБУ на '+link("bank.gov.ua")+'.<br>'+
   '• Брокери, інвестиційні фірми, торговці цінними паперами: ліцензії на '+link("nssmc.gov.ua")+' (НКЦПФР).<br>'+
   '• Гарантії за вкладами: '+link("fg.gov.ua")+'.<br>'+
   '• Немає в реєстрі — не вкладайте.</div></details>'+
  '<details class="item"><summary class="itemTitle" style="cursor:pointer">⛔ Чого уникати</summary>'+dt+
   '• «Гарантований» високий дохід, піраміди, невідомі «трейдери» та платформи.<br>'+
   '• Вкладення подушки безпеки в ризикові активи (акції, крипта).<br>'+
   '• Кредити чи позики заради інвестування.</div></details>'+
  '<div class="small muted" style="margin-top:10px">Це довідник, а не індивідуальна інвестиційна консультація.</div>',"advInvest");
 var nav=document.querySelector("nav"),home=nav&&nav.querySelector('button[onclick="go(\'home\')"]');
 var b=document.createElement("button");b.textContent="🧭 Радник";b.setAttribute("onclick","go('hAdv')");
 if(home)home.insertAdjacentElement("afterend",b);else if(nav)nav.appendChild(b);
}

/* ---------- підключення до застосунку ---------- */
var _tb=window.totalBalance,_cs=window.calculateSpend,_rf=window.refresh,_st=window.saveTransaction,_sq=window.saveQuick;
window.calculateSpend=function(){ /* заморожені кошти не входять у «Можна витратити сьогодні» */
 var f=frozen();
 if(!f)return _cs.apply(this,arguments);
 window.totalBalance=function(){return _tb()-f;};
 try{return _cs.apply(this,arguments);}finally{window.totalBalance=_tb;}
};
window.refresh=function(){var r=_rf.apply(this,arguments);try{render();}catch(e){}try{calRender();}catch(e){}return r;};
function onIncome(n){if(S.transactions.length>n){var t=S.transactions[S.transactions.length-1];if(t&&t.type==="income")setTimeout(function(){modal(t);},60);}}
window.saveTransaction=async function(type){var n=S.transactions.length;var r=await _st.apply(this,arguments);if(type==="income")onIncome(n);return r;};
window.saveQuick=function(type){var n=S.transactions.length;var r=_sq.apply(this,arguments);if(type==="income")onIncome(n);return r;};
window.advDoFreeze=doFreeze;window.advRelease=release;window.advSavePct=savePct;window.advManual=function(){modal(null);};

/* ---------- вхід за відбитком пальця (WebAuthn) ---------- */
function bio(){
 var KEY="fin26_bio_cred";
 if(!window.PublicKeyCredential||!navigator.credentials)return;
 var exists=Array.prototype.some.call(document.querySelectorAll("button,label,h2,h3,.small,.muted"),function(e){return /відбит/i.test(e.textContent);});
 if(exists)return; /* у цій версії застосунку вхід за відбитком уже є */
 function b2s(b){var a=new Uint8Array(b),s="";for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s);}
 function s2b(s){var t=atob(s),a=new Uint8Array(t.length);for(var i=0;i<t.length;i++)a[i]=t.charCodeAt(i);return a;}
 function rnd(n){return crypto.getRandomValues(new Uint8Array(n));}
 function has(){try{return !!localStorage.getItem(KEY);}catch(e){return false;}}
 function ui(){
  var lb=G("bioLoginBtn");if(lb)lb.style.display=has()?"":"none";
  var st=G("bioStatus");if(st)st.textContent=has()?"✅ Вхід за відбитком увімкнено на цьому пристрої.":"Вхід за відбитком вимкнено.";
 }
 async function enable(){
  try{
   var c=await navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:"Financial Strategy"},user:{id:rnd(16),name:"user",displayName:"Користувач"},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required"},timeout:60000}});
   localStorage.setItem(KEY,b2s(c.rawId));ui();
   alert("Готово! На екрані входу з'явилась кнопка «Увійти за відбитком».");
  }catch(e){alert("Не вдалося увімкнути відбиток. Перевірте, що на пристрої налаштовано відбиток пальця, а застосунок відкрито за https.");}
 }
 async function loginBio(silent){
  try{
   await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:"public-key",id:s2b(localStorage.getItem(KEY)),transports:["internal"]}],userVerification:"required",timeout:60000}});
   G("loginPassword").value=S.password;
   login();
   G("loginPassword").value="";
  }catch(e){if(silent!==true)alert("Відбиток не підтверджено. Введіть пароль або PIN.");}
 }
 function disable(){if(!confirm("Вимкнути вхід за відбитком?"))return;try{localStorage.removeItem(KEY);}catch(e){}ui();}
 var lbtn=document.querySelector("#login .loginBox button.btn.primary");
 if(lbtn)lbtn.insertAdjacentHTML("afterend",'<button id="bioLoginBtn" class="btn green" style="width:100%;margin-top:10px;display:none" onclick="advBioLogin()">🖐 Увійти за відбитком</button>');
 var ps=G("pinStatus");
 if(ps)ps.insertAdjacentHTML("afterend",'<div class="field"><div id="bioStatus" class="small muted" style="margin-bottom:8px"></div><div class="row"><button class="btn green" onclick="advBioEnable()">🖐 Увімкнути вхід за відбитком</button><button class="btn red" onclick="advBioDisable()">Вимкнути</button></div><div class="small muted" style="margin-top:6px">Діє лише на цьому пристрої. Як і PIN, захищає від випадкового перегляду, але не шифрує дані.</div></div>');
 window.advBioEnable=enable;window.advBioLogin=loginBio;window.advBioDisable=disable;
 ui();
 /* автоматично пропонувати відбиток під час запуску застосунку */
 if(has())setTimeout(function(){var l=G("login");if(l&&l.style.display!=="none")loginBio(true);},600);
}

/* ---------- розмовний радник: міркує, пояснює, радить ---------- */
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function fmt(t){return esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");}
function eta(rem,per){
 if(rem<=0)return"уже досягнуто";
 if(per<=0)return null;
 var m=Math.ceil(rem/per);
 return m<=1?"приблизно за місяць":"приблизно за "+m+" міс. (≈"+fd(addD(today(),m*30))+")";
}
function ctx(){
 var a=analytics(),A=avgDaily(),bal=totalBalance(),fr=frozen();
 var incs=S.transactions.filter(function(t){return t.type==="income";}).sort(function(x,y){return x.date<y.date?1:-1;});
 var owe=oweList();
 return{a:a,A:A,bal:bal,fr:fr,free:bal-fr,d:calculateSpend(),inc:incs.length?amt(incs[0]):a.income,owe:owe,
  oweSum:owe.reduce(function(s,x){return s+debtRemaining(x);},0),pct:Number(S.settings.advPct)||20,cm:cushMonths(),m:A.d*30,goals:goalList()};
}
function think(q){
 var c=ctx(),l=q.toLowerCase(),R=[],T="",p;
 var mm=l.match(/(\d[\d\s]*(?:[.,]\d+)?)/),n=mm?Number(mm[1].replace(/\s/g,"").replace(",",".")):0;
 var free=Math.max(0,c.free);

 if(n>0&&/чи можу|чи можна|витрат|купит|дозволит|вистачить/.test(l)){
  var lim=c.d.amount;
  R.push("Сума покупки: "+money(n)+".","Доступно без заморожених коштів: "+money(free)+".","Ліміт на сьогодні: "+money(lim)+".");
  if(c.m>0)R.push("Ваші типові витрати ≈"+money(c.m)+"/міс., тож покупка — "+Math.round(n/c.m*100)+"% місячного рівня.");
  if(n>free)T="Ні, зараз це не вийде: доступно лише **"+money(free)+"**"+(c.fr>0?" (ще "+money(c.fr)+" заморожено — їх краще не чіпати)":"")+". Не вистачає **"+money(n-free)+"**. Можна відкласти покупку до наступного доходу або додати її в «План».";
  else if(n<=lim)T=pick(["Так, спокійно.","Можна."])+" **"+money(n)+"** вкладаються у сьогоднішній ліміт, після покупки на сьогодні лишиться ≈"+money(lim-n)+".";
  else{var k=c.d.daily>0?(n-lim)/c.d.daily:0;T="Гроші є, але це вийде за денний ліміт: покупка «з'їсть» приблизно **"+k.toFixed(1)+" дн.** вашого бюджету, і решту днів доведеться витрачати скромніше.";}
  if(c.m>0&&n>c.m*0.3&&n<=free)T+="\n\nСума значна (понад 30% місячних витрат). Дайте собі 24 години: якщо річ і далі потрібна — купуйте.";
  return{r:R,t:T};
 }

 if(/подушк|коли буде|прогноз|скільки часу/.test(l)){
  if(c.m<=0)return{r:["Витрат за 7+ днів ще немає."],t:"Щоб порахувати подушку, мені потрібні ваші витрати хоча б за тиждень. Вносьте їх, і я назву точну суму (ціль — 3 місяці витрат) та строк."};
  var target=c.m*3,cur=frozenBy(P_CUSH),per=c.inc*c.pct/100,e=eta(target-cur,per);
  R.push("Місячні витрати ≈"+money(c.m)+" → ціль на 3 місяці: "+money(target)+".","Вже в подушці: "+money(cur)+".","Відкладання "+c.pct+"% від доходу "+money(c.inc)+" ≈ "+money(per)+"/міс. (якщо дохід раз на місяць).");
  T=cur>=target?"Подушка вже покриває 3 місяці витрат, чудово. Тепер можна рухатись до цілей і вкладень.":
   "Подушка покриває **"+c.cm.toFixed(1)+" міс.** з трьох. Лишилось накопичити **"+money(target-cur)+"**"+(e?", і за такого темпу це "+e+".":". Додайте дохід, і я порахую строк.")+"\n\nПришвидшити можна двома шляхами: підняти відсоток відкладання або скоротити «бажання».";
  return{r:R,t:T};
 }

 if(/скільки.*(відклад|заморож|накопич|кладу)|відкладат/.test(l)){
  p=plan(c.inc);
  var per2=Math.round(c.inc*c.pct/100);
  R.push("Базове правило: "+c.pct+"% від кожного доходу → з "+money(c.inc)+" це "+money(per2)+".");
  if(c.A.d>0)R.push("На життя до кінця періоду (≈"+p.left+" дн.) потрібно ≈"+money(p.live)+"; доступно "+money(free)+".");
  if(p.debtAmt>0)R.push("Є борг «"+p.debtName+"»: ≈"+money(p.debtAmt)+" краще спрямувати на нього.");
  T="Орієнтир — **"+money(per2)+"** із кожного доходу ("+c.pct+"%). "+(c.A.d>0?(p.capped?"Але зараз гроші потрібні на життя, тож реально безпечно заморозити **"+money(p.freeze)+"**.":"На життя до кінця періоду вистачає, тож можна спокійно заморожувати **"+money(p.freeze)+"**."):"Коли накопичиться кілька днів витрат, я точніше скажу, скільки можна відкласти без шкоди для щоденних потреб.")+"\n\nСуть правила: відкладайте одразу після надходження, поки гроші не розійшлись, а решту розподіляйте на життя.";
  return{r:R,t:T};
 }

 if(/чому|поясни|навіщо|обґрунт/.test(l)){
  return{r:["Пояснюю загальну логіку розрахунку."],t:"Ось як я міркую:\n\n1) **Спершу заплати собі.** Якщо відкладати «що залишиться», зазвичай не лишається нічого, тому "+c.pct+"% беру одразу.\n2) **Не відбираю в життя.** Суму зменшую, якщо до кінця періоду не вистачить на їжу, комуналку й транспорт (рахую за вашими середніми витратами).\n3) **Порядок пріоритетів:** подушка → борги → цілі → вкладення. Без подушки будь-яка несподівана витрата змусить брати борг або продавати вкладення у невдалий момент."};
 }

 if(/борг|кредит|позик/.test(l)){
  if(!c.owe.length)return{r:["Активних боргів «Я винен» немає."],t:"Боргів, які ви винні, у застосунку немає, і це добре. Тоді весь резерв можна спрямувати на подушку й цілі."};
  R.push("Залишок ваших боргів: "+money(c.oweSum)+".","Подушка зараз: "+c.cm.toFixed(1)+" міс.");
  return{r:R,t:"Мій підхід такий. Спершу невелика подушка на 1 місяць, щоб непередбачена витрата не змусила брати новий борг. Потім усі вільні кошти спрямовуйте на борги, починаючи з того, що має найближчий термін або вищий відсоток. Зараз першочерговий — **«"+c.owe[0].name+"»** (залишок "+money(debtRemaining(c.owe[0]))+")."};
 }

 if(/вклад|інвест|депозит|овдп|облігац|куди/.test(l)){
  if(c.cm<3||c.owe.length){
   R.push("Подушка: "+c.cm.toFixed(1)+" з 3 міс.","Боргів: "+money(c.oweSum)+".");
   return{r:R,t:"Поки що рано вкладати. "+(c.cm<3?"Подушка покриває "+c.cm.toFixed(1)+" з 3 місяців. ":"")+(c.owe.length?"Є борги ("+money(c.oweSum)+"). ":"")+"Вкладення мають бути грішми, без яких ви спокійно проживете, інакше доведеться знімати їх у невдалий момент.\n\nКоли умови виконаються, відкрийте блок «Куди вкласти» нижче: там покрокові інструкції й посилання на офіційні джерела."};
  }
  return{r:["Подушка ≥ 3 міс. і боргів немає."],t:"Умови виконано. Найпростіші перевірені варіанти: банківський депозит у банку-учаснику Фонду гарантування вкладів та ОВДП через «Дію». Не вкладайте все в один інструмент: розділіть між ліквідним депозитом і ОВДП. Покрокові інструкції у блоці «Куди вкласти» нижче; умови й податки перевіряйте на офіційних сайтах. Це орієнтир, а не індивідуальна інвестиційна консультація."};
 }

 if(/швидше|заощад|скороти|економ|зекономит/.test(l)){
  var wants=c.a.list.filter(function(x){return needsList().indexOf(x[0])<0;}).slice(0,3);
  if(!wants.length)return{r:["Необов'язкових витрат у періоді майже немає."],t:"Економити зараз майже нема на чому: «бажань» у витратах немає. Швидше накопичувати допоможе перегляд тарифів у потребах (комуналка, інтернет, транспорт) або додатковий дохід."};
  var sv=wants.reduce(function(s,x){return s+x[1]*0.2;},0);
  wants.forEach(function(x){R.push("«"+x[0]+"»: "+money(x[1])+" за період.");});
  return{r:R,t:"Найпростіше підрізати те, без чого можна обійтись. Найбільші «бажання» зараз:\n"+wants.map(function(x){return "• "+x[0]+" — "+money(x[1]);}).join("\n")+"\n\nЯкщо скоротити кожну на 20%, це дасть ≈**"+money(sv)+"** за період. Заморожуйте цю суму одразу, інакше вона розійдеться на інше."};
 }

 if(/почат|що робити|з чого|порад|стратег|план/.test(l)){
  var s;
  if(c.A.n<14){R.push("Записів про витрати лише за "+c.A.n+" дн.");s="Починати треба з обліку. Вносьте всі доходи й витрати хоча б 2 тижні: на цих цифрах я рахую, скільки вам реально можна відкладати. Паралельно можете вже заморожувати хоча б 5-10% кожного доходу, щоб виробити звичку.";}
  else if(c.cm<1){R.push("Подушка: "+c.cm.toFixed(1)+" міс.");s="Перша мета: подушка на 1 місяць витрат (≈"+money(c.m)+"). Відкладайте "+c.pct+"% з кожного доходу й заморожуйте під «Подушка безпеки». Поки подушки немає, будь-яка несподіванка б'є по бюджету.";}
  else if(c.owe.length){R.push("Борги: "+money(c.oweSum)+".");s="Подушка на місяць уже є, тож час закривати борги. Спрямовуйте вільні кошти на «"+c.owe[0].name+"», а відкладання на подушку тимчасово зменште до мінімуму.";}
  else if(c.cm<3){R.push("Подушка: "+c.cm.toFixed(1)+" з 3 міс.");s="Лишилось добудувати подушку до 3 місяців витрат (≈"+money(c.m*3)+"). Тримайте темп "+c.pct+"% від доходу, і ця мета наближатиметься щомісяця.";}
  else if(c.goals.length){R.push("Активних цілей: "+c.goals.length+".");s="Фундамент збудовано. Тепер заморожуйте під ціль «"+c.goals[0].name+"»: це найближча за терміном.";}
  else{R.push("Подушка й борги в порядку, цілей немає.");s="Фундамент готовий. Поставте конкретну ціль із дедлайном у розділі «Цілі» або розгляньте вкладення (блок «Куди вкласти» нижче).";}
  return{r:R,t:s+"\n\nМоя стратегія: подушка → борги → цілі → вкладення. Спитайте «Чому саме так?», і я поясню логіку."};
 }

 return{r:[],t:"Я можу пояснити, скільки й чому відкладати, з чого почати, чи можна зробити покупку, як швидше накопичити, що робити з боргами та куди вкладати. Зараз: баланс "+money(c.bal)+", заморожено "+money(c.fr)+", подушка "+c.cm.toFixed(1)+" з 3 міс.\n\nСпробуйте, наприклад: «Чи можу я витратити 800 грн?»"};
}
function chatAdd(who,html){
 var b=G("advMsgs");if(!b)return;
 var d=document.createElement("div");d.className="aiMsg "+who;
 d.innerHTML='<div class="who">'+(who==="ai"?"🧭 РАДНИК":"👤 ВИ")+"</div>"+html;
 b.appendChild(d);b.scrollTop=b.scrollHeight;
}
function ask(q){
 var inp=G("advQ");q=String(q||(inp?inp.value:"")).trim();
 if(!q)return;
 if(inp)inp.value="";
 chatAdd("user",fmt(q));
 chatAdd("ai",'<span id="advTyping">💭 Думаю…</span>');
 setTimeout(function(){
  var t=G("advTyping"),box=t&&t.parentNode;if(box)box.remove();
  var o;try{o=think(q);}catch(e){o={r:[],t:"Не вдалося порахувати. Спробуйте переформулювати запитання."};}
  chatAdd("ai",(o.r.length?'<details style="margin-bottom:8px"><summary class="small muted" style="cursor:pointer">💭 Як я міркую</summary><div class="small muted" style="margin-top:6px">'+o.r.map(function(x){return "• "+fmt(x);}).join("<br>")+"</div></details>":"")+fmt(o.t));
 },700);
}
function chatBuild(){
 var el=G("advChat");if(!el||G("advMsgs"))return;
 var qs=["З чого мені почати?","Скільки відкладати?","Чому саме так?","Як швидше накопичити?","Борги чи накопичення?","Коли буде подушка?","Куди вкласти гроші?"];
 el.innerHTML='<div class="small muted" style="margin-bottom:10px">Радник міркує на основі ваших даних, пояснює кроки й радить. Усе рахується в застосунку.</div>'+
  '<div class="quick aiQuick">'+qs.map(function(q){return '<button onclick="advAsk(this.textContent)">'+q+"</button>";}).join("")+"</div>"+
  '<div id="advMsgs" class="aiMessages" style="height:340px"></div>'+
  '<div class="aiInputRow"><input id="advQ" placeholder="Наприклад: Чи можу я витратити 800 грн?" onkeydown="if(event.key===\'Enter\')advAsk()"><button class="btn cyan" onclick="advAsk()">Надіслати</button></div>';
 chatAdd("ai",fmt("Привіт! Я ваш фінансовий радник. Можу пояснити, скільки й чому відкладати, з чого почати, чи можна зробити покупку та куди вкладати. Запитайте своїми словами або оберіть питання вище."));
}
window.advAsk=ask;

/* ---------- «Головна»: ліміт завжди видно, решта згортається ---------- */
function grp(id,title,sub,nodes){
 var w=document.createElement("div");w.id=id;w.style.marginTop="14px";
 w.innerHTML='<div class="card sectionToggle" onclick="toggleSection(\''+id+'\')"><div class="head" style="margin-bottom:0"><div><h2 style="margin:0">'+title+'</h2><div class="muted small">'+sub+'</div></div><span class="badge arrowBadge" id="'+id+'-arrow">▶</span></div></div><div id="'+id+'-body" class="sectionBody collapsed"></div>';
 var body=w.querySelector(".sectionBody");
 nodes.forEach(function(n){if(n){n.style.marginTop="0";body.appendChild(n);}});
 return w;
}
function homeLayout(){
 var home=G("home");if(!home||G("hFin"))return;
 var kpi=home.querySelector(":scope > .grid.grid4"),widget=home.querySelector(".dailyWidget");
 var quick=widget&&widget.querySelector(".quick"),dg=widget&&widget.querySelector(".dailyGrid");
 var pr=G("periodProgress"),prw=pr&&pr.parentNode&&pr.parentNode.parentNode;
 var advC=G("homeAdvice")&&G("homeAdvice").closest(".card");
 var st=home.querySelector(":scope > .grid.grid2");
 if(!kpi||!widget||!advC||!st||!quick||!dg||!prw)return;
 var rec=G("recommendations"),recCard=rec&&rec.closest(".card");
 if(recCard){var h2=recCard.querySelector("h2");if(h2)h2.style.display="none";if(recCard.parentNode)recCard.parentNode.style.gridTemplateColumns="1fr";}
 var g1=grp("hFin",TITLE_PANEL,"Баланс, доходи, витрати, ліміт і прогрес періоду",[kpi,quick,dg,prw]);
 var g2=grp("hAdv","🧭 Радник і поради","Підказки, план дій, чат і налаштування радника",[]);
 var g3=grp("hState","🧠 Фінансовий стан та 50/30/20","Фінансовий бал і розподіл бюджету",[st]);
 [quick,dg,prw].forEach(function(n){n.style.marginTop="14px";});
 widget.style.marginTop="0";
 var body=g2.querySelector(".sectionBody");
 var ab=advC.querySelector("button");if(ab)ab.setAttribute("onclick","advOpenTips()");
 body.appendChild(P.kpi);
 advC.style.marginTop="14px";body.appendChild(advC);
 var plan=document.createElement("div");plan.appendChild(P.steps);P.frozen.style.marginTop="14px";plan.appendChild(P.frozen);
 [
  grp("advGTips","💬 Поради радника","Повний список порад радника",[P.tips]),
  grp("advGChat","💬 Запитайте радника","Радник міркує, пояснює й радить",[P.chat]),
  grp("advGPlan","🪜 План дій крок за кроком","Етапи та заморожені кошти",[plan]),
  grp("advGInv","📈 Куди вкласти: перевірені інструменти (Україна)","Депозит, ОВДП та офіційні джерела",[P.invest]),
  recCard?grp("advGRec","💡 Поради та рекомендації","Поради за вашою ситуацією",[recCard]):null,
  grp("advGSet","⚙️ Налаштування радника","Відсоток відкладання",[P.settings]),
  grp("advGTransfer","↔️ Переказ між рахунками","Переміщення коштів без зміни доходів і витрат",[P.transfer])
 ].forEach(function(g){if(g)body.appendChild(g);});
 home.appendChild(g1);home.appendChild(g2);home.appendChild(g3);
 home.insertBefore(widget,home.firstChild);
}
window.advOpenTips=function(){
 var g=G("advGTips");
 if(G("hAdv-body")&&G("hAdv-body").classList.contains("collapsed"))toggleSection("hAdv");
 if(G("advGTips-body")&&G("advGTips-body").classList.contains("collapsed"))toggleSection("advGTips");
 if(g)g.scrollIntoView({behavior:"smooth"});
};
function renameAI(){
 var ai=G("aiAssistant"),h=ai&&ai.querySelector("h2");
 if(h&&/ФІНАНСОВИЙ ШІ-ПОМІЧНИК/i.test(h.textContent))h.textContent="ШІ-ПОМІЧНИК";
}

/* ---------- календар доходів і витрат ---------- */
var MON=["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
var calY=0,calM=0,calSel="";
function pad2(n){return String(n).padStart(2,"0");}
function shortMoney(n){
 if(S.settings.hideAmounts)return"••";
 n=Math.round(n);
 if(n>=10000)return Math.round(n/1000)+"к";
 if(n>=1000)return(n/1000).toFixed(1).replace(".",",")+"к";
 return String(n);
}
function calBuild(){
 if(G("calendar")||!G("history"))return;
 var st=document.createElement("style");
 st.textContent=".calGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.calDow{text-align:center;font-size:11px;color:var(--muted);padding:4px 0}.calDay{min-height:56px;border:1px solid var(--line);border-radius:9px;padding:3px 4px;font-size:10px;line-height:1.35;cursor:pointer;background:rgba(7,17,31,.3);overflow:hidden}.calDay.off{border:0;background:none;cursor:default}.calDay.today{border-color:var(--c)}.calDay.over{border-color:var(--r)}.calDay.sel{box-shadow:0 0 0 2px var(--b)}.calN{font-weight:800;font-size:11px;color:var(--muted)}.calI{color:var(--g);font-weight:700}.calE{color:var(--r);font-weight:700}";
 document.head.appendChild(st);
 var t=today();calY=+t.slice(0,4);calM=+t.slice(5,7)-1;calSel=t;
 var sec=document.createElement("section");sec.id="calendar";
 sec.innerHTML='<div class="card sectionToggle" onclick="toggleSection(\'calendar\')"><div class="head" style="margin-bottom:0"><div><h2 style="margin:0">📅 Календар</h2><div class="muted small">Доходи й витрати по днях</div></div><span class="badge arrowBadge" id="calendar-arrow">▶</span></div></div>'+
  '<div id="calendar-body" class="sectionBody collapsed"><div class="card"><div id="calBox"></div></div></div>';
 G("history").insertAdjacentElement("afterend",sec);
 var nav=document.querySelector("nav"),hb=nav&&nav.querySelector('button[onclick="go(\'history\')"]');
 var b=document.createElement("button");b.textContent="📅 Календар";b.setAttribute("onclick","go('calendar')");
 if(hb)hb.insertAdjacentElement("afterend",b);else if(nav)nav.appendChild(b);
}
function calRender(){
 var el=G("calBox");
 if(!el||typeof S==="undefined"||!S)return;
 var key=calY+"-"+pad2(calM+1);
 var dim=new Date(calY,calM+1,0).getDate(),off=(new Date(calY,calM,1).getDay()+6)%7;
 var agg={},ti=0,te=0,maxE=0;
 S.transactions.forEach(function(t){
  if((t.type!=="income"&&t.type!=="expense")||String(t.date).slice(0,7)!==key)return;
  var o=agg[t.date]||(agg[t.date]={i:0,e:0});
  if(t.type==="income"){o.i+=amt(t);ti+=amt(t);}else{o.e+=amt(t);te+=amt(t);}
 });
 Object.keys(agg).forEach(function(k){if(agg[k].e>maxE)maxE=agg[k].e;});
 var lim=0;try{lim=calculateSpend().daily;}catch(e){}
 var tdy=today(),h="";
 ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"].forEach(function(d){h+='<div class="calDow">'+d+"</div>";});
 for(var i=0;i<off;i++)h+='<div class="calDay off"></div>';
 for(var d=1;d<=dim;d++){
  var ds=key+"-"+pad2(d),o=agg[ds],cls="calDay",bg="";
  if(ds===tdy)cls+=" today";
  if(ds===calSel)cls+=" sel";
  if(o&&o.e>0){
   bg="background:rgba(255,100,124,"+(0.08+0.32*o.e/maxE).toFixed(2)+");";
   if(lim>0&&o.e>lim)cls+=" over";
  }else if(o&&o.i>0)bg="background:rgba(54,224,154,.14);";
  h+='<div class="'+cls+'" style="'+bg+'" onclick="advCalSel(\''+ds+'\')"><div class="calN">'+d+"</div>"+
   (o&&o.i?'<div class="calI">+'+shortMoney(o.i)+"</div>":"")+(o&&o.e?'<div class="calE">−'+shortMoney(o.e)+"</div>":"")+"</div>";
 }
 var det="";
 if(calSel&&calSel.slice(0,7)===key){
  var ops=S.transactions.filter(function(t){return t.date===calSel&&(t.type==="income"||t.type==="expense");});
  det='<h3 style="margin:16px 0 10px">📋 '+fd(calSel)+"</h3>"+(ops.length?ops.map(function(t){
   var inc=t.type==="income",ac=account(t.accountId);
   return '<div class="item"><div class="row" style="justify-content:space-between"><div><div class="itemTitle">'+(inc?"➕":"➖")+" "+esc(t.category||"Інше")+'</div><div class="small muted">'+esc(ac?ac.name:"")+(t.memo?" • "+esc(t.memo):"")+'</div></div><div style="text-align:right"><b class="'+(inc?"green":"red")+'">'+(inc?"+":"−")+money(amt(t))+'</b><div style="margin-top:6px"><button class="btn smallBtn" onclick="editTx(\''+t.id+'\')">✏️</button></div></div></div></div>';
  }).join(""):'<div class="empty">У цей день операцій немає</div>');
 }else det='<div class="small muted" style="margin-top:12px">Торкніться дня, щоб побачити операції.</div>';
 var kp=function(l,v,c){return '<div class="kpi" style="padding:10px"><div class="label" style="margin-bottom:4px">'+l+'</div><div class="value '+c+'" style="font-size:15px">'+money(v)+"</div></div>";};
 el.innerHTML=
  '<div class="head"><button class="btn smallBtn" onclick="advCalMove(-1)">◀</button><h3 style="margin:0">'+MON[calM]+" "+calY+'</h3><button class="btn smallBtn" onclick="advCalMove(1)">▶</button></div>'+
  '<div class="row" style="justify-content:center;margin-bottom:12px"><button class="btn cyan smallBtn" onclick="advCalMove(0)">Сьогодні</button></div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">'+kp("ДОХОДИ",ti,"green")+kp("ВИТРАТИ",te,"red")+kp("РЕЗУЛЬТАТ",ti-te,ti-te>=0?"green":"red")+"</div>"+
  '<div class="calGrid">'+h+"</div>"+
  '<div class="small muted" style="margin-top:10px">🟢 дохід • 🔴 витрата (темніше = більша сума) • червона рамка — понад поточний денний ліміт • блакитна — сьогодні</div>'+det;
}
window.advCalSel=function(ds){calSel=ds;calRender();};
window.advCalMove=function(n){
 if(n===0){var t=today();calY=+t.slice(0,4);calM=+t.slice(5,7)-1;calSel=t;}
 else{calM+=n;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}calSel="";}
 calRender();
};

build();
try{homeLayout();}catch(e){}try{renameAI();}catch(e){}
try{calBuild();}catch(e){}
try{chatBuild();}catch(e){}
try{bio();}catch(e){}
/* ---------- закріплені шапки розділів: багаторівнева навігація ---------- */
(function stickySectionHeaders(){
  var STYLE_ID='fin26-sticky-section-style';
  if(document.getElementById(STYLE_ID)) return;
  var style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=
    'nav.fin26StickyNav{position:sticky!important;top:0!important;z-index:1200!important;}'+
    '.sectionToggle.fin26StickyHeader{position:sticky;z-index:1100;isolation:isolate;'+
      'background:var(--panel, #0b1727);box-shadow:0 5px 12px rgba(0,0,0,.22);'+
      'touch-action:pan-y;cursor:pointer;transition:box-shadow .18s ease,opacity .18s ease;}'+
    '.sectionToggle.fin26StickyHeader:after{content:"";position:absolute;left:8px;right:8px;bottom:-3px;height:5px;'+
      'border-radius:8px;background:linear-gradient(90deg,transparent,var(--c, #36d9ff),transparent);opacity:.22;pointer-events:none;}'+
    '.sectionToggle.fin26StickyHeader.fin26Unpinned{position:relative!important;top:auto!important;z-index:auto!important;box-shadow:none;}'+
    '.sectionToggle.fin26StickyHeader.fin26LongPressing{box-shadow:0 0 0 2px var(--c, #36d9ff),0 0 18px rgba(54,217,255,.28);}'+
    '.sectionBody:not(.collapsed){overflow:visible!important;}'+
    '.sectionBody:not(.collapsed)>.card{overflow:visible;}';
  document.head.appendChild(style);

  var nav=document.querySelector('nav');
  if(nav) nav.classList.add('fin26StickyNav');
  var pressTimer=null,pressTarget=null,longFired=false,startX=0,startY=0;
  var PRESS_MS=620;

  function getDepth(el){
    var depth=0,p=el.parentElement;
    while(p){if(p.classList&&p.classList.contains('sectionBody'))depth++;p=p.parentElement;}
    return depth;
  }
  function update(){
    var n=document.querySelector('nav');
    var navH=n?Math.ceil(n.getBoundingClientRect().height):0;
    document.querySelectorAll('.sectionToggle').forEach(function(el){
      if(!el.querySelector('.arrowBadge')) return;
      el.classList.add('fin26StickyHeader');
      var depth=getDepth(el);
      /* Кожен наступний рівень трохи накладається на попередній, економлячи висоту. */
      var top=navH+depth*46;
      el.style.top=top+'px';
      el.style.zIndex=String(1100+depth);
      if(!el.hasAttribute('data-fin26-pinned'))el.setAttribute('data-fin26-pinned','1');
      el.classList.toggle('fin26Unpinned',el.getAttribute('data-fin26-pinned')==='0');
    });
  }
  function cancelPress(){
    if(pressTimer)clearTimeout(pressTimer);
    pressTimer=null;
    if(pressTarget)pressTarget.classList.remove('fin26LongPressing');
    pressTarget=null;
  }
  function togglePin(el){
    var pin=el.getAttribute('data-fin26-pinned')!=='0';
    el.setAttribute('data-fin26-pinned',pin?'0':'1');
    el.classList.toggle('fin26Unpinned',pin);
    var h=el.querySelector('h2');
    var title=h?h.textContent.trim():'Розділ';
    el.setAttribute('aria-label',title+(pin?' — закріплення вимкнено':' — закріплено'));
    var note=el.querySelector('.fin26PinHint');
    if(!note){note=document.createElement('span');note.className='fin26PinHint';note.style.cssText='font-size:10px;opacity:.72;margin-left:6px;white-space:nowrap;';var head=el.querySelector('.head');if(head)head.appendChild(note);}
    if(note){note.textContent=pin?'↕ Вільно':'📌 Закріплено';setTimeout(function(){if(note&&note.parentNode)note.textContent='';},1400);}
  }
  document.addEventListener('pointerdown',function(e){
    var el=e.target.closest&&e.target.closest('.sectionToggle.fin26StickyHeader');
    if(!el||e.button!==undefined&&e.button!==0)return;
    cancelPress();pressTarget=el;longFired=false;startX=e.clientX||0;startY=e.clientY||0;
    pressTarget.classList.add('fin26LongPressing');
    pressTimer=setTimeout(function(){
      if(!pressTarget)return;
      longFired=true;togglePin(pressTarget);pressTarget.classList.remove('fin26LongPressing');
      /* Позначка прибирає звичайний клік, щоб довге натискання не згортало розділ. */
      pressTarget.setAttribute('data-fin26-suppress-click','1');
      setTimeout(function(){if(pressTarget)pressTarget.removeAttribute('data-fin26-suppress-click');},450);
    },PRESS_MS);
  },{passive:true});
  document.addEventListener('pointermove',function(e){
    if(!pressTarget)return;
    if(Math.abs((e.clientX||0)-startX)>12||Math.abs((e.clientY||0)-startY)>12)cancelPress();
  },{passive:true});
  ['pointerup','pointercancel','pointerleave'].forEach(function(type){document.addEventListener(type,cancelPress,{passive:true});});
  document.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('.sectionToggle.fin26StickyHeader');
    if(el&&el.getAttribute('data-fin26-suppress-click')==='1'){
      e.preventDefault();e.stopPropagation();el.removeAttribute('data-fin26-suppress-click');
    }
  },true);
  update();
  if(window.MutationObserver){
    var mo=new MutationObserver(function(){update();});
    mo.observe(document.body,{childList:true,subtree:true});
  }
  window.addEventListener('resize',update,{passive:true});
  window.addEventListener('orientationchange',function(){setTimeout(update,180);},{passive:true});
})();

})();
