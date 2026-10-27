import { initPage, supabase, esc, avatar, showToast } from './common.js';
import { guestToken, guestMode, inviteGuest } from './guest.js';
import { gameSplash } from './gamesplash.js';

/* ================= הכנה: בן משפחה או אורח ================= */
const GT = guestToken();
let profiles = [], me, gid = new URLSearchParams(location.search).get('g'), gcall = null;
// ספלאש הפתיחה נבנה לפני שמחכים לרשת, כדי שיופיע מיד בכל כניסה למשחק
const cx = s => s.split(' ').map(x => 'st-' + x).join(' ');
const $ = id => document.getElementById(id);
function mkSplash() {
  const sp = document.createElement('div');
  sp.className = cx('splash'); sp.id = 'splash'; sp.setAttribute('role', 'button'); sp.tabIndex = 0; sp.setAttribute('aria-label', 'פתיחת המשחק, לחץ כדי לדלג');
  sp.innerHTML = '<div class="st-sp-art"></div><div class="st-sp-skip" id="spHint">לחץ כדי להתחיל</div>';
  document.body.append(sp);
}
if (!GT) mkSplash();
if (GT) { gameSplash('stratego-splash.jpg'); const g = await guestMode('st', GT); me = g.me; gid = g.ref; gcall = g.call; }
else {
  const r = await initPage({ active: 'games', title: 'Royal Front' });
  profiles = r.profiles || [];
  me = profiles.find(p => p.id === r.session.user.id) || { id: r.session.user.id, name: '' };
}
const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
byId[me.id] = byId[me.id] || me;
const root = $('st');
const call = (fn, args) => GT ? gcall(fn, args) : supabase.rpc(fn, args);
const soundOn = () => { try { return localStorage.getItem('soundOff') !== '1'; } catch (_) { return true; } };
const nm = id => (byId[id] && byId[id].name) || 'שחקן';

/* ================= נתוני הכלים ================= */
var N = 10, LAKE = {};
[4, 5].forEach(function (r) { [2, 3, 6, 7].forEach(function (c) { LAKE[r * N + c] = 1; }); });
var NAMES = { 0: 'דגל', 1: 'מרגל', 2: 'סייר', 3: 'חבלן', 4: 'סמל', 5: 'סגן', 6: 'סרן', 7: 'רב-סרן', 8: 'קולונל', 9: 'גנרל', 10: 'מרשל', 11: 'פצצה' };
var COUNTS = { 0: 1, 1: 1, 2: 8, 3: 5, 4: 4, 5: 4, 6: 4, 7: 3, 8: 2, 9: 1, 10: 1, 11: 6 };
var SPECIAL = { 0: 'לתפוס אותו מנצח את המשחק', 1: 'מנצח מרשל רק כשהוא תוקף', 2: 'זז כמה משבצות בקו ישר', 3: 'מנטרל פצצות', 11: 'לא זזה. מפילה כל מי שנוגע בה, חוץ מחבלן' };
// קוד בשרת <-> דרגה בציור: F דגל, B פצצה, X מרשל (10), 1-9 לפי הדרגה
const R = c => c === 'F' ? 0 : c === 'B' ? 11 : c === 'X' ? 10 : +c;
const CODE = r => r === 0 ? 'F' : r === 11 ? 'B' : r === 10 ? 'X' : String(r);
const CNT = { F: 1, B: 6, '1': 1, '2': 8, '3': 5, '4': 4, '5': 4, '6': 4, '7': 3, '8': 2, '9': 1, X: 1 };

/* איורים מקוריים של הכלים: כוכבים, פסים ודרגות לקצינים, וסמלים לכלים המיוחדים */
function starPts(cx,cy,R,r){var a=[];for(var i=0;i<10;i++){var ang=-Math.PI/2+i*Math.PI/5,rad=i%2?r:R;a.push((cx+rad*Math.cos(ang)).toFixed(1)+','+(cy+rad*Math.sin(ang)).toFixed(1));}return a.join(' ');}
function star(cx,cy,R){return '<polygon points="'+starPts(cx,cy,R,R*0.45)+'" fill="#ffd23f" stroke="#7a5a00" stroke-width="1.5" stroke-linejoin="round"/>';}
var GOLD='#ffd23f';
var ICONS={
 10:star(32,34,19)+'<path d="M13 46Q5 28 19 12M51 46Q59 28 45 12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="19" cy="12" r="3" fill="#fff"/><circle cx="45" cy="12" r="3" fill="#fff"/>',
 9:star(32,19,12)+star(18,42,12)+star(46,42,12),
 8:star(19,32,14)+star(45,32,14),
 7:star(32,33,22),
 6:'<rect x="9" y="11" width="46" height="9" rx="3" fill="#fff"/><rect x="9" y="27" width="46" height="9" rx="3" fill="#fff"/><rect x="9" y="43" width="46" height="9" rx="3" fill="#fff"/>',
 5:'<rect x="9" y="17" width="46" height="12" rx="3" fill="#fff"/><rect x="9" y="37" width="46" height="12" rx="3" fill="#fff"/>',
 4:'<g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,24 32,10 54,24"/><polyline points="10,38 32,24 54,38"/><polyline points="10,52 32,38 54,52"/></g>',
 3:'<path d="M17 54L44 22" stroke="#d9b27c" stroke-width="6" stroke-linecap="round"/><path d="M18 22Q32 6 52 22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><circle cx="52" cy="22" r="4" fill="#fff"/><circle cx="18" cy="22" r="4" fill="#fff"/>',
 2:'<rect x="9" y="22" width="18" height="8" rx="2" fill="#2b2b2b"/><rect x="37" y="22" width="18" height="8" rx="2" fill="#2b2b2b"/><rect x="26" y="32" width="12" height="7" fill="#2b2b2b"/><circle cx="18" cy="42" r="12" fill="#2b2b2b" stroke="#fff" stroke-width="3"/><circle cx="46" cy="42" r="12" fill="#2b2b2b" stroke="#fff" stroke-width="3"/><circle cx="18" cy="42" r="6" fill="#7fc4ff"/><circle cx="46" cy="42" r="6" fill="#7fc4ff"/><circle cx="15.5" cy="39.5" r="2" fill="#fff"/><circle cx="43.5" cy="39.5" r="2" fill="#fff"/>',
 1:'<path d="M17 31Q17 11 32 11Q47 11 47 31Z" fill="#fff"/><rect x="17" y="24" width="30" height="5" fill="#2b2b2b"/><ellipse cx="32" cy="31" rx="26" ry="6" fill="#fff"/><rect x="11" y="39" width="42" height="13" rx="6.5" fill="#1b1b1b"/><ellipse cx="22" cy="45.5" rx="5" ry="3.2" fill="#fff"/><ellipse cx="42" cy="45.5" rx="5" ry="3.2" fill="#fff"/>',
 11:'<circle cx="30" cy="38" r="19" fill="#1d1d1d" stroke="#fff" stroke-width="2.5"/><path d="M19 34Q22 25 31 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/><rect x="26" y="15" width="8" height="7" rx="2" fill="#888"/><path d="M33 15Q38 6 49 9" fill="none" stroke="#d9b27c" stroke-width="3" stroke-linecap="round"/><polygon points="'+starPts(51,9,7,3)+'" fill="#ff8a1f"/><polygon points="'+starPts(51,9,4,1.8)+'" fill="#ffe27a"/>',
 0:'<path d="M17 8V58" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M21 12Q34 6 40 12T58 12V34Q46 40 40 34T21 34Z" fill="#ffd23f" stroke="#7a5a00" stroke-width="2" stroke-linejoin="round"/><polygon points="'+starPts(39,23,6,2.7)+'" fill="#c0392b"/>'
};
function iconSvg(rank){return '<svg viewBox="0 0 64 64" aria-hidden="true">'+ICONS[rank]+'</svg>';}
function pieceInner(p){return iconSvg(p.rank)+((p.rank===0||p.rank===11)?'':'<span class="st-rk">'+p.rank+'</span>');}
function miniPiece(rank,side){return '<span class="st-mini st-piece st-'+(side||'p')+'">'+pieceInner({rank:rank})+'</span>';}



