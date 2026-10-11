'use strict';
// One run after Windows sign-in. The login config stays on this PC, and only
// the six public auction prices are written to GitHub by publish().
const { refreshAuctionPrices } = require('./auction');
const { readLocalLogin, readHistory, saveHistory } = require('./server');
const { publish } = require('./publish');
const allowed = new Set(['wonderberry', 'royalstyle', 'platinumscissors', 'abysscirculator',
  'primecube', 'primeadditionalcube']);

async function run(refresh = refreshAuctionPrices, publisher = publish,
  getConfig = readLocalLogin, save = saveHistory, read = readHistory) {
  console.log(`[자동 갱신] 시작: ${new Date().toLocaleString('ko-KR')}`);
  const result = await refresh(getConfig());
  const values = {};
  for (const { id, auctionPrice } of result.items || []) {
    if (allowed.has(id) && Number.isSafeInteger(auctionPrice) && auctionPrice > 0) values[id] = auctionPrice;
  }
  if (!Object.keys(values).length) throw Error('옥션 가격을 읽지 못해 온라인 시세를 변경하지 않았습니다.');
  const observedAt = Object.fromEntries((result.items || []).map(item => [item.id, item.observedAt]));
  for (const [id, value] of Object.entries(values)) console.log(`[자동 갱신] ${id}: ${value.toLocaleString('ko-KR')} 메소`);
  save(values, observedAt);
  const status = publisher(read());
  console.log(`[자동 갱신] ${Object.keys(values).length}개 품목 게시 완료${status.unchanged ? ' (가격 변경 없음)' : ''}. Vercel 배포 뒤 반영됩니다.`);
  if (result.errors?.length) console.log(`[자동 갱신] 일부 조회 실패: ${result.errors.join(' / ')}`);
  return status;
}
if (require.main === module) run().catch(error => {
  // Do not print the login config or a Playwright stack that may contain inputs.
  console.error(`[자동 갱신] 실패: ${error.message}`);
  process.exitCode = 1;
});
module.exports = { run };
