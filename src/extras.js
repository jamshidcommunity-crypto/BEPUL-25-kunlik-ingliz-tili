/* ================================================================
   EXTRAS: points & leaderboard, badges, spaced repetition (SRS),
   sounds/combo/hints/mistakes, certificates, theme/font, read-along,
   time tracking, dictionary.  (Boot is at the end of this file.)
   ================================================================ */

/* ----- Points (mirror of netlify/functions/lib/game.js) ----- */
function myPoints(){let s=0;Object.values(P.units).forEach(u=>s+=Math.round((u.score||0)*10));s+=Object.keys(P.shadow).length*50;if(P.test)s+=(P.test.score||0)*5;s+=Math.min(P.srsCorrect||0,2000)*2;return s;}
function lessonsDone(){return Object.keys(P.units).filter(unitDone).length;}
function daysDoneThrough(n){for(let i=1;i<=n;i++){const d=DAYS.find(x=>x.day===i);if(!d||dayStatus(d).st!=='done')return false;}return true;}

/* ----- Badges ----- */
const BADGES=[
 {id:'first',icon:'🌱',name:'Birinchi qadam',desc:'Birinchi darsni tugatdingiz',ok:()=>lessonsDone()>=1},
 {id:'perfect',icon:'💯',name:'Mukammal',desc:'Bitta darsda 18/18',ok:()=>Object.values(P.units).some(u=>u.score>=18)},
 {id:'shadow1',icon:'🎧',name:'Birinchi shadowing',desc:'Birinchi shadowingni tugatdingiz',ok:()=>Object.keys(P.shadow).length>=1},
 {id:'streak3',icon:'🔥',name:'3 kun ketma-ket',desc:'3 kun uzluksiz shugʻullandingiz',ok:()=>bestStreak()>=3},
 {id:'streak7',icon:'⚡',name:'7 kun ketma-ket',desc:'Bir hafta uzluksiz!',ok:()=>bestStreak()>=7},
 {id:'words50',icon:'📚',name:'50 soʻz',desc:'Takrorlashda 50 marta toʻgʻri topdingiz',ok:()=>(P.srsCorrect||0)>=50},
 {id:'day5',icon:'🥉',name:'5 kun',desc:'1–5-kunlar tugallandi',ok:()=>daysDoneThrough(5),cert:5},
 {id:'day10',icon:'🥈',name:'10 kun',desc:'1–10-kunlar tugallandi',ok:()=>daysDoneThrough(10),cert:10},
 {id:'half',icon:'🏅',name:'Yarim yoʻl',desc:'17 ta dars tugallandi',ok:()=>lessonsDone()>=17},
 {id:'day20',icon:'🥇',name:'20 kun',desc:'1–20-kunlar tugallandi',ok:()=>daysDoneThrough(20),cert:20},
 {id:'shadow10',icon:'🎙️',name:'Shadowing ustasi',desc:'10 kunlik shadowing',ok:()=>Object.keys(P.shadow).length>=10},
 {id:'final',icon:'🎓',name:'Bitiruvchi',desc:'Yakuniy testdan oʻtdingiz',ok:()=>!!(P.test&&P.test.score>=CFG.testPass),cert:25},
];
function bestStreak(){const s=streak();if(s>(P.bestStreak||0)){P.bestStreak=s;save();}return P.bestStreak||0;}
let badgeQueue=[];
function checkBadges(){P.badges=P.badges||[];const fresh=BADGES.filter(b=>!P.badges.includes(b.id)&&b.ok());if(!fresh.length)return;fresh.forEach(b=>P.badges.push(b.id));save();sync();badgeQueue.push(...fresh);if(!$('#badgeModal'))showNextBadge();}
function showNextBadge(){const b=badgeQueue.shift();if(!b)return;Sound.win();const m=document.createElement('div');m.id='badgeModal';m.className='modal';
m.innerHTML=`<div class="mbox"><div class="bicon">${b.icon}</div><div class="mt">Yangi nishon!</div><h2>${esc(b.name)}</h2><p>${esc(b.desc)}</p><div class="toolbar" style="justify-content:center;margin:12px 0 0">${b.cert?`<button class="btn ghost" onclick="closeBadge();go('sertifikat/${b.cert}')">🎖️ Sertifikat</button>`:''}<button class="btn" onclick="closeBadge()">Zoʻr!</button></div></div>`;
document.body.appendChild(m);confetti();}
function closeBadge(){const m=$('#badgeModal');if(m)m.remove();setTimeout(showNextBadge,250);}
function viewBadges(){P.badges=P.badges||[];render(`${topbar('profile','Nishonlar')}<h2 class="sec">Nishonlar</h2><p class="sub">${P.badges.length}/${BADGES.length} ta yigʻildi. Har bir nishon — botga ham tabrik keladi.</p>
<div class="badges">${BADGES.map(b=>{const has=P.badges.includes(b.id);return `<div class="bd ${has?'has':''}"><div class="bi">${has?b.icon:'🔒'}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`;}).join('')}</div>${foot()}`);}

