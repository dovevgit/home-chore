// מסך פתיחה (ספלאש) של 4 שניות בכל כניסה מחדשת לאפליקציה.
// מצלמה מתחילה בתקריב על הבית ועולה למעלה אל הלוגו ובני המשפחה, ואז ברק וניצוצות.
// מוצג פעם אחת לכל פתיחה (sessionStorage), לא בכל מעבר בין מסכים.
(function () {
  try { if (sessionStorage.getItem('splashShown')) return; sessionStorage.setItem('splashShown', '1'); } catch (_) {}
  var AR = 941 / 1672, TOTAL = 4000;
  var css =
    '#splash{position:fixed;inset:0;z-index:99999;overflow:hidden;background:#3AB5FF;transition:opacity .45s ease;opacity:1}' +
    '#splash .bg{position:absolute;inset:-30px;background:center/cover no-repeat;filter:blur(22px) saturate(1.1)}' +
    '#splash .cam{position:absolute;inset:0;display:flex;justify-content:center;align-items:flex-end;opacity:0}' +
    '#splash.go .cam{opacity:1;animation:spcam 2.2s cubic-bezier(.45,.05,.2,1) both}' +
    '#splash .stage{position:relative;height:100%;aspect-ratio:941/1672;max-width:none;flex:none}' +
    '#splash .stage img{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '#splash .glint{position:absolute;left:0;right:0;top:3%;height:19%;overflow:hidden;pointer-events:none;mix-blend-mode:soft-light}' +
    '#splash .glint:after{content:"";position:absolute;top:-20%;bottom:-20%;width:26%;left:-40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.95),transparent);transform:skewX(-18deg)}' +
    '#splash.go .glint:after{animation:spglint 1s ease-in-out 2.1s both}' +
    '#splash .sp{position:absolute;color:#fff;text-shadow:0 0 8px #fff,0 0 14px #FFD84D;font-size:22px;line-height:1;opacity:0;pointer-events:none}' +
    '#splash.go .sp{animation:sptw 1.3s ease-in-out both}' +
    '@keyframes spcam{0%{transform:scale(1.9);transform-origin:50% 94%}100%{transform:scale(1);transform-origin:50% 50%}}' +
    '@keyframes spglint{0%{left:-40%}100%{left:120%}}' +
    '@keyframes sptw{0%{opacity:0;transform:scale(.2) rotate(0)}40%{opacity:1;transform:scale(1.15) rotate(40deg)}100%{opacity:0;transform:scale(.4) rotate(90deg)}}';
  var st = document.createElement('style'); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var d = document.createElement('div');
  d.id = 'splash'; d.setAttribute('role', 'img'); d.setAttribute('aria-label', 'הבית שלנו');
  var bg = document.createElement('div'); bg.className = 'bg'; bg.style.backgroundImage = 'url(splash.jpg)';
  var cam = document.createElement('div'); cam.className = 'cam';
  var stage = document.createElement('div'); stage.className = 'stage';
  var img = new Image(); img.alt = ''; img.src = 'splash.jpg';
  stage.appendChild(img);
  var g = document.createElement('div'); g.className = 'glint'; stage.appendChild(g);
  [[18, 10, 2.15], [82, 11, 2.35], [50, 5, 2.55], [27, 60, 2.7], [72, 62, 2.45], [50, 61, 2.9], [88, 54, 2.8], [12, 54, 2.6]]
    .forEach(function (p) { var s = document.createElement('span'); s.className = 'sp'; s.textContent = '✦';
      s.style.left = p[0] + '%'; s.style.top = p[1] + '%'; s.style.animationDelay = p[2] + 's'; stage.appendChild(s); });
  cam.appendChild(stage); d.appendChild(bg); d.appendChild(cam);
  document.documentElement.appendChild(d);

  var started = false;
  function start() {
    if (started) return; started = true;
    d.className = 'go';
    setTimeout(function () { d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 450); }, TOTAL - 450);
  }
  if (img.complete) start(); else { img.onload = start; img.onerror = start; setTimeout(start, 2500); }
})();
