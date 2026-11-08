/* Local game and screen privacy. This does not encrypt the personal record. */
const COVER_KEY = IS_PREVIEW ? 'pandaui-preview-access-v1' : 'pandaui-access-v1';
const STACK_KEY = IS_PREVIEW ? 'pandaui-preview-stack-v1' : 'pandaui-stack-v1';
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
  pauseStack(); closeCoverDialog(); $('gameShell').hidden = true; $('privateApp').hidden = false; $('privateApp').inert = false; document.body.classList.remove('cover-locked');
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
  pauseStack(); renderStack(); window.scrollTo(0, 0);
}
function closeCoverDialog() {
  coverState.generation++; coverState.busy = false;
  $('coverDialog').hidden = true; $('coverPin').value = ''; $('coverPinRepeat').value = ''; $('coverPinError').textContent = '';
  $('gameShell').inert = false; $('privateApp').inert = !isPrivateUnlocked();
  $('coverPinSubmit').disabled = false;
  if (!isPrivateUnlocked()) renderStack();
}
function showCoverDialog(mode) {
  coverState.generation++;
  pauseStack(); coverState.mode = mode; coverState.busy = false;
  $('coverDialog').hidden = false; $('gameShell').inert = true; $('privateApp').inert = true;
  $('coverPinForm').hidden = mode === 'help'; $('stackHelpBody').hidden = mode !== 'help';
  if ($('towerShop')) $('towerShop').hidden = true;
  const setting = mode === 'setup' || mode === 'change';
  $('coverPinRepeatField').hidden = !setting; $('coverPin').value = ''; $('coverPinRepeat').value = ''; $('coverPinError').textContent = '';
  $('coverDialogTitle').textContent = mode === 'help' ? 'Jak hrát' : setting ? 'Nastavit přístup' : 'PandaUI';
  $('coverDialogText').textContent = mode === 'help' ? 'Jedno klepnutí. Další patro.' : setting ? 'Zvol PIN o 4 až 8 číslicích a zapamatuj si ho.' : mode === 'verify-change' ? 'Nejdřív ověř současný PIN.' : 'Zadej svůj PIN.';
  $('coverPinLabel').textContent = setting ? 'Nový PIN' : 'PIN'; $('coverPinSubmit').disabled = false;
  if (mode === 'help') { $('stackVibration').checked = stack.vibration; $('coverDialogClose').focus(); } else $('coverPin').focus();
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
function freshStack(best = 0, vibration = true) { return { status: 'ready', blocks: [{ x: 80, width: 160 }], x: 12, direction: 1, score: 0, best, vibration, perfects: 0 }; }
function readStack() {
  try {
    const s = JSON.parse(localStorage.getItem(STACK_KEY) || 'null');
    if (!s || !Array.isArray(s.blocks) || !s.blocks.length || s.blocks.length > 2000 || !s.blocks.every(b => Number.isFinite(b.x) && Number.isFinite(b.width) && b.width >= 4 && b.x >= 0 && b.x + b.width <= 320) || !Number.isSafeInteger(s.score) || s.score < 0 || !Number.isSafeInteger(s.best) || s.best < 0) return freshStack();
    return { ...s, best: Math.max(s.best, s.score), x: Number.isFinite(s.x) ? Math.min(308 - s.blocks.at(-1).width, Math.max(12, s.x)) : 12, direction: s.direction === -1 ? -1 : 1, status: s.status === 'over' ? 'over' : s.blocks.length > 1 || s.status === 'playing' || s.status === 'paused' ? 'paused' : 'ready', vibration: s.vibration !== false, perfects: Number.isSafeInteger(s.perfects) ? s.perfects : 0 };
  } catch { return freshStack(); }
}
let stack = readStack(), stackFrameId = null, stackLastTime = 0;
let stackEffects = [], stackSparks = [], stackGlow = 0, stackCamera = 0;
function stackBurst(x, y, color, count = 15) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < count; i++) stackSparks.push({ x, y, vx: (Math.random() - .5) * 150, vy: -40 - Math.random() * 120, life: .8, color });
}
function stackCut(x, width, index) {
  if (width <= 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  stackEffects.push({ x, width, y: 378 - index * 22 + Math.max(0, stack.blocks.length - 8) * 22, vy: -18, vx: x < 160 ? -28 : 28, life: 1, color: 'hsl(' + (165 + index * 11) % 360 + ' 58% 64%)' });
}
function saveStack() { try { localStorage.setItem(STACK_KEY, JSON.stringify(stack)); } catch {} }
function stackAdvance(seconds) {
  if (stack.status !== 'playing') return;
  const width = stack.blocks.at(-1).width, left = 12, right = 308 - width, speed = Math.min(225, 85 + (stack.blocks.length - 1) * 6);
  stack.x += stack.direction * speed * Math.max(0, Math.min(.1, seconds));
  if (stack.x > right) { stack.x = right - (stack.x - right); stack.direction = -1; }
  if (stack.x < left) { stack.x = left + (left - stack.x); stack.direction = 1; }
}
function placeStackBlock() {
  if (stack.status !== 'playing' || !$('coverDialog').hidden || isPrivateUnlocked()) return false;
  const top = stack.blocks.at(-1), perfect = Math.abs(stack.x - top.x) <= 4;
  const left = perfect ? top.x : Math.max(stack.x, top.x), right = perfect ? top.x + top.width : Math.min(stack.x + top.width, top.x + top.width);
  if (right - left < 4 || stack.blocks.length >= 2000) { if (stack.blocks.length < 2000 && towerMeta.shields > 0) { towerMeta.shields--; saveTower(); stack.x=12; stack.direction=1; $('stackStatus').textContent='Štít tě zachránil. Ještě jedna šance!'; renderStack(); return false; } stackCut(stack.x, top.width, stack.blocks.length); stack.status = 'over'; stack.best = Math.max(stack.best, stack.score); saveStack(); renderStack(); return false; }
  if (!perfect) { if (stack.x < top.x) stackCut(stack.x, left - stack.x, stack.blocks.length); else stackCut(right, stack.x + top.width - right, stack.blocks.length); }
  stack.blocks.push({ x: left, width: right - left }); stack.score += perfect ? 2 : 1; stack.perfects = perfect ? stack.perfects + 1 : 0;
  stack.best = Math.max(stack.best, stack.score); stack.direction = stack.blocks.length % 2 ? 1 : -1; stack.x = stack.direction === 1 ? 12 : 308 - (right - left);
  if (perfect) {
    const bonus = Math.min(3, Math.max(0, stack.perfects - 1)); stack.score += bonus; stack.best = Math.max(stack.best, stack.score); stackGlow = 1;
    stackBurst(left + (right - left) / 2, 378 - (stack.blocks.length - 1) * 22 + Math.max(0, stack.blocks.length - 8) * 22, '#a5f3d4');
  }
  $('stackStatus').textContent = perfect ? (stack.perfects > 1 ? 'Série ' + stack.perfects + '× · ' : 'Přesně! · ') + '+' + (2 + Math.min(3, Math.max(0, stack.perfects - 1))) + ' body' : 'Další patro. +1 bod';
  if (perfect && stack.vibration) { try { navigator.vibrate?.(12); } catch {} }
  awardTower(perfect);
  saveStack(); renderStack(); return true;
}
function stackFrame(timestamp) {
  stackFrameId = null; if (document.hidden || isPrivateUnlocked() || !$('coverDialog').hidden) return;
  const seconds = stackLastTime ? Math.min(.05, (timestamp - stackLastTime) / 1000) : 0; stackLastTime = timestamp;
  stackAdvance(seconds); stackGlow = Math.max(0, stackGlow - seconds * 2);
  for (const e of stackEffects) { e.vy += 480 * seconds; e.y += e.vy * seconds; e.x += e.vx * seconds; e.life -= seconds; }
  for (const e of stackSparks) { e.vy += 160 * seconds; e.y += e.vy * seconds; e.x += e.vx * seconds; e.life -= seconds; }
  stackEffects = stackEffects.filter(e => e.life > 0 && e.y < 460); stackSparks = stackSparks.filter(e => e.life > 0);
  drawStack(); if (stack.status === 'playing' || stackEffects.length || stackSparks.length || stackGlow > 0) stackFrameId = requestAnimationFrame(stackFrame);
}
function playStack() {
  if (!$('coverDialog').hidden || isPrivateUnlocked()) return;
  if (stack.status === 'playing') { placeStackBlock(); return; }
  if (stack.status === 'over') { stack = freshStack(stack.best, stack.vibration); stackEffects = []; stackSparks = []; stackCamera = 0; }
  stack.status = 'playing'; stackLastTime = 0; saveStack(); renderStack(); if (stackFrameId == null) stackFrameId = requestAnimationFrame(stackFrame);
}
function pauseStack() {
  if (stack.status === 'playing') { stack.status = 'paused'; saveStack(); }
  if (stackFrameId != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(stackFrameId); stackFrameId = null; stackLastTime = 0;
}
function drawStack() {
  const canvas = $('stackCanvas'), ctx = canvas.getContext?.('2d'); if (!ctx) return;
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 320, 430);
  const target = Math.max(0, stack.blocks.length - 8) * 22;
  stackCamera = matchMedia('(prefers-reduced-motion: reduce)').matches ? target : stackCamera + (target - stackCamera) * .15;
  const camera = stackCamera;
  for (let i = 0; i < 22; i++) { ctx.fillStyle = '#b8d8fa' + (i % 3 === 0 ? '40' : '18'); ctx.fillRect((i * 73 + 19) % 310, (i * 47 + 14) % 350, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1); }
  ctx.strokeStyle = '#2d405a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(18, 403); ctx.lineTo(302, 403); ctx.stroke();
  stack.blocks.forEach((b, i) => { const y = 378 - i * 22 + camera; if (y > 430 || y < -30) return;
    ctx.fillStyle = '#00000030'; ctx.fillRect(b.x + 3, y + 4, b.width, 20);
    const colors = towerColors(i), gradient = ctx.createLinearGradient(b.x, y, b.x, y + 20); gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1]); ctx.fillStyle = gradient; ctx.fillRect(b.x, y, b.width, 20); ctx.fillStyle = '#ffffff45'; ctx.fillRect(b.x, y, b.width, 2);
    if (towerMeta.skin === 'circuit') { ctx.fillStyle='#ffffff55'; for(let j=6;j<b.width-3;j+=16)ctx.fillRect(b.x+j,y+6,2,8); }
    if (towerMeta.skin === 'cosmic') { ctx.fillStyle='#ffffff99'; for(let j=8;j<b.width-3;j+=21)ctx.fillRect(b.x+j,y+8,2,2); }
    if (i > 0 && i % 5 === 0) { ctx.fillStyle = '#ffffff88'; ctx.font = '9px -apple-system,sans-serif'; ctx.textAlign = 'right'; ctx.fillText(String(i), b.x - 9, y + 13); }
  });
  if (stack.status === 'playing' || stack.status === 'paused') { const top = stack.blocks.at(-1), y = 378 - stack.blocks.length * 22 + camera; ctx.fillStyle = '#f4c98a'; ctx.shadowColor = '#f4c98a66'; ctx.shadowBlur = 12; ctx.fillRect(stack.x, y, top.width, 20); ctx.shadowBlur = 0; }
  for (const e of stackEffects) { ctx.globalAlpha = Math.max(0, e.life); ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.width, 20); }
  for (const e of stackSparks) { ctx.globalAlpha = Math.max(0, e.life); ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, 3, 3); } ctx.globalAlpha = 1;
  if (stackGlow > 0) { ctx.strokeStyle = 'rgba(165,243,212,' + stackGlow * .5 + ')'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 316, 426); }
}
function renderStack() {
  renderTowerHUD();
  if ($('stackPause')) $('stackPause').disabled = stack.status !== 'playing';
  if ($('stackLevel')) $('stackLevel').textContent = stack.blocks.length > 20 ? 'Zóna soustředění' : stack.blocks.length > 10 ? 'Ve správném rytmu' : 'Najdi svůj rytmus';
  if ($('stackFloors')) $('stackFloors').textContent = (stack.blocks.length - 1) + ' pater';
  if ($('stackCombo')) { $('stackCombo').textContent = stack.perfects > 1 ? 'PERFECT ×' + stack.perfects : 'Přesnost se vyplácí'; $('stackCombo').classList.toggle('is-hot', stack.perfects > 1); }
  $('stackScore').textContent = stack.score; $('stackBest').textContent = stack.best;
  $('stackPlay').textContent = stack.status === 'playing' ? 'Položit blok' : stack.status === 'paused' ? 'Pokračovat' : stack.status === 'over' ? 'Hrát znovu' : 'Hrát';
  $('stackMessage').hidden = stack.status === 'playing'; $('stackNew').hidden = stack.status === 'ready';
  $('stackMessageTitle').textContent = stack.status === 'over' ? 'Ještě o blok výš?' : stack.status === 'paused' ? 'Věž na tebe počká.' : 'Najdi svůj rytmus.';
  $('stackMessageText').textContent = stack.status === 'over' ? 'Skóre ' + stack.score + ' · rekord ' + stack.best : stack.status === 'paused' ? 'Pokračuj tam, kde jsi skončil.' : 'Pokládej bloky na sebe. Přesah se odřízne.';
  if (stack.status !== 'playing') $('stackStatus').textContent = stack.status === 'over' ? 'Minul jsi. Nová věž, nová šance.' : 'Jedno klepnutí. Další patro.';
  drawStack();
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
  $('stackHelp').onclick = () => showCoverDialog('help'); $('coverDialogClose').onclick = closeCoverDialog;
  $('towerWorkshop').onclick = openTowerWorkshop;
  $('coverPinForm').onsubmit = submitCoverPin;
  $('coverQuickHide').onclick = $('coverReturn').onclick = lockCover;
  $('coverChangePin').onclick = () => showCoverDialog('verify-change');
  $('coverIdle').onchange = () => { const c = readCoverConfig(); c.idleSeconds = [15, 60, 300].includes(+$('coverIdle').value) ? +$('coverIdle').value : 60; writeCoverConfig(c); coverState.idleAt = Date.now(); };
  $('stackPlay').onclick = playStack; $('stackCanvas').onclick = placeStackBlock;
  if ($('stackPause')) $('stackPause').onclick = () => { pauseStack(); renderStack(); };
  $('stackCanvas').onkeydown = event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); placeStackBlock(); } };
  $('stackNew').onclick = () => { pauseStack(); stack = freshStack(stack.best, stack.vibration); stackEffects = []; stackSparks = []; stackGlow = 0; stackCamera = 0; saveStack(); renderStack(); };
  $('stackVibration').onchange = () => { stack.vibration = $('stackVibration').checked; saveStack(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelHold(); lockCover(); } });
  window.addEventListener('pagehide', lockCover); window.addEventListener('pageshow', event => { if (event.persisted) lockCover(); });
  for (const name of ['pointerdown', 'keydown', 'input', 'scroll']) document.addEventListener(name, () => { if (isPrivateUnlocked()) coverState.idleAt = Date.now(); }, { passive: true });
  setInterval(checkCoverIdle, 1000);
  document.addEventListener('keydown', event => {
    if ($('coverDialog').hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeCoverDialog(); }
    if (event.key === 'Tab') { const fields = [...$('coverDialog').querySelectorAll('button,input')].filter(n => !n.disabled && n.getClientRects().length); const first = fields[0], last = fields.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
  });
  lockCover(); prepareCoverOffline();
}
function checkCoverIdle() { if (isPrivateUnlocked() && Date.now() - coverState.idleAt >= readCoverConfig().idleSeconds * 1000) lockCover(); }

