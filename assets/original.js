/* Original-style interface on the existing data format and access controls. */
let originalQuickTime = '';
const originalQuickRecordBase = quickRecord;
quickRecord = function () { return { ...originalQuickRecordBase(), time: originalQuickTime || iso(new Date()) }; };
function originalLifetime() {
  const rows = currentDoses(), keys = rows.map(d => d.time.slice(0, 10)).sort(), total = rows.reduce((s, d) => s + d.g, 0);
  const days = keys.length ? Math.round((Date.parse(todayK() + 'T00:00Z') - Date.parse(keys[0] + 'T00:00Z')) / 864e5) + 1 : 0;
  const active = new Set(keys).size;
  return { total, days, average: days ? total / days : null, activeAverage: active ? total / active : null };
}
function originalStreak() {
  const rows = currentDoses(), keys = rows.map(d => d.time.slice(0, 10)).sort(); if (!keys.length) return { current: 0, best: 0 };
  const sums = new Map(); for (const d of rows) { const k = d.time.slice(0, 10); sums.set(k, (sums.get(k) || 0) + d.g); }
  let run = 0, best = 0;
  const date = new Date(keys[0] + 'T12:00');
  while (iso(date).slice(0, 10) < todayK()) { const k = iso(date).slice(0, 10), L = limFor(k); run = L != null && sums.has(k) && sums.get(k) <= L + 1e-9 ? run + 1 : 0; best = Math.max(best, run); date.setDate(date.getDate() + 1); }
  return { current: run, best };
}
function migrateOriginalLayout() {
  if (S.ui.originalStyle === 1) return;
  for (const page of ['home', 'stats']) { S.ui[page].order = [...DEFAULT_LAYOUT[page].order]; S.ui[page].hidden = [...DEFAULT_LAYOUT[page].hidden]; }
  S.ui.home.hidden = S.ui.home.order.filter(k => !['limit', 'clearance', 'quick', 'recent'].includes(k));
  for (const key of ['limit', 'clearance', 'quick', 'recent']) { S.ui.home.config[key].size = 'standard'; S.ui.home.config[key].compact = false; }
  S.ui.home.config.limit.showStreak = true; S.ui.home.config.quick.step = .5;
  S.ui.home.config.quick.showMeals = true; S.ui.home.config.quick.showPresets = true;
  S.set.qd = [4, 6, 8, 10]; S.ui.originalStyle = 1;
  // Layout migration is saved when the personal app opens; records are untouched.
  try { localStorage.setItem(TK, 'dark'); applyTheme('dark'); } catch {}
  save();
}
const originalRenderQuickBase = renderQuick;
renderQuick = function () { originalRenderQuickBase(); if (typeof widgetSystemReady !== 'undefined' && widgetSystemReady && isPrivateUnlocked()) renderOriginalUI(); };
function renderOriginalUI() {
  if (!isPrivateUnlocked() || !$('originalQuickTime')) return;
  migrateOriginalLayout();
  if (!originalQuickTime) originalQuickTime = iso(new Date());
  $('originalQuickTime').value = originalQuickTime;
  $('originalQuickTime').onchange = () => { originalQuickTime = $('originalQuickTime').value; };
  $('quickAmountText').textContent = quickGrams.toFixed(1).replace('.', ',');
  $('quickSave').textContent = 'Zapsat dávku';
  const L = limit(), over = L && dayG(todayK()) + quickGrams > L.g;
  $('quickSave').classList.toggle('original-over-limit', !!over);
  $('originalDoseInfo').textContent = quickGrams > 0 ? fmt(quickGrams) + ' g' + (over ? ' · překročí nastavený denní limit' : '') : 'Zadej množství';
  const streak = originalStreak();
  $('originalHeaderStreak').textContent = 'Série · ' + dayLabel(streak.current); $('originalHeaderStreak').setAttribute('aria-label', 'Série v limitu: ' + streak.current + ' dokončených dní');
  polishModelCard();
  $('hero').querySelector('.original-mini-model')?.remove();
  const model = el('div', 'original-mini-model'), now = Date.now(), rows = currentDoses().filter(d => d.pct > 0);
  if (rows.length && !isCompactWidget('clearance')) {
    const values = Array.from({ length: 33 }, (_, i) => { const t = now + (i - 8) * 36e5; return rows.reduce((sum, d) => { const entered = new Date(d.time).getTime(); return entered <= t ? sum + mg(d.g, d.pct) * Math.pow(.5, (t - entered) / 36e5 / S.set.hl) : sum; }, 0); });
    const high = Math.max(1, ...values), points = values.map((v, i) => (i * 10).toFixed(1) + ',' + (100 - v / high * 86).toFixed(1)).join(' ');
    model.innerHTML = '<svg viewBox="0 0 320 112" role="img" aria-label="Modelový průběh množství od osmi hodin zpět do dvaceti čtyř hodin dopředu"><path d="M0 100H320M0 57H320M0 14H320" fill="none" stroke="var(--sep)"/><polygon points="0,100 ' + points + ' 320,100" fill="var(--acc)" opacity=".12"/><polyline points="' + points + '" fill="none" stroke="var(--acc)" stroke-width="2"/><path d="M80 9V100" stroke="var(--mute)" stroke-dasharray="3 4"/></svg>';
    model.appendChild(el('small', null, '−8 h · model nyní · +24 h bez dalších dávek')); $('hero').insertBefore(model,$('hero').querySelector('.model-footer'));
  }
  let badge = $('originalLimitStreak'); if (!badge) { badge = el('div', 'original-streak'); badge.id = 'originalLimitStreak'; $('limC').appendChild(badge); }
  const todayLimit = limFor(todayK());
  badge.hidden = widgetConfig('limit').showStreak === false;
  badge.textContent = '';
  const streakName=el('span','streak-label','Série v limitu'),streakValue=el('strong',null,dayLabel(streak.current)),streakRecord=el('small',null,'Rekord '+dayLabel(streak.best)); badge.append(streakName,streakValue,streakRecord);
  badge.setAttribute('aria-label',streak.current+' dokončených dní v limitu, rekord '+streak.best);
  const status=$('limC').querySelector('.limit-status');if(status&&todayLimit!=null){status.textContent=dayG(todayK())>todayLimit?'Nad limitem':'Hranice '+fmt(todayLimit)+' g';}
  renderOriginalLifetime();
}
function dayLabel(n){return n+' '+(n===1?'den':n>=2&&n<=4?'dny':'dní');}
function polishModelCard(){
  const box=$('hero');if(!box||box.querySelector('.model-info-action'))return;
  const notes=[...box.querySelectorAll('.widget-note')],weight=box.querySelector('.weight-stat-note'),text=notes.map(n=>n.textContent);if(weight)text.push(weight.textContent);
  notes.forEach(n=>n.remove());if(weight)weight.remove();
  const note=el('p','model-caption','Orientační model · bez dalších dávek'),button=el('button','model-info-action','O výpočtu');button.type='button';button.onclick=()=>openWidgetSheet('O výpočtu','Parametry a omezení modelu',body=>{text.forEach(t=>body.appendChild(el('p','config-intro',t)));if(!text.length)body.appendChild(el('p','config-intro','Model používá uložené množství, složení a zadaný poločas. Neurčuje střízlivost ani bezpečný čas další dávky.'));});
  if(weight&&widgetConfig('clearance').showWeight!==false){const facts=box.querySelector('.clearance-facts');if(facts)facts.appendChild(el('span',null,'≈ '+formatRelative(inBody()/getProfileWeight())+' mg/kg'));}
  const foot=el('div','model-footer');foot.append(note,button);box.appendChild(foot);
}

function renderOriginalLifetime(){
  let average = $('originalLifetimeAverage'); if (!average) { average = el('div', 'original-average'); average.id = 'originalLifetimeAverage'; $('statisticsLifetime').appendChild(average); }
  const life = originalLifetime(); average.textContent = ''; average.append(el('span', null, 'Průměr za celou dobu'), el('strong', null, life.average == null ? '—' : fmt(life.average) + ' g/den'), el('small', null, life.days ? 'Za ' + life.days + ' kalendářních dní od prvního záznamu včetně dneška a dnů bez zápisu. Jen dny se záznamem: ' + fmt(life.activeAverage) + ' g/den.' : 'Zatím bez záznamů.'));
}