/* צלילים: נוצרים בדפדפן, בלי קבצים. מתחילים רק אחרי לחיצה ראשונה. */
var AC=null;
function ac(){
  if(!soundOn())return null;
  if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}
  if(AC.state==='suspended'){try{AC.resume();}catch(e){}}
  return AC;
}
function tone(f,d,type,vol,when,to){
  var c=ac();if(!c)return;var t=c.currentTime+(when||0),o=c.createOscillator(),g=c.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.15,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+0.03);
}
function noise(d,vol,when,f0,f1){
  var c=ac();if(!c)return;var t=c.currentTime+(when||0),n=Math.max(1,Math.floor(c.sampleRate*d)),buf=c.createBuffer(1,n,c.sampleRate),a=buf.getChannelData(0);
  for(var i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
  var src=c.createBufferSource();src.buffer=buf;var fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(f0||2000,t);fl.frequency.exponentialRampToValueAtTime(Math.max(40,f1||200),t+d);
  var g=c.createGain();g.gain.setValueAtTime(vol||0.2,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  src.connect(fl);fl.connect(g);g.connect(c.destination);src.start(t);
}
var sfx={
  tick:function(){tone(520,0.05,'triangle',0.1);},
  move:function(far){tone(240,0.09,'triangle',0.2,0,140);noise(0.05,0.1,0,1200,300);if(far){tone(180,0.22,'sine',0.08,0.02,420);}},
  hit:function(good){ // עימות רגיל: מנצח או מפסיד
    noise(0.12,0.28,0,3200,300);
    if(good){tone(660,0.14,'square',0.1,0.02);tone(990,0.2,'triangle',0.14,0.1);}
    else{tone(200,0.3,'sawtooth',0.14,0,70);}
  },
  clash:function(){noise(0.16,0.3,0,3500,250);tone(330,0.25,'square',0.09,0,110);tone(300,0.25,'square',0.09,0.02,100);},
  boom:function(mine){
    noise(0.85,0.55,0,2200,70);noise(0.35,0.3,0.05,5000,400);
    tone(120,0.7,'sine',0.5,0,34);tone(70,0.8,'sawtooth',0.12,0,28);
    var b=document.getElementById('stBoard');if(b){b.classList.remove('st-shake');void b.offsetWidth;b.classList.add('st-shake');}
  },
  defuse:function(){noise(0.06,0.18,0,5000,1500);[523,659,784,1047].forEach(function(f,i){tone(f,0.14,'triangle',0.16,0.08+i*0.07);});},
  flag:function(){noise(0.1,0.25,0,3000,300);[392,523,659,784].forEach(function(f,i){tone(f,0.22,'triangle',0.18,0.08+i*0.09);});},
  win:function(){[523,523,523,659,523,659,784].forEach(function(f,i){tone(f,i===6?0.55:0.14,'triangle',0.2,i*0.14);});tone(130,0.5,'sine',0.25,0.9);},
  lose:function(){[392,370,349,330].forEach(function(f,i){tone(f,0.3,'sawtooth',0.1,i*0.22,f*0.9);});tone(98,0.8,'sine',0.25,0.7,60);}
};




var WATER="stratego-water.jpg";
var LAKE_D={a:"M10 50C7 30 22 14 40 10C52 7 60 14 72 12C86 10 95 28 91 48C89 62 94 74 82 84C70 94 56 88 44 92C26 96 12 80 10 50Z",
            b:"M12 44C10 26 26 12 46 12C64 12 70 6 82 16C94 26 92 42 88 54C84 68 88 80 72 88C58 94 44 86 32 88C16 90 14 62 12 44Z"};
function lakeSvg(k){
  var d=LAKE_D[k];
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="lk'+k+'"><path d="'+d+'"/></clipPath></defs>'
   +'<path d="'+d+'" fill="#cdbb83" stroke="#cdbb83" stroke-width="7" stroke-linejoin="round"/>'
   +'<path d="'+d+'" fill="none" stroke="#a89560" stroke-width="7.6" stroke-linejoin="round" opacity=".35"/>'
   +'<g clip-path="url(#lk'+k+')"><image href="'+WATER+'" x="-6" y="-6" width="112" height="112" preserveAspectRatio="xMidYMid slice"/>'
   +'<path d="'+d+'" fill="none" stroke="#0a3f78" stroke-opacity=".55" stroke-width="11" stroke-linejoin="round"/>'
   +'<path d="'+d+'" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.2" stroke-linejoin="round" transform="translate(0 0)"/>'
   +'<ellipse class="st-rip" cx="38" cy="42" rx="16" ry="12" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>'
   +'<ellipse class="st-rip" style="animation-delay:-2.4s" cx="62" cy="62" rx="14" ry="10" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/></g></svg>';
}



/* מנגינת פתיחה: חצוצרות, תופי טימפני וצלצול סיום, כ-4 שניות. נוצרת בדפדפן, בלי קובץ. */
var echo=null;
function brass(f,start,dur,vol){
  var c=ac();if(!c)return;var t=c.currentTime+start;
  if(!echo){var dl=c.createDelay(0.5);dl.delayTime.value=0.19;var fb=c.createGain();fb.gain.value=0.32;var wet=c.createGain();wet.gain.value=0.28;dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(c.destination);echo=dl;}
  var fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(700,t);fl.frequency.exponentialRampToValueAtTime(2600,t+0.07);fl.frequency.exponentialRampToValueAtTime(1500,t+dur);
  var g=c.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.04);g.gain.setValueAtTime(vol,t+Math.max(0.05,dur-0.12));g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.1);
  fl.connect(g);g.connect(c.destination);g.connect(echo);
  [[f,-7],[f,7],[f/2,0]].forEach(function(o,k){var os=c.createOscillator();os.type=k===2?'square':'sawtooth';os.frequency.value=o[0];os.detune.value=o[1];var og=c.createGain();og.gain.value=k===2?0.35:1;os.connect(og);og.connect(fl);os.start(t);os.stop(t+dur+0.15);});
}
function timp(start,vol){tone(125,0.45,'sine',vol,start,48);noise(0.22,vol*0.7,start,500,90);}
function playTheme(){
  var N={G3:196,C4:261.6,E4:329.6,G4:392,C5:523.3,E5:659.3,G5:784};
  timp(0,0.5);timp(0.22,0.28);timp(0.4,0.34);
  brass(N.G4,0.55,0.2,0.1);brass(N.G4,0.8,0.2,0.1);brass(N.G4,1.05,0.2,0.1);
  brass(N.C5,1.35,0.6,0.12);timp(1.35,0.4);
  brass(N.G4,2.05,0.18,0.1);brass(N.C5,2.28,0.18,0.1);brass(N.E5,2.5,0.5,0.12);
  timp(3.0,0.55);noise(1.0,0.14,3.0,9000,2500);
  [N.C4,N.E4,N.G4,N.C5,N.E5].forEach(function(f){brass(f,3.0,0.95,0.085);});
}