const TOWER_KEY = IS_PREVIEW ? 'pandaui-preview-workshop-v1' : 'pandaui-workshop-v1';
const TOWER_SKINS = [
 {id:'mint',name:'Origin',cost:0,colors:['#a4efd3','#368f9d'],note:'Čisté sklo a mátové hrany'},
 {id:'sunset',name:'Sunset',cost:45,colors:['#ffd08e','#db608e'],note:'Teplé odstíny západu slunce'},
 {id:'ice',name:'Arctic',cost:70,colors:['#d5fbff','#448bd2'],note:'Ledové vrstvy a modré stíny'},
 {id:'circuit',name:'Circuit',cost:100,colors:['#b9ff6a','#269282'],note:'Neonové dílky s obvodovým vzorem'},
 {id:'cosmic',name:'Cosmic',cost:140,colors:['#e9b3ff','#7656ce'],note:'Hvězdný vzor a fialová galaxie'}
];
function loadTower(){let p={};try{p=JSON.parse(localStorage.getItem(TOWER_KEY)||'{}')||{}}catch{};const unlocked=['mint',...TOWER_SKINS.filter(s=>s.id!=='mint'&&Array.isArray(p.unlocked)&&p.unlocked.includes(s.id)).map(s=>s.id)];return {coins:Number.isSafeInteger(p.coins)&&p.coins>=0?Math.min(p.coins,1000000):0,unlocked,skin:unlocked.includes(p.skin)?p.skin:'mint',shields:Number.isInteger(p.shields)?Math.max(0,Math.min(3,p.shields)):0,daily:p.daily&&p.daily.date===todayK()?{date:todayK(),floors:Math.max(0,Math.min(10000,Number(p.daily.floors)||0)),perfect:Math.max(0,Math.min(10000,Number(p.daily.perfect)||0)),claimed:Array.isArray(p.daily.claimed)?p.daily.claimed.filter(k=>['floors','perfect'].includes(k)):[]}:{date:todayK(),floors:0,perfect:0,claimed:[]}}}
let towerMeta=loadTower();
function saveTower(){try{localStorage.setItem(TOWER_KEY,JSON.stringify(towerMeta))}catch{}}
function refreshTowerDay(){if(towerMeta.daily.date!==todayK())towerMeta.daily={date:todayK(),floors:0,perfect:0,claimed:[]}}
function towerColors(i){const skin=TOWER_SKINS.find(s=>s.id===towerMeta.skin)||TOWER_SKINS[0];return skin.id==='mint'?['hsl('+((165+i*11)%360)+' 58% 70%)','hsl('+((165+i*11)%360)+' 48% 48%)']:skin.colors}
function awardTower(perfect){refreshTowerDay();towerMeta.coins+=perfect?3:1;towerMeta.daily.floors++;if(perfect)towerMeta.daily.perfect++;saveTower()}
function renderTowerHUD(){if(!$('towerCoins'))return;refreshTowerDay();$('towerCoins').textContent='◈ '+towerMeta.coins;$('towerShield').textContent=towerMeta.shields?'◇ '+towerMeta.shields+' štít':'';$('gameShell').dataset.skin=towerMeta.skin}
function towerAction(kind,id){refreshTowerDay();if(kind==='skin'){const s=TOWER_SKINS.find(s=>s.id===id);if(!s)return false;if(!towerMeta.unlocked.includes(id)){if(towerMeta.coins<s.cost)return false;towerMeta.coins-=s.cost;towerMeta.unlocked.push(id)}towerMeta.skin=id}
 else if(kind==='shield'){if(towerMeta.coins<30||towerMeta.shields>=3)return false;towerMeta.coins-=30;towerMeta.shields++}
 else if(kind==='widen'){const b=stack.blocks.at(-1);if(towerMeta.coins<25||!['paused','playing'].includes(stack.status)||b.width>=160)return false;towerMeta.coins-=25;const w=Math.min(160,b.width+20);b.x=Math.max(12,Math.min(308-w,b.x-(w-b.width)/2));b.width=w;stack.x=Math.max(12,Math.min(308-w,stack.x));saveStack()}
 else if(kind==='claim'){if(!['floors','perfect'].includes(id))return false;const goal=id==='floors'?20:id==='perfect'?5:Infinity;if(towerMeta.daily[id]<goal||towerMeta.daily.claimed.includes(id))return false;towerMeta.daily.claimed.push(id);towerMeta.coins+=id==='floors'?20:25}
 else return false;saveTower();renderStack();openTowerWorkshop();return true}
