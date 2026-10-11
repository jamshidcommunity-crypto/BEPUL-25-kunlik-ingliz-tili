/* ===== Lexicon (shared with tools/lexicon.js) ===== */
const Lexicon=(function(){
  const IRREGULAR={went:'go',gone:'go',had:'have',has:'have',saw:'see',seen:'see',ate:'eat',eaten:'eat',bought:'buy',made:'make',got:'get',came:'come',took:'take',taken:'take',gave:'give',given:'give',met:'meet',wrote:'write',written:'write',read:'read',slept:'sleep',drank:'drink',drunk:'drink',was:'be',were:'be',is:'be',am:'be',are:'be',been:'be',being:'be',did:'do',does:'do',done:'do',children:'child',men:'man',women:'woman',people:'person',feet:'foot',teeth:'tooth',mice:'mouse',better:'good',best:'good',worse:'bad',worst:'bad',more:'much',most:'much',said:'say',sat:'sit',ran:'run',swam:'swim',found:'find',told:'tell',knew:'know',thought:'think',left:'leave',felt:'feel',began:'begin',broke:'break',brought:'bring',built:'build',caught:'catch',chose:'choose',cost:'cost',cut:'cut',drove:'drive',fell:'fall',flew:'fly',forgot:'forget',grew:'grow',grown:'grow',heard:'hear',hit:'hit',kept:'keep',lost:'lose',paid:'pay',put:'put',rode:'ride',rang:'ring',sang:'sing',spoke:'speak',spent:'spend',stood:'stand',taught:'teach',threw:'throw',understood:'understand',woke:'wake',won:'win',worn:'wear',wore:'wear',hurt:'hurt',let:'let',sent:'send',sold:'sell',shut:'shut',lent:'lend',lay:'lie',meant:'mean',fed:'feed',led:'lead',lit:'light',shone:'shine',stuck:'stick',bit:'bite',earlier:'early',earliest:'early',bigger:'big',biggest:'big',hotter:'hot',hottest:'hot',thinner:'thin',thinnest:'thin',fatter:'fat',fattest:'fat',sadder:'sad',saddest:'sad',wetter:'wet',wettest:'wet',farther:'far',farthest:'far',further:'far',furthest:'far',less:'little',least:'little',fewer:'few',fewest:'few'};
  const NAMES=new Set(['dilnoza','bekzod','karim','nodira','hamida','aziz','malika','kim','mr','mrs','tom','usmat','jizzax','samarkand','tashkent','uzbekistan','korea','bukhara','khiva','england','london','russia','turkey','china','japan','india','america','moscow','istanbul','seoul','paris','france','english','uzbek','russian','korean','monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','march','april','may','june','july','august','september','october','november','december','tv','ok','i','zarina','sardor','gulnora','ms']);
  function clean(t){return t.toLowerCase().replace(/[“”"()\[\],.!?:;…]/g,'').replace(/[‘’]/g,"'").replace(/^'+|'+$/g,'');}
  function cands(w){const c=[w];if(IRREGULAR[w])c.push(IRREGULAR[w]);if(w.endsWith("'s"))c.push(w.slice(0,-2));if(w.endsWith('ies')&&w.length>4)c.push(w.slice(0,-3)+'y');if(w.endsWith('es')&&w.length>3)c.push(w.slice(0,-2));if(w.endsWith('s')&&w.length>2)c.push(w.slice(0,-1));if(w.endsWith('ied')&&w.length>4)c.push(w.slice(0,-3)+'y');if(w.endsWith('ed')&&w.length>3){c.push(w.slice(0,-2));c.push(w.slice(0,-1));if(w[w.length-3]===w[w.length-4])c.push(w.slice(0,-3));}if(w.endsWith('ing')&&w.length>4){c.push(w.slice(0,-3));c.push(w.slice(0,-3)+'e');if(w[w.length-4]===w[w.length-5])c.push(w.slice(0,-4));}if(w.endsWith('er')&&w.length>3){c.push(w.slice(0,-2));c.push(w.slice(0,-1));if(w[w.length-3]===w[w.length-4])c.push(w.slice(0,-3));}if(w.endsWith('est')&&w.length>4){c.push(w.slice(0,-3));c.push(w.slice(0,-2));if(w[w.length-4]===w[w.length-5])c.push(w.slice(0,-4));}if(w.endsWith('ier')&&w.length>4)c.push(w.slice(0,-3)+'y');if(w.endsWith('iest')&&w.length>5)c.push(w.slice(0,-4)+'y');if(w.endsWith('ly')&&w.length>3){c.push(w.slice(0,-2));if(w.endsWith('ily'))c.push(w.slice(0,-3)+'y');}return c;}
  function lookup(tok,g){const w=clean(tok);if(!w||/^\d+$/.test(w))return null;for(const k of cands(w))if(g[k]!==undefined)return{key:k,uz:g[k]};return null;}
  return{lookup,clean,isName:t=>NAMES.has(clean(t))};
})();

/* ===== Data & state ===== */
const C=window.COURSE, CFG=C.config, G=C.glossary;
const DAYS=C.days; const UNITS={}; DAYS.forEach(d=>d.units.forEach(u=>{UNITS[u.id]=u;u.day=d.day;}));
const EMBLEM='data:image/png;base64,__EMBLEM__';
const API=(CFG.apiBase||'')+'/.netlify/functions';
const BOT=CFG.bot||'InglizTili0danBot';
const LS='b25_progress';
let P=load();
function load(){try{return Object.assign({code:'',uid:'',name:'',tg:'',openDay:null,units:{},shadow:{},test:null,dirty:false,seen:{}},JSON.parse(localStorage.getItem(LS)||'{}'));}catch(e){return{code:'',uid:'',name:'',tg:'',openDay:null,units:{},shadow:{},test:null,dirty:false,seen:{}};}}
function save(){try{localStorage.setItem(LS,JSON.stringify(P));}catch(e){}}
const $=s=>document.querySelector(s); const app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const md=s=>esc(s).replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\n/g,'<br>');
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),2400);}
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch(e){}};
const DEMO=()=>location.hash.includes('demo')||P.uid==='demo';
const openDay=()=>location.hash.includes('all')||P.uid==='master'?25:(P.openDay||CFG.openDay||1);
function unitScore(id){const u=P.units[id];return u?u.score:null;}
function unitDone(id){return (unitScore(id)||0)>=CFG.passScore;}
function dayStatus(d){const ids=d.units.map(u=>u.id);const done=ids.filter(unitDone).length;const sh=!!P.shadow[d.day];const tst=d.test?(P.test&&P.test.score>=CFG.testPass):true;const total=ids.length+1+(d.test?1:0);const got=done+(sh?1:0)+(d.test&&tst?1:0);return{st:got===total?'done':got>0?'part':'',got,total};}
function courseProgress(){let t=0,g=0;DAYS.forEach(d=>{d.units.forEach(u=>{t++;if(unitDone(u.id))g++;});t++;if(P.shadow[d.day])g++;if(d.test){t++;if(P.test&&P.test.score>=CFG.testPass)g++;}});return{t,g};}

