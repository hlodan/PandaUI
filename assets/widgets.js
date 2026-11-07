/* PandaUI 2.0 — persisted, configurable cards. No framework or network dependency. */
const WIDGET_CATALOGUE = {
  home: {
    limit: { title: 'Denní limit', description: 'Dnešní součet, hranice a zbývající množství.', icon: '◴', tone: 'mint' },
    clearance: { title: 'Odbourávání', description: 'Přehledný časový odhad a parametry modelu.', icon: '◌', tone: 'lavender' },
    quick: { title: 'Zápis dávky', description: 'Rychlé volby, množství a souvislost s jídlem.', icon: '+', tone: 'mint' },
    recent: { title: 'Poslední záznamy', description: 'Nejnovější dávky a vstup do celé historie.', icon: '↗', tone: 'blue' },
    today: { title: 'Dnešek v číslech', description: 'Gramy, počet záznamů a náklady za dnešek.', icon: '▥', tone: 'peach' },
    trend: { title: 'Spotřeba v čase', description: 'Graf gramů, odhadovaných nákladů nebo mitragyninu.', icon: '⌁', tone: 'blue' },
    gap: { title: 'Odstup od dávky', description: 'Čas od posledního zápisu a vlastní připomínka odstupu.', icon: '◷', tone: 'peach' },
    week: { title: 'Týdenní porovnání', description: 'Posledních sedm celých dní proti předchozím sedmi.', icon: '⇄', tone: 'blue' },
    spending: { title: 'Náklady na dávky', description: 'Přehled nákladů ze záznamů za zvolené období.', icon: 'Kč', tone: 'peach' },
    purchases: { title: 'Moje nákupy', description: 'Samostatný součet nákupů, bez odečítání dávek.', icon: '▱', tone: 'lavender' },
    tolerance: { title: 'Spotřeba podle váhy', description: 'Popisné g/kg a odhad mg/kg podle osobního profilu.', icon: 'kg', tone: 'mint' },
  },
  stats: {
    lifetime: { title: 'Celá historie', description: 'Celkem spotřebováno a počet záznamů.', icon: '∞', tone: 'mint' },
    period: { title: 'Zvolené období', description: 'Souhrn spotřeby, nákladů a pauz.', icon: '▥', tone: 'blue' },
    level: { title: 'Model hladiny', description: 'Orientační průběh množství v modelu.', icon: '⌁', tone: 'lavender' },
    weekly: { title: 'Týdenní souhrn', description: 'Tento a předchozí kalendářní týden.', icon: '⇄', tone: 'blue' },
    forecast: { title: 'Výhled nákladů', description: 'Vlastní scénář spotřeby a ceny na 30 dní.', icon: 'Kč', tone: 'peach' },
    weekdays: { title: 'Dny v týdnu', description: 'Rozložení spotřeby podle dnů.', icon: '▤', tone: 'mint' },
    hours: { title: 'Denní rytmus', description: 'Rozložení spotřeby podle hodin.', icon: '◷', tone: 'peach' },
    tags: { title: 'Souvislosti', description: 'Přehled štítků z uložených dávek.', icon: '#', tone: 'blue' },
    strains: { title: 'Druhy', description: 'Zastoupení druhů ve zvoleném období.', icon: '◔', tone: 'lavender' },
  },
};
const DEFAULT_LAYOUT = {
  home: { order: ['limit', 'clearance', 'quick', 'recent', 'today', 'trend', 'gap', 'week', 'spending', 'purchases', 'tolerance'], hidden: ['gap', 'week', 'spending', 'purchases', 'tolerance'] },
  stats: { order: ['lifetime', 'period', 'weekly', 'forecast', 'weekdays', 'hours', 'strains', 'level', 'tags'], hidden: ['tags'] },
};
const DEFAULT_WIDGET_OPTIONS = {
  home: { quick: { step: .5, showMeals: true, showPresets: true, showEstimate: true }, clearance: { showDetails: true, emphasis: 'time' }, limit: { showStreak: false }, recent: { count: 3, showTags: true }, today: { showCost: true }, trend: { range: 7, metric: 'g' }, spending: { days: 7 }, purchases: { showCost: true } },
  stats: { lifetime: { showCosts: true }, period: {}, level: {}, weekly: {}, forecast: {}, weekdays: {}, hours: {}, tags: {}, strains: {} },
};
let widgetSystemReady = false;
let layoutEditing = { home: false, stats: false };
let activeWidgetSheet = null;
let lastWidgetTrigger = null;
let draggingWidget = null;
let lastRenderedLayout = '';

