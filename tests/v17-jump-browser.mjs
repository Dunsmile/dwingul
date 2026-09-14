import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.DW_TEST_URL||'http://localhost:4188',out='/tmp/dwingul-v17-jump';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:390,height:844}}),report={errors:[],screenshots:[],chains:[]};page.on('pageerror',e=>report.errors.push(e.message));
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text())),advance=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const shot=async name=>{const path=`${out}/${name}.png`;await page.screenshot({path});report.screenshots.push(path);};
try{
 await page.goto(`${base}/?v17jump=1#/play/jump?seed=skill-17`);await page.locator('.dg-game').waitFor();await advance(0);let s=await state();assert.equal(s.rulesVersion,'v17');assert.equal(s.lives,3);assert.equal(s.speed,260);
 const jumpButton=page.getByRole('button',{name:/점프 · 두 번 가능/}),duckButton=page.getByRole('button',{name:/꾹 눌러 숙이기/});
 await jumpButton.click();await advance(300);await duckButton.dispatchEvent('pointerdown',{pointerId:1});await advance(20);s=await state();assert.equal(s.fastFalling,true);await shot('fast-fall-min-speed');
 for(let i=0;i<40&&s.player.y<390;i+=1){await advance(10);s=await state();}assert.equal(s.player.duck,true);await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true})));
 await page.keyboard.press('Space');await advance(40);await page.keyboard.press('ArrowUp');assert.equal((await state()).player.jumps,2);
 await page.getByRole('button',{name:'일시정지'}).click();const frozen=await state();await advance(1500);assert.equal((await state()).elapsedMs,frozen.elapsedMs);await page.getByRole('button',{name:'계속하기'}).click();
 await page.goto(`${base}/?v17jump=2#/play/jump?seed=skill-17`);await page.locator('.dg-game').waitFor();await advance(0);
 const captured=new Set();let maxSpeed=false,heart=false,minLives=3;
 for(let i=0;i<36000;i+=1){s=await state();if(s.phase!=='playing')throw Error(`ended ${s.distance}m ${s.currentPatternType}`);maxSpeed||=s.speed===480;heart||=s.heartsCollected>0;minLives=Math.min(minLives,s.lives);
  const live=s.obstacles.filter(o=>!o.hit&&!o.passed).sort((a,b)=>a.x-b.x),ground=live.filter(o=>o.kind!=='slide'),slide=live.find(o=>o.kind==='slide'&&o.x<450&&o.x+o.w>75);
  const groundAhead=slide&&ground.some(o=>o.x<=slide.x&&o.x+o.w>116);if(slide&&!groundAhead)await page.keyboard.down('ArrowDown');else await page.keyboard.up('ArrowDown');
  const nearest=ground[0];if(nearest&&s.player.jumps===0&&nearest.x<s.speed*.75)await page.keyboard.press('Space');
  const tall=ground.find(o=>o.kind==='double');if(tall&&s.player.jumps===1&&tall.x<Math.max(350,s.speed*.75))await page.keyboard.press('ArrowUp');
  const visible=s.obstacles.filter(o=>o.patternId===s.currentPatternId&&!o.passed&&o.x<620&&o.x+o.w>0),required=s.currentPatternType==='master-chain'?3:2;
  const speedReady=s.currentPatternType==='slide-chain'||s.speed===480;
  if(['slide-chain','single-double','jump-slide','master-chain'].includes(s.currentPatternType)&&visible.length>=required&&speedReady&&!captured.has(s.currentPatternType)){
   captured.add(s.currentPatternType);await shot(`${s.currentPatternType}-${s.speed}pxs`);report.chains.push({type:s.currentPatternType,speed:s.speed,distance:s.distance});
  }
  await advance(20);if(s.distance>=6100&&captured.size===4)break;
 }
 await page.keyboard.up('ArrowDown');s=await state();assert.equal(s.speed,480);assert.ok(s.distance>=6000);assert.equal(maxSpeed,true);assert.equal(heart,true);assert.equal(minLives,3);assert.deepEqual([...captured].sort(),['jump-slide','master-chain','single-double','slide-chain']);
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log('v17 jump browser passed');