/* ================= מצב המשחק ================= */
let S = null, G = null, SIDE = 'a', busy = false, lastKey = '', lastLoad = 0;
let layout = null, sel = -1, targets = {}, arrIdx = -1, hitIdx = -1, infoHtml = '', logs = [], shellKey = '', cells = [], overShown = false;

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function randomLayout() {
  const codes = []; Object.keys(CNT).forEach(c => { if (c !== 'F') for (let k = 0; k < CNT[c]; k++) codes.push(c); });
  shuffle(codes);
  const fc = Math.floor(Math.random() * 10), fj = 30 + fc, L = new Array(40); L[fj] = 'F';
  let id = 0; for (let j = 0; j < 40; j++) if (j !== fj) L[j] = codes[id++];
  const nb = []; if (fc > 0) nb.push(fj - 1); if (fc < 9) nb.push(fj + 1); nb.push(fj - 10);
  nb.forEach(ni => {
    if (Math.random() < 0.85 && L[ni] !== 'B') {
      const cand = []; for (let j = 0; j < 40; j++) if (j !== fj && L[j] === 'B' && !nb.includes(j)) cand.push(j);
      if (cand.length) { const si = cand[Math.floor(Math.random() * cand.length)], t = L[ni]; L[ni] = 'B'; L[si] = t; }
    }
  });
  return L;
}

/* מה רואים בכל משבצת: {t:'lake'|'empty'|'p'|'e', rank, hid, known} */
function cellsView() {
  const out = [], st = G.status;
  for (let i = 0; i < 100; i++) {
    if (LAKE[i]) { out.push({ t: 'lake' }); continue; }
    if (st === 'setup') {
      if (i < 40) out.push({ t: 'e', hid: true });
      else if (i >= 60 && layout) out.push({ t: 'p', rank: R(layout[i - 60]) });
      else out.push({ t: 'empty' });
      continue;
    }
    const o = S.own[i], k = S.kind[i];
    if (o === 'm') out.push({ t: 'p', rank: R(k), known: S.rev[i] === '1' });
    else if (o === 'o') out.push(k === '?' ? { t: 'e', hid: true } : { t: 'e', rank: R(k) });
    else out.push({ t: 'empty' });
  }
  return out;
}
let V = [];
function legalMoves(i) {
  const p = V[i], out = [];
  if (!p || p.t !== 'p' || p.rank === 0 || p.rank === 11) return out;
  const r = Math.floor(i / N), c = i % N;
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
    let rr = r + d[0], cc = c + d[1], steps = 0;
    while (rr >= 0 && rr < N && cc >= 0 && cc < N) {
      const j = rr * N + cc; if (LAKE[j]) break;
      const q = V[j];
      if (q.t === 'empty') out.push({ to: j, kind: 'move' });
      else { if (q.t === 'e') out.push({ to: j, kind: 'attack' }); break; }
      steps++; if (p.rank !== 2) break;
      rr += d[0]; cc += d[1];
    }
  });
  return out;
}

