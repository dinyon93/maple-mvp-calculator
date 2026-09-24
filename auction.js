'use strict';
// This module reads the normal web auction UI. It does not call private endpoints,
// skip security checks, save a password, or buy/sell anything.
const ITEMS = [
  { id: 'wonderberry', name: '위습의 원더베리' },
  { id: 'royalstyle', name: '메이플 로얄 스타일' },
  { id: 'platinumscissors', name: '플래티넘 카르마의 가위' },
  { id: 'abysscirculator', name: '심연의 서큘레이터' },
  { id: 'primecube', name: '프라임 큐브' },
  { id: 'primeadditionalcube', name: '프라임 에디셔널 큐브' }
];
function parseMeso(text) {
  const raw = String(text).replace(/,/g, '').replace(/\s+/g, '');
  const eok = /([0-9]+)억/.exec(raw), man = /([0-9]+)만/.exec(raw);
  const rest = raw.replace(/[0-9]+억/, '').replace(/[0-9]+만/, '');
  if (!/^\d*$/.test(rest)) return NaN;
  const n = Number(eok?.[1] || 0) * 100000000 + Number(man?.[1] || 0) * 10000 + Number(rest || 0);
  return Number.isSafeInteger(n) && n > 0 ? n : NaN;
}
function pricesFromText(text, itemName) {
  const escaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`${escaped}[\\s\\S]{0,95}?개당\\s*([0-9,\\s억만]+?)\\s*메소`, 'g');
  const values = [...String(text).matchAll(expression)].map(m => parseMeso(m[1])).filter(Number.isFinite);
  return values.length ? Math.min(...values) : null;
}
async function findVisible(frame, selectors) {
  for (const selector of selectors) {
    const loc = frame.locator(selector);
    if (await loc.count() && await loc.first().isVisible()) return loc.first();
  }
  return null;
}
async function firstVisible(locators) {
  for (const locator of locators) {
    if (await locator.count() && await locator.first().isVisible()) return locator.first();
  }
  return null;
}
// Check selector syntax before opening the site. Navigation can invalidate a
// frame mid-query; that is a temporary page change, not invalid CSS.
async function validateConfiguredSelectors(page, selectors) {
  for (const [key, selector] of Object.entries(selectors)) {
    if (!selector) continue;
    try { await page.locator(selector).count(); }
    catch (_) { throw Error(`${key}에 적은 CSS 선택자의 형식이 올바르지 않습니다. Elements에서 Copy → Copy selector로 다시 복사해 주세요.`); }
  }
}
async function configuredLocator(page, selector, label, timeout = 15000) {
  const until = Date.now() + timeout;
  do {
    for (const frame of page.frames()) {
      let locator;
      try { locator = await firstVisible([frame.locator(selector)]); }
      catch (_) { continue; } // Frame may have navigated during the query.
      if (locator) return { frame, locator };
    }
    await page.waitForTimeout(500);
  } while (Date.now() < until);
  throw Error(`${label} 선택자에 해당하는 화면 요소를 찾지 못했습니다.`);
}
async function loginForm(context, selectors = {}) {
  for (const page of [...context.pages()].reverse()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      let password, id;
      try {
        password = await findVisible(frame, selectors.loginPasswordSelector ? [selectors.loginPasswordSelector] : ['input[type="password"]']);
        id = await findVisible(frame, selectors.loginIdSelector ? [selectors.loginIdSelector] : [
          'input[autocomplete="username"]', 'input[name="id"]', 'input[name="userId"]',
          'input[type="email"]', 'input[type="text"]'
        ]);
      } catch (_) { continue; } // A redirect can detach this frame at any time.
      if (password && id) return { page, frame, id, password };
    }
  }
  return null;
}
async function clickLoginEntry(page, context, selector, selectors) {
  // The first MapleStory page is sometimes a promotional page. Its sign-in
  // control says "넥슨 로그인", rather than just "로그인".
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await loginForm(context, selectors)) return;
    for (const frame of page.frames()) {
      let entry;
      try {
        entry = selector
          ? await firstVisible([frame.locator(selector)])
          : await firstVisible([
            frame.getByRole('link', { name: /넥슨\s*(?:ID\s*)?로그인|^로그인$/ }),
            frame.getByRole('button', { name: /넥슨\s*(?:ID\s*)?로그인|^로그인$/ }),
            frame.locator('a:has-text("넥슨 로그인"), button:has-text("넥슨 로그인")')
          ]);
      } catch (_) { continue; }
      if (entry) { await entry.click(); return; }
    }
    await page.waitForTimeout(500);
  }
  if (selector) throw Error('로그인 선택자에 해당하는 버튼을 찾지 못했습니다. 처음 열린 화면에서 선택자를 다시 복사해 주세요.');
}
async function signIn(page, context, id, password, selectors) {
  await clickLoginEntry(page, context, selectors.loginEntrySelector, selectors);
  let form;
  for (let attempt = 0; attempt < 60; attempt++) {
    form = await loginForm(context, selectors);
    if (form) break;
    let methodClicked = false;
    for (const current of [...context.pages()].reverse()) {
      if (current.isClosed()) continue;
      for (const frame of current.frames()) {
        let method;
        try {
          method = selectors.loginMethodSelector
            ? await firstVisible([frame.locator(selectors.loginMethodSelector)])
            : await firstVisible([
              frame.getByRole('tab', { name: /넥슨\s*ID\s*로그인/ }),
              frame.getByRole('link', { name: /넥슨\s*ID\s*로그인/ }),
              frame.getByRole('button', { name: /넥슨\s*ID\s*로그인/ })
            ]);
        } catch (_) { continue; }
        if (method) { await method.click(); methodClicked = true; break; }
      }
      if (methodClicked) break;
    }
    await page.waitForTimeout(500);
  }
  if (!form) throw Error('넥슨 ID·비밀번호 입력칸을 찾지 못했습니다. 로그인 화면 구조를 확인해야 합니다.');
  await form.id.fill(id);
  await form.password.fill(password);
  const submit = selectors.loginSubmitSelector
    ? (await configuredLocator(form.page, selectors.loginSubmitSelector, '로그인 제출')).locator
    : await firstVisible([
      form.frame.getByRole('button', { name: /넥슨\s*ID\s*로그인|로그인|sign in/i }),
      form.frame.locator('button[type="submit"], input[type="submit"]')
    ]);
  if (submit) await submit.click();
  else await form.password.press('Enter');
  // Do not leave the login page while its redirect or additional verification
  // is still running. The user can complete OTP in the opened Chrome window.
  for (let attempt = 0; attempt < 240; attempt++) {
    if (form.page.isClosed()) return page;
    const stillOnLogin = await form.password.isVisible().catch(() => false);
    const currentUrl = form.page.url();
    if (!stillOnLogin && /maplestory\.nexon\.com/i.test(currentUrl)) return form.page;
    await page.waitForTimeout(500);
  }
  throw Error('로그인 완료를 확인하지 못했습니다. 열린 Chrome 창에서 넥슨의 안내와 로그인 상태를 확인해 주세요.');
}
async function openAuction(page, context, selectors, character, characterSelectionStage) {
  // Following login the site returns to its promotional page. Its house icon
  // leads to the main MapleStory site and its "메이플 옥션" menu.
  const home = selectors.homeSelector ? (await configuredLocator(page, selectors.homeSelector, '홈 버튼')).locator : await firstVisible([
    page.locator('a[href*="/home/main" i]'),
    page.getByRole('link', { name: /^(?:홈|홈으로|메이플스토리 홈)$/ })
  ]);
  if (home) await home.click();
  else await page.goto('https://maplestory.nexon.com/home/main', { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (characterSelectionStage === 'afterHome') await chooseCharacter(page, character, selectors);
  if (!selectors.auctionMenuSelector) await page.getByRole('link', { name: /메이플\s*옥션/ }).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  const auction = selectors.auctionMenuSelector ? (await configuredLocator(page, selectors.auctionMenuSelector, '메이플 옥션 메뉴', 30000)).locator : await firstVisible([
    page.getByRole('link', { name: /메이플\s*옥션/ }),
    page.locator('a:has-text("메이플 옥션")')
  ]);
  if (!auction) throw Error('메이플 홈에서 옥션 메뉴를 찾지 못했습니다. 화면의 메뉴 이름을 확인해 주세요.');
  const previous = new Set(context.pages());
  await auction.click();
  for (let attempt = 0; attempt < 20; attempt++) {
    if (context.pages().some(candidate => !previous.has(candidate))) break;
    if (/auction/i.test(page.url())) break;
    await page.waitForTimeout(500);
  }
  return context.pages().find(candidate => !previous.has(candidate)) || page;
}
async function clickCharacterCard(page, label) {
  // Character names live inside a <p>; the auction attaches its click handler
  // to the surrounding card. Prefer that card over the text node itself.
  const targets = [
    label.locator('xpath=ancestor::*[self::button or self::a or @role="button" or contains(@class,"cursor-pointer")][1]'),
    label.locator('xpath=ancestor::div[.//canvas or .//img][1]'),
    label.locator('xpath=..'),
    label
  ];
  for (const candidate of targets) {
    const target = await firstVisible([candidate]);
    if (!target) continue;
    try { await target.click({ timeout: 5000 }); }
    catch (_) { continue; }
    for (let attempt = 0; attempt < 12; attempt++) {
      if (await firstVisible([page.locator('input[placeholder*="아이템명"]')])) return;
      const picker = await page.getByText(/입장할 캐릭터/).first().isVisible().catch(() => false);
      if (!picker) return; // The page is navigating to the auction.
      await page.waitForTimeout(500);
    }
  }
  throw Error('캐릭터 이름은 찾았지만 카드 클릭 후 옥션으로 이동하지 않았습니다. characterSelector는 이름 <p> 요소의 선택자를 입력해 주세요.');
}
async function chooseCharacter(page, character, selectors) {
  // The auction opens on an account picker. The selected email is a trigger;
  // the desired account appears only after that dropdown opens.
  let pickerVisible = false;
  const picker = page.getByText(/입장할 캐릭터/).first();
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await firstVisible([page.locator('input[placeholder*="아이템명"]')])) return;
    if (await firstVisible([picker])) { pickerVisible = true; break; }
    await page.waitForTimeout(500);
  }
  if (!pickerVisible) throw Error('옥션 화면과 캐릭터 선택 화면을 찾지 못했습니다. 열린 Chrome 창의 상태를 확인해 주세요.');
  const characterText = page.getByText(character, { exact: true }).first();
  const alreadyVisible = await firstVisible([characterText]);
  const legacyName = /^[\w]{4,}$/.test(selectors.accountSelector || '') &&
    !['button', 'select', 'span', 'div', 'input'].includes(selectors.accountSelector)
    ? selectors.accountSelector : '';
  const accountName = selectors.auctionAccount || legacyName;
  if (!alreadyVisible && (accountName || selectors.accountSelector)) {
    const trigger = selectors.accountDropdownSelector
      ? (await configuredLocator(page, selectors.accountDropdownSelector, '옥션 계정 목록', 15000)).locator
      : await firstVisible([
        page.getByRole('combobox').first(),
        page.getByText(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).first(),
        page.locator('button:has-text("@")').first()
      ]);
    if (!trigger) throw Error('옥션 계정 목록을 여는 버튼을 찾지 못했습니다. accountDropdownSelector를 설정해 주세요.');
    await trigger.click();
    const option = selectors.accountSelector && !legacyName
      ? (await configuredLocator(page, selectors.accountSelector, '옥션 계정 항목', 15000)).locator
      : accountName ? page.getByText(accountName, { exact: true }).last() : null;
    if (!option) throw Error('옥션 계정 항목을 지정하지 못했습니다. auctionAccount에 화면의 계정 이름을 적어 주세요.');
    try { await option.waitFor({ state: 'visible', timeout: 15000 }); }
    catch (_) { throw Error('옥션 계정 목록에서 지정한 계정을 찾지 못했습니다. auctionAccount를 확인해 주세요.'); }
    await option.click();
  }
  const chosen = selectors.characterSelector
    ? (await configuredLocator(page, selectors.characterSelector, '캐릭터 선택', 30000)).locator
    : characterText;
  try { await chosen.waitFor({ state: 'visible', timeout: 30000 }); }
  catch (_) { throw Error('캐릭터 카드를 찾지 못했습니다. 계정과 월드 선택 상태, character 값을 확인해 주세요.'); }
  await clickCharacterCard(page, chosen);
}
async function findSearchField(page, selector) {
  const chosen = await configuredLocator(page, selector || 'input[placeholder*="아이템명"]', '옥션 검색창', 120000);
  return chosen;
}
async function refreshAuctionPrices({ id, password, character, auctionAccount = '', characterSelectionStage = 'afterAuction', ...givenSelectors }) {
  if (![id, password, character].every(x => typeof x === 'string' && x.length > 0 && x.length <= 150)) throw Error('넥슨 ID, 비밀번호, 캐릭터명을 확인해 주세요.');
  if (typeof auctionAccount !== 'string' || auctionAccount.length > 150) throw Error('auctionAccount에 화면의 계정 이름을 적어 주세요.');
  const selectorKeys = ['loginEntrySelector', 'loginMethodSelector', 'loginIdSelector', 'loginPasswordSelector',
    'loginSubmitSelector', 'homeSelector', 'auctionMenuSelector', 'accountDropdownSelector', 'accountSelector', 'characterSelector', 'auctionSearchSelector'];
  const selectors = { ...Object.fromEntries(selectorKeys.map(key => [key, givenSelectors[key] ?? ''])), auctionAccount: auctionAccount || id.split('@')[0] };
  if (Object.values(selectors).some(value => typeof value !== 'string' || value.length > 400))
    throw Error('CSS 선택자는 400자 이내로 입력해 주세요.');
  if (!['afterLogin', 'afterHome', 'afterAuction'].includes(characterSelectionStage))
    throw Error('캐릭터 선택 단계는 afterLogin, afterHome, afterAuction 중 하나로 입력해 주세요.');
  let playwright;
  try { playwright = require('playwright'); } catch (_) { throw Error('브라우저 구성 요소가 없습니다. 시작 파일에서 npm install을 먼저 실행해 주세요.'); }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: false, channel: 'chrome' });
    const context = await browser.newContext({ locale: 'ko-KR' });
    const page = await context.newPage();
    await validateConfiguredSelectors(page, Object.fromEntries(selectorKeys.map(key => [key, selectors[key]])));
    await page.goto('https://maplestory.nexon.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const returnedPage = await signIn(page, context, id, password, selectors);
    if (characterSelectionStage === 'afterLogin') await chooseCharacter(returnedPage, character, selectors);
    const auctionPage = await openAuction(returnedPage, context, selectors, character, characterSelectionStage);
    if (characterSelectionStage === 'afterAuction') await chooseCharacter(auctionPage, character, selectors);
    let search;
    try { search = await findSearchField(auctionPage, selectors.auctionSearchSelector); }
    catch (error) { throw Error(`옥션 검색창을 찾지 못했습니다. ${error.message} 열린 브라우저에서 로그인·추가 인증·캐릭터 선택 상태를 확인해 주세요.`); }
    const items = [], errors = [];
    let lastSearchAt = 0;
    for (const item of ITEMS) {
      try {
        if (lastSearchAt) await auctionPage.waitForTimeout(Math.max(0, 5500 - (Date.now() - lastSearchAt)));
        await search.locator.fill(item.name); await search.locator.press('Enter');
        lastSearchAt = Date.now();
        let value = null;
        for (let i = 0; i < 20; i++) {
          const visibleText = await search.frame.locator('body').innerText();
          value = pricesFromText(visibleText, item.name);
          if (value) break;
          await auctionPage.waitForTimeout(400);
        }
        if (value) items.push({ id: item.id, auctionPrice: value });
        else errors.push(`${item.name}: 개당 가격을 읽지 못함`);
      } catch (_) { errors.push(`${item.name}: 검색 화면을 읽지 못함`); }
    }
    if (!items.length) throw Error('여섯 품목의 가격을 읽지 못했습니다. 옥션 결과 화면 구조를 확인해야 합니다.');
    return { items, errors, updatedAt: new Date().toLocaleString('ko-KR') };
  } catch (error) {
    // A short pause keeps the page visible so the user can inspect its state.
    if (browser?.isConnected() && !/^\w+Selector에 적은 CSS/.test(error.message))
      await new Promise(resolve => setTimeout(resolve, 20000));
    if (['넥슨 ID', '넥슨ID 로그인 방식', '로그인 선택자', '로그인 입력칸', '로그인 제출', '로그인 완료', '홈 버튼', '메이플 홈', '메이플 옥션 메뉴', '계정 선택', '캐릭터 선택', '옥션 계정', '캐릭터 카드', '캐릭터 이름', '옥션 검색창', '여섯 품목', '브라우저 구성', 'CSS 선택자'].some(prefix => error.message.startsWith(prefix)) || /^\w+Selector에 적은 CSS/.test(error.message)) throw error;
    throw Error('넥슨 화면 접속 또는 로그인에 실패했습니다. 열린 브라우저의 안내를 확인해 주세요.');
  } finally { if (browser) await browser.close(); }
}
module.exports = { ITEMS, parseMeso, pricesFromText, refreshAuctionPrices, loginForm, validateConfiguredSelectors, chooseCharacter, clickCharacterCard };
