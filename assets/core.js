
const IS_PREVIEW=document.documentElement.dataset.preview==="true";
const KEY=IS_PREVIEW?"pandaui-preview-v2":"kratom-denik-v1",TK=IS_PREVIEW?"pandaui-preview-theme-v2":"kratom-denik-theme";
let S=window.PANDA_PREVIEW||{strains:[{id:"s1",name:"Příklad: Red Bali",pct:1.5,note:""}],doses:[]};
try{const r=localStorage.getItem(KEY);if(r){const p=JSON.parse(r);if(p&&Array.isArray(p.strains)&&Array.isArray(p.doses))S=p}}catch(e){}
const TKG=[.4,.7,1.1,1.7,2.4,3.3,4.3,5.7,7.4,10],tolMg=L=>TKG[L-1]*S.set.kg,lv=m=>{const i=TKG.findIndex(t=>t*S.set.kg>=m);return i<0?10:i+1};
const DEF={tl:4,hl:24,qd:[2,3,4,6,8],dis:0,kg:70,lastBk:0,bkN:0,acc:"",tags:["Po jídle","Na lačno","Před spaním","Sport"],pin:"",pinOn:false,gapOn:false,gap:3,limOn:false,lim:20,tpOn:false,tpG:20,tpP:10,tpD:""};let norm=()=>{S.set=Object.assign({},DEF,S.set||{});S.purchases=Array.isArray(S.purchases)?S.purchases:[];S.set.qd=cleanPresets(S.set.qd);normalizeCoreSettings();if(S.set.tol){S.set.tl=lv(S.set.tol);delete S.set.tol}};norm();
const sl=s=>s.name+(s.sup?" · "+s.sup:"");
const idb=(m,v)=>new Promise(r=>{try{const q=indexedDB.open(IS_PREVIEW?"bp-preview-v2":"bp",1);q.onupgradeneeded=()=>q.result.createObjectStore("k");q.onsuccess=()=>{const t=q.result.transaction("k",m==="get"?"readonly":"readwrite"),o=t.objectStore("k"),x=m==="get"?o.get("S"):o.put(v,"S");x.onsuccess=()=>r(x.result);x.onerror=()=>r(null)};q.onerror=()=>r(null)}catch(e){r(null)}});
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}idb("put",JSON.stringify(S))};
const $=id=>document.getElementById(id);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fmt=n=>(Math.round(n*10)/10).toString().replace(".",",");
const mg=(g,p)=>g*1000*p/100;
const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);
function el(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
let editD=null,editS=null,range=7,metric="mg",tab="log",doseSaving=false;

/* tabs */
const IC={
 log:'<path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 sum:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
 str:'<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
 more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'};
const ALL=[["sum","Přehled"],["log","Historie"],["buy","Nákup"],["data","Statistiky"],["str","Druhy"],["plan","Plán"],["more","Nastavení"]];
IC.data='<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>';
IC.buy='<path d="M3 4h2l2 12h12l2-9H6M9 20h.01M18 20h.01"/>';
IC.plan='<path d="M4 17l5-5 4 4 7-8"/><path d="M15 8h5v5"/>';
function buildTabs(){const n=$("tabs");n.textContent="";
 ALL.filter(t=>t[0]!=="str"&&t[0]!=="log"&&(t[0]!=="plan"||S.set.tpOn)).forEach(([k,l])=>{const b=el("button");b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+IC[k]+'</svg>';b.appendChild(el("span",null,l));b.dataset.t=k;b.onclick=()=>go(k);if(k===tab)b.setAttribute("aria-current","page");n.appendChild(b)})}
function go(k){if(k==="plan"&&!S.set.tpOn)k="sum";tab=k;ALL.forEach(([t])=>{$("p-"+t).hidden=t!==k});
 [...$("tabs").children].forEach(b=>{if(b.dataset.t===(k==="str"?"more":k==="log"?"sum":k))b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
 window.scrollTo(0,0);if(k==="sum")chart();if(k==="buy")renderBuy();if(k==="more")setUI();if(k==="plan")planPage();if(k==="data"){dataPage();renderWidgets()}}

/* segmented controls */
function seg(id,opts,get,set){const w=$(id);w.textContent="";
 opts.forEach(([v,l])=>{const b=el("button",null,l);b.setAttribute("aria-pressed",String(get()===v));if(id==="segT"){b.classList.add("theme-choice");b.dataset.themeChoice=v}b.onclick=()=>{set(v);seg(id,opts,get,set)};w.appendChild(b)})}
function segs(){
 seg("segD",[[7,"7 dní"],[14,"14 dní"],[30,"Měsíc"],[365,"Rok"]],()=>dr,v=>{dr=v;dataPage()});
 seg("segR",[[7,"7 dní"],[14,"14 dní"],[30,"30 dní"]],()=>range,v=>{range=v;saveWidgetConfig("trend","home","range",v);chart()});
 seg("segM",[["mg","Mitragynin"],["g","Gramy"],["kc","Útrata"]],()=>metric,v=>{metric=v;saveWidgetConfig("trend","home","metric",v);chart()});
 seg("segT",[["auto","Podle systému"],["light","Světlý"],["dark","Tmavý"]],()=>{try{return localStorage.getItem(TK)||"dark"}catch(e){return"dark"}},v=>{applyTheme(v);try{localStorage.setItem(TK,v)}catch(e){}})}
function applyTheme(v){const r=document.documentElement;if(v==="auto")r.removeAttribute("data-theme");else r.setAttribute("data-theme",v)}
try{applyTheme(localStorage.getItem(TK)||"dark")}catch(e){}

/* sheets */
function open(id){document.body.classList.add("sheet-open");$("ov").hidden=false;$("shD").hidden=id!=="shD";$("shS").hidden=id!=="shS"}
function closeSh(){if(document.activeElement instanceof HTMLElement)document.activeElement.blur();document.body.classList.remove("sheet-open");$("ov").hidden=true;$("shD").hidden=true;$("shS").hidden=true}
document.querySelectorAll("[data-x]").forEach(b=>b.onclick=closeSh);
$("ov").onclick=e=>{if(e.target===$("ov"))closeSh()};
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSh();$("qm").hidden=true}});

/* doses */
function calcBase(){const s=S.strains.find(x=>x.id===$("st").value),g=parseFloat($("g").value),c=$("calc"),L=limit();
 c.style.color="";c.textContent=(s&&g>0)?"Odhad: "+fmt(mg(g,s.pct))+" mg mitragyninu ("+fmt(g)+" g × "+fmt(s.pct)+" %)":"Zadej množství a vyber druh pro odhad mg.";
 if(s&&s.price>0&&g>0)c.textContent+=" · "+Math.round(g*s.price)+" Kč";
 if(S.set.gapOn&&g>0&&$("dt").value){const t=new Date($("dt").value).getTime();let m=Infinity;S.doses.forEach(d=>{if(d.id!==editD)m=Math.min(m,Math.abs(t-new Date(d.time).getTime()))});m/=6e4;if(m<S.set.gap*60){c.textContent+="\nOdstup od nejbližší dávky jen "+hm(m)+" (min. "+fmt(S.set.gap)+" h)";c.style.color="var(--red)"}}
 if(L&&g>0){const td=dayG(($("dt").value||"").slice(0,10),editD)+g;c.textContent+="\nZa den "+fmt(td)+" / "+fmt(L.g)+" g"+(td>L.g?" · nad limitem":"");if(td>L.g)c.style.color="var(--red)"}}
function calc(){calcBase();if(typeof appendWeightCalculation==="function")appendWeightCalculation()}
["g","st","dt"].forEach(i=>$(i).addEventListener("input",calc));
function fillSel(){const sel=$("st");sel.textContent="";
 S.strains.forEach(s=>{const o=el("option",null,sl(s)+" ("+fmt(s.pct)+" %)");o.value=s.id;sel.appendChild(o)});
 if(!S.strains.length){const o=el("option",null,"Bez druhu");o.value="";sel.appendChild(o)}}
function openDose(id,pg){
 fillSel();doseSaving=false;editD=id||null;const d=id&&S.doses.find(x=>x.id===id);
 $("dT").textContent=d?"Upravit dávku":"Nová dávka";$("dDelW").hidden=!d;
 $("dt").value=d?d.time:iso(new Date());$("g").value=d?d.g:(pg||"");$("me").value=d?d.method||"":"";$("no").value=d?d.note||"":"";
 const ref=d||[...S.doses].sort((a,b)=>b.time.localeCompare(a.time))[0];
 if(ref&&ref.strainId&&S.strains.some(s=>s.id===ref.strainId))$("st").value=ref.strainId;
 calc();dChips();curTags=d?[...(d.tags||[])]:[];tagsUI();open("shD")}
$("addD").onclick=()=>openDose();
$("dSave").onclick=()=>{
 if(doseSaving)return;
 const g=parseFloat($("g").value),dt=$("dt").value,s=S.strains.find(x=>x.id===$("st").value);
 if(!dt||!(g>0)){toast("Zadej datum a množství větší než 0.");return}
 const rec={time:dt,g,strainId:s?s.id:null,strain:s?sl(s):"Bez druhu",tags:[...curTags],price:s?s.price||0:0,pct:s?s.pct:0,method:$("me").value.trim(),note:$("no").value.trim()};
 doseSaving=true;if(commitDose(rec,editD)){closeSh();toast("Uloženo · "+fmt(g)+" g")}else doseSaving=false};
$("dDel").onclick=()=>twice($("dDel"),()=>{S.doses=S.doses.filter(x=>x.id!==editD);save();closeSh();renderLog();chart()});

function renderLog(){
 const box=$("log");box.textContent="";
 if(!S.doses.length){box.appendChild(el("div","empty","Zatím žádné dávky. Klepni na + a zapiš první."));return}
 const sorted=[...S.doses].sort((a,b)=>b.time.localeCompare(a.time));
 let day=null,grp=null,cap=null,tg=0,tm=0;
 const fin=()=>{if(cap)cap.lastChild.textContent=fmt(tg)+" g · "+fmt(tm)+" mg"};
 sorted.forEach(d=>{const dd=d.time.slice(0,10);
  if(dd!==day){fin();day=dd;tg=0;tm=0;const [y,m,n]=dd.split("-");
   cap=el("div","cap");cap.append(el("span",null,(+n)+". "+(+m)+". "+y),el("span",null,""));box.appendChild(cap);
   grp=el("div","grp");box.appendChild(grp)}
  tg+=d.g;tm+=mg(d.g,d.pct);
  const c=el("button","cell"),l=el("div");
  l.appendChild(el("div",null,fmt(d.g)+" g · "+d.strain));
  l.appendChild(el("div","s",d.time.slice(11)+(d.method?" · "+d.method:"")+" · "+fmt(d.pct)+" %"+(d.price>0?" · "+Math.round(d.g*d.price)+" Kč":"")));
  if(d.tags&&d.tags.length)l.appendChild(el("div","s","# "+d.tags.join(", ")));
  if(d.note)l.appendChild(el("div","s",d.note));
  c.append(l,el("div","r",fmt(mg(d.g,d.pct))+" mg"));c.onclick=()=>openDose(d.id);grp.appendChild(c)});
 fin()}

/* strains */
function renderStrains(){const box=$("strains");box.textContent="";
 if(!S.strains.length){box.appendChild(el("div","empty","Žádný druh. Klepni na + a přidej první."));return}
 const g=el("div","grp");
 S.strains.forEach(s=>{const c=el("button","cell"),l=el("div");
  l.appendChild(el("div",null,sl(s)));const sub=[s.price>0?fmt(s.price)+" Kč/g":"",s.note].filter(Boolean).join(" · ");if(sub)l.appendChild(el("div","s",sub));
  c.append(l,el("div","r",fmt(s.pct)+" %"));c.onclick=()=>openStrain(s.id);g.appendChild(c)});
 box.appendChild(g)}
function openStrain(id){editS=id||null;const s=id&&S.strains.find(x=>x.id===id);
 $("sT").textContent=s?"Upravit druh":"Nový druh";$("sDelW").hidden=!s;
 $("sDupW").hidden=!s;$("sc").value=s&&s.price?s.price:"";$("sv").value=s?s.sup||"":"";$("sn").value=s?s.name:"";$("sp").value=s?s.pct:"";$("sx").value=s?s.note||"":"";open("shS")}
$("addS").onclick=()=>openStrain();
$("sDup").onclick=()=>{editS=null;$("sT").textContent="Nový druh";$("sDelW").hidden=true;$("sDupW").hidden=true;$("sv").value="";$("sp").value="";$("sc").value="";$("sv").focus()};
$("sSave").onclick=()=>{const name=$("sn").value.trim(),pct=parseFloat($("sp").value),note=$("sx").value.trim(),sup=$("sv").value.trim(),price=parseFloat($("sc").value)||0;
 if(!name||!Number.isFinite(pct)||pct<0||pct>100||!Number.isFinite(price)||price<0){toast("Zadej název, složení od 0 do 100 % a nezápornou cenu.");return}
 if(editS)Object.assign(S.strains.find(x=>x.id===editS),{name,pct,note,sup,price});else S.strains.push({id:uid(),name,pct,note,sup,price});
 save();closeSh();renderStrains()};
$("sDel").onclick=()=>twice($("sDel"),()=>{S.strains=S.strains.filter(x=>x.id!==editS);save();closeSh();renderStrains();fillSel()});



/* Both entry forms keep the original record format and storage keys. */
function commitDose(rec,id){
 if(!rec||!Number.isFinite(rec.pct)||rec.pct<0||rec.pct>100||!Number.isFinite(rec.price)||rec.price<0){toast("Zkontroluj složení a cenu druhu.");return false}
 if(!Number.isFinite(rec.g)||rec.g<=0||!Number.isFinite(new Date(rec.time).getTime())){toast('Zkontroluj množství a čas.');return false}
 if(!id&&S.profile.snapshotWeight&&getProfileWeight()){rec.weightKgAtEntry=getProfileWeight();rec.weightRecordedAt=S.profile.weightUpdatedAt||null;}
 if(id){const original=S.doses.find(d=>d.id===id);if(!original)return false;Object.assign(original,rec)}else S.doses.push({id:uid(),...rec});
 if(!id){quickGrams=0;quickFood='';quickBusy=false;$('quickExact').value='';$('quickExact').hidden=true;$('quickAmount').hidden=false;}save();renderLog();chart();overChk();return true;
}
let quickGrams=0,quickFood='',quickBusy=false;
function changeAmount(value,delta){return Math.max(0,Math.round(((Number(value)||0)+delta)*10)/10)}
function quickRecord(){const strain=S.strains.find(x=>x.id===$('quickStrain').value);return {time:iso(new Date()),g:quickGrams,strainId:strain?strain.id:null,strain:strain?sl(strain):'Bez druhu',tags:quickFood?[quickFood]:[],price:strain?strain.price||0:0,pct:strain?strain.pct:0,method:'',note:''}}
function quickToSheet(focusAmount=false){const record=quickRecord();openDose(null,quickGrams||undefined);if(record.strainId)$('st').value=record.strainId;curTags=record.tags;tagsUI();calc();if(focusAmount)$('g').focus()}
function renderQuick(){
 const now=Date.now(),valid=S.doses.filter(d=>new Date(d.time).getTime()<=now).sort((a,b)=>b.time.localeCompare(a.time)),last=valid[0],select=$('quickStrain'),signature=JSON.stringify(S.strains.map(s=>[s.id,sl(s)]));
 if(select.dataset.signature!==signature){const chosen=select.value;select.textContent='';S.strains.forEach(s=>{const o=el('option',null,sl(s));o.value=s.id;select.appendChild(o)});if(!S.strains.length){const o=el('option',null,'Bez druhu');o.value='';select.appendChild(o)}select.value=S.strains.some(s=>s.id===chosen)?chosen:S.strains.some(s=>s.id===last?.strainId)?last.strainId:S.strains[0]?.id||'';select.dataset.signature=signature}
 $('quickSince').textContent=last?'Od poslední '+hm(Math.max(0,(now-new Date(last.time))/6e4)):'Zatím bez záznamů';
 $('quickAmountText').textContent=fmt(quickGrams);$('quickMinus').disabled=quickGrams<=0;$('quickSave').disabled=quickGrams<=0||quickBusy;
 const chips=$('quickChips');chips.textContent='';S.set.qd.forEach(g=>{const b=el('button','chip',fmt(g)+' g');b.setAttribute('aria-pressed',String(g===quickGrams));b.onclick=()=>{quickGrams=g;renderQuick()};chips.appendChild(b)});
 $('quickEmpty').setAttribute('aria-pressed',String(quickFood==='Na lačno'));$('quickMeal').setAttribute('aria-pressed',String(quickFood==='Po jídle'));
 const rec=quickRecord(),L=limit(),estimate=$('quickEstimate');estimate.classList.remove('warning');let text=quickGrams>0?'Zápis v aktuálním čase'+(rec.price>0?' · '+Math.round(quickGrams*rec.price).toLocaleString('cs-CZ')+' Kč':''):'Vyber množství pomocí −/+ nebo rychlé volby.';
 if(quickGrams>0&&L&&dayG(todayK())+quickGrams>L.g){text+=' · Překročíš denní limit';estimate.classList.add('warning')}
 if(quickGrams>0&&S.set.gapOn&&last&&(now-new Date(last.time))/36e5<S.set.gap){text+=' · Nastavený odstup ještě neuplynul';estimate.classList.add('warning')}estimate.textContent=text;if(quickGrams>0&&S.profile.showRelative&&getProfileWeight())estimate.textContent+=' · '+formatRelative(quickGrams/getProfileWeight())+' g/kg';
 const today=valid.filter(d=>d.time.slice(0,10)===todayK()),strip=$('todayStrip');strip.textContent='';[['Dnes',fmt(today.reduce((a,d)=>a+d.g,0))+' g'],['Záznamy',String(today.length)],['Útrata',Math.round(today.reduce((a,d)=>a+d.g*(d.price||0),0)).toLocaleString('cs-CZ')+' Kč']].forEach(([label,value])=>{const c=el('div');c.append(el('span',null,label),el('strong',null,value));strip.appendChild(c)});
 $('recentCard').hidden=false;const recent=$('recentDoses');recent.textContent='';valid.slice(0,isCompactWidget('recent')?Math.min(2,widgetConfig('recent','home').count||3):widgetConfig('recent','home').count||3).forEach(d=>{const row=el('button','recent-row'),left=el('span','recent-left');left.append(el('strong',null,d.strain),el('small',null,new Date(d.time).toLocaleString('cs-CZ',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})+(!isCompactWidget('recent')&&widgetConfig('recent','home').showTags!==false&&d.tags?.length?' · '+d.tags.join(', '):'')));row.append(left,el('b',null,fmt(d.g)+' g'));row.onclick=()=>openDose(d.id);recent.appendChild(row)});
}
$('quickMinus').onclick=()=>{quickGrams=changeAmount(quickGrams,-widgetConfig('quick','home').step);renderQuick()};$('quickPlus').onclick=()=>{quickGrams=changeAmount(quickGrams,widgetConfig('quick','home').step);renderQuick()};
$('quickStrain').onchange=()=>renderQuick();$('quickEmpty').onclick=()=>{quickFood=quickFood==='Na lačno'?'':'Na lačno';renderQuick()};$('quickMeal').onclick=()=>{quickFood=quickFood==='Po jídle'?'':'Po jídle';renderQuick()};
$('quickAmount').onclick=()=>{const input=$('quickExact');input.value=quickGrams||'';$('quickAmount').hidden=true;input.hidden=false;input.focus();input.select()};$('quickDetails').onclick=()=>quickToSheet();
$('quickSave').onclick=()=>{if(quickBusy||quickGrams<=0)return;quickBusy=true;const record=quickRecord();if(commitDose(record)){quickGrams=0;quickFood='';toast('Dávka zapsána')}renderQuick();setTimeout(()=>{quickBusy=false;renderQuick()},700)};
$('doseMinus').onclick=()=>{$('g').value=changeAmount($('g').value,-widgetConfig('quick','home').step);calc();dChips()};$('dosePlus').onclick=()=>{$('g').value=changeAmount($('g').value,widgetConfig('quick','home').step);calc();dChips()};$('dConfirm').onclick=()=>$('dSave').click();
/* Avoid accidental text selection, page zoom and a retained keyboard after sheets. */
function connectionUI(){const online=navigator.onLine,state=$('connectionState');state.classList.toggle('offline',!online);state.lastElementChild.textContent=online?'Online':'Offline'}
window.addEventListener('online',connectionUI);window.addEventListener('offline',connectionUI);connectionUI();
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});