/* ================= בניית המסך ================= */
const RULES = `<details class="st-panel st-rules-box"><summary>חוקים ומקרא הכלים</summary>
  <ul class="st-rules">
    <li>המטרה: לתפוס את הדגל של היריב, או להשאיר אותו בלי כלים שיכולים לזוז.</li>
    <li>קודם כל שחקן מסדר את הכלים שלו ב-4 השורות הקרובות אליו. מחליפים בין שני כלים בלחיצה על שניהם, ולוחצים "סיימתי לסדר". כשהשניים סיימו, הקרב מתחיל. מי שהזמין מתחיל.</li>
    <li>בכל תור מזיזים כלי אחד צעד אחד, קדימה, אחורה או הצידה. אסור באלכסון ואסור להיכנס לאגמים.</li>
    <li>נכנסים למשבצת של כלי יריב כדי לתקוף. הדרגה הגבוהה מנצחת, ובשוויון שני הכלים יוצאים. אחרי עימות, הכלים שהשתתפו בו נחשפים עד סוף המשחק.</li>
    <li>הסייר (2) זז כמה משבצות בקו ישר. כשהוא זז יותר מצעד, היריב מבין שהוא סייר.</li>
    <li>החבלן (3) הוא היחיד שמנטרל פצצה. כל כלי אחר שנוגע בפצצה יוצא.</li>
    <li>המרגל (1) מנצח את המרשל (10) רק כשהוא זה שתוקף. אם המרשל תוקף אותו, המרגל יוצא.</li>
    <li>פצצות ודגל לא זזים. כלי שהזיז את עצמו כבר ברור שהוא לא פצצה ולא דגל.</li>
  </ul>
  <table class="st-legend"><thead><tr><th>כלי</th><th>שם ודרגה</th><th>כמות</th><th>מיוחד</th></tr></thead><tbody>${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 11, 0].map(r => `<tr><td>${miniPiece(r)}</td><td>${(r === 11 || r === 0 ? '' : r + ' · ')}${NAMES[r]}</td><td>${COUNTS[r]}</td><td>${SPECIAL[r] || ''}</td></tr>`).join('')}</tbody></table>
</details>`;

function gameShell() {
  return `<div class="st-bar st-oppbar"><span id="stOpp"></span><span class="st-oppsub" id="stSub"></span></div>
  <div class="st-banner" id="stStatus" aria-live="polite">טוען...</div>
  <div class="st-bar"><div class="st-count" aria-label="כלים שנותרו"><b class="st-m"><i></i><span id="cm">40</span> שלך</b><b class="st-f"><i></i><span id="cf">40</span> של היריב</b></div></div>
  <div class="st-ready" id="stReady"><span id="rMe"></span><span id="rOpp"></span></div>
  <div class="st-board" id="stBoard" role="grid" aria-label="לוח Royal Front"></div>
  <div class="st-btns" id="stBtns"></div>
  <div class="st-info" id="stInfo" aria-live="polite"></div>
  <div class="st-panel"><h2>כלים שיצאו מהמשחק</h2>
    <div class="st-lostrow"><span class="st-lh">היריב</span><div id="lostE" class="st-lost"></div></div>
    <div class="st-lostrow"><span class="st-lh">שלך</span><div id="lostP" class="st-lost"></div></div>
  </div>
  <label class="st-toggle"><input type="checkbox" id="snd"> צלילים</label>
  <div class="st-panel"><h2>מה קרה</h2><ul class="st-log" id="stLog"></ul></div>
  ${RULES}`;
}
function buildBoard() {
  const b = $('stBoard'); b.innerHTML = ''; cells = [];
  for (let i = 0; i < 100; i++) {
    const e = document.createElement('button'); e.type = 'button'; e.className = cx('cell'); e.dataset.i = i; e.setAttribute('role', 'gridcell');
    if (i === 42 || i === 46) { const lk = document.createElement('div'); lk.className = cx('lakeimg'); lk.setAttribute('aria-hidden', 'true'); lk.innerHTML = lakeSvg(i === 46 ? 'b' : 'a'); e.appendChild(lk); }
    b.appendChild(e); cells.push(e);
  }
  b.onclick = ev => { const c = ev.target.closest('.st-cell'); if (c) onCell(+c.dataset.i); };
}

function renderLost() {
  const mine = SIDE === 'a' ? G.lost_a : G.lost_b, theirs = SIDE === 'a' ? G.lost_b : G.lost_a;
  [['e', theirs, 'lostE'], ['p', mine, 'lostP']].forEach(x => {
    const cnt = {}; (x[1] || '').split('').forEach(c => { const r = R(c); cnt[r] = (cnt[r] || 0) + 1; });
    let h = ''; [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 11, 0].forEach(r => { const n = cnt[r] || 0; if (n) h += `<span class="st-lostc" title="${NAMES[r]}">${miniPiece(r, x[0])}${n > 1 ? '<b>' + n + '</b>' : ''}</span>`; });
    $(x[2]).innerHTML = h || '<em>עדיין אין</em>';
  });
}
function pushLog(s) { logs.unshift(s); logs = logs.slice(0, 6); const u = $('stLog'); if (u) u.innerHTML = logs.map(x => `<li>${esc(x)}</li>`).join('') || '<li>עוד לא קרה כלום.</li>'; }

