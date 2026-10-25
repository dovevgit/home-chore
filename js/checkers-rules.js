// חוקי דמקה (רוסית/ישראלית): לוח 8x8, חייל הולך קדימה ואוכל גם אחורה, מלך נע ואוכל למרחק,
// אכילה חובה (אפשר לבחור איזו), חייל שמגיע לשורה האחרונה באמצע אכילה הופך למלך וממשיך לאכול.
// לוח: מחרוזת של 64 תווים. '.' ריק, w/W לבן (חייל/מלך), b/B שחור. אינדקס = שורה*8+עמודה, שורה 0 למעלה.
// הלבן מתחיל למטה (שורות 5-7) ועולה למעלה, והוא מתחיל את המשחק.
export const START = (() => {
  let s = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) s += (r + c) % 2 === 1 ? (r < 3 ? 'b' : r > 4 ? 'w' : '.') : '.';
  return s;
})();
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const colorOf = ch => ch === 'w' || ch === 'W' ? 'w' : ch === 'b' || ch === 'B' ? 'b' : null;
const isKing = ch => ch === 'W' || ch === 'B';
const promoRow = col => col === 'w' ? 0 : 7;

// כל רצפי האכילה של כלי אחד. מחזיר [{path:[...], captured:[...]}]
function captureSeqs(b, from) {
  const col = colorOf(b[from]);
  const out = [];
  const start = b.split(''); start[from] = '.';
  function dfs(pos, king, taken, path) {
    const r0 = Math.floor(pos / 8), c0 = pos % 8;
    let found = false;
    const options = []; // {land, cap, kingNow}
    for (const [dr, dc] of DIRS) {
      let r = r0 + dr, c = c0 + dc;
      if (king) {
        while (inb(r, c) && start[r * 8 + c] === '.' ) { r += dr; c += dc; }
      }
      if (!inb(r, c)) continue;
      const cap = r * 8 + c, ch = start[cap];
      if (colorOf(ch) === null || colorOf(ch) === col || taken.includes(cap)) continue;
      let lr = r + dr, lc = c + dc;
      while (inb(lr, lc) && start[lr * 8 + lc] === '.') {
        options.push({ land: lr * 8 + lc, cap, kingNow: king || lr === promoRow(col) });
        if (!king) break;
        lr += dr; lc += dc;
      }
    }
    // חייבים להמשיך לאכול אם אפשר: אם מנחיתה כלשהי יש המשך, רק נחיתות כאלה מותרות
    const withMore = [];
    for (const o of options) {
      const t = taken.concat(o.cap);
      const more = hasMore(o.land, o.kingNow, t);
      withMore.push({ o, more });
    }
    const anyMore = withMore.some(x => x.more);
    for (const { o, more } of withMore) {
      if (anyMore && !more) continue;
      found = true;
      const t = taken.concat(o.cap), p = path.concat(o.land);
      if (more) dfs(o.land, o.kingNow, t, p); else out.push({ path: p, captured: t });
    }
    return found;
  }
  function hasMore(pos, king, taken) {
    const r0 = Math.floor(pos / 8), c0 = pos % 8;
    for (const [dr, dc] of DIRS) {
      let r = r0 + dr, c = c0 + dc;
      if (king) while (inb(r, c) && start[r * 8 + c] === '.') { r += dr; c += dc; }
      if (!inb(r, c)) continue;
      const cap = r * 8 + c, ch = start[cap];
      if (colorOf(ch) === null || colorOf(ch) === col || taken.includes(cap)) continue;
      const lr = r + dr, lc = c + dc;
      if (inb(lr, lc) && start[lr * 8 + lc] === '.') return true;
    }
    return false;
  }
  dfs(from, isKing(b[from]), [], [from]);
  return out;
}

// כל המהלכים החוקיים לצבע: [{path, captured}]
export function legalMoves(b, col) {
  const caps = [];
  for (let i = 0; i < 64; i++) if (colorOf(b[i]) === col) caps.push(...captureSeqs(b, i));
  if (caps.length) return caps;
  const out = [];
  for (let i = 0; i < 64; i++) {
    if (colorOf(b[i]) !== col) continue;
    const r0 = Math.floor(i / 8), c0 = i % 8;
    if (isKing(b[i])) {
      for (const [dr, dc] of DIRS) {
        let r = r0 + dr, c = c0 + dc;
        while (inb(r, c) && b[r * 8 + c] === '.') { out.push({ path: [i, r * 8 + c], captured: [] }); r += dr; c += dc; }
      }
    } else {
      const dr = col === 'w' ? -1 : 1;
      for (const dc of [-1, 1]) { const r = r0 + dr, c = c0 + dc; if (inb(r, c) && b[r * 8 + c] === '.') out.push({ path: [i, r * 8 + c], captured: [] }); }
    }
  }
  return out;
}

// מבצע מהלך ומחזיר לוח חדש (והאם המהלך אכל או היה של חייל, לספירת תיקו)
export function applyMove(b, mv) {
  const a = b.split('');
  const from = mv.path[0], to = mv.path[mv.path.length - 1];
  const piece = a[from], col = colorOf(piece);
  a[from] = '.';
  for (const c of mv.captured) a[c] = '.';
  const promote = !isKing(piece) && (Math.floor(to / 8) === promoRow(col) || mv.captured.length > 0 && wentKing(b, mv, col));
  a[to] = promote ? piece.toUpperCase() : piece;
  return { board: a.join(''), reset: mv.captured.length > 0 || !isKing(piece) };
}
function wentKing(b, mv, col) { return mv.path.some(p => Math.floor(p / 8) === promoRow(col)); }

export function counts(b) {
  const o = { w: 0, W: 0, b: 0, B: 0 };
  for (const ch of b) if (o[ch] !== undefined) o[ch]++;
  return o;
}
