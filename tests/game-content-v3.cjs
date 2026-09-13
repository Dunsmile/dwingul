const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const browser=await chromium.launch();try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('output/game-v3',{recursive:true});
  const check=(v,m)=>{if(!v)throw Error(m)},state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const advance=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
  const last=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dw:history'))[0]);
  async function start(id,seed=42){await page.goto(`http://localhost:4174/#/play/${id}?seed=${seed}`);await page.locator('.dg-game').waitFor();await advance(0);}
  await start('sort');let s=await state();check(s.queue.every(q=>q.x===450),'single column');
  const next=s.queue[1];await page.keyboard.press(s.queue[0].side==='left'?'ArrowLeft':'ArrowRight');
  s=await state();check(s.queue[0].key===next.key&&s.queue[0].y===next.y,'no snapping after hit');
  for(let i=0;i<10;i++){await advance(200);s=await state();check(s.queue.every(q=>q.x===450),'spawn in single column');for(let n=1;n<s.queue.length;n++)check(s.queue[n-1].y-s.queue[n].y>=115,'non-overlapping faces');}
  await page.screenshot({path:'output/game-v3/sort-active.png'});const beforeResize=(await state()).queue;await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').height===680);check((await state()).queue.every((q,i)=>Math.abs(q.y-beforeResize[i].y)<.001),'resize preserves spacing');await page.setViewportSize({width:1280,height:720});
  await start('sequence');const pads=page.locator('.dg-game__sequence-pad');
  const colors=()=>pads.evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));
  const rest=await colors();check(new Set(rest).size===1,'neutral resting pads');
  await advance(450);s=await state();const lit=await colors();check(lit[s.lit]!==rest[0],'lit pad has color');check(lit.filter(c=>c!==rest[0]).length===1,'only lit pad colored');
  await page.screenshot({path:'output/game-v3/sequence-lit.png'});await advance(1000);check(new Set(await colors()).size===1,'all return neutral');
  await pads.nth((await state()).sequence[0]).click();check((await colors()).filter(c=>c!==rest[0]).length===1,'input feedback color');await advance(141);check(new Set(await colors()).size===1,'input color clears');
  await start('typing');const phrases=[];
  while(phrases.length<100){s=await state();if(!s.blocks?.length){await advance(1300);continue;}
    const text=s.blocks[0].text;check(!phrases.includes(text),'typing repeats');phrases.push(text);
    await page.locator('.dg-game__typing-input').fill(text);await page.locator('.dg-game__typing-input').press('Enter');
  }
  await page.locator('.result-number').waitFor();const result=await last();check(result.value===100&&result.details.completed,'100 phrases completes');check(result.mode==='phrases-100-v3','typing mode');
  await page.screenshot({path:'output/game-v3/typing-complete.png'});
  await start('jump');s=await state();const originalY=s.player.y;
  await page.keyboard.press('Space');await advance(180);s=await state();check(s.player.y<originalY&&s.player.jumps===1,'jump');
  await page.keyboard.press('Space');await advance(120);check((await state()).player.jumps===2,'double jump');
  await page.keyboard.press('Space');check((await state()).player.jumps===2,'no third jump');await advance(1200);
  await page.keyboard.down('ArrowDown');check((await state()).player.duck,'keyboard crouch');
  await page.locator('.dg-game__pause').click();await page.keyboard.up('ArrowDown');s=await state();await advance(1000);check((await state()).elapsedMs===s.elapsedMs,'jump pause');
  await page.locator('.dg-game__pause').click();check(!(await state()).player.duck,'held crouch cleared on pause');
  // Steer using the visible obstacle geometry, then deliberately stop to reach game over.
  let ducking=false;
  for(let n=0;n<700;n++){
    s=await state();check(s.player,'runner ended before successful dodges');
    const o=s.obstacles.find(o=>!o.passed&&!o.hit&&o.x+o.w>=108);
    const needDuck=o?.type==='cloud'&&o.x<250&&o.x+o.w>100;
    if(needDuck&&!ducking){await page.keyboard.down('ArrowDown');ducking=true;}
    else if(!needDuck&&ducking){await page.keyboard.up('ArrowDown');ducking=false;}
    if(o?.type==='ground'&&o.x<210&&o.x>150&&s.player.jumps===0)await page.keyboard.press('Space');
    await advance(40);s=await state();if(s.score>=6)break;
  }
  check((await state()).score>=6,'both obstacle types playable');await page.screenshot({path:'output/game-v3/jump-active.png'});
  if(ducking)await page.keyboard.up('ArrowDown');await advance(20000);await page.locator('.result-number').waitFor();check((await last()).mode==='jump-v1','jump result');
  await page.locator('a.button.primary').first().click();await page.locator('[data-act=start]').click();await page.locator('.dg-game').waitFor();await advance(0);check((await state()).lives===2&&(await state()).score===0,'fresh restart');
  const layouts=[];for(const [width,height]of [[320,568],[390,844],[1280,720]]){
    await page.setViewportSize({width,height});
    for(const id of ['sort','sequence','typing','jump']){
      await start(id);if(id==='sort')await advance(1000);
      const box=await page.locator('.dg-game').evaluate(e=>({bottom:e.getBoundingClientRect().bottom,width:e.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth}));
      check(!box.overflow,'horizontal overflow '+id);check(box.bottom<=height+1,'controls fit '+JSON.stringify({id,width,height,...box}));
      layouts.push({id,width,height,...box});await page.screenshot({path:`output/game-v3/${id}-${width}.png`});
    }
  }
  check(!errors.length,JSON.stringify(errors));fs.writeFileSync('tests/game-content-v3-report.json',JSON.stringify({passed:true,typingPhrases:phrases.length,singleLine:true,neutralPads:true,doubleJump:true,layouts,errors},null,2));console.log('GAME_CONTENT_V3_PASSED');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
