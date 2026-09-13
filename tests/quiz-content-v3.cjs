const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const {getQuestions}=await import('../public/js/quizzes.js');const b=await chromium.launch();try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const check=(v,m)=>{if(!v)throw Error(m)};fs.mkdirSync('output/game-v3',{recursive:true});
  for(const [id,topic]of [['guess','drama'],['guess','anime'],['guess','game'],['iq','mixed']]){
    const previous=[];
    for(const seed of [42,43]){
      await p.goto(`http://localhost:4174/#/play/${id}?seed=${seed}&topic=${topic}`);await p.locator('.question').waitFor();
      const expected=getQuestions(id,topic,seed),prompts=[];
      for(let i=0;i<expected.length;i++){
        const prompt=await p.locator('.question').innerText();prompts.push(prompt);check(prompt===expected[i].prompt,'client uses new seeded question '+id);
        if(i===0&&seed===42)await p.screenshot({path:`output/game-v3/${id}-${topic}-question.png`});
        await p.locator('[data-act=answer]').nth(expected[i].answer).click();check((await p.locator('#feedback').innerText()).includes('맞혔어요!'),'correct answer feedback');await p.locator('[data-act=next]').click();
      }
      await p.locator('.result-number').waitFor();const r=await p.evaluate(()=>JSON.parse(localStorage.getItem('dw:history'))[0]);
      check(r.value===expected.length&&r.questionVersion==='pool-100-v3','result uses new bank');check(new Set(prompts).size===expected.length,'round has no duplicate prompts');
      if(previous.length)check(prompts.some(x=>!previous.includes(x)),'different rounds vary');previous.push(...prompts);
    }
  }
  // A real result share carries the bank version into another browser's same challenge.
  const responsePromise=p.waitForResponse(r=>r.url().endsWith('/api/shares')&&r.request().method()==='POST');
  await p.locator('[data-act=share]').click();const response=await responsePromise;check(response.ok(),'share created');const {id:shareId}=await response.json();
  const friend=await b.newPage({viewport:{width:1280,height:720}});await friend.goto(`http://localhost:4174/#/s/${shareId}`);await friend.locator('a.button.primary').click();await friend.locator('.question').waitFor();
  check(await friend.locator('.question').innerText()===getQuestions('iq','mixed',43)[0].prompt,'shared challenge same questions');
  await friend.screenshot({path:'output/game-v3/iq-friend-question.png'});
  check(!errors.length,JSON.stringify(errors));fs.writeFileSync('tests/quiz-content-v3-report.json',JSON.stringify({passed:true,rounds:8,questions:100,shareVersion:true,errors},null,2));console.log('QUIZ_CONTENT_V3_PASSED');
}finally{await b.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