/* ----- Sounds (WebAudio, no files) ----- */
const Sound={ctx:null,
 _c(){if(P.sound===false)return null;try{this.ctx=this.ctx||new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();return this.ctx;}catch(e){return null;}},
 tone(f,t0,d,type='sine',v=0.18){const c=this._c();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,c.currentTime+t0);g.gain.linearRampToValueAtTime(v,c.currentTime+t0+0.01);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+t0+d);o.connect(g).connect(c.destination);o.start(c.currentTime+t0);o.stop(c.currentTime+t0+d+0.05);},
 ok(){this.tone(880,0,0.12);this.tone(1320,0.09,0.18);},
 bad(){this.tone(196,0,0.22,'triangle',0.16);},
 combo(){[784,988,1175,1568].forEach((f,i)=>this.tone(f,i*0.07,0.16));},
 win(){[523,659,784,1047,1319].forEach((f,i)=>this.tone(f,i*0.09,0.25));}};

/* ----- Exercise upgrades: sound, combo, hint, mistakes ----- */
const _mark=mark;
mark=function(key,ok){if(!EX.wrong)EX.wrong=[];if(EX.combo==null)EX.combo=0;
 const val=ok?(EX.hinted&&EX.hinted[key]?0.5:1):0;
 if(ok){EX.combo++;if([3,5,8,12].includes(EX.combo)){Sound.combo();toast(`🔥 Combo ×${EX.combo}!`);}else Sound.ok();}else{EX.combo=0;Sound.bad();}
 EX.answers[key]=val;buzz(ok?20:[40,40,40]);const n=Object.keys(EX.answers).length;const s=Object.values(EX.answers).reduce((a,b)=>a+b,0);
 const pb=$('#pbn');if(pb){pb.textContent=`${n}/18`;$('#pbi').style.width=(n/18*100)+'%';$('#pbs').textContent=`${s} ✓${EX.combo>=3?' 🔥'+EX.combo:''}`;}
 if(n>=EX.total)finishEx();};
function noteWrong(q,a){if(!EX.wrong)EX.wrong=[];EX.wrong.push({q,a});}
const _ansChoice=ansChoice;
ansChoice=function(pre,i,j,a){const q=$('#'+pre+i);if(q.dataset.done)return;const u=window._ex;const it=(pre==='c'?u.exercises.choice:u.exercises.text)[i];if(j!==a)noteWrong(it.q,it.o[a]);_ansChoice(pre,i,j,a);};
const _checkOrder=checkOrder;
checkOrder=function(i){const q=$('#o'+i);if(q.dataset.done)return;const built=[...$('#ob'+i).querySelectorAll('.chip')].map(x=>x.textContent).join(' ');const a=q.dataset.a;const norm=s=>s.toLowerCase().replace(/[.!?,]/g,'').replace(/\s+/g,' ').trim();if(built&&norm(built)!==norm(a))noteWrong('Gap tuzish: '+built,a);_checkOrder(i);};
const _checkFill=checkFill;
checkFill=function(i){const q=$('#f'+i);if(q.dataset.done)return;const it=window._ex.exercises.fill[i];const v=$('#fi'+i).value.trim();const norm=s=>s.toLowerCase().replace(/[.!?]/g,'').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();if(v&&!it.a.some(x=>norm(x)===norm(v)))noteWrong(it.q.replace('___','____'),it.a[0]);_checkFill(i);};
function hintFill(i){const q=$('#f'+i);if(q.dataset.done)return;const it=window._ex.exercises.fill[i];EX.hinted=EX.hinted||{};EX.hinted['f'+i]=true;const a=it.a[0];const inp=$('#fi'+i);inp.placeholder=a[0]+'…'.repeat(1)+` (${a.length} harf)`;inp.focus();const hb=$('#hb'+i);if(hb){hb.disabled=true;hb.textContent='💡 0.5 ball';}}
const _renderEx=renderEx;
renderEx=function(u){_renderEx(u);EX.wrong=[];EX.combo=0;EX.hinted={};
 u.exercises.fill.forEach((it,i)=>{const row=$('#f'+i+' .fillrow');if(row){const b=document.createElement('button');b.className='btn ghost';b.id='hb'+i;b.textContent='💡';b.title='Maslahat (javob 0.5 ball)';b.onclick=()=>hintFill(i);row.insertBefore(b,row.lastElementChild);}});};