function paint() {
  const g = G, st = g.status, oppId = SIDE === 'a' ? g.b_id : g.a_id, myReady = SIDE === 'a' ? g.ready_a : g.ready_b, oppReady = SIDE === 'a' ? g.ready_b : g.ready_a;
  const myTurn = st === 'play' && g.turn === SIDE;
  V = cellsView();
  $('stOpp').innerHTML = `${avatar(byId[oppId], 34)}<span>${esc(nm(oppId))}</span>`;
  $('stSub').textContent = st === 'play' ? 'בקרב' : st === 'setup' ? 'סידור כלים' : st === 'done' ? 'המשחק נגמר' : '';
  const sEl = $('stStatus');
  let msg = '', cls = 'them';
  if (st === 'setup') { msg = myReady ? (oppReady ? 'מתחילים!' : `ממתינים ש${nm(oppId)} יסיים לסדר...`) : (oppReady ? `${nm(oppId)} סיים לסדר וממתין לך` : 'סדרו את הכלים שלכם'); cls = myReady ? 'them' : 'you'; }
  else if (st === 'play') { msg = myTurn ? 'התור שלך' : `התור של ${nm(oppId)}`; cls = myTurn ? 'you' : 'them'; }
  else if (st === 'done') {
    cls = 'end'; const win = g.winner === me.id;
    msg = g.result === 'resign' ? (win ? `${nm(oppId)} ויתר/ה. ניצחת!` : 'ויתרת על המשחק') : g.result === 'flag' ? (win ? 'ניצחת! תפסת את הדגל.' : 'הפסדת. היריב תפס את הדגל שלך.') : (win ? 'ניצחת! ליריב לא נשארו כלים שזזים.' : 'הפסדת. לא נשארו לך כלים שזזים.');
  }
  sEl.textContent = msg; sEl.className = cx('banner ' + cls);
  // סיימתי לסדר
  const rd = $('stReady'); rd.hidden = st !== 'setup';
  if (st === 'setup') {
    $('rMe').innerHTML = `<i class="${cx('dot')}${myReady ? ' st-ok' : ''}"></i>${myReady ? 'אתה סיימת לסדר' : 'אתה מסדר את הכלים'}`;
    $('rOpp').innerHTML = `<i class="${cx('dot')}${oppReady ? ' st-ok' : ''}"></i>${oppReady ? esc(nm(oppId)) + ' סיים לסדר' : esc(nm(oppId)) + ' מסדר את הכלים'}`;
  }
  // כפתורים
  const bt = $('stBtns');
  const btnKey = st + '|' + myReady;
  if (bt.dataset.k !== btnKey) {
    bt.dataset.k = btnKey;
    if (st === 'setup') bt.innerHTML = `${myReady ? '' : `<button class="st-btn st-sec" id="bShuf" type="button">ערבב מחדש</button>`}<button class="st-btn ${myReady ? 'st-sec' : ''}" id="bReady" type="button">${myReady ? 'ביטול, אני רוצה לסדר עוד' : 'סיימתי לסדר'}</button><button class="st-btn st-red" id="bResign" type="button">ויתור</button>`;
    else if (st === 'play') bt.innerHTML = `<button class="st-btn st-red" id="bResign" type="button">ויתור</button>`;
    else bt.innerHTML = GT ? '<p class="st-thanks">תודה ששיחקת!</p>' : '<a class="st-btn" href="stratego.html" style="text-align:center;text-decoration:none">למשחקים</a>';
    bind('bShuf', () => { layout = randomLayout(); sel = -1; infoHtml = ''; pushLog('ערבבת את הכלים מחדש.'); paint(); });
    bind('bReady', toggleReady);
    bind('bResign', resign);
  }
  // לוח
  for (let i = 0; i < 100; i++) {
    const el = cells[i], p = V[i], r = Math.floor(i / N), c = i % N;
    let k = cx('cell') + ((r + c) % 2 ? ' st-alt' : '') + (p.t === 'lake' ? ' st-lake' : '');
    if (i === sel) k += ' st-sel';
    if (S && G.status !== 'setup' && i === S.lt) k += ' st-last';
    const t = targets[i]; if (t) k += t === 'attack' ? ' st-atk' : ' st-tgt';
    el.className = k;
    const label = 'שורה ' + (r + 1) + ' עמודה ' + (c + 1);
    if (p.t === 'lake') { el.setAttribute('aria-label', label + ' אגם'); continue; }
    if (p.t === 'empty') { el.innerHTML = ''; el.setAttribute('aria-label', label + ' ריק'); continue; }
    let pc = cx('piece ' + p.t) + (p.hid ? ' st-hid' : '') + (p.known ? ' st-known' : '');
    if (i === arrIdx) pc += ' st-moved-in'; if (i === hitIdx) pc += ' st-hit';
    el.innerHTML = `<div class="${pc}">${p.hid ? '' : pieceInner({ rank: p.rank })}</div>`;
    el.setAttribute('aria-label', label + (p.hid ? ' כלי של היריב' : ' ' + NAMES[p.rank] + (p.t === 'p' ? ' שלך' : ' של היריב')));
  }
  let cm = 0, cf = 0; V.forEach(p => { if (p.t === 'p') cm++; else if (p.t === 'e') cf++; });
  $('cm').textContent = cm; $('cf').textContent = cf;
  renderLost();
  $('stInfo').innerHTML = infoHtml || (st === 'setup' ? (myReady ? 'הכלים שלך נעולים. אפשר ללחוץ "ביטול" כל עוד היריב עוד לא סיים.' : 'לחץ על שני כלים כחולים כדי להחליף ביניהם. מומלץ להסתיר את הדגל בשורה האחורית ולהקיף אותו בפצצות. כשתסיים, לחץ "סיימתי לסדר".') : st === 'play' ? (myTurn ? 'לחץ על כלי כחול כדי לראות לאן הוא יכול ללכת.' : 'ממתינים למהלך של היריב.') : '<b>המשחק נגמר.</b><small>כל הכלים נחשפו.</small>');
  $('snd').checked = soundOn();
  arrIdx = -1; hitIdx = -1;
}

function showInfo(i) {
  const p = V[i]; if (!p || p.t === 'lake' || p.t === 'empty') return;
  if (!p.hid) {
    const extra = SPECIAL[p.rank] ? '<small>' + SPECIAL[p.rank] + '</small>' : '';
    infoHtml = `<div class="st-ico-in"><span class="${cx('piece ' + p.t)}">${pieceInner({ rank: p.rank })}</span><div class="st-txt"><b>${NAMES[p.rank]} ${p.t === 'p' ? 'שלך' : 'של היריב'}</b>${p.rank === 11 || p.rank === 0 ? '' : ' · דרגה ' + p.rank}${extra}</div></div>`;
  } else infoHtml = '<b>כלי של היריב</b><small>הכלי הזה עוד לא נחשף. זה יכול להיות כל כלי, גם פצצה או דגל.</small>';
}

