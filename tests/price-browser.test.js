'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const KEY = 'maple-mvp-settings-v1';
const oldTime='2026-10-06T11:19:03.000Z', newTime='2026-10-06T11:43:00.000Z';
function snapshot(value, observedAt=newTime) {
  return {updatedAt:observedAt || '2026-10-06',publishedAt:observedAt,history:[{
    date:'2026-10-06', values:{abysscirculator:value},...(observedAt?{observedAt:{abysscirculator:observedAt}}:{})
  }]};
}
async function flush() {await new Promise(resolve=>setImmediate(resolve));}
async function app(local, initial, published) {
  let data=published, fail=false;
  const storage=new Map([[KEY,JSON.stringify(initial)]]), elements=new Map(), events=new Map(), intervals=[], requests=[];
  function element(id) {
    if (!elements.has(id)) elements.set(id,{id,value:'',textContent:'',innerHTML:'',disabled:false,hidden:id==='trendPage',
      classList:{toggle(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});
    return elements.get(id);
  }
  const context=vm.createContext({console,structuredClone,AbortController,setTimeout,clearTimeout,
    setInterval:fn=>intervals.push(fn),location:{protocol:'http:'},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    document:{hidden:false,activeElement:null,getElementById:element,addEventListener:(name,fn)=>events.set(name,fn)},
    fetch:async(url,options={})=>{
      requests.push({url,options});if(fail) throw Error('offline');
      if(url==='/api/publish') {
        const sent=JSON.parse(options.body).values;
        data=snapshot(sent.abysscirculator);
        return {ok:true,json:async()=>({published:true,publishedAt:newTime,revision:'abc123'})};
      }
      return {ok:true,json:async()=>structuredClone(data)};
    }
  });
  context.window=context;context.addEventListener=(name,fn)=>events.set(name,fn);
  for (const name of ['web/price-sync.js',local?'app.js':'web/app.js']) vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
  await flush();
  return {context,element,events,intervals,requests,model:()=>JSON.parse(storage.get(KEY)),
    setData:next=>data=next,setFailure:()=>fail=true,click:async id=>{await element(id).listeners.click();await flush();}};
}
const saved=(value)=>({itemDefaultsReady:true,items:[
  {id:'wonderberry',name:'위습의 원더베리',cashPrice:54000,units:11,auctionPrice:220000000},
  {id:'abysscirculator',name:'심연의 서큘레이터',cashPrice:4900,units:1,auctionPrice:value}
],gifts:[{cost:46000,count:7},{count:5},{count:2}],existingCredits:7777});

test('public page replaces old saved price with latest published price, preserving personal inputs', async()=>{
  const page=await app(false,saved(237988879),snapshot(243000000));
  const model=page.model();
  assert.equal(model.items[1].auctionPrice,243000000);
  assert.equal(model.items[0].units,11);assert.equal(model.items[0].cashPrice,54000);
  assert.equal(model.gifts[0].count,7);assert.equal(model.gifts[0].cost,46000);assert.equal(model.existingCredits,7777);
  assert.match(page.element('items').innerHTML,/243,000,000/);
  assert.equal(page.requests.filter(r=>r.options.method==='POST').length,0);
  assert.equal(page.element('refreshPrices').disabled,false);
  // An open page follows later publication even when the price decreases.
  page.setData(snapshot(231000000,'2026-10-06T12:00:00.000Z'));
  page.intervals[0]();await flush();assert.equal(page.model().items[1].auctionPrice,231000000);
});
test('local page keeps the existing 2.43 hundred million value and publishes it, without inventing a timestamp for old data', async()=>{
  const page=await app(true,saved(243000000),snapshot(237988879,''));
  assert.equal(page.model().items[1].auctionPrice,243000000);
  assert.match(page.element('refreshStatus').textContent,/입력하거나 보관한 값/);
  await page.click('publishPrices');
  const post=page.requests.find(r=>r.url==='/api/publish');
  assert.equal(JSON.parse(post.options.body).values.abysscirculator,243000000);
  assert.equal(page.model().items[1].observedAt,newTime);
  assert.match(page.element('refreshStatus').textContent,/abc123/);
});
test('local app loads timestamped server price without writing history on a read; fetch failure is visible', async()=>{
  const page=await app(true,saved(237988879),snapshot(243000000));
  assert.equal(page.model().items[1].auctionPrice,243000000);
  assert.equal(page.requests.filter(r=>r.options.method==='POST').length,0);
  page.setFailure();await page.click('loadStoredPrices');
  assert.equal(page.model().items[1].auctionPrice,243000000);
  assert.match(page.element('refreshStatus').textContent,/확인 실패/);
});
test('late old response cannot roll back a newer published price, while explicit reload can restore a simulation', async()=>{
  const page=await app(false,saved(1),snapshot(243000000));
  page.setData(snapshot(237988879,oldTime));
  page.intervals[0]();await flush();
  assert.equal(page.model().items[1].auctionPrice,243000000);
});
