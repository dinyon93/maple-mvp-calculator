'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = __dirname;
const PUBLIC_FILE = path.join(ROOT, 'web', 'shared-prices.json');
const IDS = new Set(['wonderberry', 'royalstyle', 'platinumscissors', 'abysscirculator',
  'primecube', 'primeadditionalcube', 'marketRate', 'discordRate']);

// Only prices and dates are exported. Neither the login config nor browser settings
// are read by the publisher, and git is given only this one public file.
function buildSnapshot(history) {
  const rows = [];
  for (const entry of history) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.date || '')) continue;
    const values = {};
    for (const [id, value] of Object.entries(entry.values || {})) {
      if (IDS.has(id) && Number.isSafeInteger(value) && value > 0) values[id] = value;
    }
    if (Object.keys(values).length) rows.push({ date: entry.date, values });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { updatedAt: rows.at(-1)?.date || '', history: rows };
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, timeout: 30000, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function publish(history) {
  const top = git('rev-parse', '--show-toplevel');
  if (path.resolve(top) !== path.resolve(ROOT)) throw Error('이 폴더가 GitHub에 연결된 프로젝트 폴더가 아닙니다. 기존 VS Code 프로젝트 폴더에 수정 파일을 복사해 주세요.');
  const remote = git('remote', 'get-url', 'origin');
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?$/.test(remote) && !/^git@github\.com:[^/]+\/[^/]+(?:\.git)?$/.test(remote))
    throw Error('origin이 GitHub 저장소인지 확인해 주세요. 주소에 비밀번호나 토큰을 넣지 마세요.');
  if (git('branch', '--show-current') !== 'main') throw Error('main 브랜치에서 실행해 주세요.');
  if (git('ls-files', '--', 'config.local.json', 'data'))
    throw Error('계정 설정이나 개인 기록이 Git에 추가돼 있습니다. Git 추적에서 제외한 후 게시해 주세요.');
  if (git('status', '--porcelain', '--', 'web/shared-prices.json'))
    throw Error('공개 시세 파일에 저장되지 않은 수정이 있습니다. 먼저 확인해 주세요.');
  const snapshot = buildSnapshot(history);
  if (!snapshot.history.length) throw Error('게시할 시세 기록이 없습니다.');
  fs.writeFileSync(PUBLIC_FILE, JSON.stringify(snapshot, null, 2) + '\n');
  let unchanged = false;
  try {
    git('commit', '--only', '-m', `Update public prices ${snapshot.updatedAt}`, '--', 'web/shared-prices.json');
  } catch (error) {
    // Nothing to commit is normal when today's numbers have not changed.
    if (!git('diff', 'HEAD', '--', 'web/shared-prices.json')) unchanged = true;
    else throw Error('시세 파일을 커밋하지 못했습니다. Git 사용자 이름과 이메일 설정을 확인해 주세요.');
  }
  try { git('push', 'origin', 'HEAD:main'); }
  catch (_) { throw Error('GitHub 업로드에 실패했습니다. VS Code에서 Git 로그인과 원격 변경사항을 확인해 주세요. 시세는 PC에 저장돼 있습니다.'); }
  return { published: true, unchanged };
}
module.exports = { buildSnapshot, publish };