/* ===== Server sync (best effort) ===== */
async function verifyCode(code){const r=await fetch(`${API}/verify?code=${encodeURIComponent(code)}`,{cache:'no-store'});return r.json();}
async function sync(){if(!P.code||DEMO())return;P.dirty=true;save();if(!navigator.onLine)return;try{const r=await fetch(`${API}/progress`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:P.code,name:P.name,units:P.units,shadow:P.shadow,test:P.test})});const j=await r.json();if(j.ok){P.dirty=false;P.syncedAt=Date.now();save();}}catch(e){}}
async function refreshOpenDay(){if(!P.code||DEMO()||!navigator.onLine)return;try{const j=await verifyCode(P.code);if(j.ok&&j.openDay){if(P.openDay!==j.openDay){P.openDay=j.openDay;save();if(location.hash==='#home'||!location.hash)viewHome();}}}catch(e){}}
window.addEventListener('online',()=>{if(P.dirty)sync();});

/* ===== TTS ===== */
const TTS={voice:null,init(){if(!('speechSynthesis'in window))return;const pick=()=>{const vs=speechSynthesis.getVoices();this.voice=vs.find(v=>/en-GB/i.test(v.lang)&&/female|Google UK English Female|Serena|Kate/i.test(v.name))||vs.find(v=>/en-GB/i.test(v.lang))||vs.find(v=>/en-US/i.test(v.lang)&&/Google|Samantha|Zira/i.test(v.name))||vs.find(v=>/^en/i.test(v.lang))||null;};pick();speechSynthesis.onvoiceschanged=pick;},
  speak(text,rate=0.9){return new Promise(res=>{if(!('speechSynthesis'in window)){toast('Bu qurilmada ovoz yoʻq');return res();}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';if(this.voice)u.voice=this.voice;u.rate=rate;u.pitch=1;u.onend=res;u.onerror=res;speechSynthesis.speak(u);});},
  stop(){if('speechSynthesis'in window)speechSynthesis.cancel();}};
TTS.init();
const SPK='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
function spkBtn(text,rate){return `<button class="spk" data-say="${esc(text)}" data-rate="${rate||0.9}" aria-label="Tinglash">${SPK}</button>`;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-say]');if(!b)return;document.querySelectorAll('.spk.on').forEach(x=>x.classList.remove('on'));b.classList.add('on');TTS.speak(b.dataset.say,parseFloat(b.dataset.rate)).then(()=>b.classList.remove('on'));});

/* ===== Router, back button, Esc ===== */
// Every go() pushes a hash → the phone's back button / browser back goes exactly one step.
// At the home screen a back press is caught once ("press again to exit") so the app doesn't close by accident.
let exitArmed=false;
function go(h){if(location.hash==='#'+h){route();return;}location.hash=h;}
function back(fallback){if(history.state&&history.state.b25>0)history.back();else go(fallback||'home');}
window.addEventListener('hashchange',()=>{if(!(history.state&&history.state.b25!=null)){const prev=(history.state&&history.state.b25)||0;history.replaceState({b25:prev+1},'');}route();});
window.addEventListener('popstate',e=>{if(e.state&&e.state.root){if(exitArmed){return;}exitArmed=true;setTimeout(()=>exitArmed=false,2000);history.pushState({b25:0},'','#home');toast('Chiqish uchun yana bir marta «orqaga» bosing');route();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const pop=document.querySelector('.pop');if(pop){pop.remove();return;}if(location.hash&&location.hash!=='#home'&&location.hash!=='#start')back();}});
function initHistory(){const h=location.hash||'#home';history.replaceState({root:1},'','#home');history.pushState({b25:0},'',h);}
function route(){TTS.stop();document.querySelectorAll('.pop').forEach(p=>p.remove());const h=location.hash.replace('#','').replace(/^(all|demo)\/?/,'');const [k,a,b]=h.split('/');window.scrollTo(0,0);
  if(!P.code&&!DEMO())return viewStart();
  if(k==='start'&&P.code)return go('home');
  if(k==='day')return viewDay(+a);
  if(k==='unit')return viewUnit(+a,b||'rule');
  if(k==='shadow')return viewShadow(+a);
  if(k==='test')return viewTest(+a);
  if(k==='profile')return viewProfile();
  if(k==='install')return viewInstall();
  return viewHome();}
function topbar(back_,title){return `<div class="top">${back_?`<button class="back" onclick="back('${back_}')">‹ Orqaga</button>`:`<img src="${EMBLEM}" alt=""><div class="brand">${esc(CFG.courseName)}<small>Imamov Academy</small></div>`}<div class="sp"></div>${title?`<span class="pill">${esc(title)}</span>`:''}${back_?'':`<button class="iconbtn" onclick="go('profile')" aria-label="Profil">👤</button>`}</div><div class="curve"></div>`;}
function foot(){return `<div class="foot"><img src="${EMBLEM}" alt="">Imamov Academy · ${esc(CFG.telegram)} · ${esc(CFG.phone)}</div>`;}
function render(html){app.innerHTML=`<div class="view">${html}</div>`;}

/* ===== Login ===== */
function viewStart(){const pre=new URLSearchParams(location.search).get('code')||'';
render(`<div class="login"><div class="logo"><img src="${EMBLEM}" alt="Imamov Academy"><h1>${esc(CFG.courseName)}</h1><p>Ingliz tili — 0 dan, 25 kunda. Imamov Academy.</p></div>
<div class="card"><input class="codein" id="code" placeholder="B25-XXXXX" value="${esc(pre)}" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="12" onkeydown="if(event.key==='Enter')login()"><div class="err" id="err"></div><button class="btn wide" id="loginbtn" onclick="login()">Kirish</button>
<div class="steps"><div><b>1</b><span>Telegramda <a href="https://t.me/${BOT}" target="_blank" rel="noopener">@${BOT}</a> ni oching</span></div><div><b>2</b><span>Ikkala kanalga aʼzo boʻling va 3 ta doʻstingizni taklif qiling</span></div><div><b>3</b><span>Bot bergan kodni shu yerga yozing — ilova va yopiq kanal ochiladi</span></div></div>
<a class="btn ghost wide" href="https://t.me/${BOT}" target="_blank" rel="noopener">Kod olish — @${BOT}</a></div>
<p class="note" style="text-align:center">Kod bitta oʻquvchi uchun. Natijalar botdagi profilingizga yoziladi.</p></div>`);
setTimeout(()=>$('#code')?.focus(),50);}
async function login(){const inp=$('#code'),err=$('#err'),btn=$('#loginbtn');let code=inp.value.trim().toUpperCase().replace(/\s+/g,'');if(code&&!code.startsWith('B25-')&&/^[A-Z2-9]{5}$/.test(code))code='B25-'+code;if(!code){err.textContent='Kodni kiriting';return;}
if(code==='DEMO'){P.uid='demo';P.code='DEMO';P.name='Mehmon';save();return go('home');}
btn.disabled=true;btn.textContent='Tekshirilmoqda…';err.textContent='';
try{const j=await verifyCode(code);if(j.ok){P.code=code;P.uid=j.uid;P.name=j.name||'Oʻquvchi';P.tg=j.username?'@'+j.username:'';if(j.openDay)P.openDay=j.openDay;save();buzz(20);go('home');}
else{err.textContent=j.error==='invalid'?'Bunday kod topilmadi. Botdan olgan kodni tekshiring.':'Xatolik. Keyinroq urinib koʻring.';}}
catch(e){err.textContent=navigator.onLine?'Server bilan bogʻlanib boʻlmadi.':'Internet yoʻq. Ulanib, qayta urinib koʻring.';}
btn.disabled=false;btn.textContent='Kirish';}

/* ===== Home ===== */
function viewHome(){const {t,g}=courseProgress();const pct=Math.round(g/t*100);const od=openDay();const r=58,c=2*Math.PI*r;
const nextDay=DAYS.find(d=>d.day<=od&&dayStatus(d).st!=='done');
render(`${topbar()}<div class="card hero"><div class="arc"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="${r}" stroke="var(--line)" stroke-width="10" fill="none"/><circle cx="66" cy="66" r="${r}" stroke="url(#gr)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-g/t)}"/><defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E9BE6"/><stop offset="1" stop-color="#0B3FAF"/></linearGradient></defs></svg><div class="n">${pct}%<small>${g}/${t}</small></div></div><div><h1>Salom, ${esc((P.name||'').split(' ')[0]||'doʻstim')}!</h1><p>${nextDay?`Bugungi qadam: <b>Day ${nextDay.day}</b> — ${esc(nextDay.title)}.`:'Hamma ochiq kunlar tugallangan — zoʻr!'}<br>Ochiq kunlar: 1–${od}.</p>${nextDay?`<button class="btn" style="margin-top:10px" onclick="go('day/${nextDay.day}')">Davom etish ›</button>`:''}</div></div>
${installCard()}
<div class="days">${DAYS.map(d=>{const {st,got,total}=dayStatus(d);const locked=d.day>od;const n=d.units.length;const sub=n?`${n} ta dars (Unit ${d.units[0].id}${n>1?'–'+d.units[n-1].id:''}) · shadowing`:'40 ta savol · shadowing';return `<button class="day ${st} ${locked?'locked':''} ${nextDay&&nextDay.day===d.day?'next':''}" ${locked?'disabled':''} onclick="go('day/${d.day}')"><span class="num">${d.day}</span><span><span class="t">${esc(d.title)}</span><span class="s">${esc(sub)}</span>${!locked&&got?`<span class="mini"><i style="width:${got/total*100}%"></i></span>`:''}</span><span class="st">${locked?'🔒':st==='done'?'✅':'›'}</span></button>`;}).join('')}</div>${foot()}`);}

/* ===== Install (PWA) ===== */
let deferredInstall=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;if(location.hash==='#home'||!location.hash){const c=$('#installcard');if(c)c.outerHTML=installCard();}});
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!window.MSStream;
function installCard(){if(isStandalone()||P.hideInstall)return '';return `<button class="card install" id="installcard" onclick="go('install')"><span class="ic">📲</span><span><span class="t">Ilovani oʻrnatish</span><span class="s">Telefon yoki kompyuterga oʻrnating — bosh ekrandan ochiladi, oflayn ham ishlaydi</span></span><span class="st">›</span></button>`;}
function viewInstall(){const ios=isIOS();const android=/Android/i.test(navigator.userAgent);
render(`${topbar('home','Oʻrnatish')}<h2 class="sec">Ilovani oʻrnatish</h2><p class="sub">Beginner 25 — oddiy sayt emas, ilova. Bir marta oʻrnatsangiz, bosh ekrandan ochiladi va internet boʻlmasa ham ishlaydi.</p>
${deferredInstall?`<div class="card"><p style="margin:0 0 10px">Qurilmangiz oʻrnatishni qoʻllaydi:</p><button class="btn wide" onclick="doInstall()">📲 Hozir oʻrnatish</button></div>`:''}
<div class="card"><h3 style="font-size:17px;color:var(--royal)">iPhone / iPad (Safari)</h3><div class="steps"><div><b>1</b><span>Safari pastidagi <b>Ulashish</b> (kvadrat va yuqoriga strelka) tugmasini bosing</span></div><div><b>2</b><span>Roʻyxatdan <b>«Bosh ekranga qoʻshish» / «Add to Home Screen»</b> ni tanlang</span></div><div><b>3</b><span><b>Qoʻshish</b> ni bosing — ilova bosh ekranda paydo boʻladi</span></div></div>${ios?'<p class="note">Siz iPhone’dasiz — yuqoridagi 3 qadamni bajaring.</p>':''}</div>
<div class="card"><h3 style="font-size:17px;color:var(--royal)">Android (Chrome)</h3><div class="steps"><div><b>1</b><span>Chrome oʻng yuqoridagi <b>⋮</b> menyusini oching</span></div><div><b>2</b><span><b>«Ilovani oʻrnatish» / «Install app»</b> (yoki «Bosh ekranga qoʻshish») ni bosing</span></div><div><b>3</b><span><b>Oʻrnatish</b> ni tasdiqlang</span></div></div>${android&&!deferredInstall?'<p class="note">Agar tugma chiqmasa, sahifani yangilab, yana urinib koʻring.</p>':''}</div>
<div class="card"><h3 style="font-size:17px;color:var(--royal)">Kompyuter (Chrome / Edge)</h3><div class="steps"><div><b>1</b><span>Manzil qatorining oʻng tomonidagi <b>oʻrnatish belgisi</b> (monitor + strelka) ni bosing</span></div><div><b>2</b><span><b>Oʻrnatish</b> ni tasdiqlang — ilova alohida oynada ochiladi</span></div></div><p class="note">Klaviatura: <b>Esc</b> — bir qadam orqaga.</p></div>
<button class="btn ghost wide" onclick="P.hideInstall=true;save();go('home')">Keyinroq</button>${foot()}`);}
async function doInstall(){if(!deferredInstall)return;deferredInstall.prompt();const r=await deferredInstall.userChoice;deferredInstall=null;if(r.outcome==='accepted'){toast('Oʻrnatildi! Bosh ekrandan oching.');go('home');}}

/* ===== Profile ===== */
function viewProfile(){const {t,g}=courseProgress();const done=Object.keys(P.units).filter(unitDone).length;const sh=Object.keys(P.shadow).length;
render(`${topbar('home','Profil')}<div class="card"><h2 class="sec">${esc(P.name)}</h2><p class="sub">${esc(P.tg||'')} ${P.code&&P.code!=='DEMO'?'· kod: <b>'+esc(P.code)+'</b>':''}</p>
<div class="stat"><div><b>${done}</b><small>dars (34)</small></div><div><b>${sh}</b><small>shadowing (25)</small></div><div><b>${P.test?P.test.score:'—'}</b><small>test (40)</small></div></div>
<div class="form"><label>Ism (ilovada koʻrinadi)</label><input id="nm" value="${esc(P.name)}"></div>
<div class="toolbar" style="margin-top:12px"><button class="btn" onclick="P.name=$('#nm').value.trim()||P.name;save();sync();toast('Saqlandi')">Saqlash</button><button class="btn ghost" onclick="sync().then(()=>toast(P.dirty?'Yuborilmadi — internetni tekshiring':'Natijalar botga yuborildi'))">Natijani yuborish</button></div>
<p class="note">Natijalar avtomatik botga yuboriladi (${P.syncedAt?'oxirgi: '+new Date(P.syncedAt).toLocaleString('uz'):'hali yuborilmagan'}). Botda <b>/holat</b> buyrugʻi bilan koʻrasiz.</p></div>
<div class="card"><div class="toolbar" style="margin:0"><a class="btn ghost" href="https://t.me/${BOT}" target="_blank" rel="noopener">Bot: @${BOT}</a><button class="btn ghost" onclick="go('install')">Ilovani oʻrnatish</button></div></div>
<button class="btn ghost wide" onclick="if(confirm('Chiqasizmi? Natijalar botda saqlanadi, qayta kirish uchun kod kerak.')){sync();localStorage.removeItem('${LS}');P=load();go('start');}">Chiqish</button>${foot()}`);}

/* ===== Day ===== */
function viewDay(n){const d=DAYS.find(x=>x.day===n);if(!d)return go('home');const od=openDay();if(n>od){toast('Bu kun hali ochilmagan');return go('home');}
const units=d.units.map(u=>{const s=unitScore(u.id);return `<button class="unit" onclick="go('unit/${u.id}')"><span class="k ${u.code}">${u.code==='S'?'S':'G'}</span><span><span class="t">Unit ${u.id} — ${esc(u.title)}</span><span class="s">Qoida · soʻzlar · matn · 18 ta mashq</span></span><span class="score ${s!=null&&s>=CFG.passScore?'ok':''}">${s==null?'—':s+'/'+CFG.unitMax}</span></button>`;}).join('');
const sh=`<button class="unit" onclick="go('shadow/${n}')"><span class="k sh">🎧</span><span><span class="t">Shadowing — 8 ta gap</span><span class="s">Tinglash → takrorlash → birga aytish (10 daqiqa)</span></span><span class="score ${P.shadow[n]?'ok':''}">${P.shadow[n]?'✓':'—'}</span></button>`;
const tst=d.test?`<button class="unit" onclick="go('test/${n}')"><span class="k">T</span><span><span class="t">Yakuniy test — 40 ta savol</span><span class="s">Oʻtish: ${CFG.testPass}/40</span></span><span class="score ${P.test&&P.test.score>=CFG.testPass?'ok':''}">${P.test?P.test.score+'/40':'—'}</span></button>`:'';
render(`${topbar('home','Day '+n)}<h2 class="sec">Day ${n}: ${esc(d.title)}</h2><p class="sub">${d.units.length>1?'Bugun '+d.units.length+' ta dars. Tartib bilan ishlang, oxirida shadowing.':d.units.length?'Bugun 1 ta dars, keyin shadowing.':'Yakuniy kun: shadowing va test.'}</p><div class="units">${units}${sh}${tst}</div>${foot()}`);}

/* ===== Unit ===== */
let EX=null;
function viewUnit(id,tab){const u=UNITS[id];if(!u)return go('home');if(u.day>openDay())return go('home');
const tabs=[['rule','Qoida'],['words','Soʻzlar'],['text','Matn'],['ex','Mashqlar']];
const done=unitDone(id);P.seen[id]=P.seen[id]||{};P.seen[id][tab]=true;save();
render(`${topbar('day/'+u.day,'Unit '+id)}<h2 class="sec">${esc(u.title)}</h2><p class="sub">Day ${u.day} · ${u.code==='G'?'Grammatika':'Soʻz va koʻnikma'} ${done?'· <b style="color:var(--ok)">tugallandi ✓</b>':''}</p>
<div class="tabs">${tabs.map(([k,l],i)=>`<button class="${k===tab?'on':''} ${(k==='ex'?done:P.seen[id][k])?'seen':''}" onclick="go('unit/${id}/${k}')"><b>${(k==='ex'?done:P.seen[id][k])&&k!==tab?'✓':i+1}</b>${l}</button>`).join('')}</div><div id="pane"></div>${foot()}`);
const pane=$('#pane');
if(tab==='rule'){pane.innerHTML=`<div class="card"><div class="rule">${md(u.rule)}</div></div><div class="card">${u.examples.map(e=>`<div class="ex"><span class="en">${esc(e)}</span>${spkBtn(e,0.85)}</div>`).join('')}</div><button class="btn wide" onclick="go('unit/${id}/words')">Soʻzlarga oʻtish ›</button>`;}
else if(tab==='words'){pane.innerHTML=`<p class="note">Kartochkani bosing — tarjima koʻrinadi. Ovoz tugmasi bilan tinglang.</p><div class="words">${u.words.map(w=>`<button class="word" onclick="this.querySelector('.uz').classList.toggle('hide')"><span class="en">${esc(w.en)}</span><span class="uz hide">${esc(w.uz)}</span>${spkBtn(w.en,0.85)}</button>`).join('')}</div><div class="toolbar" style="margin-top:12px"><button class="btn ghost" onclick="document.querySelectorAll('.word .uz').forEach(x=>x.classList.remove('hide'))">Hammasini ochish</button><button class="btn" onclick="go('unit/${id}/text')">Matnga oʻtish ›</button></div>`;}
else if(tab==='text'){pane.innerHTML=`<div class="card"><div class="toolbar"><strong style="font-family:var(--serif);font-size:18px">${esc(u.text.title||'Matn')}</strong><span class="sp" style="flex:1"></span>${spkBtn(u.text.en.replace(/\n/g,' '),0.85)}</div><div class="text" id="txt">${renderText(u.text.en)}</div><p class="note">Soʻzga bossangiz tarjimasi chiqadi va oʻqib beradi.</p></div><button class="btn wide" onclick="go('unit/${id}/ex')">Mashqlarga oʻtish ›</button>`;bindText();}
else{renderEx(u);}}
function renderText(t){const lines=t.split('\n');return lines.map(line=>{const m=line.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?):\s*(.*)$/);let pre='',body=line;if(m){pre=`<span class="spkr">${esc(m[1])}:</span> `;body=m[2];}
const toks=body.split(/(\s+)/);return pre+toks.map(tk=>{if(/^\s+$/.test(tk)||!tk)return tk;const c=Lexicon.clean(tk);if(!c||Lexicon.isName(tk)||/^\d+$/.test(c))return `<span>${esc(tk)}</span>`;return `<span class="w" data-w="${esc(tk)}">${esc(tk)}</span>`;}).join('');}).join('<br>');}
function bindText(){const box=$('#txt');let pop=null;const close=()=>{if(pop){pop.remove();pop=null;}box.querySelectorAll('.w.on').forEach(x=>x.classList.remove('on'));};
box.addEventListener('click',e=>{const w=e.target.closest('.w');if(!w){close();return;}close();w.classList.add('on');
const tok=w.dataset.w;let hit=null;const next=w.nextElementSibling;const nxt=next&&next.classList.contains('w')?next.dataset.w:null;
if(nxt){const key=(Lexicon.clean(tok)+' '+Lexicon.clean(nxt));if(G[key]){hit={key,uz:G[key],phrase:true};}}
if(!hit)hit=Lexicon.lookup(tok,G);
pop=document.createElement('div');pop.className='pop';const shown=Lexicon.clean(tok);
pop.innerHTML=hit?`<b>${esc(hit.phrase?hit.key:shown)}</b>${hit.uz?esc(hit.uz):''}${!hit.phrase&&hit.key!==shown?`<div class="ph">asosi: ${esc(hit.key)}</div>`:''}`:`<b>${esc(shown)}</b><span class="ph">tarjima topilmadi</span>`;
document.body.appendChild(pop);const r=w.getBoundingClientRect();const pw=pop.offsetWidth;let left=r.left+window.scrollX+r.width/2-pw/2;left=Math.max(8,Math.min(left,window.innerWidth-pw-8));pop.style.left=left+'px';pop.style.top=(r.bottom+window.scrollY+8)+'px';
TTS.speak(hit&&hit.phrase?hit.key:shown,0.85);});
document.addEventListener('click',e=>{if(!e.target.closest('#txt')&&!e.target.closest('.pop'))close();});}

