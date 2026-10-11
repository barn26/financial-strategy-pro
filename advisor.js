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
 if(typeof S==="undefined"||!S||!G("advDyn"))return;
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
 G("advDyn").innerHTML=
  '<div class="grid grid4">'+
  '<div class="kpi"><div class="label">ЗАГАЛЬНИЙ БАЛАНС</div><div class="value" style="font-size:20px">'+money(bal)+"</div></div>"+
  '<div class="kpi"><div class="label">❄️ ЗАМОРОЖЕНО</div><div class="value cyan" style="font-size:20px">'+money(fr)+"</div></div>"+
  '<div class="kpi"><div class="label">ДОСТУПНО</div><div class="value green" style="font-size:20px">'+money(av)+"</div></div>"+
  '<div class="kpi"><div class="label">🛟 ПОДУШКА</div><div class="value '+ccls+'" style="font-size:20px">'+cm.toFixed(1)+' з 3 міс.</div><div class="progress" style="margin-top:8px"><div style="width:'+Math.min(100,cm/3*100)+'%"></div></div></div>'+
  "</div>"+
  '<div class="card" style="margin-top:14px"><h3>💬 Поради радника</h3>'+tips().map(function(x){return adv(x[0],x[1]);}).join("")+"</div>"+
  '<div class="card" style="margin-top:14px"><h3>🪜 План дій крок за кроком</h3>'+stepsHtml+"</div>"+
  '<div class="card" style="margin-top:14px"><div class="head"><h3 style="margin:0">❄️ Заморожені кошти</h3><button class="btn cyan smallBtn" onclick="advManual()">+ Заморозити</button></div>'+fHtml+"</div>";
 var ok=cm>=3&&!owe.length;
 var lk=G("advLock");
 if(lk){lk.textContent=ok?"🟢 Можна розглядати":"🔒 Спершу: подушка 3 міс. і борги";lk.className="badge "+(ok?"green":"yellow");}
 if(G("advPct"))G("advPct").placeholder="авто (20)";
 var h=G("homeAdvice");
 if(h){
  var c=h.closest(".card"),el=G("advHome");
  if(c&&!el){el=document.createElement("div");el.id="advHome";el.className="card";el.style.marginTop="14px";c.parentNode.insertBefore(el,c);}
  if(el)el.innerHTML='<div class="head"><h3 style="margin:0">🧭 Радник</h3><button class="btn smallBtn" onclick="go(\'advisor\')">Відкрити →</button></div>'+
   '<div class="statLine"><span>❄️ Заморожено</span><b class="cyan">'+money(fr)+'</b></div><div class="statLine"><span>Доступно</span><b class="green">'+money(av)+'</b></div>'+
   '<div style="margin-top:10px">'+(function(t){return adv(t[0],t[1]);})(tips()[0])+"</div>";
 }
}