/* Purchases are a personal record, with package price snapshots. */
function cleanPresets(values){const a=[...new Set((Array.isArray(values)?values:[]).map(Number).filter(v=>Number.isFinite(v)&&v>=.1&&v<=200).map(v=>Math.round(v*10)/10))].sort((a,b)=>a-b).slice(0,8);return a.length?a:[2,3,4,6,8]}
function lineTotals(items){return items.reduce((a,i)=>({grams:a.grams+i.grams*i.quantity,cost:a.cost+i.unitPrice*i.quantity,count:a.count+i.quantity}),{grams:0,cost:0,count:0})}
function validPurchaseItems(items){return Array.isArray(items)&&items.length>0&&items.every(i=>i&&Number.isFinite(i.grams)&&i.grams>0&&Number.isSafeInteger(i.quantity)&&i.quantity>0&&Number.isFinite(i.unitPrice)&&i.unitPrice>=0)}
function purchaseSummary(now=Date.now()){
 const day=iso(new Date(now)).slice(0,10),purchases=S.purchases.filter(p=>p&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.date<=day&&validPurchaseItems(p.items));
 return {...lineTotals(purchases.flatMap(p=>p.items)),purchases:purchases.length};
}
function money(n){return n.toLocaleString('cs-CZ',{maximumFractionDigits:2})+' Kč'}
function getPurchaseDraft(){if(!S.purchaseDraft||!Array.isArray(S.purchaseDraft.items))S.purchaseDraft={items:[],date:todayK(),editing:null};return S.purchaseDraft}
let buyQuantity=1;
function unusedLegacyConsumptionCard(){const consumed=S.doses.filter(d=>Number.isFinite(d.g)&&d.g>0&&new Date(d.time).getTime()<=Date.now()).reduce((a,d)=>a+d.g,0),box=$('homeBalance');box.textContent='';const row=el('div','balance-link'),text=el('span');text.append(el('strong',null,'Celkem spotřebováno '+fmt(consumed)+' g'),el('small',null,'Součet všech zaznamenaných dávek'));row.appendChild(text);box.appendChild(row)}
function fillBuyStrains(){const select=$('buyStrain'),value=select.value;select.textContent='';S.strains.forEach(s=>{const o=el('option',null,sl(s));o.value=s.id;select.appendChild(o)});if(!S.strains.length){const o=el('option',null,'Bez druhu');o.value='';select.appendChild(o)}if(S.strains.some(s=>s.id===value))select.value=value}
function renderPackageOptions(){const w=$('packageOptions');w.textContent='';purchaseOptions().sizes.forEach(g=>{const b=el('button','chip',g+' g');b.setAttribute('aria-pressed',String(+$('buySize').value===g));b.onclick=()=>{$('buySize').value=g;renderPackageOptions();renderBuyPreview()};w.appendChild(b)})}
function renderBuyPreview(){const g=$('buySize').valueAsNumber,p=$('buyPrice').valueAsNumber,valid=Number.isFinite(g)&&g>0&&Number.isFinite(p)&&p>=0;$('buyQty').textContent=buyQuantity;$('buyQtyMinus').disabled=buyQuantity<=1;$('buyAdd').disabled=!valid;$('buyPreview').textContent=valid?buyQuantity+' × '+fmt(g)+' g · '+fmt(g*buyQuantity)+' g · '+money(p*buyQuantity)+' ('+money(p/g)+'/g)':'Vyber balení a doplň jeho cenu. Cena je za jedno balení.'}
function saveDraft(){save();renderBuy()}
function renderBuy(){
 const total=purchaseSummary(),w=$('purchaseSummary');w.textContent='';[['Nakoupeno celkem',fmt(total.grams)+' g'],['Za nákupy',money(total.cost)],...(purchaseOptions().showCounts?[['Počet balení',String(total.count)],['Uložené nákupy',String(total.purchases)]]:[])].forEach(([label,value])=>{const c=el('div','stat');c.append(el('span',null,label),el('b',null,value));w.appendChild(c)});
 $('purchaseBalanceNote').textContent='Samostatná evidence nákupů. Zapsané dávky tyto součty nijak nemění.';
 fillBuyStrains();renderPackageOptions();renderBuyPreview();const draft=getPurchaseDraft(),cart=$('cartLines');cart.textContent='';$('cartTitle').textContent=draft.editing?'Upravit nákup':'Rozpracovaný nákup';$('buyClear').textContent=draft.editing?'Zrušit úpravu':'Vyprázdnit nákup';$('buySave').textContent=draft.editing?'Uložit změny nákupu':'Uložit nákup';
 if(!draft.items.length)cart.appendChild(el('div','cart-empty','Nákup je prázdný. Přidej první balení nahoře.'));
 draft.items.forEach((item,i)=>{const row=el('div','cart-line'),top=el('div','cart-line-top'),name=el('div');name.append(el('strong',null,item.strain),el('small',null,fmt(item.grams)+' g / balení · '+money(item.unitPrice)+' · '+money(item.unitPrice/item.grams)+'/g'));top.append(name,el('b',null,money(item.unitPrice*item.quantity)));const controls=el('div','cart-line-controls'),qty=el('div','quantity-control'),minus=el('button',null,'−'),plus=el('button',null,'+'),remove=el('button','lk','Odebrat');minus.setAttribute('aria-label','Odebrat balení '+item.strain+' '+fmt(item.grams)+' g');plus.setAttribute('aria-label','Přidat balení '+item.strain+' '+fmt(item.grams)+' g');minus.disabled=item.quantity<=1;minus.onclick=()=>{item.quantity--;saveDraft()};plus.onclick=()=>{if(item.quantity>=999){toast('Nejvýše 999 balení v jedné položce.');return}item.quantity++;saveDraft()};remove.onclick=()=>{draft.items.splice(i,1);saveDraft()};qty.append(minus,el('span',null,String(item.quantity)),plus);controls.append(qty,remove);row.append(top,controls);cart.appendChild(row)});
 const sum=lineTotals(draft.items);$('cartCount').textContent=sum.count+' balení · '+fmt(sum.grams)+' g';$('cartTotal').textContent=money(sum.cost);$('cartCard').classList.toggle('compact-cart',purchaseOptions().compactCart);$('buyDate').value=draft.date;$('buyDate').max=todayK();$('buySave').disabled=!draft.items.length;
 const h=$('purchaseHistory');h.textContent='';let records=[...S.purchases].filter(p=>p&&validPurchaseItems(p.items)).sort((a,b)=>purchaseOptions().historyOrder==='oldest'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));if(purchaseOptions().historyCount>0)records=records.slice(0,purchaseOptions().historyCount);if(!records.length)h.appendChild(el('div','empty','Zatím žádné uložené nákupy.'));
 records.forEach(p=>{const c=el('div','purchase-history-card'),header=el('div','cart-line-top'),sum=lineTotals(p.items);header.append(el('strong',null,new Date(p.date+'T12:00').toLocaleDateString('cs-CZ')),el('b',null,money(sum.cost)));c.appendChild(header);p.items.forEach(i=>c.appendChild(el('p',null,i.quantity+' × '+fmt(i.grams)+' g · '+i.strain+' · '+money(i.unitPrice*i.quantity)+' · '+money(i.unitPrice/i.grams)+'/g')));const actions=el('div','purchase-history-actions'),edit=el('button','lk','Upravit'),del=el('button','lk','Smazat');edit.onclick=()=>{if(getPurchaseDraft().items.length){toast('Nejdřív ulož nebo vyprázdni rozpracovaný nákup.');return}S.purchaseDraft={items:p.items.map(i=>({...i})),date:p.date,editing:p.id};saveDraft();$('cartCard').scrollIntoView({behavior:'smooth',block:'start'})};del.style.color='var(--red)';del.onclick=()=>twice(del,()=>{S.purchases=S.purchases.filter(x=>x.id!==p.id);if(getPurchaseDraft().editing===p.id)S.purchaseDraft=null;save();renderBuy();renderHomeBalance()});actions.append(edit,del);c.appendChild(actions);h.appendChild(c)});
}
function addPurchaseLine(){const grams=$('buySize').valueAsNumber,unitPrice=$('buyPrice').valueAsNumber,strain=S.strains.find(s=>s.id===$('buyStrain').value);if(!Number.isFinite(grams)||grams<=0||grams>100000||!Number.isFinite(unitPrice)||unitPrice<0||unitPrice>1e8){toast('Zadej platnou velikost a cenu balení.');return}const item={strainId:strain?.id||null,strain:strain?sl(strain):'Bez druhu',grams,quantity:buyQuantity,unitPrice},draft=getPurchaseDraft(),existing=draft.items.find(i=>i.strainId===item.strainId&&i.strain===item.strain&&i.grams===grams&&i.unitPrice===unitPrice);if(existing){if(existing.quantity+buyQuantity>999){toast('Nejvýše 999 balení v jedné položce.');return}existing.quantity+=buyQuantity}else draft.items.push(item);buyQuantity=1;saveDraft();toast('Balení přidáno do nákupu')}
function commitPurchase(draft){if(!validPurchaseItems(draft.items)||!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||!validDateOnly(draft.date)||draft.date>todayK())return false;const record={id:draft.editing||uid(),date:draft.date,items:draft.items.map(i=>({...i}))};if(draft.editing){const index=S.purchases.findIndex(p=>p.id===draft.editing);if(index<0)return false;S.purchases[index]=record}else S.purchases.push(record);S.purchaseDraft=null;save();return true}
$('buyQtyMinus').onclick=()=>{buyQuantity=Math.max(1,buyQuantity-1);renderBuyPreview()};$('buyQtyPlus').onclick=()=>{buyQuantity=Math.min(999,buyQuantity+1);renderBuyPreview()};$('buySize').oninput=()=>{renderPackageOptions();renderBuyPreview()};$('buyPrice').oninput=renderBuyPreview;$('buyStrain').onchange=renderBuyPreview;$('buyAdd').onclick=addPurchaseLine;
$('buyDate').onchange=()=>{getPurchaseDraft().date=$('buyDate').value;save()};$('buySave').onclick=()=>{if(!commitPurchase(getPurchaseDraft())){toast('Zkontroluj položky a datum nákupu (nejpozději dnes).');return}renderBuy();renderLifetimeStatistics();renderQuick();toast('Nákup uložen')};$('buyClear').onclick=()=>{S.purchaseDraft=null;saveDraft()};
/* Individual, editable quick amount presets. */
function updatePresets(values){S.set.qd=cleanPresets(values);save();renderPresetSettings();renderQuick();dChips()}
function renderPresetSettings(){const w=$('presetList');w.textContent='';S.set.qd.forEach((g,index)=>{const row=el('div','preset-row'),minus=el('button',null,'−'),plus=el('button',null,'+'),remove=el('button','preset-remove','×'),input=el('input');input.type='number';input.min='.1';input.max='200';input.step='.1';input.inputMode='decimal';input.value=g;input.setAttribute('aria-label','Rychlá volba '+(index+1)+' v gramech');minus.setAttribute('aria-label','Snížit rychlou volbu '+fmt(g)+' g');plus.setAttribute('aria-label','Zvýšit rychlou volbu '+fmt(g)+' g');remove.setAttribute('aria-label','Odstranit rychlou volbu '+fmt(g)+' g');remove.disabled=S.set.qd.length<=1;
 const change=value=>{if(!Number.isFinite(value)||value<.1||value>200||S.set.qd.some((v,i)=>i!==index&&Math.abs(v-value)<.001)){toast('Použij odlišnou hodnotu od 0,1 do 200 g.');input.value=g;return}const values=[...S.set.qd];values[index]=Math.round(value*10)/10;updatePresets(values)};
 minus.disabled=g<=.1;minus.onclick=()=>change(Math.max(.1,Math.round((g-.5)*10)/10));plus.onclick=()=>change(Math.round((g+.5)*10)/10);input.onchange=()=>change(input.valueAsNumber);remove.onclick=()=>updatePresets(S.set.qd.filter((_,i)=>i!==index));row.append(minus,input,el('span',null,'g'),plus,remove);w.appendChild(row)});$('presetAdd').disabled=S.set.qd.length>=8;}
