(function (root) {
  'use strict';
  const IDS = ['wonderberry', 'royalstyle', 'platinumscissors', 'abysscirculator',
    'primecube', 'primeadditionalcube', 'marketRate', 'discordRate'];
  function iso(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return '';
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : '';
  }
  function latest(history) {
    const result = {};
    for (const row of history || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row?.date || '')) continue;
      for (const id of IDS) {
        const value = row.values?.[id];
        if (!Number.isSafeInteger(value) || value <= 0) continue;
        const observedAt = iso(row.observedAt?.[id]);
        const next = { value, date: row.date, observedAt };
        const previous = result[id];
        if (!previous || (observedAt || row.date) >= (previous.observedAt || previous.date)) result[id] = next;
      }
    }
    return result;
  }
  function displayTime(value) {
    const timestamp = iso(value);
    return timestamp ? new Date(timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
      : value ? `${String(value).slice(0, 10)} (시각 기록 없음)` : '시각 기록 없음';
  }
  // Old local inputs may be unpublished. A date alone cannot decide which is newer.
  function shouldApply(current, incoming, { local = false, force = false, dirty = false } = {}) {
    if (dirty && !force) return false;
    if (force) return true;
    const previousTime = iso(current?.observedAt);
    if (previousTime && (!incoming.observedAt || previousTime > incoming.observedAt)) return false;
    if (local && !incoming.observedAt && Number(current?.value) > 0 && Number(current.value) !== incoming.value) return false;
    return true;
  }
  const api = { IDS, iso, latest, displayTime, shouldApply };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MvpPriceSync = api;
})(globalThis);
