import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base=process.env.DW_TEST_URL||'http://localhost:4182';
const out='/tmp/dwingul-v16-jump'; await mkdir(out,{recursive:true});
const browser=await chromium.launch(); const report={errors:[],checks:[],screenshots:[]};
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('pageerror',error=>report.errors.push(error.message));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const start=async seed=>{await page.goto(`${base}/?qa=v16jump#/play/jump?seed=${seed}`);await page.locator('.dg-game').waitFor();await page.waitForFunction(()=>typeof window.advanceTime==='function');await advance(0);};
try {
  await start(19);
  let current=await state(); assert.equal(current.rulesVersion,'v16');assert.equal(current.lives,3);assert.equal(current.maxLives,3);
  assert.equal((await page.locator('.dg-game__status').innerText()).trim(),'');assert.equal(await page.getByRole('button',{name:'일시정지'}).count(),1);
  await page.keyboard.press('Space');await advance(40);await page.keyboard.press('ArrowUp');
  for(let i=0;i<200&&(await state()).player.y<375;i+=1)await advance(10);
  await page.keyboard.press('KeyW');assert.ok((await state()).jumpBufferMs>0);await advance(180);current=await state();assert.ok(current.player.y<390&&current.player.jumps===1);
  await page.getByRole('button',{name:'일시정지'}).click();const frozen=await state();await advance(2000);assert.deepEqual((await state()).player,frozen.player);assert.equal((await state()).elapsedMs,frozen.elapsedMs);await page.getByRole('button',{name:'계속하기'}).click();
  report.checks.push('Space/ArrowUp/W, landing buffer, and pause freeze');

  await start(23);
  const seenStages=new Set(); const capturedStages=new Set(); let healed=false,heartCaptured=false;
  for(let i=0;i<30000;i+=1){
    current=await state(); if(current.phase!=='playing')throw new Error(`autoplay ended at ${current.distance}m`);
    seenStages.add(current.stageIndex);
    if(current.stageIndex>=1&&!capturedStages.has(current.stageIndex)) {
      capturedStages.add(current.stageIndex);await page.waitForTimeout(120);await advance(0);
      const path=`${out}/stage-${current.stageIndex+1}.png`;await page.screenshot({path});report.screenshots.push(path);
    }
    if(current.hearts.some(heart=>heart.x<590&&heart.x>210)&&!heartCaptured){heartCaptured=true;const path=`${out}/heart-corridor.png`;await page.screenshot({path});report.screenshots.push(path);}
    const obstacle=current.obstacles.filter(o=>!o.hit&&!o.passed).sort((a,b)=>a.x-b.x)[0];
    const down=obstacle?.kind==='slide'&&obstacle.x<330&&obstacle.x+obstacle.w>75;
    if(down)await page.keyboard.down('ArrowDown');else await page.keyboard.up('ArrowDown');
    if(obstacle&&obstacle.kind!=='slide'){
      const trigger=obstacle.kind==='double'?current.speed*1.28:current.speed*.8;
      if(current.player.jumps===0&&obstacle.x<trigger)await page.keyboard.press('Space');
      else if(obstacle.kind==='double'&&current.player.jumps===1&&obstacle.x<current.speed*.8)await page.keyboard.press('ArrowUp');
    }
    await advance(20); current=await state();
    if(current.heartsCollected>0&&current.lives===3)healed=true;
    if(current.distance>=6000)break;
  }
  await page.keyboard.up('ArrowDown'); current=await state();
  assert.ok(healed,'runner should collect a safe heart without exceeding max health');assert.ok(current.distance>=6000);assert.deepEqual([...seenStages],[0,1,2,3,4,5]);
  assert.deepEqual([...capturedStages],[1,2,3,4,5]);assert.equal(heartCaptured,true);
  await page.screenshot({path:`${out}/master-stage.png`});report.screenshots.push(`${out}/master-stage.png`);
  report.checks.push('safe heart recovery and all six 1000m stages');

  await start(29);for(let i=0;i<15000&&(await state()).phase==='playing';i+=1)await advance(25);
  current=await state();assert.equal(current.lives,0);assert.equal(current.phase,'ending');const endingDistance=current.distance;
  await page.getByRole('button',{name:'일시정지'}).click();const endingPlayer=(await state()).player;await advance(1000);assert.deepEqual((await state()).player,endingPlayer);assert.equal((await state()).distance,endingDistance);
  await page.getByRole('button',{name:'계속하기'}).click();await advance(2000);await page.locator('.result-number').waitFor();
  report.checks.push('third hit, paused ending freeze, landing result');
  assert.deepEqual(report.errors,[]); report.passed=true;
} finally {await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log('v16 jump browser passed');