const _finishEx=finishEx;
finishEx=function(){_finishEx();const res=$('#res .result');if(res&&EX.wrong&&EX.wrong.length){const score=Object.values(EX.answers).reduce((a,b)=>a+b,0);const must=score<CFG.passScore;const nb=$('#nextbtn');if(must&&nb){nb.disabled=true;nb.title='Avval xatolarni koʻrib chiqing';}
  const box=document.createElement('div');box.className='card mistakes';box.innerHTML=`<h3>Xatolar tahlili (${EX.wrong.length})</h3><p class="note" style="margin:0 0 8px">Har bir xatoni toʻgʻri javob bilan solishtiring — qoida shu yerda eslab qolinadi.</p>${EX.wrong.map(w=>`<div class="mk"><div>${esc(w.q)}</div><div class="ma">✓ ${esc(w.a)}</div></div>`).join('')}<div class="toolbar" style="margin:10px 0 0"><button class="btn ghost" onclick="viewUnit(${EX.id},'rule')">📖 Qoidani qayta oʻqish</button>${must?`<button class="btn" onclick="const b=$('#nextbtn');if(b){b.disabled=false;b.title='';}this.textContent='✓ Koʻrib chiqildi';this.disabled=true;toast('Endi davom etishingiz mumkin');b&&b.scrollIntoView({behavior:'smooth',block:'center'})">✓ Tushundim, davom etaman</button>`:''}</div>`;res.after(box);if(must)setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'start'}),600);}
 if(EX.combo>=18)toast('🏆 Hammasi birinchi urinishda toʻgʻri!');setTimeout(checkBadges,900);};

/* ----- Shadowing / test completion hooks ----- */
const _ansTest=ansTest;
ansTest=function(i,j,a){_ansTest(i,j,a);if(j===a)Sound.ok();else Sound.bad();if(T&&Object.keys(T.answers).length===T.items.length)setTimeout(checkBadges,900);};
// watch shadowing completion (P.shadow changes) — checked when the result block appears
new MutationObserver(()=>{const r=$('#shres .result');if(r&&!r.dataset.checked){r.dataset.checked=1;setTimeout(checkBadges,900);}}).observe(document.getElementById('app'),{childList:true,subtree:true});

/* ----- Spaced repetition: daily word review ----- */
const SRS_DAYS=[0,1,2,4,7,15,30];
function srsPool(){const out=[];DAYS.forEach(d=>{if(d.day>openDay())return;d.units.forEach(u=>{const seen=P.seen&&P.seen[u.id]&&(P.seen[u.id].words||P.seen[u.id].ex);if(!seen&&unitScore(u.id)==null)return;u.words.forEach(w=>out.push({en:w.en,uz:w.uz,unit:u.id}));});});return out;}
function srsDue(){P.srs=P.srs||{};const now=Date.now();return srsPool().filter(w=>{const s=P.srs[w.en];return !s||s.due<=now;});}
let RV=null;
function viewReview(){const due=srsDue();const pool=srsPool();
 if(pool.length<4){render(`${topbar('home','Takrorlash')}<div class="card" style="text-align:center"><div style="font-size:44px">📚</div><h2 class="sec">Hali soʻz yoʻq</h2><p class="sub">Birinchi darsning «Soʻzlar» boʻlimini ochganingizdan keyin takrorlash boshlanadi.</p><button class="btn" onclick="go('home')">Darslarga</button></div>${foot()}`);return;}
 if(!due.length){render(`${topbar('home','Takrorlash')}<div class="card" style="text-align:center"><div style="font-size:44px">✅</div><h2 class="sec">Bugungi takrorlash tugadi</h2><p class="sub">Keyingi soʻzlar ertaga keladi. Jami toʻgʻri javoblar: <b>${P.srsCorrect||0}</b>.</p><button class="btn" onclick="go('home')">Bosh sahifa</button></div>${foot()}`);return;}
 RV={items:shuffle(due).slice(0,10),i:0,ok:0,pool};nextReview();}