$('presetAdd').onclick=()=>{const value=$('presetNew').valueAsNumber;if(S.set.qd.length>=8||!Number.isFinite(value)||value<.1||value>200||S.set.qd.includes(Math.round(value*10)/10)){toast('Přidej odlišnou hodnotu od 0,1 do 200 g, nejvýše 8 voleb.');return}updatePresets([...S.set.qd,value]);$('presetNew').value=''};
function finishQuickExact(){const input=$('quickExact');if(input.hidden)return;const value=input.valueAsNumber;if(!Number.isFinite(value)||value<=0||value>200){toast('Zadej množství od 0,1 do 200 g.')}else quickGrams=Math.round(value*10)/10;input.hidden=true;$('quickAmount').hidden=false;input.blur();renderQuick()}
$('quickExact').onblur=finishQuickExact;$('quickExact').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finishQuickExact()}if(e.key==='Escape'){$('quickExact').hidden=true;$('quickAmount').hidden=false;renderQuick()}};

/* chart */
function step(x){const p=Math.pow(10,Math.floor(Math.log10(x))),r=x/p;return(r<=1?1:r<=2?2:r<=2.5?2.5:r<=5?5:10)*p}
function chips(id,fn,sel){const w=$(id);w.textContent="";const cur=sel?parseFloat($("g").value):NaN;
 S.set.qd.forEach(q=>{const b=el("button","chip",fmt(q)+" g");b.setAttribute("aria-pressed",String(cur===q));b.onclick=()=>fn(q);w.appendChild(b)})}
