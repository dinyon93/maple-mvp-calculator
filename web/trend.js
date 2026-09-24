(function () {
  'use strict';
  const KEY = 'maple-mvp-daily-trends-v1';
  const series = [
    ['wonderberry', '위습의 원더베리', '메소'],
    ['royalstyle', '메이플 로얄 스타일', '메소'],
    ['platinumscissors', '플래티넘 카르마의 가위', '메소'],
    ['abysscirculator', '심연의 서큘레이터', '메소'],
    ['primecube', '프라임 큐브', '메소'],
    ['primeadditionalcube', '프라임 에디셔널 큐브', '메소'],
    ['marketRate', '메소마켓 (1억 메소당)', '메이플포인트'],
    ['discordRate', '디스코드 (1억 메소당)', '원']
  ];
  const $ = id => document.getElementById(id);
  const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const num = n => Number(n).toLocaleString('ko-KR');
  let history = [];
  function localRead() { try { const value = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
  async function load() {
    history = localRead();
    $('trendStorageNote').textContent = '이 브라우저에 날짜별로 저장됩니다. 다른 기기와 자동으로 공유되지 않습니다.';
    render();
  }
  async function record(values) {
    const clean = {};
    for (const [id] of series) {
      const n = Number(String(values[id] ?? '').replace(/,/g, ''));
      if (values[id] !== '' && values[id] != null && Number.isSafeInteger(n) && n > 0) clean[id] = n;
    }
    if (!Object.keys(clean).length) return;
    const today = localDate(); const row = history.find(x => x.date === today);
    if (row) Object.assign(row.values, clean); else history.push({ date: today, values: clean });
    history.sort((a, b) => a.date.localeCompare(b.date));
    try { localStorage.setItem(KEY, JSON.stringify(history)); }
    catch (_) { $('trendStorageNote').textContent = '브라우저 저장 공간이 부족합니다.'; }
    if (!$('trendPage').hidden) render();
  }
  function svgEl(name, attrs = {}, label) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (label != null) e.textContent = label;
    return e;
  }
  function render() {
    const [id, title, unit] = series.find(x => x[0] === $('trendSeries').value) || series[0];
    const points = history.filter(x => Number(x.values?.[id]) > 0).sort((a, b) => a.date.localeCompare(b.date));
    const chart = $('trendChart'); chart.replaceChildren(); chart.setAttribute('aria-label', `${title} 날짜별 시세 그래프`);
    if (!points.length) { chart.textContent = '아직 저장된 시세가 없습니다. 계산기에서 시세를 갱신하거나 입력해 주세요.'; }
    else {
      const svg = svgEl('svg', { viewBox: '0 0 880 340', role: 'img', 'aria-label': `${title} 시세 추이` });
      const left = 86, right = 850, top = 24, bottom = 276;
      const values = points.map(p => Number(p.values[id]));
      let min = Math.min(...values), max = Math.max(...values);
      if (min === max) { const pad = Math.max(1, Math.round(min * 0.08)); min = Math.max(0, min - pad); max += pad; }
      const x = i => left + (points.length === 1 ? (right - left) / 2 : i * (right - left) / (points.length - 1));
      const y = v => bottom - (v - min) / (max - min) * (bottom - top);
      for (let i = 0; i <= 4; i++) {
        const level = min + (max - min) * (4 - i) / 4, yy = top + (bottom - top) * i;
        svg.append(svgEl('line', { x1: left, x2: right, y1: yy, y2: yy, stroke: '#3d4c67' }));
        svg.append(svgEl('text', { x: left - 10, y: yy + 5, 'text-anchor': 'end', fill: '#a9b7d0', 'font-size': 12 }, num(Math.round(level))));
      }
      const path = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
      svg.append(svgEl('path', { d: path, fill: 'none', stroke: '#9cf4ca', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      points.forEach((p, i) => {
        const dot = svgEl('circle', { cx: x(i), cy: y(values[i]), r: 5, fill: '#9cf4ca' });
        dot.append(svgEl('title', {}, `${p.date}: ${num(values[i])} ${unit}`)); svg.append(dot);
        if (i === 0 || i === points.length - 1 || (points.length <= 7 || i % Math.ceil(points.length / 6) === 0)) svg.append(svgEl('text', { x: x(i), y: bottom + 29, 'text-anchor': 'middle', fill: '#a9b7d0', 'font-size': 12 }, p.date.slice(5)));
      });
      chart.append(svg);
    }
    const body = $('trendTable'); body.replaceChildren();
    for (const row of [...history].sort((a, b) => b.date.localeCompare(a.date))) {
      for (const [key, name, unitName] of series) {
        const value = row.values?.[key]; if (!(Number(value) > 0)) continue;
        const tr = document.createElement('tr');
        for (const str of [row.date, name, `${num(value)} ${unitName}`]) { const td = document.createElement('td'); td.textContent = str; tr.append(td); }
        body.append(tr);
      }
    }
    if (!body.childElementCount) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 3; td.textContent = '기록이 없습니다.'; tr.append(td); body.append(tr); }
  }
  function showTrend(on) {
    $('calculatorPage').hidden = on; $('trendPage').hidden = !on;
    $('calcTab').classList.toggle('active', !on); $('trendTab').classList.toggle('active', on);
    $('calcTab').setAttribute('aria-selected', String(!on)); $('trendTab').setAttribute('aria-selected', String(on));
    if (on) load();
  }
  $('trendSeries').innerHTML = series.map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
  $('trendSeries').addEventListener('change', render);
  $('calcTab').addEventListener('click', () => showTrend(false));
  $('trendTab').addEventListener('click', () => showTrend(true));
  window.MvpTrend = { record, load };
  load();
})();