function onCell(i) {
  if (busy || !G || LAKE[i]) return;
  const p = V[i];
  if (G.status === 'setup') {
    const myReady = SIDE === 'a' ? G.ready_a : G.ready_b;
    if (myReady || !p || p.t !== 'p') return;
    sfx.tick();
    if (sel < 0) { sel = i; showInfo(i); }
    else if (sel === i) { sel = -1; infoHtml = ''; }
    else { const a = sel - 60, b = i - 60, t = layout[a]; layout[a] = layout[b]; layout[b] = t; sel = -1; infoHtml = ''; pushLog('החלפת בין שני כלים.'); }
    paint(); return;
  }
  if (G.status !== 'play' || G.turn !== SIDE) { if (p && p.t !== 'empty') { sel = -1; targets = {}; showInfo(i); paint(); } return; }
  if (sel >= 0 && targets[i]) { const from = sel; sel = -1; targets = {}; doMove(from, i); return; }
  if (p && p.t === 'p') {
    sel = -1; targets = {}; const mv = legalMoves(i); sfx.tick(); showInfo(i);
    if (mv.length) { sel = i; mv.forEach(m => { targets[m.to] = m.kind; }); }
    else infoHtml += '<small>אין לכלי הזה לאן לזוז עכשיו.</small>';
    paint(); return;
  }
  sel = -1; targets = {}; if (p && p.t === 'e') showInfo(i); else infoHtml = '';
  paint();
}

/* ================= פעולות מול השרת ================= */
const dist = (a, b) => Math.abs(Math.floor(a / N) - Math.floor(b / N)) + Math.abs(a % N - b % N);
function playMine(res, from, to) {
  const far = dist(from, to) > 1;
  if (res.res === 'move' || res.res === 'scout') { sfx.move(far); arrIdx = to; if (far) pushLog(`הזזת סייר ${dist(from, to)} משבצות.`); return; }
  hitIdx = to;
  const a = NAMES[R(res.ak)], d = NAMES[R(res.dk)], head = `${a} שלך תקף ${d} של היריב: `;
  if (res.res === 'flag') { sfx.flag(); pushLog(head + 'הדגל נתפס!'); }
  else if (res.res === 'defuse') { sfx.defuse(); pushLog(head + 'הפצצה נוטרלה.'); }
  else if (res.res === 'bomb') { sfx.boom(true); pushLog(head + 'הכלי שלך הוסר.'); }
  else if (res.res === 'win') { sfx.hit(true); pushLog(head + 'ניצחת.'); }
  else if (res.res === 'lose') { sfx.hit(false); pushLog(head + 'הכלי שלך הוסר.'); }
  else { sfx.clash(); pushLog(head + 'שני הכלים הוסרו.'); }
}
function playTheirs(g, lf, lt) {
  const far = dist(lf, lt) > 1;
  if (g.last_res === 'move' || g.last_res === 'scout') { sfx.move(far); arrIdx = lt; if (far) pushLog(`היריב הזיז סייר ${dist(lf, lt)} משבצות.`); return; }
  hitIdx = lt;
  const a = NAMES[R(g.last_ak)], d = NAMES[R(g.last_dk)], head = `${a} של היריב תקף ${d} שלך: `;
  if (g.last_res === 'flag') { sfx.flag(); pushLog(head + 'הדגל שלך נתפס!'); }
  else if (g.last_res === 'defuse') { sfx.hit(false); pushLog(head + 'הפצצה שלך נוטרלה.'); }
  else if (g.last_res === 'bomb') { sfx.boom(false); pushLog(head + 'הכלי של היריב הוסר.'); }
  else if (g.last_res === 'win') { sfx.hit(false); pushLog(head + 'הכלי שלך הוסר.'); }
  else if (g.last_res === 'lose') { sfx.hit(true); pushLog(head + 'ניצחת.'); }
  else { sfx.clash(); pushLog(head + 'שני הכלים הוסרו.'); }
}
async function doMove(from, to) {
  if (busy) return; busy = true; ac(); infoHtml = '';
  const { data, error } = await call('st_move', { p_game: gid, p_from: from, p_to: to });
  busy = false;
  if (error) { showToast(/not_your_turn/.test(error.message) ? 'עדיין לא התור שלך' : 'המהלך נכשל, נסו שוב', true); lastKey = ''; await load(); return; }
  playMine(data, from, to);
  lastKey = ''; await load(true);
}
async function toggleReady() {
  if (busy) return; busy = true; ac(); sfx.tick();
  const myReady = SIDE === 'a' ? G.ready_a : G.ready_b;
  const { error } = myReady ? await call('st_unready', { p_game: gid }) : await call('st_place', { p_game: gid, p_layout: layout.join('') });
  busy = false; sel = -1; infoHtml = '';
  if (error) showToast(/already_ready|not_allowed/.test(error.message) ? 'אי אפשר לשנות עכשיו' : 'שמירת הסידור נכשלה, נסו שוב', true);
  else if (!myReady) pushLog('סיימת לסדר את הכלים.');
  lastKey = ''; await load();
}
function resign() { if (confirm('לוותר על המשחק?')) act('st_resign', { p_game: gid }); }
async function act(fn, args) {
  if (busy) return; busy = true;
  const { error } = await call(fn, args); busy = false;
  if (error) showToast('הפעולה נכשלה', true);
  lastKey = ''; await load();
}
function bind(id, fn) { const e = $(id); if (e) e.onclick = fn; }