const dChips=()=>chips("chipsD",q=>{$("g").value=q;calc();dChips()},1);
$("g").addEventListener("input",dChips);
const inBody=()=>{const n=Date.now(),h=S.set.hl;return S.doses.reduce((a,d)=>{const t=new Date(d.time).getTime();return t>n?a:a+mg(d.g,d.pct)*Math.pow(.5,(n-t)/36e5/h)},0)};
function heroC(){const w=$("hero"),R=inBody();w.textContent="";w.appendChild(el("small",null,"Odhad vyčištění organismu"));
 if(!S.doses.length||R<=1){w.appendChild(el("b",null,"Čistý"));w.appendChild(el("p",null,S.doses.length?"Odhadovaný zbytek mitragyninu je pod 1 mg.":"Zatím žádné záznamy."))}
 else{const hrs=S.set.hl*Math.log2(R),t=Math.round(hrs),end=new Date(Date.now()+hrs*36e5);
  w.appendChild(el("b",null,t<1?"za méně než hodinu":"za "+(t>=24?Math.floor(t/24)+" d ":"")+(t%24?t%24+" h":"")));
  w.appendChild(el("p",null,"Přibližně "+end.toLocaleString("cs-CZ",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})+" · v těle teď cca "+fmt(R)+" mg mitragyninu"))}
 w.appendChild(el("p",null,"Orientační odhad z poločasu "+S.set.hl+" h. Liší se člověk od člověka a nenahrazuje test."))}
function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>{t.hidden=true},2600)}
function twice(b,fn){if(b.dataset.arm){clearTimeout(+b.dataset.arm);delete b.dataset.arm;b.textContent=b.dataset.t0;fn();return}
 b.dataset.t0=b.textContent;b.textContent="Klepni znovu pro potvrzení";b.dataset.arm=setTimeout(()=>{delete b.dataset.arm;b.textContent=b.dataset.t0},3500)}
function qm(btn){const r=btn.getBoundingClientRect(),b=$("qmB");b.textContent="";
 const lt=[...S.doses].sort((a,b)=>b.time.localeCompare(a.time))[0];
 if(lt){const x=el("button",null,"Jako naposledy · "+fmt(lt.g)+" g");x.style.fontWeight="600";x.onclick=()=>{$("qm").hidden=true;openDose(null,lt.g)};b.appendChild(x)}
 S.set.qd.forEach(q=>{const x=el("button",null,fmt(q)+" g");x.onclick=()=>{$("qm").hidden=true;openDose(null,q)};b.appendChild(x)});
 const o=el("button",null,"Jiné množství…");o.style.color="var(--acc)";o.onclick=()=>{$("qm").hidden=true;openDose()};b.appendChild(o);
 b.style.top=(r.bottom+6)+"px";b.style.right=Math.max(8,innerWidth-r.right)+"px";$("qm").hidden=false}
$("qm").onclick=e=>{if(e.target===$("qm"))$("qm").hidden=true};
function tolCard(){renderWeightWidget()}
function setUI(){ renderPresetSettings(); $("hl").value=S.set.hl; limUI(); recUI(); accUI(); applyAcc(); renderProfileSettings(); renderAppearanceSettings(); }
$("tl").oninput=()=>{S.set.tl=+$("tl").value;save();setUI();chart()};
$("hl").onchange=()=>{const v=parseFloat($("hl").value);if(v>=6&&v<=72){S.set.hl=v;save()}setUI();chart()};

const dayG=(day,ex)=>S.doses.reduce((a,d)=>a+(d.time.slice(0,10)===day&&d.id!==ex?d.g:0),0);
const todayK=()=>iso(new Date()).slice(0,10);
const avgG=()=>{const C=new Date();C.setDate(C.getDate()-6);const f=iso(C).slice(0,10);return S.doses.reduce((a,d)=>a+(d.time.slice(0,10)>=f?d.g:0),0)/7};
function limit(){const z=S.set;
 if(z.tpOn&&z.tpD){const w=Math.max(0,Math.floor((Date.now()-new Date(z.tpD+"T00:00"))/6048e5)),g=z.tpG*Math.pow(1-z.tpP/100,w);return{g:g<.5?0:Math.round(g*10)/10,src:"plan",w:w+1}}
 return z.limOn?{g:z.lim,src:"limit"}:null}
function overChk(){const L=limit();if(!L)return;const td=dayG(todayK());
 if(td>L.g)toast("Denní limit překročen: "+fmt(td)+" / "+fmt(L.g)+" g");else if(L.g>0&&td>=L.g*.8)toast("Blížíš se limitu: "+fmt(td)+" / "+fmt(L.g)+" g")}
