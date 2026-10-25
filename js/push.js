// התראות לטלפון (Web Push): הפעלה, מצב ובדיקה.
import { supabase } from './supabase.js';

const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
const swReady = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('sw')), 5000))]);
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// 'unsupported' | 'denied' | 'on' | 'off'
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  try { const reg = await swReady(); return (await reg.pushManager.getSubscription()) ? 'on' : 'off'; } catch (_) { return 'off'; }
}

export async function enablePush(userId) {
  if (!pushSupported()) throw new Error('unsupported');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const { data, error } = await supabase.functions.invoke('push', { body: { action: 'key' } });
  if (error || !data?.publicKey) throw new Error('key');
  const reg = await swReady();
  const old = await reg.pushManager.getSubscription();
  if (old) { try { await old.unsubscribe(); } catch (_) {} }
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(data.publicKey) });
  const j = sub.toJSON();
  const { error: e2 } = await supabase.from('push_subs').upsert({ user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
  if (e2) throw new Error('save');
}

export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('push', { body: { action: 'test' } });
  if (error) throw new Error('test');
  return data;
}