function nextReview(){if(RV.i>=RV.items.length){Sound.win();confetti();render(`${topbar('home','Takrorlash')}<div class="result"><div class="big">${RV.ok}/${RV.items.length}</div><p>Takrorlash tugadi! Har bir toʻgʻri javob +2 ball.</p><div class="toolbar" style="justify-content:center;margin:0"><button class="btn" onclick="go('home')">Bosh sahifa</button>${srsDue().length?`<button class="btn" onclick="viewReview()">Yana 10 ta ›</button>`:''}</div></div>${foot()}`);checkBadges();sync();return;}
 const w=RV.items[RV.i];const wrong=shuffle(RV.pool.filter(x=>x.uz!==w.uz)).slice(0,3).map(x=>x.uz);const opts=shuffle([w.uz,...wrong]);
 render(`${topbar('home','Takrorlash')}<div class="progressbar" style="position:static;margin:0 0 14px"><span>${RV.i+1}/${RV.items.length}</span><div class="bar"><i style="width:${RV.i/RV.items.length*100}%"></i></div><span>${RV.ok} ✓</span></div>
 <div class="card rv"><div class="rvw">${esc(w.en)}</div>${spkBtn(w.en,0.85)}<div class="note">Unit ${w.unit} · tarjimasini tanlang</div></div>
 <div class="rvopts">${opts.map(o=>`<button class="opt" onclick="ansReview(this,${JSON.stringify(o===w.uz)})">${esc(o)}</button>`).join('')}</div>${foot()}`);
 setTimeout(()=>TTS.speak(w.en,0.85),250);}
function ansReview(btn,ok){if(btn.parentNode.dataset.done)return;btn.parentNode.dataset.done=1;const w=RV.items[RV.i];P.srs=P.srs||{};const s=P.srs[w.en]||{b:0};
 btn.parentNode.querySelectorAll('.opt').forEach(b=>{b.disabled=true;if(b.textContent===w.uz)b.classList.add('good');});
 if(ok){RV.ok++;s.b=Math.min(SRS_DAYS.length-1,(s.b||0)+1);P.srsCorrect=(P.srsCorrect||0)+1;Sound.ok();buzz(20);}else{btn.classList.add('badp');s.b=0;Sound.bad();buzz([40,40,40]);RV.items.push(w);}
 s.due=Date.now()+SRS_DAYS[s.b]*864e5-36e5;P.srs[w.en]=s;markActive();save();RV.i++;setTimeout(nextReview,ok?650:1300);}

/* ----- Leaderboard ----- */
async function viewLeaderboard(){render(`${topbar('home','Reyting')}<h2 class="sec">🏆 Reyting</h2><p class="sub">Ball: dars ×10, shadowing +50, soʻz takrorlash +2, yakuniy test ×5. Har yakshanba eng faol 5 kishi botda eʼlon qilinadi.</p>
<div class="card lbme"><div><small>Sizning ballingiz</small><b>${myPoints()}</b></div><div><small>Oʻrningiz</small><b id="myrank">…</b></div><div><small>🔥 Seriya</small><b>${streak()}</b></div></div><div id="team"></div><h3 class="sec" style="font-size:17px;margin:14px 0 6px">Umumiy reyting</h3><div id="lb" class="card"><p class="note">Yuklanmoqda…</p></div>${foot()}`);
 if(DEMO()||!P.code){$('#lb').innerHTML='<p class="note">Reyting kod bilan kirganda koʻrinadi.</p>';return;}
 try{await sync();const r=await fetch(`${API}/leaderboard?code=${encodeURIComponent(P.code)}`,{cache:'no-store'});const j=await r.json();if(!j.ok)throw 0;
  $('#myrank').textContent=j.me?`${j.me.rank}/${j.total}`:'—';
  if(j.team&&j.team.length>1){const role={ref:'taklif qilgan',inv:'siz taklif qildingiz',sib:'jamoadosh'};$('#team').innerHTML=`<h3 class="sec" style="font-size:17px;margin:0 0 6px">👥 Sizning jamoangiz</h3><p class="sub" style="margin:0 0 8px">Siz va doʻstlaringiz — kim oldinda?</p><div class="card">${j.team.map((x,i)=>`<div class="lbr ${x.me?'me':''}"><span class="lbn">${i+1}</span><span class="lbname">${esc(x.name)}${x.me?' (siz)':''}<small style="display:block;color:var(--muted,#6b7a99);font-weight:400">${x.me?'':role[x.role]||''}</small></span><span class="lbs">${x.lessons} dars</span><b>${x.points}</b></div>`).join('')}</div>`;}
  const md=['🥇','🥈','🥉'];$('#lb').innerHTML=j.top.length?j.top.map((x,i)=>`<div class="lbr ${x.me?'me':''}"><span class="lbn">${md[i]||i+1}</span><span class="lbname">${esc(x.name)}${x.me?' (siz)':''}</span><span class="lbs">${x.streak?'🔥'+x.streak+' · ':''}${x.lessons} dars</span><b>${x.points}</b></div>`).join(''):'<p class="note">Hali hech kim ball toʻplamadi — birinchi boʻling!</p>';}
 catch(e){$('#lb').innerHTML='<p class="note">Reytingni yuklab boʻlmadi. Internetni tekshiring.</p>';}}