function limCard(){const w=$("limC");w.textContent="";const L=limit();if(!L)return;
 const td=dayG(todayK()),over=td>L.g,near=!over&&L.g>0&&td>=L.g*.8,c=el("div","grp"),row=el("div","cell"),l=el("div"),r=el("div","r");
 row.style.cssText="cursor:default;border-bottom:0";
 l.append(el("div",null,L.src==="plan"?"Plán snižování · týden "+L.w:"Denní limit"),el("div","s",over?"Limit překročen o "+fmt(td-L.g)+" g":near?"Blížíš se limitu":L.g>0?"Zbývá "+fmt(L.g-td)+" g":"Cíl dosažen"));
 r.textContent=fmt(td)+" / "+fmt(L.g)+" g";if(over)r.style.color="var(--red)";l.style.flex="1";
 const rg=el("span","ring");rg.innerHTML='<svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="19" fill="none" stroke="var(--sep)" stroke-width="5"/><circle cx="23" cy="23" r="19" fill="none" stroke="'+(over?"var(--red)":near?"#ff9f0a":"var(--acc)")+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+(119.4*Math.min(1,L.g>0?td/L.g:1))+' 119.4" transform="rotate(-90 23 23)"/></svg>';row.append(rg,l,r);
 const sk=streaks();c.appendChild(row);
 if(sk){row.style.borderBottom=".5px solid var(--sep)";const r2=el("div","cell"),l2=el("div");r2.style.cssText="cursor:default;border-bottom:0";l2.append(el("div",null,"Série v limitu"),el("div","s","Rekord "+sk.best+" d"));r2.append(l2,el("div","r",sk.cur+" d"));c.appendChild(r2)}
 w.appendChild(c)}
function limUI(){const z=S.set;$("bkI").textContent=z.lastBk?"Poslední záloha: "+new Date(z.lastBk).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric",year:"numeric"})+". ":"Zatím žádná záloha do souboru. ";$("pnOn").checked=!!z.pinOn;$("pnCh").hidden=!z.pinOn;$("gapOn").checked=z.gapOn;$("gap").value=z.gap;$("limOn").checked=z.limOn;$("lim").value=z.lim;$("tpOn").checked=z.tpOn;$("tpG").value=z.tpG;$("tpP").value=z.tpP;$("tpR").hidden=!z.tpOn;
 let t="Po zapnutí se denní limit každý týden sníží o zvolené procento od startovní dávky. Nahrazuje ručně nastavený limit a kdykoli ho vypneš.";
 if(z.tpOn&&z.tpD){const [y,m,d]=z.tpD.split("-"),L=limit();t="Plán začal "+(+d)+". "+(+m)+". "+y+". Dnešní limit: "+fmt(L.g)+" g (týden "+L.w+"). Snižování po malých krocích bývá snesitelnější než náhlé vysazení; při vysokém příjmu se případně poraď s lékařem. Podrobnosti najdeš dole v záložce Plán."}
 $("tpD").textContent=t}
const num=(id,k,min,max)=>{$(id).onchange=()=>{const v=parseFloat($(id).value);if(v>=min&&v<=max){S.set[k]=v;save()}setUI();chart()}};
num("lim","lim",0,200);num("tpG","tpG",0,200);
$("tpP").onchange=()=>{S.set.tpP=+$("tpP").value;save();setUI();chart()};
$("limOn").onchange=()=>{S.set.limOn=$("limOn").checked;save();setUI();chart()};
$("tpOn").onchange=()=>{const on=$("tpOn").checked;S.set.tpOn=on;if(on){S.set.tpD=todayK();const a=avgG();if(a>0)S.set.tpG=Math.round(a*2)/2}save();setUI();chart();buildTabs()};
$("tpR").onclick=()=>{S.set.tpD=todayK();save();setUI();chart();toast("Plán začíná znovu dnes")};
const hm=m=>{m=Math.round(m);return m>=60?Math.floor(m/60)+" h"+(m%60?" "+m%60+" min":""):m+" min"};
const lastT=()=>{const n=Date.now();let m=0;S.doses.forEach(d=>{const t=new Date(d.time).getTime();if(t<=n&&t>m)m=t});return m};
function gapCard(){const w=$("gapC");w.textContent="";const t=lastT();if(!S.set.gapOn||!t)return;
 const left=(t+S.set.gap*36e5-Date.now())/6e4,c=el("div","grp"),row=el("div","cell"),l=el("div"),r=el("div","r");row.style.cssText="cursor:default;border-bottom:0";
 l.append(el("div",null,"Odstup mezi dávkami"),el("div","s","Poslední dávka před "+hm((Date.now()-t)/6e4)));
 r.textContent=left>0?"ještě "+hm(left):"odstup OK";if(left>0)r.style.color="#ff9f0a";row.append(l,r);c.appendChild(row);w.appendChild(c)}
function costCard(){const w=$("costC");w.textContent="";if(!S.doses.some(d=>d.price>0))return;
 const from=n=>{const C=new Date();C.setDate(C.getDate()-n+1);return iso(C).slice(0,10)},
 sum=f=>S.doses.reduce((a,d)=>a+(d.time.slice(0,10)>=f?d.g*(d.price||0):0),0),cap=el("div","cap"),g=el("div","stats");
 cap.appendChild(el("span",null,"Útrata"));
 [["Dnes",1],["7 dní",7],["30 dní",30]].forEach(([l,n])=>{const s=el("div","stat"),b=el("b",null,Math.round(sum(from(n))).toLocaleString("cs-CZ")+" Kč");b.style.fontSize="19px";s.append(b,el("span",null,l));g.appendChild(s)});
 w.append(cap,g)}
num("gap","gap",0.5,48);
function applyAcc(){const r=document.documentElement.style,c=S.set.acc;if(c){r.setProperty("--acc",c);r.setProperty("--acc2",c+"29")}else{r.removeProperty("--acc");r.removeProperty("--acc2")}}
function accUI(){
 const w=$('accP');w.textContent='';
 [['','#30d158','Zelená'],['#0a84ff','#0a84ff','Modrá'],['#23a38a','#23a38a','Mátová'],['#f08a00','#f08a00','Oranžová'],['#a550e0','#a550e0','Fialová'],['#e8315b','#e8315b','Růžová']].forEach(([value,color,name])=>{
 const selected=(S.set.acc||'')===value,b=el('button','accent-choice'),sample=el('span','accent-sample'),dot=el('span','accent-sample-dot'),line=el('span','accent-sample-line');
 dot.style.background=color;line.style.background=color;sample.append(dot,line);b.append(sample,el('span','accent-name',name),el('span','accent-check',selected?'✓':''));b.type='button';b.setAttribute('aria-label','Barva ovládání: '+name);b.setAttribute('aria-pressed',String(selected));b.onclick=()=>{S.set.acc=value;save();applyAcc();accUI();chart()};w.appendChild(b);
 });
}
function recLv(){const C=new Date();C.setDate(C.getDate()-13);const f=iso(C).slice(0,10),M={};S.doses.forEach(d=>{const k=d.time.slice(0,10);if(k>=f)M[k]=(M[k]||0)+mg(d.g,d.pct)});const v=Object.values(M);return v.length?lv(v.reduce((a,b)=>a+b,0)/v.length):0}
function recUI(){ $("recT").textContent="Doporučené dávkování se nepočítá."; $("recB").hidden=true; }
$("recB").onclick=()=>{S.set.tl=recLv();save();setUI();chart()};
$("gapOn").onchange=()=>{S.set.gapOn=$("gapOn").checked;save();setUI();chart()};
setInterval(()=>{if(tab==="sum"&&$("ov").hidden)chart()},60000);
let curTags=[],pinBuf="",pinTmp="",pinMode="",hideT=0;
function tagsUI(){const w=$("tagsD");w.textContent="";[...new Set([...S.set.tags,...curTags])].forEach(t=>{const b=el("button","chip",t);b.setAttribute("aria-pressed",String(curTags.includes(t)));b.onclick=()=>{curTags=curTags.includes(t)?curTags.filter(x=>x!==t):[...curTags,t];tagsUI()};w.appendChild(b)})}

function limFor(k){const z=S.set;if(z.tpOn&&z.tpD&&k>=z.tpD){const w=Math.floor((new Date(k+"T00:00")-new Date(z.tpD+"T00:00"))/6048e5),g=z.tpG*Math.pow(1-z.tpP/100,w);return g<.5?0:Math.round(g*10)/10}return z.limOn?z.lim:null}
function streaks(){if(!S.doses.length)return null;const first=S.doses.map(d=>d.time.slice(0,10)).sort()[0],t0=new Date(first+"T12:00"),n=Math.round((new Date(todayK()+"T12:00")-t0)/864e5)+1;let run=0,best=0;
 for(let i=0;i<n;i++){const k=iso(new Date(t0.getTime()+i*864e5)).slice(0,10),L=limFor(k);if(L==null)return null;if(dayG(k)<=L+1e-9){run++;best=Math.max(best,run)}else run=0}
 return{cur:run,best}}
function tagCard(ds){const w=$("dTag");w.textContent="";const m={};ds.forEach(d=>(d.tags||[]).forEach(t=>{m[t]=m[t]||{g:0,n:0};m[t].g+=d.g;m[t].n++}));const e=Object.entries(m).sort((a,b)=>b[1].g-a[1].g);
 if(!e.length){w.appendChild(el("div","empty","Žádné štítky v tomto období."));return}
 e.forEach(([t,v])=>{const r=el("div","cell");r.style.cursor="default";r.append(el("div",null,t),el("div","r",v.n+"× · "+fmt(v.g)+" g"));w.appendChild(r)})}
