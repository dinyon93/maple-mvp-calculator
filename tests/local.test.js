'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os'), fs = require('node:fs'), path = require('node:path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-calc-'));
process.env.MVP_DATA_PATH = path.join(temp, 'trends.json');
const { createServer, readLocalLogin, localDate } = require('../server');
const { buildSnapshot } = require('../publish');
const { parseMeso, pricesFromText, loginForm, validateConfiguredSelectors, chooseCharacter, clickCharacterCard } = require('../auction');
require('../calc');
const BASE = 'http://127.0.0.1:8765';
function post(route, body, origin = BASE) { return fetch(BASE + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }); }
test('옥션 묶음의 개당 가격을 메소 정수로 해석한다', () => {
  assert.equal(parseMeso('9988만 8889'), 99888889);
  assert.equal(parseMeso('44억 9500만'), 4495000000);
  const rows = '메이플 로얄 스타일\n45개 · 개당 9988만 8889메소\n44억 9500만 메소\n메이플 로얄 스타일\n45개 · 개당 9999만 9956메소';
  assert.equal(pricesFromText(rows, '메이플 로얄 스타일'), 99888889);
});
test('화면 이동 중 입력칸 조회가 실패해도 CSS 오류로 잘못 표시하지 않는다', async () => {
  const changing = { locator: () => ({ count: async () => { throw Error('Execution context was destroyed'); } }) };
  const stable = { locator: selector => ({
    count: async () => selector === 'input[type="password"]' || selector === 'input[type="text"]' ? 1 : 0,
    first: () => ({ isVisible: async () => true })
  }) };
  const page = { isClosed: () => false, frames: () => [changing, stable] };
  const form = await loginForm({ pages: () => [page] });
  assert.equal(form.frame, stable);
});
test('잘못된 선택자는 사이트를 열기 전에 설정 이름과 함께 알려준다', async () => {
  const page = { locator: selector => ({ count: async () => {
    if (selector === '<input>') throw Error('Unexpected token');
    return 0;
  } }) };
  await assert.rejects(validateConfiguredSelectors(page, { loginIdSelector: '<input>' }), /loginIdSelector/);
  await validateConfiguredSelectors(page, { loginIdSelector: "input[placeholder='넥슨ID (아이디 또는 이메일)']" });
});
test('옥션 계정 목록을 연 뒤 계정 항목과 캐릭터 카드를 순서대로 선택한다', async () => {
  const events = [];
  const locator = (visible, click) => ({
    count: async () => Number(visible()),
    first() { return this; }, last() { return this; },
    isVisible: async () => visible(),
    waitFor: async () => { assert.ok(visible()); },
    click: async () => click(),
    locator: () => locator(visible, click)
  });
  const page = {
    locator: () => locator(() => events.includes('캐릭터 선택'), () => {}),
    getByRole: () => locator(() => false, () => {}),
    waitForTimeout: async () => {},
    getByText: value => {
      if (value === '테스트캐릭터') return locator(() => events.includes('계정 선택'), () => events.push('캐릭터 선택'));
      if (value === '선택할계정') return locator(() => events.includes('목록 열기'), () => events.push('계정 선택'));
      if (value instanceof RegExp && value.test('초기계정@example.com')) return locator(() => true, () => events.push('목록 열기'));
      return locator(() => true, () => {});
    }
  };
  await chooseCharacter(page, '테스트캐릭터', { auctionAccount: '선택할계정' });
  assert.deepEqual(events, ['목록 열기', '계정 선택', '캐릭터 선택']);
});
test('캐릭터 이름보다 클릭 가능한 부모 카드를 먼저 누른다', async () => {
  const clicks = [];
  const card = { count: async () => 1, first() { return this; }, isVisible: async () => true, click: async () => { clicks.push('카드'); } };
  const label = { locator: () => card, click: async () => { clicks.push('이름'); } };
  const page = {
    locator: () => ({ count: async () => Number(clicks.includes('카드')), first() { return this; }, isVisible: async () => true }),
    getByText: () => ({ first: () => ({ isVisible: async () => !clicks.includes('카드') }) }),
    waitForTimeout: async () => {}
  };
  await clickCharacterCard(page, label);
  assert.deepEqual(clicks, ['카드']);
});
test('옥션이 바로 열리면 계정·캐릭터 선택을 건너뛴다', async () => {
  let reads = 0;
  const page = {
    locator: () => ({ count: async () => ++reads > 2 ? 1 : 0, first: () => ({ isVisible: async () => true }) }),
    getByText: () => ({ first: () => ({ count: async () => 0 }) }),
    getByRole: () => { throw Error('계정 목록을 열어서는 안 됩니다.'); },
    waitForTimeout: async () => {}
  };
  await chooseCharacter(page, '테스트캐릭터', { auctionAccount: '선택할계정' });
  assert.equal(reads, 3);
});
test('메소마켓에 적립된 크레딧과 두 큐브 판매액을 각각 비교하고 기존 크레딧 가치는 손익에서 뺀다', () => {
  const result = globalThis.MvpCalc.calculate({
    target: 500000, gifts: [], cards: [{ amount: 500000, benefit: 0 }],
    discordRate: 2000, marketRate: 5000, fee: 3, existingCredits: 30000,
    event: { points: 10000, cost: 9000, count: 1 }, items: [],
    creditItems: [
      { name: '프라임 큐브', creditPrice: 10000, auctionPrice: 100000000 },
      { name: '프라임 에디셔널 큐브', creditPrice: 20000, auctionPrice: 250000000 }
    ]
  });
  assert.equal(result.error, undefined);
  const market = result.rows.find(row => row.name === '메소마켓');
  const prime = result.rows.find(row => row.name === '메소마켓 + 프라임 큐브');
  const additional = result.rows.find(row => row.name === '메소마켓 + 프라임 에디셔널 큐브');
  assert.equal(market.points, 501000);
  assert.equal(market.earnedCredits, 25000);
  assert.equal(prime.creditChoice.count, 5);
  assert.equal(prime.creditChoice.baselineCount, 3);
  assert.equal(prime.mesos, market.mesos + 5 * 100000000 * 0.97);
  assert.equal(prime.totalRecovered - market.totalRecovered, 2 * 0.97 * 2000);
  assert.equal(additional.creditChoice.count, 2);
  assert.equal(additional.creditChoice.baselineCount, 1);
  assert.equal(additional.totalRecovered - market.totalRecovered, 2.5 * 0.97 * 2000);
  assert.equal(result.rows[0].name, '메소마켓 + 프라임 에디셔널 큐브');
});
test('로컬 기록은 같은 날짜에 덮어쓰고 다른 시세는 유지한다', async t => {
  const configPath = path.join(temp, 'config.local.json');
  let received;
  const published = [];
  const server = createServer(async input => {
    received = input;
    return { items: [{ id: 'royalstyle', auctionPrice: 99888889 }], updatedAt: 'test', errors: [] };
  }, () => readLocalLogin(configPath), rows => { published.push(buildSnapshot(rows)); return { published: true }; });
  await new Promise(resolve => server.listen(8765, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(temp, { recursive: true, force: true }); });
  let response = await post('/api/trends', { values: { discordRate: 2200, marketRate: 5000 } });
  assert.equal(response.status, 200);
  response = await post('/api/trends', { values: { discordRate: 2300 } });
  assert.equal(response.status, 200);
  const rows = await response.json();
  assert.equal(rows.length, 1); assert.equal(rows[0].date, localDate());
  assert.deepEqual(rows[0].values, { discordRate: 2300, marketRate: 5000 });
  response = await post('/api/trends', { values: { discordRate: 999 } }, 'https://attacker.example');
  assert.equal(response.status, 403);
  response = await post('/api/refresh', {});
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /config\.local\.json/);
  fs.writeFileSync(configPath, JSON.stringify({ id: 'local-id', password: 'local-secret', character: 'my-character', auctionAccount: 'local-account', loginEntrySelector: '#local-login', accountDropdownSelector: '#account-dropdown', accountSelector: '#account-choice', characterSelector: '#character-choice', characterSelectionStage: 'afterHome', auctionSearchSelector: '#search-item' }));
  response = await post('/api/refresh', { id: 'web-id', password: 'web-secret', character: 'web-character', loginEntrySelector: '#web-login' });
  assert.equal(response.status, 200); const refreshed = await response.json();
  assert.equal(refreshed.items[0].auctionPrice, 99888889);
  assert.equal(refreshed.publication.published, true);
  assert.deepEqual(published[0].history[0].values, { discordRate: 2300, marketRate: 5000, royalstyle: 99888889 });
  assert.equal(JSON.stringify(published).includes('local-secret'), false);
  response = await post('/api/publish', { values: { discordRate: 2450 } });
  assert.equal(response.status, 200);
  assert.equal(published[1].history[0].values.discordRate, 2450);
  response = await post('/api/publish', { values: { password: 'web-secret' } });
  assert.equal(response.status, 400);
  assert.equal(received.id, 'local-id');
  assert.equal(received.password, 'local-secret');
  assert.equal(received.character, 'my-character');
  assert.equal(received.loginEntrySelector, '#local-login');
  assert.equal(received.accountSelector, '#account-choice');
  assert.equal(received.accountDropdownSelector, '#account-dropdown');
  assert.equal(received.auctionAccount, 'local-account');
  assert.equal(received.characterSelector, '#character-choice');
  assert.equal(received.auctionSearchSelector, '#search-item');
  assert.equal(received.characterSelectionStage, 'afterHome');
  assert.equal(received.homeSelector, '');
  fs.writeFileSync(configPath, JSON.stringify({ id: 'local-id', password: 'local-secret', character: 'my-character', loginEntrySelector: '<div class="gnbLogin">...</div>' }));
  assert.throws(() => readLocalLogin(configPath), /HTML 전체를 넣지 마세요/);
  assert.equal(JSON.stringify(refreshed).includes('local-secret'), false);
  assert.equal(fs.readFileSync(process.env.MVP_DATA_PATH, 'utf8').includes('local-secret'), false);
  response = await fetch(BASE + '/config.local.json'); assert.equal(response.status, 404);
  response = await fetch(BASE + '/trend.js'); assert.equal(response.status, 200);
});
test('게시 파일에는 여덟 개 시세와 날짜만 들어간다', () => {
  const content = buildSnapshot([{ date: '2026-09-24', password: 'do-not-publish', values: {
    royalstyle: 99888889, discordRate: 2450, privateCharacter: 'character', primecube: -10, loginId: 30
  } }, { date: '../config.local.json', values: { marketRate: 10000 } }]);
  assert.deepEqual(content, { updatedAt: '2026-09-24', history: [{ date: '2026-09-24', values: { royalstyle: 99888889, discordRate: 2450 } }] });
  assert.equal(JSON.stringify(content).includes('do-not-publish'), false);
});