/* ================= טעינה ================= */
async function learn(ids) {
  const miss = [...new Set(ids)].filter(id => id && !byId[id]);
  if (!miss.length) return;
  const { data } = await supabase.from('profiles').select('id,name,color').in('id', miss);
  (data || []).forEach(p => { byId[p.id] = p; });
}
async function load(force) {
  const { data, error } = await call('st_state', { p_game: gid });
  lastLoad = Date.now();
  if (error || !data || !data.game) { root.innerHTML = '<p class="st-empty">המשחק לא נמצא</p>' + (GT ? '' : '<a class="st-btn" href="stratego.html">חזרה</a>'); shellKey = ''; return; }
  const g = data.game; byId[g.a_id] = byId[g.a_id] || { id: g.a_id, name: data.a_name }; byId[g.b_id] = byId[g.b_id] || { id: g.b_id, name: data.b_name };
  if (!GT) await learn([g.a_id, g.b_id]);
  const key = [g.status, g.turn, g.updated_at, g.ready_a, g.ready_b, g.move_no].join('|');
  if (key === lastKey && !force) return;
  lastKey = key;
  const prev = G; S = data; G = g; SIDE = data.side;
  const oppId = SIDE === 'a' ? g.b_id : g.a_id, myReady = SIDE === 'a' ? g.ready_a : g.ready_b, oppReady = SIDE === 'a' ? g.ready_b : g.ready_a;
  // צלילים והודעות על מה שהיריב עשה
  if (prev) {
    const prevOpp = SIDE === 'a' ? prev.ready_b : prev.ready_a;
    if (g.status === 'setup' && oppReady && !prevOpp) { tone(660, 0.1, 'triangle', 0.12); tone(880, 0.14, 'triangle', 0.12, 0.08); pushLog(`${nm(oppId)} סיים לסדר את הכלים.`); }
    if (prev.status !== 'play' && g.status === 'play') { tone(523, 0.1, 'triangle', 0.15); tone(784, 0.16, 'triangle', 0.15, 0.09); pushLog(g.turn === SIDE ? 'שני הצדדים סיימו לסדר. המשחק התחיל, ואתה מתחיל.' : 'שני הצדדים סיימו לסדר. המשחק התחיל.'); }
    if (g.move_no > prev.move_no && g.last_by && g.last_by !== SIDE) { sel = -1; targets = {}; infoHtml = ''; playTheirs(g, S.lf, S.lt); }
    if (prev.status !== 'done' && g.status === 'done') { const win = g.winner === me.id; setTimeout(() => { win ? sfx.win() : (g.result === 'resign' ? 0 : sfx.lose()); }, 550); }
  }
  if (g.status === 'play' && g.turn !== SIDE) { sel = -1; targets = {}; }
  if (g.status === 'setup') { if (!layout || myReady) layout = (data.layout ? data.layout.split('') : layout) || randomLayout(); }
  if (g.status === 'invite' || g.status === 'declined') { renderInvite(); return; }
  if (shellKey !== 'game') { root.innerHTML = gameShell(); shellKey = 'game'; buildBoard(); $('snd').onchange = e => { try { localStorage.setItem('soundOff', e.target.checked ? '0' : '1'); } catch (_) {} }; logs = logs.length ? logs : []; pushLog(g.status === 'setup' ? 'סדרו את הכלים ואז לחצו "סיימתי לסדר".' : 'המשחק נטען.'); }
  paint();
  if (g.status === 'done' && !$('stOver') && !overShown) { overShown = true; showOver(g.winner === me.id, g.result); }
}
function renderInvite() {
  const g = G, iA = g.a_id === me.id, oppId = iA ? g.b_id : g.a_id;
  shellKey = 'invite';
  if (g.status === 'declined') { root.innerHTML = `<div class="st-banner st-end">ההזמנה בוטלה</div>${GT ? '' : '<a class="st-btn" href="stratego.html" style="text-align:center;text-decoration:none">חזרה</a>'}`; return; }
  root.innerHTML = `<div class="st-bar st-oppbar"><span>${avatar(byId[oppId], 34)}<span>${esc(nm(oppId))}</span></span></div>
    <div class="st-banner st-them">${iA ? `ממתינים ש${esc(nm(oppId))} יאשר/תאשר` : `${esc(nm(oppId))} הזמין/ה אותך ל-Royal Front`}</div>
    <div class="st-btns">${iA ? '<button class="st-btn st-red" id="bCancel" type="button">בטל הזמנה</button>' : '<button class="st-btn st-go" id="bYes" type="button">בוא נשחק</button><button class="st-btn st-sec" id="bNo" type="button">לא עכשיו</button>'}</div>${RULES}`;
  bind('bCancel', () => act('st_resign', { p_game: gid }));
  bind('bYes', () => act('st_respond', { p_game: gid, p_accept: true }));
  bind('bNo', async () => { await act('st_respond', { p_game: gid, p_accept: false }); location.href = 'stratego.html'; });
}
function confetti() {
  const cs = ['#ffd23f', '#ff5a3c', '#2c6bd6', '#6c5ce7', '#2fa65a', '#e8559b'];
  for (let i = 0; i < 90; i++) { const e = document.createElement('i'); e.className = 'st-conf'; e.style.left = Math.random() * 100 + 'vw'; e.style.background = cs[i % cs.length];
    e.style.animationDuration = 2 + Math.random() * 2.2 + 's'; e.style.animationDelay = Math.random() * .6 + 's'; document.body.append(e); setTimeout(() => e.remove(), 5200); }
}
function showOver(win, result) {
  const o = document.createElement('div'); o.className = 'st-over'; o.id = 'stOver';
  const txt = result === 'resign' ? (win ? 'היריב ויתר' : 'ויתרת על המשחק') : result === 'flag' ? (win ? 'תפסת את הדגל של היריב' : 'היריב תפס את הדגל שלך') : (win ? 'ליריב לא נשארו כלים שזזים' : 'לא נשארו לך כלים שזזים');
  o.innerHTML = `<div class="st-box"><div class="st-big">${win ? '🏆' : '🏳️'}</div><h2>${win ? 'ניצחת!' : 'הפסדת'}</h2><p>${txt}</p><button class="st-btn st-go" id="stOk" type="button" style="width:100%">סגור</button></div>`;
  document.body.append(o); $('stOk').onclick = () => o.remove();
  if (win) confetti();
}