function weekCard(){const T0=new Date();T0.setHours(12,0,0,0);const mon=new Date(T0);mon.setDate(T0.getDate()-(T0.getDay()+6)%7);const lm=new Date(mon);lm.setDate(mon.getDate()-7);
 const km=iso(mon).slice(0,10),kl=iso(lm).slice(0,10),w=$("dWeek"),sum=(a,b)=>{const o={g:0,mg:0,kc:0,dy:new Set()};S.doses.forEach(d=>{const k=d.time.slice(0,10);if(k>=a&&k<b){o.g+=d.g;o.mg+=mg(d.g,d.pct);o.kc+=d.g*(d.price||0);o.dy.add(k)}});return o},A=sum(km,"9999"),B=sum(kl,km);w.textContent="";
 [["Gramy",A.g,B.g,v=>fmt(v)+" g"],["Mitragynin",A.mg,B.mg,v=>fmt(v)+" mg"],["Útrata",A.kc,B.kc,v=>Math.round(v).toLocaleString("cs-CZ")+" Kč"],["Dny užití",A.dy.size,B.dy.size,v=>v+" d"]].forEach(([l,x,y,f])=>{
  const r=el("div","cell"),q=el("div"),e=el("div","r"),d=y>0?Math.round((x/y-1)*100):null;
  q.append(el("div",null,l),el("div","s","Minulý týden: "+f(y)));e.textContent=f(x)+(d==null||d===0?"":(d>0?"  ▲ ":"  ▼ ")+Math.abs(d)+" %");e.style.color=d>0?"var(--red)":"var(--acc)";r.style.cursor="default";r.append(q,e);w.appendChild(r)})}
function levelChart(){const n=Date.now(),hl=S.set.hl,N=145,pts=[];let mx=0;
 for(let i=0;i<N;i++){const t=n+(i-48)*18e5;let v=0;S.doses.forEach(d=>{const td=new Date(d.time).getTime();if(td<=t)v+=mg(d.g,d.pct)*Math.pow(.5,(t-td)/36e5/hl)});pts.push(v);if(v>mx)mx=v}
 const W=340,H=170,pl=36,pb=20,pt=8,pw=W-pl-6,ph=H-pb-pt,st=mx>0?step(mx/4):1,top=st*4,X=i=>pl+i*pw/(N-1),Y=v=>pt+ph-ph*v/top;let h2="";
 for(let i=0;i<=4;i++){const y=pt+ph-ph*i/4;h2+='<line class="gl" x1="'+pl+'" x2="'+(W-6)+'" y1="'+y+'" y2="'+y+'"/><text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end">'+fmt(st*i)+'</text>'}
 const d0=pts.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1)).join("");
 h2+='<path d="'+d0+'L'+X(N-1)+','+(pt+ph)+'L'+X(0)+','+(pt+ph)+'Z" fill="var(--acc)" opacity=".18"/><path d="'+d0+'" fill="none" stroke="var(--acc)" stroke-width="2"/><line x1="'+X(48)+'" x2="'+X(48)+'" y1="'+pt+'" y2="'+(pt+ph)+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".5"/>';
 [[0,"-24 h"],[24,"-12 h"],[48,"teď"],[72,"+12 h"],[96,"+24 h"],[120,"+36 h"],[144,"+48 h"]].forEach(([i,l])=>{h2+='<text x="'+X(i)+'" y="'+(H-5)+'" text-anchor="middle">'+l+'</text>'});
 $("dLv").innerHTML=h2;$("dLvR").textContent="Teď cca "+fmt(pts[48])+" mg · maximum v zobrazeném úseku "+fmt(mx)+" mg"}
const hs=p=>{let h=5381;const t="bp|"+p;for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return""+h};
function lockDots(){const d=$("lkD");d.textContent="";for(let i=0;i<4;i++){const e=el("i");if(i<pinBuf.length)e.className="on";d.appendChild(e)}}
function lockOpen(m){pinMode=m;pinBuf="";pinTmp="";$("lkM").textContent=m==="unlock"?"Zadej PIN":"Zvol nový PIN";$("lkP").children[9].style.visibility=m==="unlock"?"hidden":"visible";lockDots();$("lock").hidden=false}
function pinKey(k){
 if(k==="x"){if(pinMode==="unlock")return;$("lock").hidden=true;setUI();return}
 if(k==="b"){pinBuf=pinBuf.slice(0,-1);lockDots();return}
 if(pinBuf.length>=4)return;pinBuf+=k;lockDots();if(pinBuf.length<4)return;
 setTimeout(()=>{
  if(pinMode==="unlock"){if(hs(pinBuf)===S.set.pin)$("lock").hidden=true;else $("lkM").textContent="Špatný PIN";pinBuf="";lockDots()}
  else if(!pinTmp){pinTmp=pinBuf;pinBuf="";$("lkM").textContent="Zopakuj PIN";lockDots()}
  else if(pinTmp===pinBuf){S.set.pin=hs(pinBuf);S.set.pinOn=true;save();$("lock").hidden=true;setUI();toast("PIN nastaven")}
  else{pinTmp="";pinBuf="";$("lkM").textContent="PIN nesouhlasí, zvol znovu";lockDots()}
 },120)}
[..."123456789","x","0","b"].forEach(k=>{const b=el("button",null,k==="x"?"Zrušit":k==="b"?"⌫":k);if(k==="x")b.style.fontSize="15px";b.onclick=()=>pinKey(k);$("lkP").appendChild(b)});
$("pnOn").onchange=()=>{if($("pnOn").checked)lockOpen("set");else{S.set.pinOn=false;S.set.pin="";save();setUI()}};
$("pnCh").onclick=()=>lockOpen("set");
document.addEventListener("visibilitychange",()=>{if(document.hidden)hideT=Date.now();else if(isPrivateUnlocked()&&S.set.pinOn&&S.set.pin&&Date.now()-hideT>30000&&$("lock").hidden)lockOpen("unlock")});
let dr=30;
function bars(id,lab,v){const W=340,H=170,pl=30,pb=20,pt=8,pw=W-pl-4,ph=H-pb-pt,bw=pw/v.length,mx=Math.max(...v),st=mx>0?step(mx/4):1,top=st*4;let h="";
 for(let i=0;i<=4;i++){const y=pt+ph-ph*i/4;h+='<line class="gl" x1="'+pl+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'"/><text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end">'+fmt(st*i)+'</text>'}
 v.forEach((x,i)=>{const bh=ph*x/top;h+='<rect x="'+(pl+i*bw+bw*.15)+'" y="'+(pt+ph-bh)+'" width="'+bw*.7+'" height="'+bh+'" rx="3" fill="var(--acc)"/>';if(lab[i])h+='<text x="'+(pl+i*bw+bw/2)+'" y="'+(H-5)+'" text-anchor="middle">'+lab[i]+'</text>'});
 $(id).innerHTML=h}

let forecastManual=false;
function costForecast(g,p){return {daily:g*p,monthly:g*p*30,yearly:g*p*365,grams:g*30};}
function forecastDefaults(){
 const now=new Date(),today=iso(now).slice(0,10),from=new Date(now);from.setDate(from.getDate()-dr+1);const key=iso(from).slice(0,10);
 const all=S.doses.filter(d=>d.time.slice(0,10)<=today&&new Date(d.time)<=now&&Number.isFinite(d.g)&&d.g>0).sort((a,b)=>a.time.localeCompare(b.time));
 const ds=all.filter(d=>d.time.slice(0,10)>=key),first=all.length?all[0].time.slice(0,10):today;
 const utc=k=>Date.parse(k+"T00:00:00Z"),days=Math.max(1,Math.round((utc(today)-utc(first>key?first:key))/864e5)+1);
 const grams=ds.reduce((a,d)=>a+d.g,0),priced=ds.filter(d=>Number.isFinite(d.price)&&d.price>0),knownG=priced.reduce((a,d)=>a+d.g,0);
 const price=knownG?priced.reduce((a,d)=>a+d.g*d.price,0)/knownG:null;
 if(!forecastManual){$("forecastGrams").value=grams?+(grams/days).toFixed(2):"";$("forecastPrice").value=price===null?"":+price.toFixed(2)}
 $("forecastBasis").textContent=forecastManual?"Vlastní scénář. Měň gramy nebo cenu a porovnej náklady. Měsíc počítáme jako 30 dní.":"Průměr za "+days+" kalendářních dní v rámci zvoleného období (včetně dní bez dávky). Cena je vážená podle gramů ze záznamů s vyplněnou cenou. "+(knownG<grams?"U části dávek cena chybí; odhad předpokládá stejnou cenu i pro ně. ":"")+(price===null?"Doplň cenu za gram nebo ji nastav u druhů pro nové záznamy. ":"")+"Měsíc = 30 dní.";
 renderForecast();
}
function renderForecast(){
 const gi=$("forecastGrams"),pi=$("forecastPrice"),g=gi.valueAsNumber,p=pi.valueAsNumber,valid=gi.value!==""&&pi.value!==""&&Number.isFinite(g)&&Number.isFinite(p)&&g>=0&&p>=0;
 const h=$("forecastHero"),fin=$("dFin"),chart=$("forecastChart");h.textContent="";fin.textContent="";chart.innerHTML="";
 if(!valid){h.append(el("small",null,"Měsíční předpověď"),el("b",null,"Doplň spotřebu a cenu"),el("p",null,"Zadej nezáporné hodnoty. Chybějící cenu nepočítáme jako nulové náklady."));return}
 const v=costForecast(g,p),money=n=>Math.round(n).toLocaleString("cs-CZ")+" Kč";
 h.append(el("small",null,"Příštích 30 dní při stejném tempu"),el("b",null,"≈ "+money(v.monthly)),el("p",null,fmt(g)+" g denně × "+fmt(p)+" Kč/g · celkem "+fmt(v.grams)+" g za 30 dní"));
 [["Za den",v.daily],["Za týden",v.daily*7],["Za rok (365 dní)",v.yearly]].forEach(([label,n])=>{const row=el("div","cell");row.style.cursor="default";row.append(el("span",null,label),el("span","r","≈ "+money(n)));fin.appendChild(row)});
 const max=Math.max(1,v.monthly),x=d=>45+d/30*280,y=n=>140-n/max*120;
 let svg="";for(let i=0;i<=4;i++){const value=max*i/4,yy=y(value);svg+='<line class="gl" x1="45" x2="325" y1="'+yy+'" y2="'+yy+'"/><text x="40" y="'+(yy+3)+'" text-anchor="end">'+Math.round(value).toLocaleString("cs-CZ")+'</text>'}
 svg+='<path d="M45 140 L325 '+y(v.monthly)+' L325 140 Z" fill="var(--acc2)"/><path d="M45 140 L325 '+y(v.monthly)+'" fill="none" stroke="var(--acc)" stroke-width="3"/>';
 [0,7,14,21,30].forEach(d=>svg+='<text x="'+x(d)+'" y="160" text-anchor="middle">'+d+'. den</text>');svg+='<text x="45" y="12">Kumulované náklady (Kč)</text>';chart.innerHTML=svg;
}
["forecastGrams","forecastPrice"].forEach(id=>$(id).oninput=()=>{forecastManual=true;$("forecastBasis").textContent="Vlastní scénář · spotřeba a cena zadané ručně. Měsíc = 30 dní. Předpověď předpokládá stejné tempo po celé období.";renderForecast()});
$("forecastReset").onclick=()=>{forecastManual=false;forecastDefaults()};