/* ---------- побудова розділу ---------- */
function link(u){return '<a href="https://'+u+'" target="_blank" rel="noopener" style="color:var(--c);font-weight:bold">'+u+"</a>";}
function build(){
 if(G("advisor")||!G("aiAssistant"))return;
 var sec=document.createElement("section");sec.id="advisor";
 sec.innerHTML=
 '<div class="card aiCard sectionToggle" onclick="toggleSection(\'advisor\')"><div class="head" style="margin-bottom:0"><div class="aiTitle"><div class="aiIcon">🧭</div><div><h2 style="margin:0">ФІНАНСОВИЙ РАДНИК</h2><div class="aiStatus">● Накопичення та вкладення крок за кроком</div></div></div><span class="badge arrowBadge" id="advisor-arrow">▶</span></div></div>'+
 '<div id="advisor-body" class="sectionBody collapsed">'+
  '<div id="advDyn"></div>'+
  '<div class="card" style="margin-top:14px"><h3>⚙️ Налаштування радника</h3>'+
   '<div class="grid grid2"><div class="field" style="margin:0"><label>Відкладати з кожного доходу, % (порожньо = авто, 20%)</label><input id="advPct" type="number" min="1" max="90" step="1"></div>'+
   '<div style="align-self:end"><button class="btn green" onclick="advSavePct()">💾 Зберегти</button></div></div>'+
   '<div class="small muted" style="margin-top:10px">Радник працює локально: усі розрахунки робляться в застосунку, дані нікуди не передаються. Це орієнтири, а не індивідуальна фінансова чи інвестиційна консультація.</div></div>'+
  '<div class="card" id="advInvest" style="margin-top:14px"><div class="head"><h3 style="margin:0">📈 Куди вкласти: перевірені інструменти (Україна)</h3><span class="badge" id="advLock">—</span></div>'+
   '<div class="small muted" style="margin-bottom:12px">Лише після подушки ≥ 3 міс. і без боргів. Умови, ставки й податки змінюються — перед рішенням перевіряйте на офіційних сайтах.</div>'+
   '<details class="item"><summary class="itemTitle" style="cursor:pointer">🏦 Банківський депозит (простіше й ліквідніше)</summary><div class="small muted" style="line-height:1.7;margin-top:8px">'+
    '1. Переконайтесь, що банк має ліцензію: '+link("bank.gov.ua")+' (НБУ) і є учасником Фонду гарантування вкладів: '+link("fg.gov.ua")+'.<br>'+
    '2. Перевірте актуальну суму гарантії на '+link("fg.gov.ua")+': під час воєнного стану діє підвищений ліміт, після його завершення передбачено 600 тис. грн. Тримайте суму в межах гарантії або розділіть між банками.<br>'+
    '3. Порівняйте ставки у 2–3 банках: строк, виплата відсотків, чи можна поповнювати й знімати достроково.<br>'+
    '4. Уточніть в банку чи на '+link("tax.gov.ua")+' податок на відсотки.<br>'+
    '5. Відкрийте депозит у застосунку банку, збережіть договір, а тут позначте заморожену суму як «Вкладення».</div></details>'+
   '<details class="item"><summary class="itemTitle" style="cursor:pointer">🇺🇦 ОВДП / військові облігації через «Дію»</summary><div class="small muted" style="line-height:1.7;margin-top:8px">'+
    '1. У застосунку «Дія»: Послуги → «Військові облігації» (інформація: '+link("diia.gov.ua")+').<br>'+
    '2. Оберіть випуск: валюта, строк, ставка. Результати аукціонів і умови — на '+link("mof.gov.ua")+' (Мінфін).<br>'+
    '3. Оберіть банк чи брокера, підпишіть документи електронним підписом і оплатіть.<br>'+
    '4. За публікаціями 2026 року дохід фізосіб від таких ОВДП не оподатковується ПДФО та військовим збором, але поточний режим перевірте на '+link("mof.gov.ua")+' або '+link("tax.gov.ua")+'.<br>'+
    '5. Ставка зазвичай фіксована: тримайте до погашення; продаж раніше можливий лише на вторинному ринку за ринковою ціною.</div></details>'+
   '<details class="item"><summary class="itemTitle" style="cursor:pointer">⛔ Чого уникати</summary><div class="small muted" style="line-height:1.7;margin-top:8px">'+
    '• «Гарантований» високий дохід, піраміди, невідомі «трейдери» та платформи.<br>'+
    '• Вкладення подушки безпеки в ризикові активи (акції, крипта).<br>'+
    '• Кредити чи позики заради інвестування.<br>'+
    '• Компанії без ліцензії: перевіряйте в НБУ ('+link("bank.gov.ua")+') та НКЦПФР ('+link("nssmc.gov.ua")+').</div></details>'+
  '</div></div>';
 G("aiAssistant").parentNode.insertBefore(sec,G("aiAssistant"));
 var nav=document.querySelector("nav"),home=nav&&nav.querySelector('button[onclick="go(\'home\')"]');
 var b=document.createElement("button");b.textContent="🧭 Радник";b.setAttribute("onclick","go('advisor')");
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
window.refresh=function(){var r=_rf.apply(this,arguments);try{render();}catch(e){}return r;};
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
 if(G("advChat")||!G("advDyn"))return;
 var el=document.createElement("div");el.id="advChat";el.className="card aiCard";el.style.marginTop="14px";
 var qs=["З чого мені почати?","Скільки відкладати?","Чому саме так?","Як швидше накопичити?","Борги чи накопичення?","Коли буде подушка?","Куди вкласти гроші?"];
 el.innerHTML='<h3>💬 Запитайте радника</h3><div class="small muted" style="margin-bottom:10px">Радник міркує на основі ваших даних, пояснює кроки й радить. Усе рахується в застосунку.</div>'+
  '<div class="quick aiQuick">'+qs.map(function(q){return '<button onclick="advAsk(this.textContent)">'+q+"</button>";}).join("")+"</div>"+
  '<div id="advMsgs" class="aiMessages" style="height:340px"></div>'+
  '<div class="aiInputRow"><input id="advQ" placeholder="Наприклад: Чи можу я витратити 800 грн?" onkeydown="if(event.key===\'Enter\')advAsk()"><button class="btn cyan" onclick="advAsk()">Надіслати</button></div>';
 G("advDyn").insertAdjacentElement("afterend",el);
 chatAdd("ai",fmt("Привіт! Я ваш фінансовий радник. Можу пояснити, скільки й чому відкладати, з чого почати, чи можна зробити покупку та куди вкладати. Запитайте своїми словами або оберіть питання вище."));
}
window.advAsk=ask;

build();
try{chatBuild();}catch(e){}
try{bio();}catch(e){}
})();