/* ----- Certificates (canvas → PNG) ----- */
function certInfo(n){if(n===25)return{ok:!!(P.test&&P.test.score>=CFG.testPass),title:'BEGINNER 25 — BITIRUVCHI',line:`Yakuniy test: ${P.test?P.test.score:0}/40`,sub:'25 kunlik «Ingliz tili 0 dan» kursini muvaffaqiyatli tugatdi'};
 return{ok:daysDoneThrough(n),title:`${n} KUNLIK MARRA`,line:`${lessonsDone()} ta dars · ${Object.keys(P.shadow).length} ta shadowing`,sub:`«Ingliz tili 0 dan» kursining 1–${n}-kunlarini tugatdi`};}
function loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});}
async function drawCert(n){const ci=certInfo(n);const W=1080,H=1350;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#1E9BE6');g.addColorStop(0.65,'#0B3FAF');g.addColorStop(1,'#072A78');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.fillStyle='rgba(255,255,255,0.06)';x.beginPath();x.ellipse(W*0.5,H*1.05,W*0.9,H*0.38,0,0,Math.PI*2);x.fill();
 x.fillStyle='#fff';const r=36;x.beginPath();x.roundRect?x.roundRect(60,60,W-120,H-120,r):x.rect(60,60,W-120,H-120);x.fill();
 x.strokeStyle='#1E9BE6';x.lineWidth=6;x.beginPath();x.roundRect?x.roundRect(84,84,W-168,H-168,24):x.rect(84,84,W-168,H-168);x.stroke();
 const em=await loadImg(EMBLEM);if(em){const h=170,w=h*em.width/em.height;x.drawImage(em,(W-w)/2,130,w,h);}
 x.textAlign='center';x.fillStyle='#0B3FAF';x.font='700 40px Georgia, serif';x.fillText('Imamov Academy',W/2,350);
 x.fillStyle='#1E9BE6';x.font='800 30px Inter, system-ui, sans-serif';x.fillText('SERTIFIKAT',W/2,430);
 x.fillStyle='#13203D';x.font='800 54px Inter, system-ui, sans-serif';x.fillText(ci.title,W/2,510);
 x.fillStyle='#4A5A7A';x.font='500 30px Inter, system-ui, sans-serif';x.fillText('Ushbu sertifikat bilan tasdiqlanadiki,',W/2,600);
 x.fillStyle='#0B3FAF';let fs=84;x.font=`700 ${fs}px Georgia, serif`;while(x.measureText(P.name||'').width>W-260&&fs>40){fs-=4;x.font=`700 ${fs}px Georgia, serif`;}x.fillText(P.name||'Oʻquvchi',W/2,700);
 x.strokeStyle='#D9E1EF';x.lineWidth=3;x.beginPath();x.moveTo(240,735);x.lineTo(W-240,735);x.stroke();
 x.fillStyle='#4A5A7A';x.font='500 30px Inter, system-ui, sans-serif';wrapText(x,ci.sub+'.',W/2,800,W-280,42);
 x.fillStyle='#13203D';x.font='700 34px Inter, system-ui, sans-serif';x.fillText(ci.line,W/2,920);
 x.fillStyle='#1E9BE6';x.font='700 30px Inter, system-ui, sans-serif';x.fillText(`🔥 ${P.bestStreak||streak()} kun ketma-ket · ${myPoints()} ball`,W/2,975);
 const d=new Date();x.fillStyle='#4A5A7A';x.font='500 26px Inter, system-ui, sans-serif';x.textAlign='left';x.fillText('Sana: '+d.toLocaleDateString('uz-UZ'),150,1150);
 x.textAlign='right';x.fillStyle='#13203D';x.font='italic 700 34px Georgia, serif';x.fillText('Jamshid Ahatqulov',W-150,1140);x.fillStyle='#4A5A7A';x.font='500 22px Inter, system-ui, sans-serif';x.fillText('Kurs muallifi va oʻqituvchisi',W-150,1175);
 x.textAlign='center';x.fillStyle='#1E9BE6';x.font='700 24px Inter, system-ui, sans-serif';x.fillText('t.me/jamshid_akhatkulov_en',W/2,1235);
 return c;}