function normalizeWidgetUI() {
  const previous = S.ui && typeof S.ui === 'object' ? S.ui : {};
  const layouts = {};
  for (const page of ['home', 'stats']) {
    const known = Object.keys(WIDGET_CATALOGUE[page]), old = previous[page] || {};
    const order = [...new Set((Array.isArray(old.order) ? old.order : DEFAULT_LAYOUT[page].order).filter(k => known.includes(k)))];
    known.forEach(k => { if (!order.includes(k)) order.push(k); });
    const hidden = [...new Set((Array.isArray(old.hidden) ? old.hidden : DEFAULT_LAYOUT[page].hidden).filter(k => known.includes(k)))];
    const config = {};
    known.forEach(k => {
      const saved = old.config?.[k] && typeof old.config[k] === 'object' ? old.config[k] : {};
      const compact = previous.schema >= 2 && typeof saved.compact === 'boolean' ? saved.compact : saved.compact === true ? true : page === 'home' && k === 'limit' ? true : null;
      config[k] = { ...(DEFAULT_WIDGET_OPTIONS[page][k] || {}), ...saved, compact };
    });
    layouts[page] = { order, hidden, config };
  }
  // Placements are independent of the original configuration scope.
  const assigned = new Set(), all = Object.keys({ ...WIDGET_CATALOGUE.home, ...WIDGET_CATALOGUE.stats });
  for (const page of ['home', 'stats']) {
    const saved = previous[page] || {};
    layouts[page].order = (Array.isArray(saved.order) ? saved.order : DEFAULT_LAYOUT[page].order).filter(k => all.includes(k) && !assigned.has(k) && assigned.add(k));
    layouts[page].hidden = (Array.isArray(saved.hidden) ? saved.hidden : DEFAULT_LAYOUT[page].hidden).filter(k => layouts[page].order.includes(k));
  }
  all.forEach(k => { if (!assigned.has(k)) { const page = widgetScope(k); layouts[page].order.push(k); if (DEFAULT_LAYOUT[page].hidden.includes(k)) layouts[page].hidden.push(k); } });
  const purchase = previous.purchase || {};
  const sizes = [...new Set((Array.isArray(purchase.sizes) ? purchase.sizes : [25, 50, 100, 250]).map(Number).filter(g => Number.isFinite(g) && g > 0 && g <= 100000))].slice(0, 8);
  S.ui = { ...previous, schema: 2, ...layouts, appearance: { density: previous.appearance?.density === 'compact' ? 'compact' : 'standard', motion: previous.appearance?.motion !== false, strongSeparators: !!previous.appearance?.strongSeparators }, purchase: { sizes, showCounts: purchase.showCounts !== false, compactCart: !!purchase.compactCart, historyOrder: purchase.historyOrder === 'oldest' ? 'oldest' : 'newest', historyCount: [0, 5, 10, 20].includes(purchase.historyCount) ? purchase.historyCount : 10 } };
  if (IS_PREVIEW && !(previous.schema >= 2)) { try { localStorage.setItem(TK, 'dark'); applyTheme('dark'); } catch {} }
  normalizePersonalProfile();
  const q = S.ui.home.config.quick;
  if (![.1, .5, 1].includes(q.step)) q.step = .5;
  const r = S.ui.home.config.recent;
  if (![3, 5, 10].includes(r.count)) r.count = 3;
  const t = S.ui.home.config.trend;
  if (![7, 14, 30].includes(t.range)) t.range = 7;
  if (!['g', 'mg', 'kc'].includes(t.metric)) t.metric = 'g';
  if (![7, 30, 90].includes(S.ui.home.config.spending.days)) S.ui.home.config.spending.days = 7;
}
function widgetConfig(key, page = 'home') {
  page = widgetScope(key);
  return S.ui?.[page]?.config?.[key] || DEFAULT_WIDGET_OPTIONS[page]?.[key] || {};
}
function purchaseOptions() {
  return S.ui?.purchase || { sizes: [25, 50, 100, 250], showCounts: true, compactCart: false, historyOrder: 'newest', historyCount: 10 };
}
function saveWidgetConfig(key, page, property, value) {
  page = widgetScope(key);
  if (!S.ui?.[page]?.config?.[key]) return;
  S.ui[page].config[key][property] = value;
  save();
}
function isCompactWidget(key, page = 'home') {
  const explicit = widgetConfig(key, page).compact;
  return typeof explicit === 'boolean' ? explicit : S.ui.appearance.density === 'compact';
}
function editPageLayout(page) { layoutEditing[page] = true; go(page === 'stats' ? 'data' : 'sum'); renderWidgets(); }
function normalizePersonalProfile() {
  const p = S.profile && typeof S.profile === 'object' ? S.profile : {};
  const kg = typeof p.weightKg === 'number' && Number.isFinite(p.weightKg) && p.weightKg >= 30 && p.weightKg <= 250 ? p.weightKg : null;
  const subjectiveTolerance = Number.isInteger(p.subjectiveTolerance) && p.subjectiveTolerance >= 1 && p.subjectiveTolerance <= 10 ? p.subjectiveTolerance : null;
  S.profile = { ...p, weightKg: kg, weightUpdatedAt: kg && typeof p.weightUpdatedAt === 'string' && Number.isFinite(new Date(p.weightUpdatedAt).getTime()) ? p.weightUpdatedAt : null, subjectiveTolerance, showRelative: p.showRelative !== false, snapshotWeight: p.snapshotWeight !== false };
}
function getProfileWeight() { return S.profile?.weightKg || null; }
function formatRelative(value) { return value.toLocaleString('cs-CZ', { maximumFractionDigits: 3 }); }
function setProfileWeight(value) {
  if (value !== null && (!Number.isFinite(value) || value < 30 || value > 250)) return false;
  S.profile.weightKg = value === null ? null : Math.round(value * 10) / 10;
  S.profile.weightUpdatedAt = value === null ? null : new Date().toISOString();
  if (value !== null) S.set.kg = S.profile.weightKg;
  save(); renderProfileSettings(); renderQuick(); renderWidgets(); return true;
}
function renderProfileSettings() {
  if (!$('profileWeightState') || !S.profile) return;
  $('kg').value = getProfileWeight() || '';
  $('profileRelativeOn').checked = S.profile.showRelative; $('profileSnapshotOn').checked = S.profile.snapshotWeight;
  $('profileWeightState').textContent = getProfileWeight() ? 'Uloženo ' + (S.profile.weightUpdatedAt ? new Date(S.profile.weightUpdatedAt).toLocaleDateString('cs-CZ') : 'v profilu') + ' · ' + fmt(getProfileWeight()) + ' kg' : 'Váha zatím není zadaná. Výchozích 70 kg ze staré verze nepovažujeme za tvoji skutečnou váhu.';
  const tolerance = S.profile.subjectiveTolerance;
  $('tlS').textContent = 'Vnímaná tolerance ke kratomu';
  $('tlD').textContent = 'Tvoje hodnocení, nakolik má stejné množství slabší účinek než dříve. Hodnota 1 znamená, že oslabení nepociťuješ, 10 výrazně slabší účinek. Z hodnocení se nepočítá dávkování.';
  $('tl').value = tolerance || 5; $('tl').style.setProperty('--range-fill', ((($('tl').valueAsNumber || 5) - 1) / 9 * 100) + '%');
  $('tl').setAttribute('aria-label', 'Vnímaná tolerance ke kratomu od 1 do 10');
  $('profileToleranceValue').textContent = tolerance ? tolerance + ' / 10' : 'Nezadaná';
  $('profileToleranceClear').hidden = tolerance == null;
}
function appendWeightCalculation() {
  const weight = getProfileWeight(), grams = parseFloat($('g').value), strain = S.strains.find(s => s.id === $('st').value);
  if (!S.profile.showRelative || !weight || !(grams > 0)) return;
  $('calc').textContent += '\nPřepočet při ' + fmt(weight) + ' kg: ' + formatRelative(grams / weight) + ' g/kg' + (strain?.pct > 0 ? ' · ≈ ' + formatRelative(mg(grams, strain.pct) / weight) + ' mg/kg mitragyninu' : '');
  const old = editD && S.doses.find(d => d.id === editD);
  if (old?.weightKgAtEntry) $('calc').textContent += '\nVáha uložená při původním zápisu: ' + fmt(old.weightKgAtEntry) + ' kg.';
}
function renderWeightWidget() {
  const box = $('tolC'); if (!box) return; box.textContent = ''; $('sug').textContent = '';
  const weight = getProfileWeight();
  if (!weight) { box.appendChild(el('p', 'widget-note', 'Pro popisné přepočty nejdřív zadej svou váhu v osobním profilu.')); const b = el('button', 'small-primary', 'Otevřít osobní profil'); b.onclick = () => go('more'); box.appendChild(b); return; }
  const today = currentDoses().filter(d => d.time.slice(0, 10) === todayK()), grams = today.reduce((a, d) => a + d.g, 0), known = today.filter(d => Number.isFinite(d.pct) && d.pct > 0), mitragynine = known.reduce((a, d) => a + mg(d.g, d.pct), 0);
  box.append(el('strong', 'widget-big-number', formatRelative(grams / weight) + ' g/kg'), el('p', 'widget-note', 'Dnešní gramy prášku / aktuální tělesná hmotnost ' + fmt(weight) + ' kg.'));
  if (known.length) box.appendChild(el('p', 'widget-note', 'Mitragynin podle zadaného složení: ≈ ' + formatRelative(mitragynine / weight) + ' mg/kg' + (known.length < today.length ? ' (jen z dávek s vyplněným složením).' : '.')));
  box.appendChild(el('p', 'widget-note', 'Popisný poměr, ne doporučená dávka ani změřená koncentrace v krvi.'));
}
function renderAppearanceSettings() {
  if (!S.ui?.appearance || !$('globalDensity')) return;
  $('globalDensity').value = S.ui.appearance.density; $('motionOn').checked = S.ui.appearance.motion; $('strongSeparatorsOn').checked = S.ui.appearance.strongSeparators;
}
function applyAppearance() {
  document.documentElement.classList.toggle('motion-disabled', !S.ui.appearance.motion);
  document.documentElement.classList.toggle('strong-separators', S.ui.appearance.strongSeparators);
}
function widgetNode(key, page) {
  return document.querySelector('[data-widget="' + key + '"]');
}
function renderWidgetHead(node, key, page) {
  const meta = WIDGET_CATALOGUE[widgetScope(key)][key], header = node.querySelector('.widget-heading');
  node.dataset.widgetPage = page;
  if (header.dataset.ready === page) return;
  header.textContent = '';
  const identity = el('div', 'widget-identity'), icon = el('span', 'widget-icon', meta.icon), title = el('h2', null, meta.title);
  identity.append(icon, title);
  const tools = el('div', 'widget-tools'), grip = el('button', 'widget-grip', '⠿'), menu = el('button', 'widget-menu-button', '•••');
  grip.type = menu.type = 'button';
  grip.setAttribute('aria-label', 'Přesunout widget ' + meta.title);
  grip.title = 'Přesunout: podrž a táhni, nebo použij klávesy ↑ ↓';
  grip.onpointerdown = e => startWidgetDrag(e, node, page);
  grip.onkeydown = e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); moveWidget(key, page, e.key === 'ArrowUp' ? -1 : 1); widgetNode(key, page).querySelector('.widget-grip').focus(); } };
  menu.setAttribute('aria-label', 'Možnosti widgetu ' + meta.title);
  menu.setAttribute('aria-haspopup', 'dialog');
  menu.onclick = () => openWidgetMenu(key, page);
  tools.append(grip, menu); header.append(identity, tools); header.dataset.ready = page;
  node.dataset.tone = meta.tone;
}
function drawLayout(page) {
  const layout = S.ui[page], grid = $(page === 'home' ? 'dashboardGrid' : 'statisticsGrid');
  grid.classList.toggle('layout-editing', layoutEditing[page]);
  const before = new Map([...grid.children].map(node => [node, node.getBoundingClientRect()]));
  layout.order.forEach(key => {
    const node = widgetNode(key, page); if (!node) return;
    renderWidgetHead(node, key, page);
    node.hidden = layout.hidden.includes(key);
    node.classList.toggle('widget-compact', isCompactWidget(key, page));
    grid.appendChild(node);
  });
  const signature = JSON.stringify([S.ui.home.order, S.ui.home.hidden, S.ui.stats.order, S.ui.stats.hidden]);
  if (lastRenderedLayout && lastRenderedLayout !== signature && !draggingWidget && S.ui.appearance.motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    before.forEach((rect, node) => {
      if (node.hidden || !rect.height || !node.animate) return;
      const now = node.getBoundingClientRect(), dy = rect.top - now.top;
      if (Math.abs(dy) > 1 && Math.abs(dy) < 1200) node.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  if (page === 'stats') lastRenderedLayout = signature;
  const hint = $(page === 'home' ? 'layoutHint' : 'statsLayoutHint'), toggle = $(page === 'home' ? 'layoutToggle' : 'statsLayoutToggle');
  hint.hidden = !layoutEditing[page]; toggle.textContent = layoutEditing[page] ? '✓ Hotovo' : '▦ Upravit'; toggle.setAttribute('aria-pressed', String(layoutEditing[page]));
  let empty = grid.querySelector('.layout-empty');
  if (layout.order.every(k => layout.hidden.includes(k))) {
    if (!empty) { empty = el('div', 'layout-empty', 'Tady máš místo pro svůj vlastní přehled. Přidej první widget níže.'); grid.appendChild(empty); }
  } else empty?.remove();
}
function moveWidget(key, page, direction) {
  const layout = S.ui[page], visible = layout.order.filter(k => !layout.hidden.includes(k)), from = visible.indexOf(key), to = from + direction;
  if (from < 0 || to < 0 || to >= visible.length) return;
  const first = layout.order.indexOf(key), second = layout.order.indexOf(visible[to]);
  [layout.order[first], layout.order[second]] = [layout.order[second], layout.order[first]];
  save(); renderWidgets();
}
function hideWidget(key, page) {
  if (!S.ui[page].hidden.includes(key)) S.ui[page].hidden.push(key);
  save(); closeWidgetSheet(); renderWidgets(); toast('Widget skrytý. Vrátíš ho přes Přidat widget.');
}
function addWidget(key, page) {
  if (!S.ui[page].order.includes(key)) transferWidget(key, page, false);
  S.ui[page].hidden = S.ui[page].hidden.filter(k => k !== key);
  save(); renderWidgets(); openWidgetCatalogue(page);
}
function startWidgetDrag(event, node, page) {
  if (!layoutEditing[page] || event.button > 0) return;
  event.preventDefault(); draggingWidget = { node, page, pointerId: event.pointerId }; node.classList.add('is-dragging');
  document.body.classList.add('widget-dragging');
}
document.addEventListener('pointermove', event => {
  if (!draggingWidget || event.pointerId !== draggingWidget.pointerId) return;
  event.preventDefault();
  const { node, page } = draggingWidget, grid = $(page === 'home' ? 'dashboardGrid' : 'statisticsGrid');
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.dashboard-widget');
  if (target && target !== node && target.parentElement === grid && !target.hidden) {
    const rect = target.getBoundingClientRect();
    grid.insertBefore(node, event.clientY > rect.top + rect.height / 2 ? target.nextSibling : target);
  }
  if (event.clientY < 100) window.scrollBy(0, -14);
  if (event.clientY > innerHeight - 110) window.scrollBy(0, 14);
}, { passive: false });
function finishWidgetDrag(event) {
  if (!draggingWidget || (event?.pointerId != null && event.pointerId !== draggingWidget.pointerId)) return;
  const { node, page } = draggingWidget, grid = node.parentElement;
  node.classList.remove('is-dragging'); document.body.classList.remove('widget-dragging');
  S.ui[page].order = [...grid.querySelectorAll('.dashboard-widget')].map(n => n.dataset.widget);
  draggingWidget = null; save(); renderWidgets();
}
document.addEventListener('pointerup', finishWidgetDrag);
document.addEventListener('pointercancel', finishWidgetDrag);

function renderLimitWidget() {
  const box = $('limC'), L = limit(), used = dayG(todayK()); box.textContent = '';
  if (!L) {
    const text = el('div', 'limit-empty'); text.append(el('strong', null, 'Tvoje hranice pro dnešní den'), el('p', null, 'Nastav si vlastní denní limit. Dnešní součet uvidíš pořád na očích.'));
    const button = el('button', 'small-primary', 'Nastavit limit'); button.onclick = () => openWidgetMenu('limit', 'home'); text.appendChild(button); box.appendChild(text); return;
  }
  const over = used > L.g, remaining = Math.max(0, L.g - used), ratio = L.g > 0 ? used / L.g : used > 0 ? 1 : 0;
  const compact = isCompactWidget('limit'), main = el('div', 'limit-main'), number = el('div', 'limit-number');
  number.append(el('strong', null, fmt(used)), el('span', null, ' / ' + fmt(L.g) + ' g'));
  const badge = el('span', 'limit-status' + (over ? ' is-over' : ''), over ? 'Nad limitem' : compact ? Math.round(ratio * 100) + ' %' : L.src === 'plan' ? 'Plán · týden ' + L.w : 'Dnešní limit'); main.append(number, badge);
  const meter = el('div', 'limit-track'), fill = el('i'); fill.style.width = Math.min(100, Math.max(0, ratio * 100)) + '%'; if (over) fill.style.background = 'var(--red)'; meter.appendChild(fill);
  meter.setAttribute('role', 'meter'); meter.setAttribute('aria-label', 'Dnešní spotřeba vůči limitu'); meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', String(Math.max(L.g, used, 1))); meter.setAttribute('aria-valuenow', String(used));
  const foot = el('div', 'limit-footer'); foot.appendChild(el('span', null, over ? 'O ' + fmt(used - L.g) + ' g nad tvou hranicí' : 'Zbývá ' + fmt(remaining) + ' g do vlastního limitu')); if (!compact) foot.appendChild(el('strong', null, Math.round(ratio * 100) + ' %'));
  box.append(main, meter, foot);
  if (!compact && widgetConfig('limit').showStreak) { const streak = streaks(); if (streak) box.appendChild(el('p', 'widget-note', 'Série v limitu: ' + streak.cur + ' dní · rekord ' + streak.best + ' dní')); }
}
function renderClearanceWidget() {
  const box = $('hero'), amount = inBody(), config = widgetConfig('clearance'); box.textContent = ''; box.className = 'clearance-widget';
  const hasRecords = S.doses.some(d => new Date(d.time).getTime() <= Date.now());
  const records = currentDoses(), missingComposition = records.some(d => !(d.pct > 0)), hasKnownComposition = records.some(d => d.pct > 0);
  const hours = amount > 1 ? S.set.hl * Math.log2(amount) : 0, end = new Date(Date.now() + hours * 36e5);
  let duration = hours < 1 ? 'méně než 1 h' : (Math.floor(hours / 24) ? Math.floor(hours / 24) + ' d ' : '') + Math.round(hours % 24) + ' h';
  if (Math.round(hours % 24) === 24) duration = (Math.floor(hours / 24) + 1) + ' d';
  const row = el('div', 'clearance-main'), headline = el('div');
  headline.append(el('small', null, config.emphasis === 'amount' ? 'Modelový zbytek nyní' : 'Pod hranici 1 mg přibližně za'));
  headline.appendChild(el('strong', null, !hasRecords ? 'Zatím bez dat' : !hasKnownComposition ? 'Chybí složení' : config.emphasis === 'amount' ? fmt(amount) + ' mg' : amount <= 1 ? missingComposition ? 'Jen známé dávky' : 'Pod 1 mg' : duration));
  const emblem = el('span', 'clearance-emblem', '◌'); row.append(headline, emblem); box.appendChild(row);
  if (hasRecords) box.appendChild(el('p', 'clearance-date', amount > 1 ? 'Přibližně ' + end.toLocaleString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'V modelu je zbytek už pod zvolenou hranicí.'));
  if (missingComposition) { const note = box.querySelector('.clearance-date'); if (note) note.textContent = hasKnownComposition ? note.textContent + ' Část dávek nemá složení a není do odhadu započtená.' : 'U dávek chybí procento mitragyninu. Odbourávání z nich nelze spočítat.'; }
  if (config.showDetails && !isCompactWidget('clearance')) {
    const details = el('div', 'clearance-facts'); details.append(el('span', null, 'Teď ≈ ' + fmt(amount) + ' mg'), el('span', null, 'Poločas ' + S.set.hl + ' h')); box.appendChild(details);
  }
  box.appendChild(el('p', 'widget-note', isCompactWidget('clearance') ? 'Odhad modelu, ne údaj o bezpečnosti nebo střízlivosti.' : 'Orientační matematický model. Neurčuje skutečné vyčištění, střízlivost ani bezpečný čas další dávky.'));
}
function currentDoses() { return S.doses.filter(d => Number.isFinite(d.g) && d.g > 0 && new Date(d.time).getTime() <= Date.now()); }
function renderLifetimeStatistics() {
  const box = $('statisticsLifetime'); if (!box) return; box.textContent = '';
  const doses = currentDoses(), total = doses.reduce((a, d) => a + d.g, 0), amount = el('div', 'lifetime-main');
  amount.append(el('span', null, 'Celkem spotřebováno'), el('strong', null, fmt(total) + ' g')); box.appendChild(amount);
  const row = el('div', 'lifetime-facts'); row.append(el('span', null, doses.length + ' záznamů'), el('span', null, new Set(doses.map(d => d.time.slice(0, 10))).size + ' dní se záznamem'));
  if (widgetConfig('lifetime', 'stats').showCosts !== false) row.appendChild(el('span', null, 'Náklady ze záznamů ' + money(doses.reduce((a, d) => a + d.g * (d.price || 0), 0))));
  box.append(row, el('p', 'widget-note', 'Celá uložená historie. Volba období níže tento součet nemění. Nákupy jsou vedené samostatně.'));
  if (S.profile.showRelative && getProfileWeight()) { const grams = doses.filter(d => d.time.slice(0, 10) === todayK()).reduce((a, d) => a + d.g, 0); box.appendChild(el('p', 'weight-stat-note', 'Dnes: ' + formatRelative(grams / getProfileWeight()) + ' g prášku/kg při aktuální váze ' + fmt(getProfileWeight()) + ' kg.')); }
}
function sumDosesBetween(from, until) { return currentDoses().filter(d => d.time.slice(0, 10) >= from && d.time.slice(0, 10) < until); }
function renderExtraWidgets() {
  const today = new Date(todayK() + 'T12:00'), key = delta => { const d = new Date(today); d.setDate(d.getDate() + delta); return iso(d).slice(0, 10); };
  const nowWeek = sumDosesBetween(key(-7), key(0)), previous = sumDosesBetween(key(-14), key(-7)), sum = a => a.reduce((s, d) => s + d.g, 0), diff = sum(nowWeek) - sum(previous);
  const week = $('widgetWeek'); week.textContent = ''; week.append(el('strong', 'widget-big-number', fmt(sum(nowWeek)) + ' g'), el('p', 'widget-note', 'Posledních 7 celých dní · předchozích 7 dní: ' + fmt(sum(previous)) + ' g'), el('span', 'comparison-pill', diff === 0 ? 'Stejná spotřeba' : (diff > 0 ? '+' : '') + fmt(diff) + ' g oproti předchozímu období'));
  const days = widgetConfig('spending').days || 7, doses = currentDoses().filter(d => d.time.slice(0, 10) >= key(1 - days)), cost = doses.reduce((a, d) => a + d.g * (d.price || 0), 0), spending = $('widgetSpending');
  spending.textContent = ''; spending.append(el('strong', 'widget-big-number', money(cost)), el('p', 'widget-note', 'Náklady z dávek za posledních ' + days + ' kalendářních dní.'), el('small', 'widget-note', doses.some(d => !(d.price > 0)) ? 'Část záznamů nemá vyplněnou cenu.' : 'Počítáno z cen uložených při zápisu dávky.'));
  const total = purchaseSummary(), purchases = $('widgetPurchases'); purchases.textContent = ''; purchases.append(el('strong', 'widget-big-number', fmt(total.grams) + ' g'), el('p', 'widget-note', 'Nakoupeno celkem · ' + total.count + ' balení' + (widgetConfig('purchases').showCost ? ' · ' + money(total.cost) : '')));
  const link = el('button', 'inline-link', 'Otevřít Nákup ↗'); link.onclick = () => go('buy'); purchases.append(link, el('p', 'widget-note', 'Samostatná evidence nákupů. Dávky se neodečítají.'));
}
function applyQuickOptions() {
  const q = widgetConfig('quick'); $('quickCard').querySelector('.quick-context').hidden = q.showMeals === false;
  $('quickChips').hidden = q.showPresets === false; $('quickEstimate').hidden = q.showEstimate === false;
  $('quickMinus').setAttribute('aria-label', 'Ubrat ' + fmt(q.step) + ' gramu'); $('quickPlus').setAttribute('aria-label', 'Přidat ' + fmt(q.step) + ' gramu');
  $('doseMinus').setAttribute('aria-label', 'Ubrat ' + fmt(q.step) + ' gramu'); $('dosePlus').setAttribute('aria-label', 'Přidat ' + fmt(q.step) + ' gramu');
  $('todayStrip').children[2].hidden = widgetConfig('today').showCost === false;
  $('todayStrip').classList.toggle('two-metrics', widgetConfig('today').showCost === false);
  if (!$('recentDoses').children.length) $('recentDoses').appendChild(el('p', 'recent-empty', 'První záznam se objeví tady. Celou historii otevřeš kdykoli níže.'));
}
function renderWidgets() {
  if (!widgetSystemReady) return;
  if (!S.ui?.home?.config || !S.ui?.stats?.config) normalizeWidgetUI();
  applyAppearance();
  renderQuick();
  if (S.ui.home.order.some(k => widgetScope(k) === 'stats' && !S.ui.home.hidden.includes(k))) dataPage();
  $('overviewDate').textContent = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  renderLimitWidget(); renderClearanceWidget(); renderWeightWidget(); renderLifetimeStatistics(); renderExtraWidgets(); applyQuickOptions();
  const gap = $('gapC'); if (!gap.children.length) { const p = el('div', 'limit-empty'); p.append(el('p', null, 'Nastav si vlastní připomínku odstupu. Není to výpočet bezpečné doby další dávky.')); const b = el('button', 'small-primary', 'Nastavit odstup'); b.onclick = () => openWidgetMenu('gap', 'home'); p.appendChild(b); gap.appendChild(p); }
  drawLayout('home'); drawLayout('stats'); renderTodayComparisonButton(); renderConsumptionReview();
}

function returnLiveEditors() {
  for (const id of ['presetEditorLive', 'halfLifeEditorLive', 'limitEditorLive', 'gapEditorLive']) { const node = $(id); if (node && node.parentElement !== $('widgetControlStash')) $('widgetControlStash').appendChild(node); }
}
function openWidgetSheet(title, subtitle, renderer) {
  if ($('widgetOverlay').hidden) lastWidgetTrigger = document.activeElement;
  returnLiveEditors(); $('widgetSheetBody').textContent = ''; $('widgetSheetTitle').textContent = title; $('widgetSheetSubtitle').textContent = subtitle;
  renderer($('widgetSheetBody'));
  $('widgetOverlay').hidden = false; document.body.classList.add('sheet-open');
  $('widgetOverlay').querySelector('.widget-sheet').scrollTop = 0; $('widgetSheetClose').focus();
}
function closeWidgetSheet() {
  returnLiveEditors(); $('widgetOverlay').hidden = true; activeWidgetSheet = null;
  if ($('ov').hidden) document.body.classList.remove('sheet-open');
  if (lastWidgetTrigger?.isConnected && !lastWidgetTrigger.closest('[hidden]')) lastWidgetTrigger.focus();
}
function addSectionTitle(parent, text) { parent.appendChild(el('h3', 'config-section-title', text)); }
function addSwitch(parent, title, checked, onChange, description) {
  const label = el('label', 'config-switch'), left = el('span'); left.appendChild(el('strong', null, title)); if (description) left.appendChild(el('small', null, description));
  const input = el('input', 'sw'); input.type = 'checkbox'; input.checked = checked; input.onchange = () => onChange(input.checked); label.append(left, input); parent.appendChild(label);
}
function addSelect(parent, title, value, choices, onChange) {
  const label = el('label', 'config-select'), select = el('select'); label.appendChild(el('span', null, title));
  choices.forEach(([v, text]) => { const o = el('option', null, text); o.value = String(v); select.appendChild(o); }); select.value = String(value); select.onchange = () => onChange(select.value); label.appendChild(select); parent.appendChild(label);
}
function actionButton(parent, text, callback, kind = '', disabled = false) {
  const b = el('button', 'config-action ' + kind, text); b.onclick = callback; b.disabled = disabled; parent.appendChild(b); return b;
}
function changeOption(key, page, property, value) {
  saveWidgetConfig(key, page, property, value);
  if (key === 'trend') { range = widgetConfig('trend').range; metric = widgetConfig('trend').metric; segs(); drawChart(); }
  renderQuick(); renderWidgets();
}
function openWidgetMenu(key, page = 'home') {
  page = widgetPlacement(key);
  const meta = WIDGET_CATALOGUE[widgetScope(key)]?.[key]; if (!meta) return;
  activeWidgetSheet = { key, page };
  openWidgetSheet(meta.title, page === 'home' ? 'Widget v přehledu' : 'Karta statistik', body => {
    const config = widgetConfig(key, page), change = (property, value) => changeOption(key, page, property, value);
    body.appendChild(el('p', 'config-intro', meta.description));
    if (widgetScope(key) === 'stats' && !['lifetime', 'forecast', 'weekly', 'level'].includes(key)) addSelect(body, 'Společné období statistik', dr, [[7, '7 dní'], [14, '14 dní'], [30, 'Měsíc'], [365, 'Rok']], value => { dr = +value; segs(); dataPage(); });
    if (key === 'quick') {
      addSelect(body, 'Krok tlačítek −/+', config.step, [[.1, '0,1 g'], [.5, '0,5 g'], [1, '1 g']], v => change('step', +v));
      addSwitch(body, 'Volba jídla', config.showMeals, v => change('showMeals', v));
      addSwitch(body, 'Rychlá množství', config.showPresets, v => change('showPresets', v));
      addSwitch(body, 'Informace před zápisem', config.showEstimate, v => change('showEstimate', v));
      addSectionTitle(body, 'Moje rychlé volby'); body.appendChild($('presetEditorLive')); renderPresetSettings();
    } else if (key === 'limit') {
      body.appendChild($('limitEditorLive'));
      if (S.set.tpOn) body.appendChild(el('p', 'config-intro', 'Zapnutý plán snižování nyní nahrazuje ruční limit.'));
      addSwitch(body, 'Zobrazit sérii v limitu', config.showStreak, v => change('showStreak', v));
    } else if (key === 'clearance') {
      addSelect(body, 'Hlavní údaj', config.emphasis, [['time', 'Odhad zbývajícího času'], ['amount', 'Modelový zbytek v mg']], v => change('emphasis', v));
      addSwitch(body, 'Podrobnosti modelu', config.showDetails, v => change('showDetails', v));
      body.appendChild($('halfLifeEditorLive')); body.appendChild(el('p', 'config-intro', 'Poločas je parametr matematického modelu, ne změřená hodnota pro tvoje tělo. Odhad není potvrzení vyčištění ani bezpečnosti.'));
    } else if (key === 'recent') {
      addSelect(body, 'Počet posledních dávek', config.count, [[3, '3 záznamy'], [5, '5 záznamů'], [10, '10 záznamů']], v => change('count', +v));
      addSwitch(body, 'Zobrazovat štítky', config.showTags, v => change('showTags', v));
    } else if (key === 'today') addSwitch(body, 'Dnešní náklady', config.showCost, v => change('showCost', v));
    else if (key === 'trend') {
      addSelect(body, 'Období', config.range, [[7, '7 dní'], [14, '14 dní'], [30, '30 dní']], v => change('range', +v));
      addSelect(body, 'Zobrazený údaj', config.metric, [['g', 'Gramy'], ['kc', 'Náklady'], ['mg', 'Mitragynin']], v => change('metric', v));
    } else if (key === 'gap') body.appendChild($('gapEditorLive'));
    else if (key === 'spending') addSelect(body, 'Období', config.days, [[7, '7 dní'], [30, '30 dní'], [90, '90 dní']], v => change('days', +v));
    else if (key === 'purchases') addSwitch(body, 'Ukázat celkovou cenu', config.showCost, v => change('showCost', v));
    else if (key === 'lifetime') addSwitch(body, 'Náklady ze záznamů', config.showCosts, v => change('showCosts', v));
    else if (key === 'tolerance') actionButton(body, 'Otevřít osobní profil ↗', () => { closeWidgetSheet(); go('more'); });
    else body.appendChild(el('p', 'config-intro', page === 'stats' ? 'Období pro tuto kartu zvolíš nahoře ve Statistikách.' : 'Porovnání používá celé dny, aby dnešek nezkresloval výsledek.'));
    addSectionTitle(body, 'Vzhled a umístění');
    addSwitch(body, 'Kompaktní karta', isCompactWidget(key, page), v => change('compact', v), 'Nižší karta, stručnější údaje a menší ovládací prvky.');
    const visible = S.ui[page].order.filter(k => !S.ui[page].hidden.includes(k)), index = visible.indexOf(key), actions = el('div', 'config-move-actions');
    actionButton(actions, '↑ Posunout výše', () => { moveWidget(key, page, -1); openWidgetMenu(key, page); }, '', index <= 0);
    actionButton(actions, '↓ Posunout níže', () => { moveWidget(key, page, 1); openWidgetMenu(key, page); }, '', index < 0 || index === visible.length - 1);
    body.appendChild(actions);
    actionButton(body, page === 'home' ? 'Přesunout do Statistik →' : 'Přesunout do Přehledu →', () => transferWidget(key, page === 'home' ? 'stats' : 'home'));
    if (index >= 0) actionButton(body, 'Skrýt tuto kartu', () => hideWidget(key, page), 'destructive');
    else actionButton(body, 'Přidat do přehledu', () => { addWidget(key, page); closeWidgetSheet(); });
    body.appendChild(el('p', 'config-footer', 'Změny se ukládají automaticky. Skryté widgety lze kdykoli přidat zpět.'));
  });
}
function openWidgetCatalogue(page = 'home') {
  openWidgetSheet(page === 'home' ? 'Přidej si widget' : 'Karty statistik', 'Tvůj přehled. Tvoje pořadí.', body => {
    Object.entries({ ...WIDGET_CATALOGUE.home, ...WIDGET_CATALOGUE.stats }).forEach(([key, meta]) => {
      const added = S.ui[page].order.includes(key) && !S.ui[page].hidden.includes(key), row = el('button', 'catalogue-row' + (added ? ' is-added' : ''));
      const icon = el('span', 'widget-icon', meta.icon), label = el('span', 'catalogue-copy'); icon.dataset.tone = meta.tone;
      label.append(el('strong', null, meta.title), el('small', null, meta.description + (widgetPlacement(key) !== page ? ' · Přesune se z druhé stránky.' : ''))); row.append(icon, label, el('span', 'catalogue-add', added ? '✓' : '+'));
      row.setAttribute('aria-label', (added ? 'Upravit ' : 'Přidat ') + meta.title); row.onclick = () => added ? openWidgetMenu(key, page) : addWidget(key, page); body.appendChild(row);
    });
    actionButton(body, 'Obnovit výchozí rozložení obou stránek', () => { for (const p of ['home', 'stats']) { S.ui[p].order = [...DEFAULT_LAYOUT[p].order]; S.ui[p].hidden = [...DEFAULT_LAYOUT[p].hidden]; } save(); renderWidgets(); closeWidgetSheet(); toast('Výchozí rozložení obnoveno'); });
  });
}

function savePurchaseOptions() { save(); if (tab === 'buy') renderBuy(); renderExtraWidgets(); }
function openPurchaseOptions() {
  openWidgetSheet('Moje balení', 'Volby přímo v Nákupu', body => {
    body.appendChild(el('p', 'config-intro', 'Nech si jen velikosti, které používáš. Vlastní velikost můžeš při nákupu zadat i bez uložené rychlé volby.'));
    const list = el('div', 'package-editor');
    purchaseOptions().sizes.forEach((g, index) => {
      const row = el('div', 'package-editor-row'), input = el('input'), remove = el('button', 'package-remove', '×'); input.type = 'number'; input.min = '.1'; input.max = '100000'; input.step = '.1'; input.inputMode = 'decimal'; input.value = g; input.setAttribute('aria-label', 'Velikost balení ' + (index + 1) + ' v gramech'); remove.setAttribute('aria-label', 'Odebrat velikost ' + fmt(g) + ' g');
      input.onchange = () => { const value = input.valueAsNumber; if (!Number.isFinite(value) || value <= 0 || value > 100000 || purchaseOptions().sizes.some((v, i) => i !== index && v === value)) { input.value = g; toast('Zadej jinou kladnou velikost balení.'); return; } S.ui.purchase.sizes[index] = value; savePurchaseOptions(); };
      remove.onclick = () => { S.ui.purchase.sizes.splice(index, 1); savePurchaseOptions(); openPurchaseOptions(); }; row.append(input, el('span', null, 'g'), remove); list.appendChild(row);
    }); body.appendChild(list);
    const add = el('div', 'package-add'), input = el('input'), button = el('button', null, '＋ Přidat'); input.type = 'number'; input.min = '.1'; input.step = '.1'; input.inputMode = 'decimal'; input.placeholder = 'Vlastní velikost (g)'; input.setAttribute('aria-label', 'Nová velikost balení v gramech'); button.disabled = purchaseOptions().sizes.length >= 8;
    button.onclick = () => { const value = input.valueAsNumber; if (!Number.isFinite(value) || value <= 0 || value > 100000 || purchaseOptions().sizes.includes(value) || purchaseOptions().sizes.length >= 8) { toast('Zadej odlišnou velikost; můžeš mít až 8 voleb.'); return; } S.ui.purchase.sizes.push(value); savePurchaseOptions(); openPurchaseOptions(); }; add.append(input, button); body.appendChild(add);
    const suggestions = el('div', 'package-suggestions'); [10, 25, 50, 100, 200, 250, 500].filter(g => !purchaseOptions().sizes.includes(g)).forEach(g => { const b = el('button', null, '＋ ' + g + ' g'); b.disabled = purchaseOptions().sizes.length >= 8; b.onclick = () => { S.ui.purchase.sizes.push(g); savePurchaseOptions(); openPurchaseOptions(); }; suggestions.appendChild(b); }); body.appendChild(suggestions);
    body.appendChild(el('p', 'config-footer', 'Úprava voleb nemění už uložené nákupy ani jejich gramáž.'));
  });
}
function openCartOptions() {
  openWidgetSheet('Rozpracovaný nákup', 'Možnosti zobrazení', body => {
    addSwitch(body, 'Kompaktní položky', purchaseOptions().compactCart, value => { S.ui.purchase.compactCart = value; savePurchaseOptions(); });
    body.appendChild(el('p', 'config-intro', 'Rozpracovaný nákup se ukládá průběžně. Do součtů se započítá až po potvrzení.'));
  });
}
function openPurchaseSummaryOptions() {
  openWidgetSheet('Přehled nákupů', 'Samostatná evidence', body => {
    addSwitch(body, 'Počty balení a nákupů', purchaseOptions().showCounts, value => { S.ui.purchase.showCounts = value; savePurchaseOptions(); });
    body.appendChild(el('p', 'config-intro', 'Vždy se ukazuje nakoupená gramáž a celková cena. Dávky se od nákupů neodečítají.'));
  });
}
function openPurchaseHistoryOptions() {
  openWidgetSheet('Historie nákupů', 'Pořadí a počet záznamů', body => {
    addSelect(body, 'Seřadit', purchaseOptions().historyOrder, [['newest', 'Od nejnovějších'], ['oldest', 'Od nejstarších']], value => { S.ui.purchase.historyOrder = value; savePurchaseOptions(); });
    addSelect(body, 'Počet nákupů', purchaseOptions().historyCount, [[5, '5 nákupů'], [10, '10 nákupů'], [20, '20 nákupů'], [0, 'Všechny']], value => { S.ui.purchase.historyCount = +value; savePurchaseOptions(); });
  });
}

$('widgetSheetClose').onclick = closeWidgetSheet;
$('widgetOverlay').onclick = event => { if (event.target === $('widgetOverlay')) closeWidgetSheet(); };
document.addEventListener('keydown', event => {
  if ($('widgetOverlay').hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeWidgetSheet(); }
  if (event.key === 'Tab') {
    const focusable = [...$('widgetOverlay').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(n => n.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
$('layoutToggle').onclick = () => { layoutEditing.home = !layoutEditing.home; renderWidgets(); };
$('statsLayoutToggle').onclick = () => { layoutEditing.stats = !layoutEditing.stats; renderWidgets(); };
$('addWidgetTop').onclick = $('addWidgetBottom').onclick = () => openWidgetCatalogue('home');
$('kg').onchange = () => { const input = $('kg'); if (input.value === '') { setProfileWeight(null); return; } if (!setProfileWeight(input.valueAsNumber)) { toast('Zadej váhu od 30 do 250 kg.'); renderProfileSettings(); } };
$('profileRelativeOn').onchange = () => { S.profile.showRelative = $('profileRelativeOn').checked; save(); renderQuick(); renderWidgets(); };
$('profileSnapshotOn').onchange = () => { S.profile.snapshotWeight = $('profileSnapshotOn').checked; save(); };
$('tl').oninput = () => { const value = $('tl').valueAsNumber; if (!Number.isInteger(value) || value < 1 || value > 10) { renderProfileSettings(); return; } S.profile.subjectiveTolerance = value; save(); renderProfileSettings(); };
$('profileToleranceClear').onclick = () => { S.profile.subjectiveTolerance = null; save(); renderProfileSettings(); };
$('globalDensity').onchange = () => { S.ui.appearance.density = $('globalDensity').value === 'compact' ? 'compact' : 'standard'; for (const page of ['home', 'stats']) Object.keys(S.ui[page].config).forEach(key => { S.ui[page].config[key].compact = null; }); save(); renderQuick(); renderWidgets(); };
$('motionOn').onchange = () => { S.ui.appearance.motion = $('motionOn').checked; save(); applyAppearance(); };
$('strongSeparatorsOn').onchange = () => { S.ui.appearance.strongSeparators = $('strongSeparatorsOn').checked; save(); applyAppearance(); };
let headerTick = false;
window.addEventListener('scroll', () => { if (headerTick) return; headerTick = true; requestAnimationFrame(() => { document.querySelector('.appbar').classList.toggle('is-scrolled', scrollY > 12); headerTick = false; }); }, { passive: true });

// Re-normalize optional UI fields on old backup import, without touching records.
const previousNorm = norm;
norm = () => { previousNorm(); normalizeWidgetUI(); range = widgetConfig('trend').range; metric = widgetConfig('trend').metric; segs(); };
function widgetScope(key) { return WIDGET_CATALOGUE.home[key] ? 'home' : 'stats'; }
function widgetPlacement(key) { return S.ui.home.order.includes(key) ? 'home' : 'stats'; }
function transferWidget(key, destination, follow = true) {
  if (!['home', 'stats'].includes(destination) || !WIDGET_CATALOGUE[widgetScope(key)][key]) return;
  for (const page of ['home', 'stats']) { S.ui[page].order = S.ui[page].order.filter(k => k !== key); S.ui[page].hidden = S.ui[page].hidden.filter(k => k !== key); }
  S.ui[destination].order.push(key); save(); closeWidgetSheet(); renderWidgets();
  if (follow) { go(destination === 'home' ? 'sum' : 'data'); toast('Karta přesunuta. Její nastavení zůstalo zachované.'); }
}
function sameWeekdayComparison(now = new Date()) {
  const past = new Date(now); past.setDate(past.getDate() - 7);
  const today = iso(now).slice(0, 10), previous = iso(past).slice(0, 10);
  const summarize = rows => ({ grams: rows.reduce((s, d) => s + d.g, 0), count: rows.length, cost: rows.reduce((s, d) => s + d.g * (d.price || 0), 0), incompletePrice: rows.some(d => !(d.price > 0)) });
  const doses = S.doses.filter(d => d.g > 0 && new Date(d.time).getTime() <= now.getTime());
  return { today, previous, now, past, current: summarize(doses.filter(d => d.time.slice(0, 10) === today)), prior: summarize(doses.filter(d => d.time.slice(0, 10) === previous && new Date(d.time).getTime() <= past.getTime())), fullPrior: summarize(doses.filter(d => d.time.slice(0, 10) === previous)) };
}
function renderTodayComparisonButton() {
  const node = widgetNode('today'); if (!node || $('todayComparison')) return;
  const button = el('button', 'config-action', '⇄ Porovnat se stejným dnem minulého týdne'); button.id = 'todayComparison'; button.onclick = openTodayComparison;
  node.appendChild(button);
}
function openTodayComparison() {
  const c = sameWeekdayComparison(), delta = c.current.grams - c.prior.grams;
  openWidgetSheet('Dnešek proti minulému týdnu', 'Stejný den v týdnu · srovnání do stejného času', body => {
    body.append(el('p', 'config-intro', c.now.toLocaleDateString('cs-CZ') + ' a ' + c.past.toLocaleDateString('cs-CZ') + ' · do ' + c.now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })), el('strong', 'widget-big-number', delta === 0 ? 'Stejné množství' : 'O ' + fmt(Math.abs(delta)) + ' g ' + (delta > 0 ? 'více' : 'méně')));
    if (c.prior.grams > 0) body.appendChild(el('p', 'widget-note', (delta > 0 ? '+' : '') + fmt(delta / c.prior.grams * 100) + ' % oproti minulému týdnu do stejného času.'));
    for (const [label, a, b] of [['Spotřeba', fmt(c.current.grams) + ' g', fmt(c.prior.grams) + ' g'], ['Záznamy', c.current.count, c.prior.count], ['Náklady', money(c.current.cost), money(c.prior.cost)]]) body.appendChild(el('p', 'config-intro', label + ' · dnes: ' + a + ' · minule: ' + b));
    body.appendChild(el('p', 'widget-note', 'Celý minulý den: ' + fmt(c.fullPrior.grams) + ' g v ' + c.fullPrior.count + ' záznamech. Nula znamená žádný uložený záznam, nikoli ověřenou abstinenci.'));
    if (c.current.incompletePrice || c.prior.incompletePrice) body.appendChild(el('p', 'widget-note', 'Část dávek nemá cenu; náklady jsou neúplné.'));
  });
}
function consumptionReview(now = new Date()) {
  const day = new Date(now); day.setHours(12, 0, 0, 0);
  const key = n => { const d = new Date(day); d.setDate(d.getDate() + n); return iso(d).slice(0, 10); };
  const rows = currentDoses(), recent = rows.filter(d => d.time.slice(0, 10) >= key(-7) && d.time.slice(0, 10) < key(0)), prior = rows.filter(d => d.time.slice(0, 10) >= key(-14) && d.time.slice(0, 10) < key(-7));
  const sum = a => a.reduce((s, d) => s + d.g, 0), ready = rows.some(d => d.time.slice(0, 10) <= key(-14)) && new Set(recent.map(d => d.time.slice(0, 10))).size >= 3 && new Set(prior.map(d => d.time.slice(0, 10))).size >= 3;
  return { ready, current: sum(recent) / 7, prior: sum(prior) / 7, ratio: sum(prior) > 0 ? sum(recent) / sum(prior) : null, date: key(0) };
}
function renderConsumptionReview() {
  const anchor = $('profileToleranceClear'); if (!anchor) return;
  let box = $('consumptionReview');
  if (!box) { box = el('div'); box.id = 'consumptionReview'; anchor.parentElement.appendChild(box); }
  box.textContent = '';
  const trend = consumptionReview();
  box.appendChild(el('p', 'widget-note', trend.ready ? 'Referenční spotřeba: ' + fmt(trend.current) + ' g/den za posledních 7 celých dní; předtím ' + fmt(trend.prior) + ' g/den. Poměr ' + fmt(trend.ratio) + '×.' + (getProfileWeight() ? ' Nyní ' + formatRelative(trend.current / getProfileWeight()) + ' g/kg/den.' : '') : 'Pro trend potřebujeme 14 dní historie a alespoň 3 dny se záznamem v každém týdnu.'));
  box.appendChild(el('p', 'widget-note', 'Doporučené číslo tolerance nelze z gramů ani váhy spolehlivě určit. Hodnocení 1–10 vyplň podle vlastní zkušenosti. Trend spotřeby jej automaticky nemění.'));
  addSwitch(box, 'Upozornit na změnu spotřeby', S.profile.consumptionAlerts !== false, value => { S.profile.consumptionAlerts = value; save(); }, 'Nabídne znovu posoudit vlastní hodnocení tolerance.');
  addSelect(box, 'Upozornit při změně alespoň', S.profile.consumptionThreshold === 50 ? 50 : 25, [[25, '25 %'], [50, '50 %']], value => { S.profile.consumptionThreshold = +value; save(); });
}
function maybeSuggestConsumptionReview() {
  if (!widgetSystemReady || S.profile.consumptionAlerts === false) return;
  const trend = consumptionReview(), threshold = S.profile.consumptionThreshold === 50 ? .5 : .25;
  const last = new Date(S.profile.consumptionReviewAt || 0).getTime();
  if (!trend.ready || trend.ratio == null || Math.abs(trend.ratio - 1) + 1e-9 < threshold || Date.now() - last < 7 * 864e5 || !$('widgetOverlay').hidden || !$('ov').hidden || !$('lock').hidden) return;
  S.profile.consumptionReviewAt = new Date().toISOString(); save();
  openWidgetSheet('Spotřeba se změnila', 'Připomenutí osobního hodnocení', body => {
    body.appendChild(el('p', 'config-intro', 'Posledních 7 celých dní: ' + fmt(trend.current) + ' g/den, předchozích 7 dní: ' + fmt(trend.prior) + ' g/den. Změna ' + (trend.ratio >= 1 ? '+' : '') + fmt((trend.ratio - 1) * 100) + ' %. Chceš znovu posoudit svoji vnímanou toleranci? Samotná změna gramů změnu tolerance neprokazuje.'));
    actionButton(body, 'Otevřít osobní hodnocení', () => { closeWidgetSheet(); go('more'); $('tl').focus(); });
    actionButton(body, 'Teď ne · další připomenutí nejdříve za týden', closeWidgetSheet);
  });
}
normalizeWidgetUI();
range = widgetConfig('trend').range; metric = widgetConfig('trend').metric;
widgetSystemReady = true;
bootPanda();
if (IS_PREVIEW) { $('previewBadge').hidden = false; document.documentElement.classList.add('is-preview'); }
renderWidgets();
setTimeout(maybeSuggestConsumptionReview, 1200);
setInterval(maybeSuggestConsumptionReview, 60000);
