'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { refreshAuctionPrices } = require('./auction');
const { publish } = require('./publish');
const PORT = 8765, ROOT = __dirname, DATA = process.env.MVP_DATA_PATH || path.join(ROOT, 'data', 'trends.json');
const LOGIN_CONFIG = path.join(ROOT, 'config.local.json');
const SELECTOR_KEYS = ['loginEntrySelector', 'loginMethodSelector', 'loginIdSelector', 'loginPasswordSelector',
  'loginSubmitSelector', 'homeSelector', 'auctionMenuSelector', 'accountDropdownSelector', 'accountSelector', 'characterSelector', 'auctionSearchSelector'];
const SERIES = new Set(['wonderberry', 'royalstyle', 'platinumscissors', 'abysscirculator', 'primecube', 'primeadditionalcube', 'marketRate', 'discordRate']);
const FILES = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/calc.js', 'calc.js'], ['/app.js', 'app.js'], ['/trend.js', 'trend.js'], ['/auction-prices.example.json', 'auction-prices.example.json']]);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function readHistory() { try { const x = JSON.parse(fs.readFileSync(DATA, 'utf8')); return Array.isArray(x) ? x : []; } catch (error) { if (error.code === 'ENOENT') return []; throw error; } }
function saveHistory(values) {
  const clean = {};
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw Error('시세 형식이 올바르지 않습니다.');
  for (const [key, value] of Object.entries(values)) {
    if (!SERIES.has(key) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw Error('시세 값이 올바르지 않습니다.');
    clean[key] = Number(value);
  }
  if (!Object.keys(clean).length) return readHistory();
  const history = readHistory(), today = localDate();
  const row = history.find(x => x.date === today);
  if (row) Object.assign(row.values, clean); else history.push({ date: today, values: clean });
  history.sort((a, b) => a.date.localeCompare(b.date));
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  const temp = `${DATA}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(history, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temp, DATA);
  return history;
}
function send(res, status, body, mime = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'" });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function jsonBody(req) {
  return new Promise((resolve, reject) => {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reject(Error('JSON 요청만 허용합니다.'));
    const chunks = []; let length = 0;
    req.on('data', part => { length += part.length; if (length > 16000) { reject(Error('요청이 너무 큽니다.')); req.destroy(); } else chunks.push(part); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (_) { reject(Error('JSON 형식이 올바르지 않습니다.')); } });
    req.on('error', reject);
  });
}
function readLocalLogin(filename = LOGIN_CONFIG) {
  let config;
  try { config = JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') throw Error('config.local.json이 없습니다. config.local.example.json을 복사해 작성해 주세요.');
    throw Error('config.local.json의 JSON 형식을 확인해 주세요.');
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw Error('config.local.json의 내용을 확인해 주세요.');
  const { id, password, character, auctionAccount = '' } = config;
  const selectors = Object.fromEntries(SELECTOR_KEYS.map(key => [key, config[key] ?? '']));
  const characterSelectionStage = config.characterSelectionStage ?? 'afterAuction';
  if (![id, password, character].every(value => typeof value === 'string' && value.trim() && value.length <= 150) ||
      typeof auctionAccount !== 'string' || auctionAccount.length > 150 ||
      Object.values(selectors).some(value => typeof value !== 'string' || value.length > 400) ||
      !['afterLogin', 'afterHome', 'afterAuction'].includes(characterSelectionStage))
    throw Error('config.local.json의 넥슨 ID, 비밀번호, 캐릭터명, CSS 선택자를 확인해 주세요.');
  if (Object.values(selectors).some(value => value.trim().startsWith('<')))
    throw Error('CSS 선택자에는 HTML 전체를 넣지 마세요. Elements에서 Copy → Copy selector를 선택해 복사한 값을 입력해 주세요.');
  return { id, password, character, auctionAccount, ...selectors, characterSelectionStage };
}
function createServer(refresh = refreshAuctionPrices, loginConfig = readLocalLogin, publisher = publish) {
  let refreshing = false;
  return http.createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${PORT}`;
    if (req.headers.host !== `127.0.0.1:${PORT}`) return send(res, 403, { error: '로컬 주소에서만 사용할 수 있습니다.' });
    const pathname = new URL(req.url, origin).pathname;
    if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { local: true });
    if (req.method === 'GET' && pathname === '/api/trends') return send(res, 200, readHistory());
    if (req.method === 'POST' && (pathname === '/api/trends' || pathname === '/api/refresh' || pathname === '/api/publish')) {
      if (req.headers.origin !== origin) return send(res, 403, { error: '로컬 페이지에서만 요청할 수 있습니다.' });
      try {
        const body = await jsonBody(req);
        if (pathname === '/api/trends') return send(res, 200, saveHistory(body.values));
        if (pathname === '/api/publish') {
          if (body.values && Object.keys(body.values).length) saveHistory(body.values);
          return send(res, 200, publisher(readHistory()));
        }
        if (refreshing) return send(res, 409, { error: '옥션 시세를 이미 조회하고 있습니다.' });
        refreshing = true;
        try {
          // Credentials are read on this PC for each request. Browser-supplied
          // fields are intentionally ignored; the settings page never sees them.
          const result = await refresh(loginConfig());
          const values = {};
          for (const item of result.items || []) {
            if (SERIES.has(item.id) && Number.isSafeInteger(item.auctionPrice) && item.auctionPrice > 0) values[item.id] = item.auctionPrice;
          }
          for (const id of ['marketRate', 'discordRate']) {
            if (body.values?.[id] !== '' && body.values?.[id] != null) values[id] = body.values[id];
          }
          if (Object.keys(values).length) saveHistory(values);
          try { result.publication = publisher(readHistory()); }
          catch (error) { result.publication = { published: false, error: error.message }; }
          return send(res, 200, result);
        } finally { refreshing = false; }
      } catch (error) { return send(res, 400, { error: error.message }); }
    }
    if (req.method === 'GET' && FILES.has(pathname)) {
      const name = FILES.get(pathname); return send(res, 200, fs.readFileSync(path.join(ROOT, name)), MIME[path.extname(name)]);
    }
    send(res, 404, { error: '페이지를 찾지 못했습니다.' });
  });
}
if (require.main === module) createServer().listen(PORT, '127.0.0.1', () => {
  console.log(`메이플 MVP작 계산기: http://127.0.0.1:${PORT}/`);
  console.log('종료하려면 Ctrl+C를 누르세요. 옥션 로그인 설정은 이 PC의 config.local.json에서 읽습니다.');
});
module.exports = { createServer, readLocalLogin, localDate, readHistory, saveHistory };
