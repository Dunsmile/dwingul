import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createApp} from '../server.mjs';

const app=createApp({dbPath:':memory:'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${app.server.address().port}`,out='output/v17/typing';
await mkdir(out,{recursive:true});
const report={views:[],errors:[]};
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const advance=(p,ms)=>p.evaluate(ms=>window.advanceTime(ms),ms);
try {
  for(const [engineName,engine] of Object.entries({chromium,webkit})) {
    const browser=await engine.launch();
    try {
      for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]) {
        const p=await browser.newPage({viewport}); p.on('pageerror',e=>report.errors.push(e.message));
        const sentenceMode=viewport.width===390?'long':'short';
        await p.goto(`${base}/?qa=v17stats#/play/typing?sentenceMode=${sentenceMode}`);
        await p.waitForFunction(()=>typeof window.render_game_to_text==='function' && JSON.parse(window.render_game_to_text()).id==='typing');
        await advance(p,0);
        const initial=await state(p),input=p.locator('.typing-rpg__input');
        assert.equal(initial.typingStats.accuracy,null);
        await input.fill('오타'); assert.equal((await state(p)).hp,100);
        await input.fill(initial.target); await advance(p,2000); await input.press('Enter');
        const correct=await state(p); assert.equal(correct.hp,100);assert.equal(correct.typingStats.accuracy,100);
        await input.fill('틀린 문장'); assert.equal((await state(p)).typingStats.accuracy,100);
        await input.press('Enter'); const wrong=await state(p); assert.ok(wrong.typingStats.accuracy<100);
        await input.press('Enter');assert.equal((await state(p)).typingStats.submissions,wrong.typingStats.submissions);
        await p.getByRole('button',{name:'일시정지',exact:true}).click();
        const paused=await state(p);await advance(p,30000);assert.equal((await state(p)).elapsedMs,paused.elapsedMs);
        await p.getByRole('button',{name:'계속하기',exact:true}).click();
        await advance(p,250000);
        await p.waitForURL(/#\/result$/);await p.locator('.typing-result-stats').waitFor();
        assert.equal(await p.getByText('평균 타자 속도',{exact:true}).count(),1);
        assert.equal(await p.getByText('모험 저장 다시 시도',{exact:true}).count(),0);
        assert.ok((await p.locator('.typing-result-stats').innerText()).includes(`${wrong.typingStats.accuracy}%`));
        const box=await p.locator('.typing-result-stats').boundingBox();
        const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
        assert.ok(overflow<=1);assert.ok(box.width<=viewport.width);
        await p.screenshot({path:`${out}/${engineName}-${viewport.width}-result.png`,fullPage:true});
        await p.locator('.typing-result-method summary').click();
        assert.ok(await p.getByText(/‘한’은 3타/).isVisible());
        assert.ok((await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);
        report.views.push({engineName,viewport,sentenceMode,accuracy:wrong.typingStats.accuracy,box});
        await p.close();
      }
    } finally {await browser.close();}
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
} catch(error) {report.failure=String(error);throw error;}
finally {await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await app.close();}
console.log('Typing v17: 6 Chromium/WebKit result/IME/pause checks passed');
