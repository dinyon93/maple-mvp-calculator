(function (root) {
  'use strict';
  const WON_UNIT = 100000000;
  function finite(value) { const n = Number(typeof value === 'string' ? value.replace(/,/g, '') : value); return Number.isFinite(n) ? n : NaN; }
  function calculate(input) {
    const target = finite(input.target);
    const gifts = input.gifts || [];
    const cards = input.cards || [];
    if (!(target > 0)) return { error: '목표 캐시를 1 이상 입력해 주세요.' };
    if (gifts.some(g => !Number.isInteger(finite(g.count)) || finite(g.count) < 0 || finite(g.cost) < 0 || !Number.isFinite(finite(g.cost)))) return { error: '상품권 가격과 수량을 확인해 주세요.' };
    if (cards.some(c => !Number.isFinite(finite(c.amount)) || !Number.isFinite(finite(c.benefit)) || finite(c.amount) < 0 || finite(c.benefit) < 0 || finite(c.benefit) > finite(c.amount))) return { error: '카드 혜택은 결제금액 이하로 입력해 주세요.' };
    const charged = gifts.reduce((sum, g) => sum + 50000 * finite(g.count), 0) + cards.reduce((sum, c) => sum + finite(c.amount), 0);
    const spent = gifts.reduce((sum, g) => sum + finite(g.cost) * finite(g.count), 0) + cards.reduce((sum, c) => sum + finite(c.amount) - finite(c.benefit), 0);
    if (!(charged > 0)) return { error: '충전할 상품권 수량이나 카드 결제금액을 입력해 주세요.' };
    if (!(spent > 0)) return { error: '실제 지출액이 0원보다 커야 합니다.' };
    if (!(finite(input.discordRate) > 0)) return { error: '디스코드 1억 메소 시세를 입력해 주세요.' };
    const fee = finite(input.fee);
    if (!(fee >= 0 && fee <= 100)) return { error: '옥션 판매 수수료를 0~100%로 입력해 주세요.' };
    const existingCredits = finite(input.existingCredits || 0);
    if (!Number.isInteger(existingCredits) || existingCredits < 0) return { error: '보유 메이플크레딧을 0 이상의 정수로 입력해 주세요.' };
    const creditItems = input.creditItems || [];
    for (const cube of creditItems) {
      if (!(finite(cube.creditPrice) > 0) || (cube.auctionPrice !== '' && cube.auctionPrice != null && !(finite(cube.auctionPrice) > 0))) return { error: '큐브의 크레딧 가격과 옥션 개당 가격을 확인해 주세요.' };
    }
    const creditOptions = earned => creditItems.map(cube => {
      const creditPrice = finite(cube.creditPrice), price = finite(cube.auctionPrice);
      const count = Math.floor((existingCredits + earned) / creditPrice);
      const baselineCount = Math.floor(existingCredits / creditPrice);
      const mesos = price > 0 ? count * price * (1 - fee / 100) : null;
      const baselineMesos = price > 0 ? baselineCount * price * (1 - fee / 100) : null;
      return { name: cube.name, creditPrice, count, baselineCount, remaining: existingCredits + earned - count * creditPrice, mesos, baselineMesos,
        recovered: mesos === null ? null : mesos / WON_UNIT * finite(input.discordRate),
        incrementalRecovered: mesos === null ? null : (mesos - baselineMesos) / WON_UNIT * finite(input.discordRate) };
    });
    const rows = [];
    function addRoute(base) {
      const options = creditOptions(base.earnedCredits);
      const recovered = base.mesos / WON_UNIT * finite(input.discordRate);
      const plain = { ...base, mainMesos: base.mesos, creditMesos: 0, creditChoice: null,
        recovered, totalRecovered: recovered, loss: spent - recovered,
        lossRate: (spent - recovered) / spent * 100 };
      rows.push(plain);
      for (const cube of options) {
        if (cube.mesos === null || cube.count === 0) continue;
        const totalRecovered = recovered + cube.incrementalRecovered;
        rows.push({ ...base, name: `${base.name} + ${cube.name}`, mainMesos: base.mesos,
          creditMesos: cube.mesos, mesos: base.mesos + cube.mesos, creditChoice: cube,
          recovered, totalRecovered, loss: spent - totalRecovered,
          lossRate: (spent - totalRecovered) / spent * 100 });
      }
    }
    for (const item of input.items || []) {
      if (!String(item.name || '').trim() || !item.cashPrice || !item.auctionPrice) continue;
      const cashPrice = finite(item.cashPrice), auctionPrice = finite(item.auctionPrice);
      const units = finite(item.units || 1);
      if (!(cashPrice > 0 && auctionPrice > 0 && Number.isInteger(units) && units > 0)) return { error: '아이템 가격과 한 번 구매 시 받는 개수를 확인해 주세요.' };
      const count = Math.floor(charged / cashPrice);
      if (count < 1) continue;
      const leftover = charged - count * cashPrice;
      const mesos = count * units * auctionPrice * (1 - fee / 100);
      const earnedCredits = count * Math.floor(cashPrice * 0.05);
      addRoute({ type: 'item', name: String(item.name).trim(), count: count * units,
        purchases: count, units, leftover, mesos, earnedCredits });
    }
    const marketRate = finite(input.marketRate);
    const event = input.event || {};
    const hasEvent = (event.points !== '' && event.points != null) || (event.cost !== '' && event.cost != null);
    let eventCount = 0, bonusPoints = 0;
    if (hasEvent) {
      const points = finite(event.points), cost = finite(event.cost);
      eventCount = finite(event.count);
      if (!(Number.isInteger(points) && points > 0 && Number.isInteger(cost) && cost > 0 && Number.isInteger(eventCount) && eventCount >= 0)) return { error: '이벤트 지급 포인트·구매가·횟수를 확인해 주세요.' };
      if (eventCount * cost > charged) return { error: '이벤트 구매 총액이 충전 캐시를 초과합니다.' };
      bonusPoints = eventCount * (points - cost);
    }
    if (marketRate > 0) {
      const totalPoints = charged + bonusPoints;
      if (!(totalPoints > 0)) return { error: '메소마켓에 사용할 포인트가 없습니다.' };
      const mesos = totalPoints / marketRate * WON_UNIT;
      const eventCash = hasEvent ? eventCount * finite(event.cost) : 0;
      // Both the ordinary point package and an optional event package are
      // assumed to be eligible Nexon Cash purchases. Round per purchase.
      const earnedCredits = Math.floor((charged - eventCash) * 0.05) +
        (hasEvent ? eventCount * Math.floor(finite(event.cost) * 0.05) : 0);
      addRoute({ type: 'market', name: '메소마켓', count: null, leftover: 0,
        mesos, earnedCredits, points: totalPoints, bonusPoints, eventCount });
    }
    rows.sort((a, b) => a.loss - b.loss || a.name.localeCompare(b.name, 'ko'));
    return { target, charged, spent, existingCredits, baseCreditOptions: creditOptions(0), targetDelta: charged - target, rows };
  }
  root.MvpCalc = { calculate };
})(typeof window !== 'undefined' ? window : globalThis);