/* ===== Exercises ===== */
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function renderEx(u){const ex=u.exercises;EX={id:u.id,answers:{},total:18};const pane=$('#pane');
const sec=(k,title,n,html)=>`<h3>${title}<small>${n} ta</small></h3>${html}`;
const choice=(items,pre)=>items.map((it,i)=>`<div class="q" id="${pre}${i}"><div class="qq"><span class="n">${i+1}.</span>${esc(it.q)}</div><div class="opts">${it.o.map((o,j)=>`<button class="opt" onclick="ansChoice('${pre}',${i},${j},${it.a})">${esc(o)}</button>`).join('')}</div></div>`).join('');
const order=ex.order.map((it,i)=>{const ws=shuffle(it.w.map((w,k)=>({w,k})));return `<div class="q" id="o${i}" data-a="${esc(it.a)}"><div class="qq"><span class="n">${i+1}.</span>Soʻzlarni tartiblang</div><div class="build" id="ob${i}"><span class="ph">Soʻzlarni bosing…</span></div><div class="opts">${ws.map(x=>`<button class="chip" data-k="${x.k}" onclick="pickWord(${i},this)">${esc(x.w)}</button>`).join('')}</div><div class="toolbar" style="margin:8px 0 0"><button class="btn ghost" onclick="clearOrder(${i})">Tozalash</button><button class="btn" onclick="checkOrder(${i})">Tekshirish</button></div><div class="fb" id="of${i}"></div></div>`;}).join('');
const fill=ex.fill.map((it,i)=>`<div class="q" id="f${i}"><div class="qq"><span class="n">${i+1}.</span>${esc(it.q).replace('___','<b style="color:var(--royal)">______</b>')} ${it.hint?`<span class="kbd">(${esc(it.hint)})</span>`:''}</div><div class="fillrow"><input id="fi${i}" placeholder="javob" autocapitalize="none" autocomplete="off" onkeydown="if(event.key==='Enter')checkFill(${i})"><button class="btn" onclick="checkFill(${i})">Tekshirish</button></div><div class="fb" id="ff${i}"></div></div>`).join('');
pane.innerHTML=`<div class="exs"><p class="note">18 ta mashq, har biri 1 ball. ${CFG.passScore} va undan koʻp ball — dars tugallandi.</p>
${sec('c','Tanlash',6,choice(ex.choice,'c'))}${sec('o','Gap tuzish',4,order)}${sec('t','Matn boʻyicha',4,choice(ex.text,'t'))}${sec('f','Yozish',4,fill)}<div id="res"></div></div><div class="progressbar"><span id="pbn">0/18</span><div class="bar"><i id="pbi"></i></div><span id="pbs">0 ✓</span></div>`;
window._ex=u;}
function mark(key,ok){EX.answers[key]=ok?1:0;buzz(ok?20:[40,40,40]);const n=Object.keys(EX.answers).length;const s=Object.values(EX.answers).reduce((a,b)=>a+b,0);const pb=$('#pbn');if(pb){pb.textContent=`${n}/18`;$('#pbi').style.width=(n/18*100)+'%';$('#pbs').textContent=`${s} ✓`;}if(n>=EX.total)finishEx();}
function ansChoice(pre,i,j,a){const q=$('#'+pre+i);if(q.dataset.done)return;q.dataset.done=1;const btns=q.querySelectorAll('.opt');btns.forEach((b,k)=>{b.disabled=true;if(k===a)b.classList.add('good');if(k===j&&j!==a)b.classList.add('badp');});q.classList.add(j===a?'right':'wrong');mark(pre+i,j===a);}
function pickWord(i,btn){const b=$('#ob'+i);if($('#o'+i).dataset.done)return;b.querySelector('.ph')?.remove();btn.classList.add('used');const c=document.createElement('button');c.className='chip in';c.textContent=btn.textContent;c.onclick=()=>{c.remove();btn.classList.remove('used');if(!b.children.length)b.innerHTML='<span class="ph">Soʻzlarni bosing…</span>';};b.appendChild(c);}
function clearOrder(i){const q=$('#o'+i);if(q.dataset.done)return;$('#ob'+i).innerHTML='<span class="ph">Soʻzlarni bosing…</span>';q.querySelectorAll('.chip.used').forEach(x=>x.classList.remove('used'));}
function checkOrder(i){const q=$('#o'+i);if(q.dataset.done)return;const built=[...$('#ob'+i).querySelectorAll('.chip')].map(x=>x.textContent).join(' ');if(!built){toast('Avval soʻzlarni tanlang');return;}const a=q.dataset.a;const norm=s=>s.toLowerCase().replace(/[.!?,]/g,'').replace(/\s+/g,' ').trim();const ok=norm(built)===norm(a);q.dataset.done=1;q.classList.add(ok?'right':'wrong');$('#of'+i).className='fb '+(ok?'good':'badp');$('#of'+i).innerHTML=ok?'Toʻgʻri! '+esc(a):'Notoʻgʻri. <span class="key">Toʻgʻri javob: '+esc(a)+'</span>';q.querySelectorAll('.chip').forEach(x=>x.disabled=true);mark('o'+i,ok);}
function checkFill(i){const q=$('#f'+i);if(q.dataset.done)return;const it=window._ex.exercises.fill[i];const v=$('#fi'+i).value.trim();if(!v){toast('Javob yozing');return;}const norm=s=>s.toLowerCase().replace(/[.!?]/g,'').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();const ok=it.a.some(x=>norm(x)===norm(v));q.dataset.done=1;q.classList.add(ok?'right':'wrong');$('#fi'+i).disabled=true;$('#ff'+i).className='fb '+(ok?'good':'badp');$('#ff'+i).innerHTML=ok?'Toʻgʻri!':'Notoʻgʻri. <span class="key">Toʻgʻri javob: '+esc(it.a[0])+'</span>';mark('f'+i,ok);}
function finishEx(){const score=Object.values(EX.answers).reduce((a,b)=>a+b,0);const prev=P.units[EX.id];if(!prev||score>prev.score){P.units[EX.id]={score,max:EX.total,at:Date.now()};save();sync();}const ok=score>=CFG.passScore;const u=UNITS[EX.id];const d=DAYS.find(x=>x.day===u.day);const idx=d.units.findIndex(x=>x.id===u.id);const nxt=idx+1<d.units.length?`unit/${d.units[idx+1].id}`:`shadow/${u.day}`;
$('#res').innerHTML=`<div class="result"><div class="big">${score}/${EX.total}</div><p>${ok?'Dars tugallandi! Davom eting.':'Qoidani yana bir oʻqib, qayta urinib koʻring.'}</p><div class="toolbar" style="justify-content:center;margin:0"><button class="btn" onclick="renderEx(UNITS[${EX.id}]);window.scrollTo(0,0)">Qayta ishlash</button><button class="btn" onclick="go('${nxt}')">${idx+1<d.units.length?'Keyingi dars ›':'Shadowingga ›'}</button></div></div>`;$('#res').scrollIntoView({behavior:'smooth',block:'center'});if(ok)confetti();}
function confetti(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const c=document.createElement('canvas');c.className='confetti';document.body.appendChild(c);const ctx=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const cols=['#1E9BE6','#0B3FAF','#F2B134','#22C55E','#ffffff'];const ps=Array.from({length:90},()=>({x:innerWidth/2+(Math.random()-.5)*120,y:innerHeight*0.55,vx:(Math.random()-.5)*14,vy:-Math.random()*14-4,r:4+Math.random()*5,c:cols[Math.floor(Math.random()*cols.length)],a:Math.random()*6}));let t=0;(function f(){ctx.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.45;p.vx*=.99;p.a+=.2;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);ctx.restore();});if(++t<90)requestAnimationFrame(f);else c.remove();})();}

