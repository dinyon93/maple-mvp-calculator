(function () {
  'use strict';
  const KEY = 'maple-mvp-settings-v1';
  const giftTypes = [
    { name: '도서문화상품권', cost: 47000, count: 12 },
    { name: '넥슨카드', cost: 47500, count: 0 },
    { name: '컬쳐랜드', cost: 47500, count: 0 }
  ];
  const itemDefaults = [
    { id: 'wonderberry', name: '위습의 원더베리' },
    { id: 'royalstyle', name: '메이플 로얄 스타일' },
    { id: 'platinumscissors', name: '플래티넘 카르마의 가위' },
    { id: 'abysscirculator', name: '심연의 서큘레이터' }
  ];
  const cubeDefaults = [
    { id: 'primecube', name: '프라임 큐브', creditPrice: 10000, auctionPrice: '', updatedAt: '' },
    { id: 'primeadditionalcube', name: '프라임 에디셔널 큐브', creditPrice: 20000, auctionPrice: '', updatedAt: '' }
  ];
  const defaults = {
    target: 1500000, gifts: giftTypes, cards: [{ amount: 300000, benefit: 0 }, { amount: 300000, benefit: 0 }, { amount: 300000, benefit: 0 }],
    discordRate: '', marketRate: '', event: { points: '', cost: '', count: 1 }, fee: 3,
    existingCredits: 0, creditItems: cubeDefaults, itemDefaultsReady: true, items: itemDefaults.map(x => ({ ...x, cashPrice: '', auctionPrice: '', units: 1, updatedAt: '' }))
  };
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const won = value => `${Math.round(value).toLocaleString('ko-KR')}원`;
  const cash = value => `${Math.round(value).toLocaleString('ko-KR')} 캐시`;
  const mesos = value => `${Math.round(value).toLocaleString('ko-KR')} 메소`;
  const formatDigits = value => String(value || '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const numberField = (label, value, extra = '') => `<input aria-label="${escapeHtml(label)}" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml(value)}" ${extra}>`;
  const amountField = (label, value, extra = '', placeholder = '') => `<input aria-label="${escapeHtml(label)}" type="text" inputmode="numeric" autocomplete="off" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(formatDigits(value))}" data-format="amount" ${extra}>`;
  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved || typeof saved !== 'object') return structuredClone(defaults);
      const { loginEntrySelector: _oldSelector, ...settings } = saved;
      return { ...structuredClone(defaults), ...settings,
        gifts: giftTypes.map((g, i) => ({ ...g, ...(saved.gifts?.[i] || {}), name: g.name })),
        cards: Array.from({ length: 3 }, (_, i) => ({ amount: 0, benefit: 0, ...(saved.cards?.[i] || {}) })),
        event: { ...defaults.event, ...(saved.event || {}) },
        itemDefaultsReady: true,
        items: [...(saved.itemDefaultsReady ? [] : itemDefaults.filter(d => !(Array.isArray(saved.items) && saved.items.some(x => x.id === d.id || x.name === d.name))).map(d => ({ ...d, cashPrice: '', auctionPrice: '', units: 1, updatedAt: '' }))), ...(Array.isArray(saved.items) ? saved.items : [])].slice(0, 30),
        creditItems: cubeDefaults.map((cube, i) => ({ ...cube, ...(saved.creditItems?.find(x => x.id === cube.id) || saved.creditItems?.[i] || {}) })) };
    } catch (_) { return structuredClone(defaults); }
  }
  let model = readSaved();
  function renderLists() {
    $('gifts').innerHTML = model.gifts.map((g, i) => `<div class="gift-row"><strong>${escapeHtml(g.name)}</strong><div class="unit-input">${amountField(`${g.name} 1장 구매가`, g.cost, `data-gift="${i}" data-key="cost"`)}<span>원</span></div><div class="unit-input">${numberField(`${g.name} 수량`, g.count, `data-gift="${i}" data-key="count"`)}<span>장</span></div></div>`).join('');
    $('cards').innerHTML = model.cards.map((c, i) => `<div class="card-row"><span class="row-index">${String(i + 1).padStart(2, '0')}</span><div class="unit-input">${amountField(`${i + 1}번 카드 결제금액`, c.amount, `data-card="${i}" data-key="amount"`)}<span>원</span></div><div class="unit-input">${amountField(`${i + 1}번 카드 혜택`, c.benefit, `data-card="${i}" data-key="benefit"`)}<span>원</span></div></div>`).join('');
    renderItems();
  }
  function renderItems() {
    $('items').innerHTML = model.items.map((item, i) => `<div class="item-row" data-item-row="${i}"><div class="item-top"><span>ITEM ${String(i + 1).padStart(2, '0')}</span><button class="remove" type="button" data-remove="${i}" aria-label="${escapeHtml(item.name || `아이템 ${i + 1}`)} 삭제">삭제 ×</button></div><label>아이템 이름<input type="text" maxlength="60" placeholder="아이템 이름" value="${escapeHtml(item.name || '')}" data-item="${i}" data-key="name"></label><div class="item-prices"><label>캐시 가격<div class="unit-input">${amountField(`아이템 ${i + 1} 캐시 가격`, item.cashPrice || '', `data-item="${i}" data-key="cashPrice"`)}<span>캐시</span></div></label><label>옥션 개당 최저가<div class="unit-input">${amountField(`아이템 ${i + 1} 옥션 개당 최저가`, item.auctionPrice || '', `data-item="${i}" data-key="auctionPrice"`, '예: 100,000,000')}<span>메소</span></div></label></div><label class="units-field">캐시샵 한 번 구매 시 받는 개수 ${numberField(`${item.name || '아이템'} 한 번 구매 시 개수`, item.units || 1, `data-item="${i}" data-key="units"`)}</label><span class="item-updated">${item.updatedAt ? `${escapeHtml(item.priceSource || '직접 입력')} · ${escapeHtml(item.updatedAt)}` : '옥션가 미입력'}</span></div>`).join('');
    $('creditItems').innerHTML = model.creditItems.map((cube, i) => `<div class="item-row"><div class="item-top"><strong>${escapeHtml(cube.name)}</strong><span>${Number(cube.creditPrice).toLocaleString('ko-KR')} 크레딧/개</span></div><label>옥션 개당 최저가<div class="unit-input">${amountField(`${cube.name} 옥션 개당 최저가`, cube.auctionPrice || '', `data-credit="${i}" data-key="auctionPrice"`, '예: 100,000,000')}<span>메소</span></div></label><span class="item-updated">${cube.updatedAt ? `${escapeHtml(cube.priceSource || '직접 입력')} · ${escapeHtml(cube.updatedAt)}` : '옥션가 미입력'}</span></div>`).join('');
  }
  function currentInput() {
    return { ...model, target: $('targetCash').value, discordRate: $('discordRate').value,
      marketRate: $('marketRate').value, event: { ...model.event }, fee: $('auctionFee').value, existingCredits: $('existingCredits').value };
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(model)); } catch (_) {} }
  function trendPrices() {
    const values = { discordRate: model.discordRate, marketRate: model.marketRate };
    for (const item of [...model.items, ...model.creditItems]) if (item.id && item.auctionPrice) values[item.id] = item.auctionPrice;
    return values;
  }
  function applyPrices(data, source) {
    if (!Array.isArray(data.items) || data.items.length > 30) throw new Error('items 배열에 최대 30개 가격을 입력해 주세요.');
    const changes = [];
    for (const entry of data.items) {
      const row = [...model.items, ...model.creditItems].find(x => x.id === entry.id);
      const price = Number(entry.auctionPrice);
      if (!row || !Number.isSafeInteger(price) || price <= 0) throw new Error('시세의 아이템 ID 또는 개당 가격이 올바르지 않습니다.');
      changes.push({ row, price });
    }
    for (const { row, price } of changes) {
      row.auctionPrice = price; row.updatedAt = String(data.updatedAt || new Date().toLocaleString('ko-KR')).slice(0, 40); row.priceSource = source;
    }
    persist(); renderItems();
    if (changes.length) window.MvpTrend?.record(Object.fromEntries(changes.map(({ row, price }) => [row.id, price])));
    return changes.length;
  }
  window.MvpApp = { trendPrices, applyPrices };
  function updateTotals() {
    const giftTotal = model.gifts.reduce((a, g) => a + 50000 * (Number(g.count) || 0), 0);
    const cardTotal = model.cards.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const spent = model.gifts.reduce((a, g) => a + (Number(g.cost) || 0) * (Number(g.count) || 0), 0) + model.cards.reduce((a, c) => a + (Number(c.amount) || 0) - (Number(c.benefit) || 0), 0);
    const total = giftTotal + cardTotal;
    $('chargeTotal').textContent = cash(total);
    $('actualSpend').textContent = won(spent);
    const difference = total - Number($('targetCash').value.replace(/,/g, ''));
    $('targetStatus').textContent = difference === 0 ? '목표 충전액과 일치합니다.' : `목표보다 ${cash(Math.abs(difference))} ${difference < 0 ? '부족합니다.' : '많습니다.'} 계산은 현재 충전 합계 기준입니다.`;
    $('targetStatus').classList.toggle('warning', difference !== 0);
  }
  function compute() {
    const output = window.MvpCalc.calculate(currentInput());
    if (output.error) { $('feedback').textContent = output.error; $('rankings').innerHTML = ''; $('creditSummary').innerHTML = ''; $('bestName').textContent = '입력값을 확인해 주세요'; $('bestLoss').textContent = '—'; $('bestSub').textContent = '계산 조건을 다시 확인해 주세요.'; return; }
    $('creditSummary').innerHTML = `<h3>기존 보유 크레딧 ${Number(output.existingCredits).toLocaleString('ko-KR')} · 구매 가능 수량</h3>${output.baseCreditOptions.map(cube => `<p>${escapeHtml(cube.name)} <strong>${cube.count.toLocaleString('ko-KR')}개</strong> · 판매 후 <strong>${cube.mesos === null ? '옥션가 입력 대기' : mesos(cube.mesos)}</strong> · 잔여 ${cube.remaining.toLocaleString('ko-KR')} 크레딧</p>`).join('')}`;
    if (!output.rows.length) { $('feedback').textContent = '판매 아이템의 캐시가·옥션가 또는 메소마켓 시세를 입력해 주세요.'; $('rankings').innerHTML = ''; $('bestName').textContent = '비교할 방법이 없습니다'; $('bestLoss').textContent = '—'; $('bestSub').textContent = '시세 입력부터 시작해 주세요.'; return; }
    $('feedback').textContent = output.targetDelta ? `목표와 충전 합계가 ${cash(Math.abs(output.targetDelta))} 차이 납니다. 충전 합계 ${cash(output.charged)} 기준으로 계산했습니다.` : `${output.rows.length}개 방법을 비교했습니다.`;
    const best = output.rows[0];
    $('bestName').textContent = best.name;
    $('bestLoss').textContent = `${best.loss >= 0 ? '예상 손실' : '예상 이익'} ${won(Math.abs(best.loss))}`;
    $('bestSub').textContent = `실제 지출 ${won(output.spent)} · 이번 충전 회수 ${won(best.totalRecovered)}`;
    $('rankings').innerHTML = output.rows.map((row, i) => {
      const description = row.type === 'item'
        ? `캐시 구매 ${row.purchases.toLocaleString('ko-KR')}회 · ${row.count.toLocaleString('ko-KR')}개 · 잔여 ${cash(row.leftover)}`
        : `${Math.round(row.points).toLocaleString('ko-KR')} 포인트${row.bonusPoints ? ` · 이벤트 추가 ${Math.round(row.bonusPoints).toLocaleString('ko-KR')}P` : ''}`;
      const cube = row.creditChoice;
      return `<article class="rank-card"><div class="rank-heading"><span class="rank-number">${String(i + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(row.name)}</strong><small>${description} · 이번 구매 적립 ${row.earnedCredits.toLocaleString('ko-KR')} 크레딧</small></div><b class="${row.loss < 0 ? 'positive' : ''}">${row.loss < 0 ? '+' : '−'}${won(Math.abs(row.loss))}</b></div>
        <div class="rank-data"><div><span>실제 지출</span><strong>${won(output.spent)}</strong></div><div><span>${row.type === 'item' ? '아이템 판매 메소' : '메소마켓 확보 메소'}</span><strong>${mesos(row.mainMesos)}</strong></div>${cube ? `<div><span>크레딧 큐브 판매 메소</span><strong>${mesos(row.creditMesos)}</strong></div>` : ''}<div><span>디스코드 판매 메소 합계</span><strong>${mesos(row.mesos)}</strong></div><div><span>이번 충전 회수 합계</span><strong>${won(row.totalRecovered)}</strong></div><div><span>${row.loss < 0 ? '이익률' : '손실률'}</span><strong>${Math.abs(row.lossRate).toFixed(2)}%</strong></div></div>
        ${cube ? `<div class="credit-detail"><strong>${escapeHtml(cube.name)} ${cube.count.toLocaleString('ko-KR')}개 판매</strong><p>기존 크레딧만 사용 시 ${cube.baselineCount.toLocaleString('ko-KR')}개 · 잔여 ${cube.remaining.toLocaleString('ko-KR')} 크레딧 · 이번 충전으로 늘어난 회수액 ${won(cube.incrementalRecovered)}</p></div>` : ''}</article>`;
    }).join('');
  }
  function init() {
    $('targetCash').value = formatDigits(model.target); $('discordRate').value = formatDigits(model.discordRate);
    $('marketRate').value = formatDigits(model.marketRate); $('eventPoints').value = formatDigits(model.event.points); $('eventCost').value = formatDigits(model.event.cost); $('eventCount').value = model.event.count; $('auctionFee').value = model.fee; $('existingCredits').value = formatDigits(model.existingCredits);
    renderLists(); updateTotals(); persist();
    document.addEventListener('input', event => {
      const el = event.target;
      if (el.dataset.format === 'amount') {
        const digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
        const raw = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        el.value = formatDigits(raw);
        let caret = 0, seen = 0;
        while (caret < el.value.length && seen < digitsBefore) { if (/\d/.test(el.value[caret])) seen++; caret++; }
        el.setSelectionRange(caret, caret);
      }
      const storedValue = el.dataset.format === 'amount' ? el.value.replace(/,/g, '') : el.value;
      if (el.dataset.gift !== undefined) model.gifts[Number(el.dataset.gift)][el.dataset.key] = storedValue;
      else if (el.dataset.card !== undefined) model.cards[Number(el.dataset.card)][el.dataset.key] = storedValue;
      else if (el.dataset.item !== undefined) {
        const row = model.items[Number(el.dataset.item)]; row[el.dataset.key] = storedValue;
        if (el.dataset.key === 'auctionPrice') { row.updatedAt = new Date().toLocaleString('ko-KR'); row.priceSource = '직접 입력'; el.closest('.item-row').querySelector('.item-updated').textContent = `직접 입력 · ${row.updatedAt}`; }
      } else if (el.dataset.credit !== undefined) {
        const row = model.creditItems[Number(el.dataset.credit)]; row[el.dataset.key] = storedValue; row.updatedAt = new Date().toLocaleString('ko-KR'); row.priceSource = '직접 입력'; el.closest('.item-row').querySelector('.item-updated').textContent = `직접 입력 · ${row.updatedAt}`;
      } else if (el.id === 'targetCash') model.target = storedValue;
      else if (el.id === 'discordRate') model.discordRate = storedValue;
      else if (el.id === 'marketRate') model.marketRate = storedValue;
      else if (el.id === 'eventPoints') model.event.points = storedValue;
      else if (el.id === 'eventCost') model.event.cost = storedValue;
      else if (el.id === 'eventCount') model.event.count = el.value;
      else if (el.id === 'auctionFee') model.fee = el.value;
      else if (el.id === 'existingCredits') model.existingCredits = storedValue;
      else return;
      persist(); updateTotals();
    });
    $('addItem').addEventListener('click', () => { if (model.items.length >= 30) { $('feedback').textContent = '아이템은 최대 30개까지 추가할 수 있습니다.'; return; } model.items.push({ id: `custom-${Date.now()}`, name: '', cashPrice: '', auctionPrice: '', units: 1, updatedAt: '' }); persist(); renderItems(); $('items').lastElementChild.querySelector('input').focus(); });
    $('items').addEventListener('click', event => { const button = event.target.closest('[data-remove]'); if (!button) return; model.items.splice(Number(button.dataset.remove), 1); persist(); renderItems(); });
    document.addEventListener('change', event => {
      const el = event.target;
      if (el.id === 'discordRate' || el.id === 'marketRate') window.MvpTrend?.record({ [el.id]: el.value });
      else if (el.dataset.item !== undefined && el.dataset.key === 'auctionPrice') window.MvpTrend?.record({ [model.items[Number(el.dataset.item)].id]: el.value });
      else if (el.dataset.credit !== undefined) window.MvpTrend?.record({ [model.creditItems[Number(el.dataset.credit)].id]: el.value });
    });
    $('priceFile').addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 100000) throw new Error('시세 파일은 100KB 이하로 선택해 주세요.');
        const count = applyPrices(JSON.parse(await file.text()), '파일에서 가져옴');
        $('feedback').textContent = `${count}개 아이템의 옥션 개당 가격을 반영했습니다.`;
      } catch (error) { $('feedback').textContent = `시세 파일을 반영하지 못했습니다: ${error.message}`; }
      event.target.value = '';
    });
    $('refreshPrices').addEventListener('click', async () => {
      $('refreshPrices').disabled = true;
      $('refreshStatus').textContent = '로컬 설정으로 넥슨 로그인과 옥션 조회를 시도하고 있습니다. 추가 인증이 필요하면 열린 브라우저에서 직접 완료하세요.';
      try {
        const response = await fetch('/api/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '옥션 조회에 실패했습니다.');
        const count = applyPrices(result, '옥션 조회');
        $('refreshStatus').textContent = `${count}개 시세를 반영했습니다. ${result.errors?.length ? `조회 실패: ${result.errors.join(' / ')}` : ''}`;
      } catch (error) { $('refreshStatus').textContent = `시세 갱신 실패: ${error.message}`; }
      finally { $('refreshPrices').disabled = false; }
    });
    $('calculate').addEventListener('click', compute);
    if (location.protocol === 'file:') { $('refreshPrices').disabled = true; $('refreshStatus').textContent = '자동조회는 start-windows.bat으로 로컬 프로그램을 실행한 뒤 이용할 수 있습니다.'; }
  }
  init();
})();
