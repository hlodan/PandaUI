/* Local history, named layouts and independent purchase price statistics. */
let historyView = { month: todayK().slice(0, 7), day: '', query: '', strain: '', range: 'all' };
function historyRows(ignoreDay = false) {
  const searchable = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('cs-CZ');
  const query = searchable(historyView.query.trim());
  const cutoff = new Date(todayK() + 'T12:00'); cutoff.setDate(cutoff.getDate() - Number(historyView.range) + 1);
  const since = historyView.range === 'all' ? '' : iso(cutoff).slice(0, 10);
  return S.doses.filter(d => (!since || d.time.slice(0, 10) >= since) && (ignoreDay || !historyView.day || d.time.slice(0, 10) === historyView.day) && (!historyView.strain || historyStrainKey(d) === historyView.strain) && (!query || searchable([d.strain, d.note, d.method, ...(d.tags || [])].join(' ')).includes(query))).sort((a, b) => b.time.localeCompare(a.time));
}
function historyStrainKey(d) { return d.strainId ? 'id:' + d.strainId : 'name:' + d.strain; }
function changeHistoryMonth(direction) {
  const date = new Date(historyView.month + '-01T12:00'); date.setMonth(date.getMonth() + direction);
  historyView.month = iso(date).slice(0, 7); historyView.day = ''; renderLog();
}
function renderHistoryCalendar() {
  const calendar = $('historyCalendar'); if (!calendar) return;
  const date = new Date(historyView.month + '-01T12:00'), days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  $('historyMonthTitle').textContent = date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  const totals = new Map(); historyRows(true).forEach(d => { const k = d.time.slice(0, 10); totals.set(k, (totals.get(k) || 0) + d.g); });
  calendar.textContent = '';
  for (const name of ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']) calendar.appendChild(el('span', 'calendar-weekday', name));
  for (let i = 0; i < (date.getDay() + 6) % 7; i++) calendar.appendChild(el('span', 'calendar-blank'));
  for (let i = 1; i <= days; i++) {
    const key = historyView.month + '-' + String(i).padStart(2, '0'), total = totals.get(key), b = el('button', 'calendar-day');
    b.type = 'button'; b.append(el('span', null, String(i)), el('small', null, total == null ? '—' : fmt(total) + ' g'));
    b.setAttribute('aria-label', i + '. ' + date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }) + (total == null ? ', bez záznamu' : ', ' + fmt(total) + ' gramů'));
    b.setAttribute('aria-pressed', String(historyView.day === key)); b.classList.toggle('has-records', total != null); b.classList.toggle('is-today', key === todayK());
    b.onclick = () => { historyView.day = historyView.day === key ? '' : key; renderLog(); }; calendar.appendChild(b);
  }
  $('historyCalendarCard').hidden = S.ui.history?.showCalendar === false;
}
function renderHistoryControls() {
  if (!$('historySearch')) return;
  const select = $('historyStrain'); select.textContent = ''; const all = el('option', null, 'Všechny druhy'); all.value = ''; select.appendChild(all);
  const names = new Map(); S.doses.forEach(d => names.set(historyStrainKey(d), d.strain || 'Bez druhu'));
  [...names.entries()].sort((a, b) => a[1].localeCompare(b[1], 'cs')).forEach(([id, name]) => { const o = el('option', null, name); o.value = id; select.appendChild(o); });
  if (historyView.strain && !names.has(historyView.strain)) historyView.strain = '';
  select.value = historyView.strain; $('historyRange').value = historyView.range;
  $('historySelectedDay').textContent = historyView.day ? 'Vybraný den: ' + new Date(historyView.day + 'T12:00').toLocaleDateString('cs-CZ') : 'Všechny dny';
  $('historyClearDay').hidden = !historyView.day;
  $('historyCalendarOn').checked = S.ui.history?.showCalendar !== false;
}
renderLog = function () {
  const box = $('log'); box.textContent = ''; renderHistoryControls(); renderHistoryCalendar();
  const rows = historyRows(), grams = rows.reduce((sum, d) => sum + d.g, 0);
  if ($('historyResults')) $('historyResults').textContent = rows.length + ' záznamů · ' + fmt(grams) + ' g podle filtrů';
  if (!rows.length) { box.appendChild(el('div', 'empty', S.doses.length ? 'Tomuto výběru neodpovídají žádné záznamy.' : 'Zatím žádné dávky. Klepni na + a zapiš první.')); return; }
  const dayTotals = new Map(); rows.forEach(d => { const k = d.time.slice(0, 10); dayTotals.set(k, (dayTotals.get(k) || 0) + d.g); });
  let day = '', group;
  for (const d of rows) {
    const key = d.time.slice(0, 10);
    if (day !== key) {
      day = key; const cap = el('div', 'cap'), sum = dayTotals.get(key);
      cap.append(el('span', null, new Date(key + 'T12:00').toLocaleDateString('cs-CZ')), el('span', null, fmt(sum) + ' g')); group = el('div', 'grp'); box.append(cap, group);
    }
    const button = el('button', 'cell'), left = el('div');
    left.append(el('div', null, fmt(d.g) + ' g · ' + d.strain), el('div', 's', d.time.slice(11) + (d.method ? ' · ' + d.method : '') + (d.price > 0 ? ' · ' + money(d.g * d.price) : '')));
    if (d.tags?.length) left.appendChild(el('div', 's', '# ' + d.tags.join(', ')));
    if (d.note) left.appendChild(el('div', 's', d.note));
    button.append(left, el('div', 'r', fmt(mg(d.g, d.pct)) + ' mg')); button.onclick = () => openDose(d.id); group.appendChild(button);
  }
};
function normalizeLibrary() {
  S.ui.history = { showCalendar: S.ui.history?.showCalendar !== false };
  S.ui.layoutProfiles = (Array.isArray(S.ui.layoutProfiles) ? S.ui.layoutProfiles : []).filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim() && p.name.length <= 32 && ['home', 'stats'].every(page => p[page] && Array.isArray(p[page].order) && Array.isArray(p[page].hidden) && p[page].config && typeof p[page].config === 'object') && JSON.stringify(p).length < 64000).slice(0, 6);
  for (const scope of ['home', 'stats']) for (const c of Object.values(S.ui[scope].config)) if (!['auto', 'small', 'standard'].includes(c.size)) c.size = 'auto';
}
function layoutSnapshot(name, id = uid()) {
  return JSON.parse(JSON.stringify({ id, name, home: S.ui.home, stats: S.ui.stats, density: S.ui.appearance.density }));
}
function saveLayoutProfile(name, updateId) {
  name = String(name || '').trim();
  if (!name || name.length > 32) { toast('Pojmenuj rozložení, nejvýše 32 znaků.'); return false; }
  if (S.ui.layoutProfiles.some(p => p.id !== updateId && p.name.toLocaleLowerCase('cs-CZ') === name.toLocaleLowerCase('cs-CZ'))) { toast('Rozložení s tímto názvem už máš.'); return false; }
  if (updateId) {
    const index = S.ui.layoutProfiles.findIndex(p => p.id === updateId); if (index < 0) return false;
    S.ui.layoutProfiles[index] = layoutSnapshot(name, updateId);
  } else { if (S.ui.layoutProfiles.length >= 6) { toast('Můžeš uložit až 6 rozložení.'); return false; } S.ui.layoutProfiles.push(layoutSnapshot(name)); }
  save(); renderLayoutProfiles(updateId || S.ui.layoutProfiles.at(-1).id); toast('Rozložení uložené'); return true;
}
function applyLayoutProfile(id) {
  const p = S.ui.layoutProfiles.find(p => p.id === id); if (!p) return false;
  const snapshot = JSON.parse(JSON.stringify(p));
  for (const page of ['home', 'stats']) S.ui[page] = snapshot[page];
  S.ui.appearance.density = p.density === 'compact' ? 'compact' : 'standard';
  normalizeWidgetUI(); range = widgetConfig('trend').range; metric = widgetConfig('trend').metric;
  segs(); save(); renderWidgets(); renderAppearanceSettings(); drawChart(); renderLayoutProfiles(id); toast('Rozložení použité'); return true;
}
function renderLayoutProfiles(selected) {
  const select = $('layoutProfileSelect'); if (!select) return;
  const choice = selected || select.value; select.textContent = '';
  const empty = el('option', null, 'Vyber uložené rozložení'); empty.value = ''; select.appendChild(empty);
  S.ui.layoutProfiles.forEach(p => { const o = el('option', null, p.name); o.value = p.id; select.appendChild(o); }); select.value = S.ui.layoutProfiles.some(p => p.id === choice) ? choice : '';
  for (const id of ['layoutProfileApply', 'layoutProfileUpdate', 'layoutProfileDelete']) $(id).disabled = !select.value;
  $('layoutProfileSave').disabled = S.ui.layoutProfiles.length >= 6;
}
function renderSmallWidget(node, key) {
  let summary = node.querySelector('.widget-small-summary');
  if (!summary) { summary = el('button', 'widget-small-summary'); summary.type = 'button'; summary.onclick = () => { saveWidgetConfig(key, widgetScope(key), 'size', 'standard'); renderWidgets(); }; node.appendChild(summary); }
  summary.textContent = '';
  const text = (selector, fallback = 'Bez záznamů') => node.querySelector(selector)?.textContent || fallback;
  let value, note = 'Klepnutím otevřeš běžnou velikost';
  switch (key) {
    case 'limit': value = text('.limit-number', 'Limit nenastavený'); note = text('.limit-footer', 'Klepni pro nastavení limitu'); break;
    case 'clearance': value = text('.clearance-main strong'); note = 'Orientační model odbourávání'; break;
    case 'quick': value = fmt(quickGrams) + ' g'; note = 'Klepni pro zápis dávky'; break;
    case 'recent': value = currentDoses().length ? text('.recent-left strong') : 'Zatím bez záznamů'; break;
    case 'today': value = fmt(dayG(todayK())) + ' g'; note = 'Dnes · ' + currentDoses().filter(d => d.time.slice(0, 10) === todayK()).length + ' záznamů'; break;
    case 'trend': value = fmt(dayG(todayK())) + ' g'; note = 'Dnešní součet · klepni pro graf'; break;
    case 'gap': { const last = currentDoses().sort((a, b) => b.time.localeCompare(a.time))[0]; value = last ? hm((Date.now() - new Date(last.time)) / 6e4) : 'Bez záznamů'; note = 'Od poslední dávky'; break; }
    case 'week': value = text('#widgetWeek strong'); break;
    case 'spending': value = text('#widgetSpending strong'); break;
    case 'purchases': value = fmt(purchaseSummary().grams) + ' g'; note = 'Nakoupeno celkem · samostatná evidence'; break;
    case 'tolerance': value = getProfileWeight() ? formatRelative(dayG(todayK()) / getProfileWeight()) + ' g/kg' : 'Doplň váhu'; note = 'Dnešní spotřeba / aktuální váha'; break;
    case 'lifetime': value = text('.lifetime-main strong'); note = 'Celkem spotřebováno'; break;
    case 'forecast': value = text('#forecastHero b', 'Doplň scénář'); note = 'Výhled nákladů · 30 dní'; break;
    case 'period': value = text('#dCards b'); note = 'Spotřeba za ' + dr + ' dní'; break;
    case 'level': value = fmt(inBody()) + ' mg'; note = 'Modelový zbytek mitragyninu'; break;
    case 'weekly': { const date = new Date(todayK() + 'T12:00'); date.setDate(date.getDate() - (date.getDay() + 6) % 7); const from = iso(date).slice(0, 10); value = fmt(currentDoses().filter(d => d.time.slice(0, 10) >= from).reduce((s, d) => s + d.g, 0)) + ' g'; note = 'Tento kalendářní týden'; break; }
    default: {
      const date = new Date(todayK() + 'T12:00'); date.setDate(date.getDate() - dr + 1); const from = iso(date).slice(0, 10), groups = new Map();
      for (const d of currentDoses().filter(d => d.time.slice(0, 10) >= from)) {
        const t = new Date(d.time), labels = key === 'tags' ? (d.tags || []) : [key === 'weekdays' ? ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'][t.getDay()] : key === 'hours' ? t.getHours() + ':00–' + t.getHours() + ':59' : d.strain];
        for (const label of labels) groups.set(label, (groups.get(label) || 0) + d.g);
      }
      const top = [...groups.entries()].sort((a, b) => b[1] - a[1])[0]; value = top ? top[0] : 'Bez záznamů'; note = top ? fmt(top[1]) + ' g · nejvíce za ' + dr + ' dní' : 'Klepni pro podrobnosti'; break;
    }
  }
  summary.append(el('strong', null, value), el('span', null, note)); summary.setAttribute('aria-label', WIDGET_CATALOGUE[widgetScope(key)][key].title + ': ' + value + '. Otevřít běžnou velikost');
}
function purchasePriceStats(month) {
  const records = S.purchases.filter(p => validDateOnly(p.date) && p.date <= todayK() && validPurchaseItems(p.items));
  const total = lineTotals(records.flatMap(p => p.items)), chosen = records.filter(p => p.date.slice(0, 7) === month), monthly = lineTotals(chosen.flatMap(p => p.items));
  const groups = new Map();
  for (const p of records) for (const i of p.items) {
    const key = i.strainId ? 'id:' + i.strainId : 'name:' + i.strain;
    const old = groups.get(key) || { name: i.strain || 'Bez druhu', grams: 0, cost: 0, latestDate: '', latestPrice: null, min: Infinity, max: 0 };
    const price = i.unitPrice / i.grams; old.grams += i.grams * i.quantity; old.cost += i.unitPrice * i.quantity; old.min = Math.min(old.min, price); old.max = Math.max(old.max, price);
    if (p.date >= old.latestDate) { old.latestDate = p.date; old.latestPrice = price; }
    groups.set(key, old);
  }
  return { total, monthly, count: chosen.length, average: total.grams ? total.cost / total.grams : null, groups: [...groups.values()] };
}
function renderPurchaseAnalytics() {
  const box = $('purchaseAnalytics'); if (!box) return;
  const month = $('purchaseMonth').value || todayK().slice(0, 7), data = purchasePriceStats(month); box.textContent = '';
  const metrics = el('div', 'purchase-summary');
  for (const [label, value] of [['Průměrná cena celkem', data.average == null ? '—' : money(data.average) + '/g'], ['Výdaje za vybraný měsíc', money(data.monthly.cost)], ['Nakoupeno v měsíci', fmt(data.monthly.grams) + ' g'], ['Nákupy v měsíci', String(data.count)]]) { const c = el('div', 'stat'); c.append(el('span', null, label), el('b', null, value)); metrics.appendChild(c); }
  box.append(metrics, el('p', 'widget-note', 'Průměrná cena je celková zaplacená částka dělená nakoupenými gramy, včetně počtu balení. Částky 0 Kč se počítají jako zadaná nulová cena.'));
  if (!data.groups.length) box.appendChild(el('p', 'widget-note', 'Po uložení prvního nákupu tu uvidíš ceny za gram podle druhů.'));
  for (const g of data.groups.sort((a, b) => a.name.localeCompare(b.name, 'cs'))) {
    const row = el('div', 'price-history-row'); row.append(el('strong', null, g.name), el('span', null, 'Průměr ' + money(g.cost / g.grams) + '/g · ' + fmt(g.grams) + ' g celkem'), el('small', null, 'Poslední ' + money(g.latestPrice) + '/g (' + new Date(g.latestDate + 'T12:00').toLocaleDateString('cs-CZ') + ') · rozsah ' + money(g.min) + '–' + money(g.max) + '/g')); box.appendChild(row);
  }
  box.appendChild(el('p', 'widget-note', 'Ceny podle druhů jsou za celou historii nákupů. Nemění ceny u dávek ani údaje o spotřebě.'));
}
const renderBuyBase = renderBuy;
renderBuy = function () { renderBuyBase(); renderPurchaseAnalytics(); };
function initLibrary() {
  $('historySearch').oninput = () => { historyView.query = $('historySearch').value; renderLog(); };
  $('historyStrain').onchange = () => { historyView.strain = $('historyStrain').value; renderLog(); };
  $('historyRange').onchange = () => { historyView.range = $('historyRange').value; historyView.day = ''; historyView.month = todayK().slice(0, 7); renderLog(); };
  $('historyPrevMonth').onclick = () => changeHistoryMonth(-1); $('historyNextMonth').onclick = () => changeHistoryMonth(1);
  $('historyThisMonth').onclick = () => { historyView.month = todayK().slice(0, 7); historyView.day = ''; renderLog(); };
  $('historyClearDay').onclick = () => { historyView.day = ''; renderLog(); };
  $('historyReset').onclick = () => { historyView = { month: todayK().slice(0, 7), day: '', query: '', strain: '', range: 'all' }; $('historySearch').value = ''; renderLog(); };
  $('historyCalendarOn').onchange = () => { S.ui.history.showCalendar = $('historyCalendarOn').checked; save(); renderLog(); };
  $('layoutProfileSave').onclick = () => saveLayoutProfile($('layoutProfileName').value);
  $('layoutProfileUpdate').onclick = () => saveLayoutProfile($('layoutProfileName').value, $('layoutProfileSelect').value);
  $('layoutProfileApply').onclick = () => applyLayoutProfile($('layoutProfileSelect').value);
  $('layoutProfileSelect').onchange = () => { const p = S.ui.layoutProfiles.find(p => p.id === $('layoutProfileSelect').value); $('layoutProfileName').value = p?.name || ''; renderLayoutProfiles(); };
  $('layoutProfileDelete').onclick = () => twice($('layoutProfileDelete'), () => { S.ui.layoutProfiles = S.ui.layoutProfiles.filter(p => p.id !== $('layoutProfileSelect').value); save(); renderLayoutProfiles(); });
  $('purchaseMonth').value = todayK().slice(0, 7); $('purchaseMonth').onchange = renderPurchaseAnalytics;
  renderLayoutProfiles();
}