function dataPage(){
 renderLifetimeStatistics();
 const C=new Date();C.setDate(C.getDate()-dr+1);const f=iso(C).slice(0,10),ds=S.doses.filter(d=>d.time.slice(0,10)>=f).sort((a,b)=>a.time.localeCompare(b.time)),
 tg=ds.reduce((a,d)=>a+d.g,0),tc=ds.reduce((a,d)=>a+d.g*(d.price||0),0);
 const T0=new Date();T0.setHours(12,0,0,0);const mon=new Date(T0);mon.setDate(T0.getDate()-(T0.getDay()+6)%7);const lm=new Date(mon);lm.setDate(mon.getDate()-7);
 const k1=iso(lm).slice(0,10),k2=iso(mon).slice(0,10),lw=S.doses.reduce((a,d)=>{const k=d.time.slice(0,10);return a+(k>=k1&&k<k2?d.g:0)},0);
 const gp=[];for(let i=1;i<ds.length;i++){const m=(new Date(ds[i].time)-new Date(ds[i-1].time))/6e4;if(m<=1440)gp.push(m)}
 const cd=$("dCards");cd.textContent="";
 [["Spotřeba",fmt(tg)+" g",fmt(tg/dr)+" g/den","var(--acc)"],["Útrata",Math.round(tc).toLocaleString("cs-CZ")+" Kč",Math.round(tc/dr)+" Kč/den","var(--red)"],["Minulý týden",fmt(lw)+" g","","#ff9f0a"],["Prům. pauza",gp.length?hm(gp.reduce((a,b)=>a+b,0)/gp.length):"–","","#0a84ff"]].forEach(([l,v,sub,c])=>{
  const e=el("div","stat"),b=el("b",null,v);e.style.textAlign="center";b.style.color=c;e.append(el("span",null,l),b);if(sub)e.appendChild(el("span",null,sub));cd.appendChild(e)});
 forecastDefaults();
 const wk=[0,0,0,0,0,0,0],hr=new Array(24).fill(0);ds.forEach(d=>{const t=new Date(d.time);wk[(t.getDay()+6)%7]+=d.g;hr[t.getHours()]+=d.g});
 bars("dWk",["Po","Út","St","Čt","Pá","So","Ne"],wk);bars("dHr",hr.map((_,i)=>i%3===0?i:""),hr);
 const by={};ds.forEach(d=>{by[d.strain]=(by[d.strain]||0)+d.g});const en=Object.entries(by).sort((a,b)=>b[1]-a[1]),PAL=["#30d158","#ff9f0a","#0a84ff","#bf5af2","#ff453a","#64d2ff","#ffd60a","#ac8e68"],Cc=2*Math.PI*38,lg=$("dLeg");
 let off=0,ring="";lg.textContent="";
 en.forEach(([nm,g],i)=>{const len=g/tg*Cc;ring+='<circle cx="50" cy="50" r="38" fill="none" stroke="'+PAL[i%8]+'" stroke-width="16" stroke-dasharray="'+len+' '+(Cc-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 50 50)"/>';off+=len;
  const r=el("div","cell"),l=el("div"),sq=el("span",null,"■ ");r.style.cursor="default";sq.style.color=PAL[i%8];l.append(sq,document.createTextNode(nm));r.append(l,el("div","r",fmt(g)+" g · "+Math.round(g/tg*100)+" %"));lg.appendChild(r)});
 if(!en.length)lg.appendChild(el("div","empty","V tomto období nejsou žádná data."));
 $("dPie").innerHTML=ring;tagCard(ds);weekCard();levelChart()}
function planPage(){const z=S.set;if(!z.tpOn||!z.tpD)return;
 const D=864e5,st=new Date(z.tpD+"T00:00").getTime(),tod=new Date(todayK()+"T00:00").getTime(),days=Math.max(1,Math.round((tod-st)/D)+1),wk=Math.floor((days-1)/7),
 cap=w=>{const g=z.tpG*Math.pow(1-z.tpP/100,w);return g<.5?0:Math.round(g*10)/10},
 dk=i=>iso(new Date(st+i*D+12*36e5)).slice(0,10),fd=t=>new Date(t).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric"});
 const G={};S.doses.forEach(d=>{const k=d.time.slice(0,10);G[k]=(G[k]||0)+d.g});
 const arr=[];for(let i=0;i<days;i++)arr.push(G[dk(i)]||0);
 let W=0;while(cap(W)>0&&W<300)W++;
 const wa=[];for(let w=0;w<=wk;w++){const q=arr.slice(w*7,Math.min(days,w*7+7));wa.push(q.reduce((x,y)=>x+y,0)/q.length)}
 let ok=0,str=0,sv=0;arr.forEach((g,i)=>{if(g<=cap(Math.floor(i/7))+1e-9)ok++;if(i<days-1)sv+=Math.max(0,z.tpG-g)});
 for(let i=days-1;i>=0&&arr[i]<=cap(Math.floor(i/7))+1e-9;i--)str++;
 let tc=0,tg=0;S.doses.forEach(d=>{if(d.price>0){tc+=d.g*d.price;tg+=d.g}});const pr=tg?tc/tg:0;
 const L=cap(wk),h=$("plH");h.textContent="";
 h.append(el("small",null,"Týden "+(wk+1)+" plánu"),el("b",null,fmt(L)+" g / den"),el("p",null,"Dnes "+fmt(arr[days-1])+" g · průměr tohoto týdne "+fmt(wa[wk])+" g"),
  el("p",null,W<=wk?"Podle plánu je cíl 0 g dosažen.":"Cíl 0 g: týden "+(W+1)+" ("+new Date(st+W*7*D).toLocaleDateString("cs-CZ",{day:"numeric",month:"numeric",year:"numeric"})+"), zbývá "+(W-wk)+" týdnů."));
 const box=$("plS");box.textContent="";
 [["Průměr týdne",fmt(wa[wk])+" g"],["Dny v limitu",ok+" / "+days],["Série",str+" d"],["Ušetřeno",fmt(sv)+" g"],["Ušetřeno (Kč)",pr?Math.round(sv*pr).toLocaleString("cs-CZ")+" Kč":"–"],["Snížení",z.tpG>0?Math.round((1-wa[wk]/z.tpG)*100)+" %":"–"]].forEach(([l,v])=>{
  const c=el("div","stat"),b=el("b",null,v);b.style.fontSize="19px";c.append(b,el("span",null,l));box.appendChild(c)});
 const n=Math.min(W+1,16),a0=Math.max(0,Math.min(wk-3,W+1-n)),b0=a0+n,Wd=340,Ht=190,pl=34,pb=22,pt=10,pw=Wd-pl-6,ph=Ht-pb-pt,bw=pw/n;
 let mx=0;for(let w=a0;w<b0;w++)mx=Math.max(mx,cap(w),w<=wk?wa[w]:0);
 const sp=mx>0?step(mx/4):1,top=sp*4,yv=v=>pt+ph-ph*v/top;
 let g2='';for(let i=0;i<=4;i++){const y=pt+ph-ph*i/4;g2+='<line class="gl" x1="'+pl+'" x2="'+(Wd-4)+'" y1="'+y+'" y2="'+y+'"/><text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end">'+fmt(sp*i)+'</text>'}
 const pts=[];
 for(let w=a0;w<b0;w++){const x=pl+(w-a0)*bw,v=cap(w),y=yv(v);
  g2+='<rect x="'+(x+bw*.15)+'" y="'+y+'" width="'+bw*.7+'" height="'+(pt+ph-y)+'" rx="3" fill="var(--sep)"'+(w===wk?' stroke="var(--acc)" stroke-width="1.5"':'')+'/>';
  g2+='<text x="'+(x+bw/2)+'" y="'+(Ht-6)+'" text-anchor="middle">'+(w+1)+'</text>';
  if(w<=wk)pts.push([x+bw/2,yv(wa[w]),wa[w]>v+1e-9])}
 if(pts.length>1)g2+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+pts.map(q=>q[0]+','+q[1]).join(' ')+'"/>';
 pts.forEach(q=>{g2+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="3.5" fill="'+(q[2]?'var(--red)':'var(--acc)')+'"/>'});
 $("plC").innerHTML=g2;$("plR").textContent="Šedé sloupce: limit plánu (g/den). Čára: tvůj průměr za týden, červeně nad limitem. Osa x: týdny.";
 const nx=$("plN");nx.textContent="";
 for(let k=0;k<=5&&wk+k<=W;k++){const w=wk+k,r=el("div","cell"),l=el("div");r.style.cursor="default";
  l.append(el("div",null,"Týden "+(w+1)+(k?"":" (nyní)")),el("div","s","od "+fd(st+w*7*D)));
  r.append(l,el("div","r",cap(w)>0?fmt(cap(w))+" g/den":"0 g · cíl"));nx.appendChild(r)}}
async function backupFile(){
 const json=JSON.stringify(S),fn="pandaui-zaloha-"+todayK()+".json",ok=()=>{S.set.lastBk=Date.now();S.set.bkN=S.doses.length;save();setUI();chart();toast("Záloha uložena")};
 if(window.claude){try{const dl=await claude.use("downloads");
   if(dl){await dl.save({filename:fn,data:json});ok();return}}catch(e){if(e&&e.code==="declined")return}
  $("exp").click();toast("Soubor nejde uložit, zkopíruj text zálohy");return}
 try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([json],{type:"application/json"}));a.download=fn;document.body.appendChild(a);a.click();a.remove();ok()}catch(e){$("exp").click()}}
