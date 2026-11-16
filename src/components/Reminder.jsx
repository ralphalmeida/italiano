import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function toUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscribe(publicKey) {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  return existing || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(publicKey) });
}

// Lembrete diário por notificação (no iPhone, só com o app adicionado à Tela de Início).
export function Reminder() {
  const [state, setState] = useState(null); // { publicKey, enabled, hour }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.pushStatus().then(setState).catch(() => setState({ publicKey: null, enabled: false, hour: 20 }));
  }, []);

  if (!state) return null;

  if (!supported()) {
    return (
      <div className="setting setting-col">
        <span>🔔 Lembrete diário</span>
        <small className="muted">
          {isIOS() && !isStandalone()
            ? 'No iPhone, primeiro adicione o app à Tela de Início: toque em Compartilhar (□↑) → “Adicionar à Tela de Início”. Depois abra o app pelo ícone e ative aqui.'
            : 'Este navegador não permite notificações.'}
        </small>
      </div>
    );
  }

  async function enable(hour = state.hour) {
    setBusy(true);
    setMsg('');
    try {
      if (!state.publicKey) throw new Error('Lembretes ainda não configurados no servidor.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Permissão de notificação negada. Libere nos Ajustes do iPhone → Notificações → Italiano.');
      const sub = await subscribe(state.publicKey);
      await api.pushEnable(sub.toJSON(), hour, Intl.DateTimeFormat().resolvedOptions().timeZone);
      setState((s) => ({ ...s, enabled: true, hour }));
      setMsg(`Pronto! Se você não cumprir a meta até as ${hour}h, eu te lembro.`);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await api.pushDisable();
      setState((s) => ({ ...s, enabled: false }));
      setMsg('Lembrete desativado.');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg('');
    try {
      await api.pushTest();
      setMsg('Notificação de teste enviada.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="setting setting-col">
      <div className="setting-row">
        <span>🔔 Lembrete diário<small>avisa se a meta do dia ainda não foi cumprida</small></span>
        <input type="checkbox" checked={state.enabled} disabled={busy} onChange={(e) => (e.target.checked ? enable() : disable())} />
      </div>
      {state.enabled && (
        <div className="setting-row">
          <span>Horário</span>
          <select value={state.hour} disabled={busy} onChange={(e) => enable(Number(e.target.value))}>
            {[8, 10, 12, 14, 16, 18, 19, 20, 21, 22].map((h) => (
              <option key={h} value={h}>{h}h</option>
            ))}
          </select>
        </div>
      )}
      {state.enabled && <button className="btn btn-ghost btn-block" disabled={busy} onClick={test}>Enviar notificação de teste</button>}
      {msg && <small className="muted">{msg}</small>}
    </div>
  );
}
