'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const http = require('node:http');
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      let text = ''; res.on('data', part => text += part);
      res.on('end', () => resolve({ status: res.statusCode, headers: { get: key => res.headers[key] }, json: async () => JSON.parse(text) }));
    });
    req.on('error', reject); req.end(options.body);
  });
}
const { latest, shouldApply } = require('../web/price-sync');
const { buildSnapshot } = require('../publish');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-latest-'));
process.env.MVP_DATA_PATH = path.join(temp, 'trends.json');
const { saveHistory, readHistory, createServer, localDate } = require('../server');
const early = '2026-10-06T11:19:03.000Z', late = '2026-10-06T11:43:00.000Z';
const make = (value, time) => ({ date:'2026-10-06', values:{abysscirculator:value}, observedAt:{abysscirculator:time} });

test('same-day later observation wins, regardless of price direction or array order', () => {
  const rows = [make(243000000,late), make(237988879,early)];
  assert.equal(latest(rows).abysscirculator.value,243000000);
  assert.equal(latest(buildSnapshot(rows).history).abysscirculator.value,243000000);
  assert.equal(latest([make(243000000,early),make(230000000,late)]).abysscirculator.value,230000000);
});
test('partial refresh keeps each other item and its original capture time; private metadata is excluded', () => {
  const snapshot = buildSnapshot([
    { ...make(237988879,early), password:'secret', values:{abysscirculator:237988879,royalstyle:95000000},observedAt:{abysscirculator:early,royalstyle:early,password:'secret'} },
    make(243000000,late)
  ]);
  assert.equal(snapshot.history.length,1);
  const prices=latest(snapshot.history);
  assert.equal(prices.royalstyle.observedAt,early);
  assert.equal(prices.abysscirculator.observedAt,late);
  assert.equal(snapshot.updatedAt,late);
  assert.ok(!JSON.stringify(snapshot).includes('secret'));
});
test('old local unsent input is preserved when remote timestamps are unknown', () => {
  assert.equal(shouldApply({value:243000000},{value:237988879,observedAt:''},{local:true}),false);
  assert.equal(shouldApply({value:237988879},{value:243000000,observedAt:late},{local:true}),true);
  assert.equal(shouldApply({value:243000000,observedAt:late},{value:237988879,observedAt:early}),false);
  assert.equal(shouldApply({value:1},{value:243000000,observedAt:late},{dirty:true}),false);
});
test('server loads latest values, rejects late-arriving older results, and publishes current manual value', async t => {
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const early = new Date(Date.now() - 120000).toISOString(), late = new Date(Date.now() - 60000).toISOString();
  saveHistory({abysscirculator:243000000,discordRate:1600},{abysscirculator:late,discordRate:early});
  saveHistory({abysscirculator:237988879},{abysscirculator:early});
  assert.equal(latest(readHistory()).abysscirculator.value,243000000);
  let published;
  const server=createServer(async()=>{throw Error('no browser should launch')},()=>({}),history=>{
    published=buildSnapshot(history);return {published:true,publishedAt:new Date().toISOString(),revision:'test'};
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const headers={Host:'127.0.0.1:8765',Origin:'http://127.0.0.1:8765','Content-Type':'application/json'};
  const response=await request(base+'/api/prices',{headers});
  assert.equal(response.status,200);
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal(latest((await response.json()).history).abysscirculator.value,243000000);
  const sent=await request(base+'/api/publish',{headers,method:'POST',body:JSON.stringify({values:{abysscirculator:243123456}})});
  assert.equal(sent.status,200);
  assert.equal(latest(published.history).abysscirculator.value,243123456);
  assert.ok(latest(published.history).abysscirculator.observedAt.includes('T'));
  assert.equal(published.history[0].date,localDate());
});