$("bkF").onclick=backupFile;
function bkCard(){const w=$("bkC");w.textContent="";if(S.doses.length<3)return;const z=S.set,d=z.lastBk?Math.floor((Date.now()-z.lastBk)/864e5):null;
 if(!(d==null||d>=7||S.doses.length-z.bkN>=15))return;
 const b=el("div","sug"),a=el("div","pad"),y=el("button",null,"Zálohovat do souboru");
 b.appendChild(el("p",null,d==null?"Data zatím nemáš zálohovaná do souboru. Ulož je do telefonu, ať o záznamy nepřijdeš.":"Poslední záloha je "+(d?"před "+d+" dny":"z dneška")+", od ní přibylo "+(S.doses.length-z.bkN)+" dávek."));
 y.onclick=backupFile;a.appendChild(y);b.appendChild(a);w.appendChild(b)}
function chart(){renderQuick();tolCard();gapCard();bkCard();drawChart();if(widgetSystemReady)renderWidgets()}
function drawChart(){
 const keys=[];for(let i=range-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);keys.push(iso(d).slice(0,10))}
 const G={},M={},K={};S.doses.forEach(d=>{const k=d.time.slice(0,10);G[k]=(G[k]||0)+d.g;M[k]=(M[k]||0)+mg(d.g,d.pct);K[k]=(K[k]||0)+d.g*(d.price||0)});
 const src=metric==="mg"?M:metric==="kc"?K:G,vals=keys.map(k=>src[k]||0),max=Math.max(...vals,(metric==="g"&&limit())?limit().g:0),st=max>0?step(max/4):1,top=st*4;
 const W=340,H=190,pl=34,pb=22,pt=10,pw=W-pl-6,ph=H-pb-pt,bw=pw/range;
 let h='<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--acc)"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:.5"/></linearGradient></defs>';
 for(let i=0;i<=4;i++){const y=pt+ph-ph*i/4;h+='<line class="gl" x1="'+pl+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'"/><text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end">'+fmt(st*i)+'</text>'}
 const LL=limit();if(metric==="g"&&LL&&LL.g>0){const y=pt+ph-ph*LL.g/top;h+='<line x1="'+pl+'" x2="'+(W-4)+'" y1="'+y+'" y2="'+y+'" stroke="var(--red)" stroke-width="1" stroke-dasharray="4 3"/><text x="'+(W-4)+'" y="'+(y-3)+'" text-anchor="end" style="fill:var(--red)">limit</text>'}
 vals.forEach((v,i)=>{const bh=ph*v/top,x=pl+i*bw+bw*.15,w=bw*.7,y=pt+ph-bh;
  if(v>0)h+='<rect class="bar'+(LL&&metric==="g"&&v>LL.g?" over":"")+'" data-i="'+i+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+bh+'" rx="'+Math.min(4,w/2)+'"/>';
  else h+='<rect data-i="'+i+'" x="'+x+'" y="'+(pt+ph-1.5)+'" width="'+w+'" height="1.5" fill="var(--sep)"/>';
  if(range<=7||i%(range>14?5:2)===(range-1)%(range>14?5:2))h+='<text x="'+(pl+i*bw+bw/2)+'" y="'+(H-6)+'" text-anchor="middle">'+(+keys[i].slice(8))+'.</text>'});
 $("chart").innerHTML=h;
 const info=i=>{const k=keys[i],[y,m,n]=k.split("-");return (+n)+". "+(+m)+".: "+fmt(M[k]||0)+" mg · "+fmt(G[k]||0)+" g"+(K[k]?" · "+Math.round(K[k])+" Kč":"")};
 $("chart").querySelectorAll("rect[data-i]").forEach(r=>r.onclick=()=>{
  $("chart").querySelectorAll(".bar").forEach(b=>b.classList.toggle("off",b!==r));$("read").textContent=info(+r.dataset.i)});
 $("read").textContent="Klepni na sloupec pro detail";
 const tot=vals.reduce((a,b)=>a+b,0),u=metric==="mg"?" mg":metric==="kc"?" Kč":" g";
 const box=$("stats");box.textContent="";
 [["Dnes",vals[vals.length-1]],["Průměr / den",tot/range],["Celkem",tot]].forEach(([l,v])=>{
  const s=el("div","stat");s.append(el("b",null,fmt(v)+u),el("span",null,l));box.appendChild(s)})}

/* backup */
$("exp").onclick=()=>{const o=$("out");o.hidden=false;o.value=JSON.stringify(S);o.select();try{navigator.clipboard.writeText(o.value)}catch(e){}};
$("impb").onclick=()=>$("imp").click();
$("imp").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{try{const p=JSON.parse(r.result);if(!validateBackup(p))throw 0;
  {S=p;norm();save();renderStrains();renderLog();setUI();chart();buildTabs();toast("Data importována")}}catch(x){toast("Soubor není platná záloha.")}};
 r.readAsText(f);e.target.value=""};


function bootPanda(){
segs();renderLog();renderStrains();setUI();$("addH").onclick=()=>openDose();try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
buildTabs();go("sum");if(S.set.pinOn&&S.set.pin&&!isPrivateUnlocked())lockOpen("unlock");
try{if(!localStorage.getItem(KEY))idb("get").then(r=>{try{const q=r&&JSON.parse(r);if(q&&Array.isArray(q.doses)&&Array.isArray(q.strains)){S=q;norm();save();setUI();renderStrains();renderLog();chart();buildTabs();applyAcc()}}catch(e){}});else idb("put",localStorage.getItem(KEY))}catch(e){}


}

function normalizeCoreSettings(){
 const z=S.set,valid=(key,min,max,fallback)=>{if(!Number.isFinite(z[key])||z[key]<min||z[key]>max)z[key]=fallback};
 valid('hl',6,72,24);valid('kg',30,250,70);valid('tl',1,10,4);z.tl=Math.round(z.tl);valid('gap',.5,48,3);valid('lim',0,200,20);valid('tpG',0,200,20);if(![5,10,15,20,25].includes(z.tpP))z.tpP=10;
 z.tags=Array.isArray(z.tags)?z.tags.filter(t=>typeof t==='string').slice(0,10):[...DEF.tags];
 for(const key of ['limOn','gapOn','tpOn','pinOn'])z[key]=z[key]===true;
 if(typeof z.pin!=='string')z.pin='';if(!z.pin)z.pinOn=false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(z.tpD||''))z.tpOn=false;
}
function validDateOnly(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value}
function validateBackup(p){
 if(!p||!Array.isArray(p.strains)||!Array.isArray(p.doses))return false;
 const text=v=>typeof v==='string',nonnegative=v=>Number.isFinite(v)&&v>=0;
 if(!p.strains.every(s=>s&&text(s.id)&&text(s.name)&&Number.isFinite(s.pct)&&s.pct>=0&&s.pct<=100&&(s.price==null||nonnegative(s.price))))return false;
 if(!p.doses.every(d=>d&&text(d.id)&&text(d.time)&&validDateOnly(d.time.slice(0,10))&&Number.isFinite(new Date(d.time).getTime())&&Number.isFinite(d.g)&&d.g>0&&Number.isFinite(d.pct)&&d.pct>=0&&d.pct<=100&&(d.price==null||nonnegative(d.price))&&(d.tags==null||Array.isArray(d.tags)&&d.tags.every(text))))return false;
 if(new Set(p.strains.map(s=>s.id)).size!==p.strains.length||new Set(p.doses.map(d=>d.id)).size!==p.doses.length)return false;
 if(p.purchases!=null&&(!Array.isArray(p.purchases)||!p.purchases.every(q=>q&&text(q.id)&&validDateOnly(q.date)&&validPurchaseItems(q.items))||new Set(p.purchases.map(q=>q.id)).size!==p.purchases.length))return false;
 return true;
}

function prepareCoverOffline(){if(!IS_PREVIEW&&'serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('pwaState').textContent='Připraveno pro offline použití · data zůstávají v tomto zařízení.'}).catch(()=>{$('pwaState').textContent='Offline příprava se nepodařila. Zkus aplikaci znovu otevřít s připojením.'});
}else $('pwaState').textContent=IS_PREVIEW?'Soukromý náhled · ukázková data, oddělené úložiště. ': 'Pro instalaci a offline režim otevři PandaUI z její webové adresy.';
}
