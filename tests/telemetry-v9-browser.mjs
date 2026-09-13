import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const root=new URL('../public/js/',import.meta.url);
const [telemetry,siteConfig]=await Promise.all([readFile(new URL('telemetry.js',root),'utf8'),readFile(new URL('site-config.js',root),'utf8')]);
const html='<!doctype html><html><head><meta charset="utf-8"><title>Telemetry fixture</title><script type="module" src="/js/telemetry.js"></script></head><body><button data-analytics-settings>방문 분석 설정</button></body></html>';

const entries=page=>page.evaluate(()=>window.dataLayer?.map(args=>Array.from(args,value=>value instanceof Date?'[date]':value))||[]);
const eventCount=(rows,name)=>rows.filter(row=>row[0]==='event'&&row[1]===name).length;

test('telemetry waits for consent, redacts private routes, and stops immediately after revocation',async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage(),unexpected=[],served=[];
 try{
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());served.push(url.href);
   if(url.hostname==='dwingul.com'&&url.pathname==='/js/telemetry.js')return route.fulfill({status:200,contentType:'text/javascript',body:telemetry});
   if(url.hostname==='dwingul.com'&&url.pathname==='/js/site-config.js')return route.fulfill({status:200,contentType:'text/javascript',body:siteConfig});
   if(url.hostname==='dwingul.com')return route.fulfill({status:200,contentType:'text/html',body:html});
   if(url.hostname==='www.googletagmanager.com')return route.fulfill({status:200,contentType:'text/javascript',body:'window.__gtagLoads=(window.__gtagLoads||0)+1;'});
   unexpected.push(url.href);return route.abort();
  });
  const privateValues=['share-secret-123','room-secret-456','ticket-secret-789','private-user-321','person@example.com','홍길동','2000-01-01','referrer@example.com'];
  await page.goto('https://dwingul.com/#/s/share-secret-123?email=person@example.com',{waitUntil:'networkidle',referer:'https://ref.example/private?email=referrer@example.com'});
  await page.locator('.consent-note').waitFor();assert.doesNotMatch(await page.locator('.consent-note').innerText(),/익명/);
  assert.deepEqual(await entries(page),[]);assert.equal(served.some(url=>url.includes('googletagmanager.com')),false);
  await page.locator('[data-consent="no"]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('dw:analytics-consent')),'no');assert.deepEqual(await entries(page),[]);

  await page.locator('[data-analytics-settings]').click();await page.locator('[data-consent="yes"]').click();
  await page.waitForFunction(()=>window.__gtagLoads===1);
  let rows=await entries(page),config=rows.find(row=>row[0]==='config');
  assert.equal(config[2].send_page_view,false);assert.equal(config[2].page_location,'https://dwingul.com/s');assert.equal(config[2].page_referrer,'https://ref.example');
  assert.equal(eventCount(rows,'page_view'),1,'the initial page view is sent manually after opt-in');

  for(const hash of ['#/group/room-secret-456?name=홍길동','#/transfer/ticket-secret-789?birth=2000-01-01','#/profile/private-user-321?email=person@example.com']){
   const previous=eventCount(await entries(page),'page_view');await page.evaluate(value=>{location.hash=value;},hash);await page.waitForFunction(count=>window.dataLayer.filter(row=>row[0]==='event'&&row[1]==='page_view').length>count,previous);
  }
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dw:metric',{detail:{name:'game_start',content:'typing',email:'person@example.com'}})));
  rows=await entries(page);
  assert.deepEqual(rows.filter(row=>row[0]==='event'&&row[1]==='page_view').map(row=>row[2].page_location),['https://dwingul.com/s','https://dwingul.com/group','https://dwingul.com/transfer','https://dwingul.com/profile']);
  assert.equal(eventCount(rows,'game_start'),1);assert.equal(rows.find(row=>row[0]==='event'&&row[1]==='game_start')[2].page_location,'https://dwingul.com/profile');
  const tracked=rows.filter(row=>['config','set','event'].includes(row[0]));for(const value of privateValues)assert.equal(JSON.stringify(tracked).includes(value),false,`telemetry must exclude ${value}`);

  const beforeRevoke=rows.length,viewsBeforeRevoke=eventCount(rows,'page_view');
  await page.locator('[data-analytics-settings]').click();assert.equal(await page.evaluate(()=>window['ga-disable-G-725B71K0DR']),true);assert.equal(await page.evaluate(()=>localStorage.getItem('dw:analytics-consent')),null);
  await page.evaluate(()=>{location.hash='#/detail/typing?name=홍길동';window.dispatchEvent(new CustomEvent('dw:metric',{detail:{name:'share_created',content:'taste'}}));});await page.waitForTimeout(50);
  assert.equal((await entries(page)).length,beforeRevoke);assert.equal(eventCount(await entries(page),'page_view'),viewsBeforeRevoke);

  await page.locator('[data-consent="yes"]').click();await page.waitForFunction(count=>window.dataLayer.length>count,beforeRevoke);
  rows=await entries(page);assert.equal(await page.evaluate(()=>window.__gtagLoads),1);assert.equal(await page.locator('script[src*="googletagmanager.com"]').count(),1);
  assert.equal(rows.filter(row=>row[0]==='event'&&row[1]==='page_view').at(-1)[2].page_location,'https://dwingul.com/detail/typing');
  for(const value of privateValues)assert.equal(JSON.stringify(rows.filter(row=>['config','set','event'].includes(row[0]))).includes(value),false);
  assert.deepEqual(unexpected,[]);
 }finally{await browser.close();}
});