/* ===== Shadowing ===== */
let SH=null;
function viewShadow(n){const d=DAYS.find(x=>x.day===n);if(!d||n>openDay())return go('home');TTS.stop();SH={day:n,items:d.shadowing,stage:0,i:0,running:false,doneStages:{},token:0};
render(`${topbar('day/'+n,'Shadowing')}<h2 class="sec">Shadowing — Day ${n}</h2><p class="sub">8 ta gap, 3 bosqich. Ovoz chiqarib ishlang — maqsad toʻgʻri talaffuz va ritm.</p>
<div class="stages">${[['1','Tinglash','gap + tarjima'],['2','Takrorlash','sekin, pauzada siz aytasiz'],['3','Birga aytish','audio bilan bir vaqtda']].map((s,k)=>`<button class="stage" id="st${k}" onclick="startStage(${k})"><b>${s[0]}</b>${s[1]}<br><small>${s[2]}</small></button>`).join('')}</div>
<div class="card"><div class="shline" id="shl">Bosqichni tanlang</div><div class="shuz" id="shu"></div><div class="bar"><i id="shb"></i></div><div class="shmeta"><span id="shm">—</span><button class="btn ghost" id="shstop" onclick="stopStage()">Toʻxtatish</button></div></div>
<div class="shlist">${d.shadowing.map((s,k)=>`<div class="it" id="shi${k}"><span class="i">${k+1}</span><span style="flex:1"><div>${esc(s.en)}</div><div class="uz">${esc(s.uz)}</div></span>${spkBtn(s.en,0.85)}</div>`).join('')}</div>
<div id="shres"></div>${foot()}`);
if(P.shadow[n])$('#shres').innerHTML=`<p class="note" style="text-align:center">Bu kun shadowingi tugallangan ✓ — xohlasangiz yana ishlang.</p>`;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function startStage(k){if(SH.running)stopStage();SH.stage=k;SH.running=true;const tok=++SH.token;document.querySelectorAll('.stage').forEach((s,j)=>s.classList.toggle('on',j===k));
const items=SH.items;const cfg=[{rate:0.85,pause:2200,uz:true,twice:false},{rate:0.75,pause:4200,uz:false,twice:false},{rate:0.95,pause:1200,uz:false,twice:true}][k];
for(let i=0;i<items.length&&SH.token===tok;i++){const s=items[i];$('#shl').textContent=s.en;$('#shu').textContent=cfg.uz?s.uz:(k===1?'Endi siz ayting…':'Birga ayting');$('#shm').textContent=`${i+1}/${items.length} · ${k+1}-bosqich`;$('#shb').style.width=((i+1)/items.length*100)+'%';document.querySelectorAll('.shlist .it').forEach((x,j)=>x.classList.toggle('on',j===i));
await TTS.speak(s.en,cfg.rate);if(SH.token!==tok)return;if(cfg.twice){await sleep(700);if(SH.token!==tok)return;await TTS.speak(s.en,cfg.rate);if(SH.token!==tok)return;}
if(k===1)$('#shu').textContent='🎤 Siz ayting…';await sleep(cfg.pause);}
if(SH.token!==tok)return;SH.running=false;SH.doneStages[k]=true;$('#st'+k).classList.add('ok');$('#st'+k).classList.remove('on');$('#shl').textContent=k<2?'Bosqich tugadi — keyingisiga oʻting':'Ajoyib! Shadowing tugadi';$('#shu').textContent='';
if(k===2){P.shadow[SH.day]=true;save();sync();confetti();const nd=DAYS.find(x=>x.day===SH.day+1);$('#shres').innerHTML=`<div class="result"><div class="big">✓</div><p>Day ${SH.day} shadowingi tugallandi.</p><div class="toolbar" style="justify-content:center;margin:0"><button class="btn" onclick="go('day/${SH.day}')">Kunga qaytish</button>${nd&&nd.day<=openDay()?`<button class="btn" onclick="go('day/${nd.day}')">Day ${nd.day} ›</button>`:''}</div></div>`;}}
function stopStage(){SH.token++;SH.running=false;TTS.stop();document.querySelectorAll('.stage.on').forEach(s=>s.classList.remove('on'));$('#shu').textContent='';}

/* ===== Final test ===== */
let T=null;
function viewTest(n){const d=DAYS.find(x=>x.day===n);if(!d||!d.test||n>openDay())return go('home');T={answers:{},items:d.test.choice};
render(`${topbar('day/'+n,'Test')}<h2 class="sec">Yakuniy test</h2><p class="sub">40 ta savol, butun kurs. Oʻtish balli: ${CFG.testPass}/40. Bir marta javob berasiz.</p><div class="exs">${T.items.map((it,i)=>`<div class="q" id="T${i}"><div class="qq"><span class="n">${i+1}.</span>${esc(it.q)}</div><div class="opts">${it.o.map((o,j)=>`<button class="opt" onclick="ansTest(${i},${j},${it.a})">${esc(o)}</button>`).join('')}</div></div>`).join('')}<div id="tres"></div></div><div class="progressbar"><span id="pbn">0/40</span><div class="bar"><i id="pbi"></i></div><span id="pbs">0 ✓</span></div>${foot()}`);}
function ansTest(i,j,a){const q=$('#T'+i);if(q.dataset.done)return;q.dataset.done=1;q.querySelectorAll('.opt').forEach((b,k)=>{b.disabled=true;if(k===a)b.classList.add('good');if(k===j&&j!==a)b.classList.add('badp');});q.classList.add(j===a?'right':'wrong');T.answers[i]=j===a?1:0;buzz(j===a?20:[40,40,40]);
const n=Object.keys(T.answers).length,s=Object.values(T.answers).reduce((x,y)=>x+y,0);$('#pbn').textContent=`${n}/40`;$('#pbi').style.width=(n/40*100)+'%';$('#pbs').textContent=`${s} ✓`;
if(n===T.items.length){if(!P.test||s>P.test.score){P.test={score:s,at:Date.now()};save();sync();}const ok=s>=CFG.testPass;$('#tres').innerHTML=`<div class="result"><div class="big">${s}/40</div><p>${ok?'Tabriklaymiz! Testdan oʻtdingiz. Natija botga yuborildi.':'Oʻtish uchun '+CFG.testPass+' ball kerak. Zaif kunlarni qayta ishlab, yana urinib koʻring.'}</p><button class="btn" onclick="go('profile')">Profil va natija</button></div>`;$('#tres').scrollIntoView({behavior:'smooth'});if(ok)confetti();}}

/* ===== Boot ===== */
initHistory();route();refreshOpenDay();if(P.dirty)sync();
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{});}