function wrapText(x,t,cx,y,maxW,lh){const words=t.split(' ');let line='';for(const w of words){const test=line?line+' '+w:w;if(x.measureText(test).width>maxW&&line){x.fillText(line,cx,y);line=w;y+=lh;}else line=test;}if(line)x.fillText(line,cx,y);}
async function viewCert(n){const ci=certInfo(n);if(!ci.ok){render(`${topbar('profile','Sertifikat')}<div class="card" style="text-align:center"><div style="font-size:44px">🔒</div><h2 class="sec">Hali ochilmagan</h2><p class="sub">${n===25?'Yakuniy testdan oʻting':`1–${n}-kunlarning hamma darslari va shadowinglarini tugating`} — sertifikat shu yerda paydo boʻladi.</p></div>${foot()}`);return;}
 render(`${topbar('profile','Sertifikat')}<h2 class="sec">🎖️ Sertifikat</h2><p class="sub">Yuklab oling va doʻstlaringizga, oilangizga ulashing!</p><div class="card" style="padding:10px"><img id="certimg" alt="Sertifikat" style="width:100%;border-radius:12px;display:block"></div>
 <div class="toolbar"><button class="btn" onclick="shareCert(${n})">📤 Ulashish</button><button class="btn ghost" onclick="downloadCert(${n})">⬇️ Yuklab olish</button></div>${n===25?`<div class="card"><h3 style="color:var(--royal);font-size:18px">🎓 Keyingi bosqich — Imamov Academy Elementary</h3><p style="margin:6px 0 12px">Noldan boshladingiz, 25 kunni bosib oʻtdingiz. Endi Elementary bosqichida gapirishni boshlaymiz. Kurs bitiruvchilari uchun <b>1-dars bepul</b> va maxsus shartlar.</p><div class="toolbar" style="margin:0"><a class="btn" href="https://t.me/${BOT}?start=keyingi" target="_blank" rel="noopener">📝 Yozilish (1-dars bepul)</a><a class="btn ghost" href="https://t.me/jamshid_akhatkulov" target="_blank" rel="noopener">Ustozga yozish</a></div></div>`:''}${foot()}`);
 const c=await drawCert(n);$('#certimg').src=c.toDataURL('image/png');}
async function certBlob(n){const c=await drawCert(n);return new Promise(r=>c.toBlob(r,'image/png'));}
async function downloadCert(n){const b=await certBlob(n);const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`sertifikat-${n}.png`;document.body.appendChild(a);a.click();a.remove();}
async function shareCert(n){const b=await certBlob(n);const f=new File([b],`sertifikat-${n}.png`,{type:'image/png'});const text='Men «Ingliz tili 0 dan» kursida! Imamov Academy — t.me/jamshid_akhatkulov_en';
 if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],text});}catch(e){}}else{downloadCert(n);toast('Rasm yuklandi — Telegram/Instagram’ga ulashing');}}

