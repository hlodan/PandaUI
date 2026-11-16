/* Neutral entry screen and existing PIN access. Personal records are unchanged. */
const COVER_KEY = IS_PREVIEW ? 'pandaui-preview-access-v1' : 'pandaui-access-v1';
const coverState = { authorized: false, booted: false, busy: false, generation: 0, mode: '', idleAt: Date.now(), hold: null, holdStart: null };
function readCoverConfig() {
  let c = {}; try { c = JSON.parse(localStorage.getItem(COVER_KEY) || '{}') || {}; } catch {}
  const valid = /^[a-f0-9]{32}$/.test(c.salt || '') && /^[a-f0-9]{64}$/.test(c.hash || '');
  return { salt: valid ? c.salt : '', hash: valid ? c.hash : '', iterations: 150000, idleSeconds: [15, 60, 300].includes(c.idleSeconds) ? c.idleSeconds : 60, failed: Number.isInteger(c.failed) ? Math.min(5, Math.max(0, c.failed)) : 0, lockedUntil: Number.isFinite(c.lockedUntil) && c.lockedUntil < Date.now() + 60000 ? c.lockedUntil : 0 };
}
function writeCoverConfig(c) { try { localStorage.setItem(COVER_KEY, JSON.stringify(c)); return true; } catch { return false; } }
function isPrivateUnlocked() { return coverState.authorized && !$('privateApp').hidden; }
function enterPrivateApp() {
  if (!coverState.authorized || document.hidden) return false;
  closeCoverDialog(); $('gameShell').hidden = true; $('privateApp').hidden = false; $('privateApp').inert = false; document.body.classList.remove('cover-locked');
  coverState.idleAt = Date.now();
  if (!coverState.booted) { coverState.booted = true; bootPanda(); } else { $('lock').hidden = true; go('sum'); }
  $('coverIdle').value = readCoverConfig().idleSeconds;
  return true;
}
function lockCover() {
  coverState.generation++; coverState.authorized = false; coverState.busy = false;
  $('privateApp').hidden = true; $('privateApp').inert = true; document.body.classList.add('cover-locked');
  closeCoverDialog(); $('gameShell').hidden = false; $('gameShell').inert = false;
  for (const id of ['ov', 'widgetOverlay', 'lock', 'toast']) if ($(id)) $(id).hidden = true;
  document.body.classList.remove('sheet-open');
  if (typeof returnLiveEditors === 'function') returnLiveEditors();
  if (document.activeElement?.blur) document.activeElement.blur();
  window.scrollTo(0, 0);
}
function closeCoverDialog() {
  coverState.generation++; coverState.busy = false;
  $('coverDialog').hidden = true; $('coverPin').value = ''; $('coverPinRepeat').value = ''; $('coverPinError').textContent = '';
  $('gameShell').inert = false; $('privateApp').inert = !isPrivateUnlocked();
  $('coverPinSubmit').disabled = false;

}
function showCoverDialog(mode) {
  coverState.generation++;
  coverState.mode = mode; coverState.busy = false;
  $('coverDialog').hidden = false; $('gameShell').inert = true; $('privateApp').inert = true;
  $('coverPinForm').hidden = false;
  const setting = mode === 'setup' || mode === 'change';
  $('coverPinRepeatField').hidden = !setting; $('coverPin').value = ''; $('coverPinRepeat').value = ''; $('coverPinError').textContent = '';
  $('coverDialogTitle').textContent = setting ? 'Nastavit přístup' : 'PandaUI';
  $('coverDialogText').textContent = setting ? 'Zvol PIN o 4 až 8 číslicích a zapamatuj si ho.' : mode === 'verify-change' ? 'Nejdřív ověř současný PIN.' : 'Zadej svůj PIN.';
  $('coverPinLabel').textContent = setting ? 'Nový PIN' : 'PIN'; $('coverPinSubmit').disabled = false;
  $('coverPin').focus();
}
function openCoverAccess() {
  if (coverState.busy) return;
  const config = readCoverConfig(); showCoverDialog(config.hash || S.set.pinOn && S.set.pin ? 'unlock' : 'setup');
}
const hexBytes = bytes => [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
async function deriveCoverPin(pin, salt) {
  if (!globalThis.crypto?.subtle) throw Error('crypto-unavailable');
  const bytes = Uint8Array.from(salt.match(/../g).map(v => parseInt(v, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hexBytes(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes, iterations: 150000 }, key, 256)));
}
async function matchesCoverPin(pin, config) {
  if (!config.hash) return !!(S.set.pinOn && S.set.pin && hs(pin) === S.set.pin);
  const hash = await deriveCoverPin(pin, config.salt); let difference = 0;
  for (let i = 0; i < hash.length; i++) difference |= hash.charCodeAt(i) ^ config.hash.charCodeAt(i);
  return difference === 0;
}
async function storeCoverPin(pin, config) {
  const salt = hexBytes(crypto.getRandomValues(new Uint8Array(16))), hash = await deriveCoverPin(pin, salt);
  return { ...config, salt, hash, failed: 0, lockedUntil: 0 };
}
async function submitCoverPin(event) {
  event?.preventDefault(); if (coverState.busy) return false;
  const pin = $('coverPin').value, repeat = $('coverPinRepeat').value, mode = coverState.mode, generation = coverState.generation, config = readCoverConfig();
  const setting = mode === 'setup' || mode === 'change';
  if (config.lockedUntil > Date.now()) { $('coverPinError').textContent = 'Zkus to znovu za ' + Math.ceil((config.lockedUntil - Date.now()) / 1000) + ' s.'; return false; }
  if (!/^\d{4,8}$/.test(pin)) { $('coverPinError').textContent = 'Zadej 4 až 8 číslic.'; return false; }
  if (setting && pin !== repeat) { $('coverPinError').textContent = 'PINy se neshodují.'; return false; }
  coverState.busy = true; $('coverPinSubmit').disabled = true;
  try {
    const matches = setting || await matchesCoverPin(pin, config);
    if (generation !== coverState.generation || document.hidden || $('coverDialog').hidden) return false;
    if (!matches) {
      config.failed++; if (config.failed >= 5) { config.lockedUntil = Date.now() + 30000; config.failed = 0; }
      writeCoverConfig(config); $('coverPinError').textContent = config.lockedUntil > Date.now() ? 'Chvíli počkej. Další pokus za 30 s.' : 'Nesprávný PIN.'; $('coverPin').value = ''; return false;
    }
    const next = setting || !config.hash ? await storeCoverPin(pin, config) : { ...config, failed: 0, lockedUntil: 0 };
    if (generation !== coverState.generation || document.hidden || $('coverDialog').hidden) return false;
    if (!writeCoverConfig(next)) { $('coverPinError').textContent = 'Přístup nelze uložit. Zkontroluj dostupnost úložiště.'; return false; }
    if (mode === 'verify-change') { showCoverDialog('change'); return true; }
    if (mode === 'change') { closeCoverDialog(); return true; }
    coverState.authorized = true; return enterPrivateApp();
  } catch { $('coverPinError').textContent = 'Přístup tady nelze bezpečně ověřit. Otevři aplikaci v aktuálním prohlížeči.'; return false; }
  finally { coverState.busy = false; $('coverPinSubmit').disabled = false; }
}
function initCover() {
  const panda = $('stackPanda');
  const cancelHold = () => { clearTimeout(coverState.hold); coverState.hold = null; };
  panda.onpointerdown = event => { if (event.button > 0) return; event.preventDefault(); cancelHold(); coverState.holdStart = [event.clientX, event.clientY]; coverState.hold = setTimeout(() => { coverState.hold = null; openCoverAccess(); }, 3000); };
  panda.onpointerup = panda.onpointercancel = panda.onpointerleave = cancelHold;
  panda.onpointermove = event => { if (coverState.holdStart && Math.hypot(event.clientX - coverState.holdStart[0], event.clientY - coverState.holdStart[1]) > 12) cancelHold(); };
  panda.oncontextmenu = event => event.preventDefault();
  panda.onkeydown = event => { if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) { event.preventDefault(); cancelHold(); coverState.hold = setTimeout(openCoverAccess, 3000); } };
  panda.onkeyup = panda.onblur = cancelHold;
  $('coverDialogClose').onclick = closeCoverDialog;
  $('coverPinForm').onsubmit = submitCoverPin;
  $('coverQuickHide').onclick = $('coverReturn').onclick = lockCover;
  $('coverChangePin').onclick = () => showCoverDialog('verify-change');
  $('coverIdle').onchange = () => { const c = readCoverConfig(); c.idleSeconds = [15, 60, 300].includes(+$('coverIdle').value) ? +$('coverIdle').value : 60; writeCoverConfig(c); coverState.idleAt = Date.now(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelHold(); lockCover(); } });
  window.addEventListener('pagehide', lockCover); window.addEventListener('pageshow', event => { if (event.persisted) lockCover(); });
  for (const name of ['pointerdown', 'keydown', 'input', 'scroll']) document.addEventListener(name, () => { if (isPrivateUnlocked()) coverState.idleAt = Date.now(); }, { passive: true });
  setInterval(checkCoverIdle, 1000);
  document.addEventListener('keydown', event => {
    if ($('coverDialog').hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeCoverDialog(); }
    if (event.key === 'Tab') { const fields = [...$('coverDialog').querySelectorAll('button,input')].filter(n => !n.disabled && n.getClientRects().length); const first = fields[0], last = fields.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
  });
  lockCover(); prepareCoverOffline(); window.PANDA_READY = true; if ($('startupRecovery')) $('startupRecovery').hidden = true;
}
function checkCoverIdle() { if (isPrivateUnlocked() && Date.now() - coverState.idleAt >= readCoverConfig().idleSeconds * 1000) lockCover(); }

