export function createSortModel({random=Math.random,mode='sprint'}={}){
 const state={mode,phase:'playing',elapsedMs:0,remainingMs:mode==='endless'?null:20000,score:0,mistakes:0,streak:0,fever:0,feverMs:0,fevers:0,lastCorrect:null,lastInput:0,endingMs:0,endReason:'',expression:'normal',queue:[],serial:0,flashMs:0,lastExit:null};
 const fill=()=>{while(state.queue.length<7)state.queue.push({key:++state.serial,side:random()<.5?'left':'right'});};fill();
 const deadline=()=>Math.max(450,1200-state.elapsedMs*.005);
 function end(reason){if(state.phase!=='playing')return;state.phase='ending';state.endReason=reason;state.expression=reason==='time'?'smile':'cry';state.feverMs=0;}
 function mistake(){state.mistakes++;state.fever=0;state.streak=0;state.lastCorrect=null;state.lastInput=state.elapsedMs;state.flashMs=160;if(state.mistakes>=3)end('mistakes');}
 function choose(side){if(state.phase!=='playing'||state.flashMs>0)return false;state.lastInput=state.elapsedMs;
  if(state.feverMs>0||state.queue[0].side===side){state.lastExit={...state.queue.shift(),side,at:state.elapsedMs};state.score++;state.streak++;fill();
   if(state.feverMs<=0){state.fever=state.lastCorrect===null||state.elapsedMs-state.lastCorrect<=1200+1e-7?state.fever+5:5;if(state.fever>=100){state.fever=100;state.feverMs=5000;state.fevers++;}}
   state.lastCorrect=state.elapsedMs;return true;
  }mistake();return false;
 }
 function tick(ms){if(state.phase==='finished')return;if(state.phase==='ending'){state.endingMs+=ms;if(state.endingMs>=900)state.phase='finished';return;}
  const dt=mode==='sprint'?Math.min(ms,20000-state.elapsedMs):ms;state.elapsedMs+=dt;state.remainingMs=mode==='sprint'?Math.max(0,20000-state.elapsedMs):null;state.flashMs=Math.max(0,state.flashMs-dt);
  if(state.feverMs>0){state.feverMs=Math.max(0,state.feverMs-dt);if(!state.feverMs){state.fever=0;state.streak=0;state.lastCorrect=null;}}
  else if(state.lastCorrect!==null&&state.elapsedMs-state.lastCorrect>1200+1e-7){state.fever=0;state.streak=0;state.lastCorrect=null;}
  if(mode==='sprint'&&state.elapsedMs>=20000)end('time');else if(mode==='endless'&&state.elapsedMs-state.lastInput>=deadline())mistake();
 }
 return{state,choose,tick,deadline,result:()=>({value:state.score,display:String(state.score),unit:'명',higherBetter:true,mode:`sort-${mode}-v5`,details:{correct:state.score,mistakes:state.mistakes,fevers:state.fevers,elapsedMs:state.elapsedMs,reason:state.endReason}})};
}
export function createSortGame(ctx){
 const model=createSortModel({random:ctx.random,mode:ctx.settings.mode}),s=model.state,canvas=document.createElement('canvas');canvas.width=900;canvas.height=500;canvas.className='dg-game__canvas';canvas.setAttribute('aria-label','앞에 멈춰 있는 캐릭터를 파랑은 왼쪽, 하양은 오른쪽으로 보내세요. 피버는 어느 쪽이든 가능해요.');const g=canvas.getContext('2d');
 const fever=document.createElement('div');fever.className='sort-fever';fever.innerHTML='<span>FEVER</span><progress max="100" value="0"></progress><b>0 / 100</b>';
 const controls=document.createElement('div');controls.className='dg-game__split-controls';controls.innerHTML='<button type="button" class="dg-game__control dg-game__control--blue">← 파랑</button><button type="button" class="dg-game__control dg-game__control--white">하양 →</button>';
 ctx.stage.append(fever,canvas,controls);let reported=false;
 const choose=side=>{model.choose(side);draw();};for(const [i,b]of [...controls.children].entries()){ctx.listen(b,'pointerdown',e=>{e.preventDefault();choose(i?'right':'left');});ctx.listen(b,'click',e=>{if(!e.detail)choose(i?'right':'left');});}
 ctx.listen(document,'keydown',e=>{if(e.repeat||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();choose(e.key==='ArrowLeft'?'left':'right');}});
 function character(item,x,y,size,face='normal',purple=false){g.fillStyle=purple?'#9a6bdb':item.side==='left'?'#3e86d7':'#fffdf1';g.strokeStyle=purple?'#593991':item.side==='left'?'#205990':'#718574';g.lineWidth=3;g.beginPath();g.roundRect(x-size/2,y-size,size,size,Math.max(9,size*.22));g.fill();g.stroke();const ink=purple||item.side==='left'?'#fff':'#294233';g.strokeStyle=ink;g.fillStyle=ink;g.lineWidth=Math.max(2,size*.028);
  for(const sign of [-1,1]){const ex=x+sign*size*.17,ey=y-size*.57;if(face==='cry'){g.beginPath();g.moveTo(ex-size*.075,ey);g.lineTo(ex+size*.075,ey);g.moveTo(ex-size*.04,ey);g.lineTo(ex-size*.04,ey+size*.22);g.moveTo(ex+size*.04,ey);g.lineTo(ex+size*.04,ey+size*.22);g.stroke();}else if(face==='smile'){g.beginPath();g.moveTo(ex-size*.07,ey+size*.05);g.lineTo(ex,ey-size*.03);g.lineTo(ex+size*.07,ey+size*.05);g.stroke();}else{g.beginPath();g.ellipse(ex,ey,size*.035,size*.048,0,0,Math.PI*2);g.fill();}}
  g.beginPath();g.arc(x,y-size*.37,size*.105,0,Math.PI);g.stroke();
 }
 function draw(){const H=canvas.height,W=canvas.width,C=W/2,purple=s.feverMs>0;g.fillStyle=purple?'#ebe2fa':'#e8efe4';g.fillRect(0,0,W,H);g.fillStyle=purple?'#d7c3ee':'#d2e1cf';g.beginPath();g.moveTo(W*.433,50);g.lineTo(W*.567,50);g.lineTo(W*.867,H);g.lineTo(W*.133,H);g.closePath();g.fill();g.strokeStyle='#afc2ac';g.lineWidth=2;for(let n=0;n<5;n++){const y=H*.23+n*n*H*.028;g.beginPath();g.moveTo(C-(y/H)*W*.367,y);g.lineTo(C+(y/H)*W*.367,y);g.stroke();}
  for(let i=s.queue.length-1;i>=0;i--){const scale=Math.pow(.71,i),size=185*scale,y=H*.91-(1-scale)*H*.78;character(s.queue[i],C,y,size,i===0?s.expression:'normal',purple);}
  if(s.lastExit&&s.phase==='playing'){const age=s.elapsedMs-s.lastExit.at;if(age<150){g.globalAlpha=1-age/150;character(s.lastExit,C+(s.lastExit.side==='left'?-1:1)*(110+age*2.2),H*.91,120,'smile',purple);g.globalAlpha=1;}}
  g.font='bold 26px sans-serif';g.textAlign='center';g.fillStyle=purple?'#684298':'#456343';g.fillText(s.phase!=='playing'?(s.endReason==='time'?'시간 끝! 잘했어요 ^^':'잠깐 쉬어가요 ㅠㅠ'):purple?'피버! 어느 쪽이든 OK':s.streak>1?`${s.streak} 연속!`:'1.2초 안에 이어 보내면 피버 +5',C,36);
  if(s.flashMs>0){g.fillStyle='#c34c4420';g.fillRect(0,0,W,H);}fever.classList.toggle('is-fever',purple);fever.querySelector('progress').value=purple?s.feverMs/50:s.fever;fever.querySelector('b').textContent=purple?`${(s.feverMs/1000).toFixed(1)}초`:s.fever+' / 100';
  ctx.setStatus(`${s.mode==='sprint'?((s.remainingMs||0)/1000).toFixed(1)+'초':'무한 '+(s.elapsedMs/1000).toFixed(1)+'초'} · ${s.score}명 · 실수 ${s.mistakes}/3`);
  for(const b of controls.children)b.disabled=s.phase!=='playing';
 }
 const resize=()=>{canvas.width=window.innerWidth<=560?500:900;canvas.height=window.innerWidth<=560?520:440;draw();};ctx.listen(window,'resize',resize);resize();
 return{tick(ms){model.tick(ms);draw();if(s.phase==='finished'&&!reported){reported=true;ctx.finish(model.result());}},getState:()=>({...s,deadlineMs:model.deadline(),queue:s.queue.map((q,i)=>({...q,progress:1,x:canvas.width/2,y:canvas.height*.91-(1-Math.pow(.71,i))*canvas.height*.78})),projection:'stationary-2.5D'}),destroy(){}};
}