/* ----- Theme & font size ----- */
function applyPrefs(){const t=P.theme||'auto';if(t==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('bigtext',!!P.big);}
function setTheme(t){P.theme=t;save();applyPrefs();viewProfile();}
function setBig(v){P.big=v;save();applyPrefs();viewProfile();}
function setSound(v){P.sound=v;save();if(v)Sound.ok();viewProfile();}

/* ----- Time tracking ----- */
const todayKey=()=>new Date().toISOString().slice(0,10);
function markActive(){P.lastActive=Date.now();}
setInterval(()=>{if(document.hidden||!P.code)return;if(P.lastActive&&Date.now()-P.lastActive>3*60e3)return;P.time=P.time||{};const k=todayKey();P.time[k]=(P.time[k]||0)+15;P.seconds=(P.seconds||0)+15;save();},15000);
['click','keydown','touchstart','scroll'].forEach(e=>document.addEventListener(e,markActive,{passive:true}));
function todayMin(){return Math.round(((P.time||{})[todayKey()]||0)/60);}

/* ----- Read-along (word by word) on the Text tab ----- */
let RA=null;
function readAlong(){const box=$('#txt');if(!box)return;if(RA){stopRA();return;}
 const spans=[...box.querySelectorAll('.w,.nw')];if(!spans.length)return;let text='',starts=[];spans.forEach(s=>{starts.push(text.length);text+=s.textContent+' ';});
 const btn=$('#rabtn');if(btn)btn.textContent='■ Toʻxtatish';let got=false;RA={spans,timer:null};
 const hl=i=>{spans.forEach(s=>s.classList.remove('ra'));if(spans[i]){spans[i].classList.add('ra');}};
 const rate=0.8;
 const p=TTS.speak(text,rate,{raw:true,onb:e=>{if(e.name&&e.name!=='word')return;got=true;let i=starts.findIndex((st,k)=>e.charIndex>=st&&(k===starts.length-1||e.charIndex<starts[k+1]));if(i>=0)hl(i);}});
 // Fallback when the voice gives no word boundaries: highlight by estimated timing
 setTimeout(()=>{if(got||!RA)return;let i=0;const step=()=>{if(!RA)return;hl(i);const ms=Math.max(260,spans[i].textContent.length*75/rate+120);i++;RA.timer=setTimeout(i<spans.length?step:stopRA,ms);};step();},700);
 p.then(()=>{if(got)stopRA();});}
function stopRA(){if(!RA)return;clearTimeout(RA.timer);RA.spans.forEach(s=>s.classList.remove('ra'));RA=null;TTS.stop();const b=$('#rabtn');if(b)b.textContent='▶ Soʻzma-soʻz oʻqish';}
window.addEventListener('hashchange',()=>{if(RA)stopRA();});

/* ----- Dictionary ----- */
function viewDict(){const words=[];DAYS.forEach(d=>{if(d.day>openDay())return;d.units.forEach(u=>u.words.forEach(w=>words.push({...w,unit:u.id,day:d.day})));});
 render(`${topbar('home','Lugʻat')}<h2 class="sec">📖 Lugʻat</h2><p class="sub">Ochiq kunlardagi ${words.length} ta soʻz. Qidiruv butun lugʻatdan (${Object.keys(G).length} soʻz) ham izlaydi.</p>
 <input class="search" id="dq" placeholder="Qidirish: inglizcha yoki oʻzbekcha…" oninput="filterDict()" autocomplete="off"><div id="dl" class="dict"></div>${foot()}`);
 window._dict=words;filterDict();}
function filterDict(){const q=($('#dq').value||'').trim().toLowerCase();let list=window._dict;
 if(q){list=list.filter(w=>w.en.toLowerCase().includes(q)||w.uz.toLowerCase().includes(q));if(q.length>=2){const have=new Set(list.map(w=>w.en.toLowerCase()));Object.entries(G).forEach(([en,uz])=>{if(!have.has(en)&&(en.includes(q)||String(uz).toLowerCase().includes(q)))list.push({en,uz,unit:null});});}}
 $('#dl').innerHTML=list.slice(0,200).map(w=>`<div class="dw"><div><b>${esc(w.en)}</b><span>${esc(w.uz)}</span></div>${w.unit?`<small>U${w.unit}</small>`:''}${spkBtn(w.en,0.85)}</div>`).join('')||'<p class="note">Topilmadi.</p>';}

/* ----- Patch existing views: home cards, profile, text tab, routes, sync payload ----- */
const _viewHome=viewHome;
viewHome=function(){_viewHome();const hero=document.querySelector('.card.hero');if(!hero)return;const due=srsDue().length;
 const el=document.createElement('div');el.className='quick';
 el.innerHTML=`<button class="qc" onclick="go('takror')"><span class="qi">🧠</span><span><b>Soʻz takrorlash</b><small>${due?due+' ta soʻz kutmoqda':'Bugun tayyor ✓'}</small></span>${due?`<em>${due}</em>`:''}</button>
 <button class="qc" onclick="go('reyting')"><span class="qi">🏆</span><span><b>Reyting</b><small>${myPoints()} ball</small></span></button>
 <button class="qc" onclick="go('lugat')"><span class="qi">📖</span><span><b>Lugʻat</b><small>soʻzlar va qidiruv</small></span></button>
 <button class="qc" onclick="go('nishon')"><span class="qi">🏅</span><span><b>Nishonlar</b><small>${(P.badges||[]).length}/${BADGES.length}</small></span></button>`;
 hero.after(el);const p=hero.querySelector('p');if(p&&todayMin())p.insertAdjacentHTML('beforeend',` · ⏱ bugun ${todayMin()} daq`);};
const _viewProfile=viewProfile;
viewProfile=function(){_viewProfile();const first=document.querySelector('.view .card');if(!first)return;
 const certs=[5,10,15,20,25].map(n=>{const ok=certInfo(n).ok;return `<button class="cert ${ok?'ok':''}" onclick="go('sertifikat/${n}')"><span>${ok?'🎖️':'🔒'}</span>${n===25?'Bitiruvchi':n+' kun'}</button>`;}).join('');
 const t=P.theme||'auto';
 first.insertAdjacentHTML('afterend',`<div class="card"><h3 class="ph3">Yutuqlar</h3><div class="toolbar" style="margin:0"><button class="btn ghost" onclick="go('nishon')">🏅 Nishonlar ${(P.badges||[]).length}/${BADGES.length}</button><button class="btn ghost" onclick="go('reyting')">🏆 Reyting · ${myPoints()} ball</button></div>
 <h3 class="ph3" style="margin-top:14px">Sertifikatlar</h3><div class="certs">${certs}</div>
 <p class="note">Jami oʻqish vaqti: ${Math.round((P.seconds||0)/60)} daqiqa · eng uzun seriya: 🔥 ${bestStreak()} kun</p></div>
 <div class="card"><h3 class="ph3">Sozlamalar</h3>
 <div class="setrow"><span>Mavzu</span><span class="seg">${[['auto','Avto'],['light','Yorugʻ'],['dark','Qorongʻi']].map(([k,l])=>`<button class="${t===k?'on':''}" onclick="setTheme('${k}')">${l}</button>`).join('')}</span></div>
 <div class="setrow"><span>Matn kattaligi</span><span class="seg"><button class="${!P.big?'on':''}" onclick="setBig(false)">Oddiy</button><button class="${P.big?'on':''}" onclick="setBig(true)">Katta</button></span></div>
 <div class="setrow"><span>Ovozli effektlar</span><span class="seg"><button class="${P.sound!==false?'on':''}" onclick="setSound(true)">Yoqilgan</button><button class="${P.sound===false?'on':''}" onclick="setSound(false)">Oʻchiq</button></span></div></div>`);};
const _viewUnit=viewUnit;
viewUnit=function(id,tab){_viewUnit(id,tab);if(tab==='text'){const tb=document.querySelector('#pane .card .toolbar');if(tb)tb.insertAdjacentHTML('afterend',`<button class="btn ghost" id="rabtn" style="margin-bottom:10px" onclick="readAlong()">▶ Soʻzma-soʻz oʻqish</button>`);}};
const _route=route;
route=function(){const h=location.hash.replace('#','').replace(/^(all|demo)\/?/,'');const [k,a]=h.split('/');
 if(P.code||DEMO()){if(k==='reyting')return (TTS.stop(),window.scrollTo(0,0),viewLeaderboard());if(k==='takror')return (TTS.stop(),window.scrollTo(0,0),viewReview());if(k==='lugat')return (TTS.stop(),window.scrollTo(0,0),viewDict());if(k==='nishon')return (window.scrollTo(0,0),viewBadges());if(k==='sertifikat')return (window.scrollTo(0,0),viewCert(+a||25));}
 return _route();};
sync=async function(){if(!P.code||DEMO())return;P.dirty=true;save();if(!navigator.onLine)return;
 try{const r=await fetch(`${API}/progress`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:P.code,name:P.name,units:P.units,shadow:P.shadow,test:P.test,badges:P.badges||[],streak:streak(),srsCorrect:P.srsCorrect||0,seconds:P.seconds||0})});const j=await r.json();if(j.ok){P.dirty=false;P.syncedAt=Date.now();save();}}catch(e){}};
// streak should also count review days
const _streak=streak;
streak=function(){const days=new Set();Object.values(P.units).forEach(u=>{if(u.at)days.add(new Date(u.at).toDateString());});Object.values(P.shadowAt||{}).forEach(t=>days.add(new Date(t).toDateString()));Object.keys(P.time||{}).forEach(k=>{if((P.time[k]||0)>=300)days.add(new Date(k+'T12:00:00').toDateString());});
 let n=0;const d=new Date();if(!days.has(d.toDateString()))d.setDate(d.getDate()-1);while(days.has(d.toDateString())){n++;d.setDate(d.getDate()-1);}return n;};

/* ===== Boot ===== */
applyPrefs();initHistory();route();refreshOpenDay();setTimeout(()=>{const sp=$('#splash');if(sp){sp.classList.add('off');setTimeout(()=>sp.remove(),500);}},isStandalone()?650:350);if(P.dirty)sync();setTimeout(checkBadges,1500);
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{});}
