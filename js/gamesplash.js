// מסך פתיחה למשחק: מופיע בכל כניסה, נסגר בלחיצה או אחרי 3.5 שניות.
// שימוש: import { gameSplash } from './gamesplash.js'; gameSplash('blackjack-splash.jpg');
export function gameSplash(img) {
  if (document.getElementById('splash') || document.getElementById('gsplash')) return; // מסך הפתיחה של האפליקציה כבר מוצג
  const st = document.createElement('style');
  st.textContent =
    '.gsp{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:#120d0a;cursor:pointer;opacity:1;transition:opacity .6s ease}' +
    '.gsp.gsp-out{opacity:0;pointer-events:none}' +
    '.gsp-art{position:absolute;inset:0;overflow:hidden}' +
    '.gsp-art::before{content:"";position:absolute;inset:-30px;background:url(' + img + ') center/cover no-repeat;filter:blur(22px) brightness(.8);transform:scale(1.1)}' +
    '.gsp-art::after{content:"";position:absolute;inset:0;background:url(' + img + ') center/contain no-repeat;animation:gspin 1.1s ease-out both}' +
    '@keyframes gspin{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}' +
    '.gsp-skip{position:absolute;bottom:max(18px,env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;color:#fff;font-size:14px;font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,.9)}' +
    '@media (prefers-reduced-motion:reduce){.gsp-art::after{animation:none}.gsp{transition:none}}';
  document.head.append(st);
  const sp = document.createElement('div');
  sp.className = 'gsp'; sp.id = 'gsplash'; sp.setAttribute('role', 'button'); sp.tabIndex = 0;
  sp.setAttribute('aria-label', 'פתיחת המשחק, לחץ כדי לדלג');
  sp.innerHTML = '<div class="gsp-art"></div><div class="gsp-skip">לחץ כדי להתחיל</div>';
  document.body.append(sp);
  let done = false;
  const hide = () => { if (done) return; done = true; sp.classList.add('gsp-out'); setTimeout(() => { sp.hidden = true; }, 650); };
  sp.addEventListener('click', hide);
  sp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); hide(); } });
  setTimeout(hide, 3500);
}
