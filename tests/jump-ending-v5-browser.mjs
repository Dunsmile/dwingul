import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1000,height:850}});
try{await p.goto('http://localhost:4174/#/play/jump?seed=21');await p.locator('.dg-game').waitFor();await p.evaluate(()=>window.advanceTime(0));
 const atImpact=await p.evaluate(()=>{for(let i=0;i<20000;i++){const s=JSON.parse(window.render_game_to_text());if(s.phase==='ending')return s;if(s.lives===1&&s.obstacles.some(o=>!o.hit&&!o.passed&&o.x<160&&o.x>158))document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',code:'ArrowUp',bubbles:true}));window.advanceTime(2);}return JSON.parse(window.render_game_to_text());});
 assert.equal(atImpact.phase,'ending');assert.ok(atImpact.player.y<390,'collision must happen airborne');await p.screenshot({path:'output/game-v5/jump-ending-air.png'});const distance=atImpact.distance;
 await p.evaluate(()=>window.advanceTime(400));const falling=await p.evaluate(()=>JSON.parse(window.render_game_to_text()));assert.equal(falling.distance,distance);await p.evaluate(()=>window.advanceTime(450));await p.screenshot({path:'output/game-v5/jump-ending-landed.png'});await p.evaluate(()=>window.advanceTime(1400));await p.locator('.result-number').waitFor();console.log('AIRBORNE_LANDING_ENDING_PASSED',atImpact.player.y,distance);
}finally{await b.close();}