/* ================= רשימה ================= */
async function showList() {
  const { data: games } = await supabase.from('st_games').select('*').order('updated_at', { ascending: false }).limit(30);
  const mine = games || []; await learn(mine.flatMap(g => [g.a_id, g.b_id]));
  const active = mine.filter(g => ['invite', 'setup', 'play'].includes(g.status));
  const busyWith = new Set(active.map(g => g.a_id === me.id ? g.b_id : g.a_id));
  const others = profiles.filter(p => p.is_user !== false && p.id !== me.id);
  const label = g => {
    const iA = g.a_id === me.id;
    if (g.status === 'invite') return iA ? ['ממתין לאישור', ''] : ['הזמנה אליך', 'me'];
    if (g.status === 'setup') { const ready = iA ? g.ready_a : g.ready_b; return ready ? ['מחכים ליריב', ''] : ['סדר את הכלים', 'me']; }
    if (g.status === 'play') return g.turn === (iA ? 'a' : 'b') ? ['התור שלך', 'me'] : ['התור שלו/ה', ''];
    if (g.status === 'done') return [g.winner === me.id ? 'ניצחת' : 'הפסדת', ''];
    return ['בוטל', ''];
  };
  const row = g => { const opp = g.a_id === me.id ? g.b_id : g.a_id, [t, c] = label(g);
    return `<a class="st-row" href="stratego.html?g=${g.id}">${avatar(byId[opp], 40)}<b>${esc(nm(opp))}</b><span class="st-tag2 ${c}">${t}</span></a>`; };
  const clrAt = (() => { try { return +localStorage.getItem('clr_st') || 0; } catch (_) { return 0; } })();
  const done = mine.filter(g => g.status === 'done' && new Date(g.updated_at || g.created_at || 0).getTime() > clrAt).slice(0, 5);
  root.innerHTML = `
    <div class="st-hero"><div class="st-herotitle">Royal Front</div><div class="st-herosub">משחק אסטרטגיה לזוג. תפסו את הדגל של היריב!</div></div>
    <div class="st-card"><h3>משחק חדש. עם מי משחקים?</h3><div class="st-pick">
      ${others.map(p => `<button class="st-pk" data-id="${p.id}" type="button" ${busyWith.has(p.id) ? 'disabled style="opacity:.4"' : ''}>${avatar(p, 52)}${esc(p.name)}</button>`).join('') || '<p>אין עוד שחקנים</p>'}
    </div></div>
    <div class="st-card"><h3>חבר שהוא לא מהמשפחה?</h3><button class="st-btn" id="bGuest" type="button" style="width:100%">הזמן אורח בקישור</button></div>
    ${active.length ? `<div class="st-card"><h3>משחקים פעילים</h3>${active.map(row).join('')}</div>` : ''}
    ${done.length ? `<div class="st-card"><h3>משחקים אחרונים<button id="stClr" type="button" style="border:0;background:transparent;font:inherit;font-size:13px;font-weight:700;color:inherit;opacity:.7;cursor:pointer;text-decoration:underline">נקה רשימה</button></h3>${done.map(row).join('')}</div>` : ''}
    ${RULES}`;
  const clrB = $('stClr');
  if (clrB) clrB.onclick = () => { try { localStorage.setItem('clr_st', String(Date.now())); } catch (_) {} clrB.closest('.st-card').remove(); };
  $('bGuest').onclick = () => inviteGuest('st', d => { location.href = 'stratego.html?g=' + d.ref; });
  root.querySelectorAll('.st-pk:not([disabled])').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { data, error } = await supabase.rpc('st_invite', { p_opp: b.dataset.id });
    if (error) { showToast(/game_exists/.test(error.message) ? 'כבר יש משחק פעיל עם השחקן הזה' : 'ההזמנה נכשלה', true); b.disabled = false; return; }
    location.href = 'stratego.html?g=' + data;
  });
}

if ($('splash')) {
(function(){
  var sp=$('splash'),hint=$('spHint'),done=false,played=false,SPLASH_MS=4000,timer=null;
  function hide(){if(done)return;done=true;clearTimeout(timer);sp.classList.add('out');setTimeout(function(){sp.hidden=true;},650);}
  function theme(){if(played)return true;var c=ac();if(!c||c.state!=='running')return false;played=true;playTheme();return true;}
  function arm(){clearTimeout(timer);timer=setTimeout(hide,SPLASH_MS);}
  function onTap(){
    if(!played){
      var c=ac();
      if(c){
        var go=function(){if(!played){played=true;playTheme();}};
        if(c.state==='running')go();else if(c.resume)c.resume().then(go).catch(function(){});
        arm();hint.textContent='לחץ שוב כדי להתחיל';return;
      }
    }
    hide();
  }
  sp.addEventListener('click',onTap);
  sp.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '||e.key==='Escape'){e.preventDefault();hide();}});
  arm();
  if(!theme()){ac();setTimeout(function(){if(!played&&!done){var c=ac();if(c&&c.state!=='running')hint.textContent='הקש להשמעת מנגינה';}},120);}
  try{sp.focus();}catch(e){}
})();

}

/* ================= הפעלה ================= */
if (!gid) await showList();
else {
  await load();
  // בלי התראות על מהלכים: האפליקציה הפתוחה מתעדכנת בעצמה (זמן אמת + בדיקה קצרה)
  setInterval(() => {
    if (busy || document.hidden) return;
    const myTurn = G && G.status === 'play' && G.turn === SIDE;
    if (myTurn && !GT && Date.now() - lastLoad < 15000) return;
    load();
  }, 2800);
  if (!GT) supabase.channel('st-' + gid).on('postgres_changes', { event: '*', schema: 'public', table: 'st_games', filter: 'id=eq.' + gid }, () => { if (!busy) load(); }).subscribe();
}
window.__st = { state: () => ({ G, S, V, layout }), click: onCell };