function openTowerWorkshop(){showCoverDialog('help');$('stackHelpBody').hidden=true;$('towerShop').hidden=false;$('coverDialogTitle').textContent='Dílna';$('coverDialogText').textContent='Skiny, bonusy a úkoly. Vše jen za mince ze hry.';renderTowerWorkshop()}
function renderTowerWorkshop(){refreshTowerDay();const box=$('towerShop');box.textContent='';box.appendChild(el('strong','tower-wallet','◈ '+towerMeta.coins+' mincí'));box.appendChild(el('p','tower-description','Za patro získáš 1 minci, za přesné 3. Mince se nekupují za peníze.'));
 const label=t=>box.appendChild(el('h3','tower-section',t));label('Dnešní úkoly');for(const [id,name,goal,reward]of [['floors','Postav 20 pater',20,20],['perfect','Polož 5 dílků přesně',5,25]]){const done=towerMeta.daily.claimed.includes(id),button=el('button','tower-mission',name+' · '+Math.min(goal,towerMeta.daily[id])+'/'+goal+' · '+(done?'Splněno':'+'+reward+' ◈'));button.disabled=done||towerMeta.daily[id]<goal;button.onclick=()=>towerAction('claim',id);box.appendChild(button)}
 label('Vzhled dílků');const grid=el('div','tower-skins');for(const s of TOWER_SKINS){const owned=towerMeta.unlocked.includes(s.id),b=el('button','tower-skin'),sample=el('span','tower-skin-sample');sample.style.background='linear-gradient(145deg,'+s.colors[0]+','+s.colors[1]+')';b.append(sample,el('strong',null,s.name),el('small',null,s.note),el('span','tower-skin-price',s.id===towerMeta.skin?'✓ Vybráno':owned?'Použít':s.cost+' ◈'));b.setAttribute('aria-pressed',String(s.id===towerMeta.skin));b.disabled=!owned&&towerMeta.coins<s.cost;b.onclick=()=>towerAction('skin',s.id);grid.appendChild(b)}box.appendChild(grid);
 label('Bonusy');for(const [id,name,note,cost,disabled]of [['shield','Druhá šance','Při minutí tě zachrání. V zásobě '+towerMeta.shields+'/3.',30,towerMeta.shields>=3],['widen','Širší základ','Rozšíří vrchní dílek, nejvýše na původní šířku.',25,!['paused','playing'].includes(stack.status)||stack.blocks.at(-1).width>=160]]){const b=el('button','tower-bonus');b.append(el('strong',null,name+' · '+cost+' ◈'),el('small',null,note));b.disabled=disabled||towerMeta.coins<cost;b.onclick=()=>towerAction(id);box.appendChild(b)}}
