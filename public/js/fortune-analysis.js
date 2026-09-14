export function createFortuneAnalysis({calculate,wait,isActive,onReady=()=>{},onError=()=>{}}){
 let result=null,taken=false,cancelled=false;
 const analysis={
  state:'idle',
  error:null,
  async run(){
   cancelled=false;taken=false;result=null;analysis.error=null;analysis.state='working';
   try{
    const calculated=await calculate();
    await wait();
    if(cancelled||!isActive()){analysis.state='cancelled';return null;}
    result=calculated;analysis.state='ready';onReady(calculated);return calculated;
   }catch(error){
    if(cancelled||!isActive()){analysis.state='cancelled';return null;}
    analysis.error=error instanceof Error?error:Error(String(error));analysis.state='failed';onError(analysis.error);return null;
   }
  },
  retry(){return analysis.run();},
  cancel(){cancelled=true;result=null;analysis.state='cancelled';},
  take(){if(analysis.state!=='ready'||taken||!result)return null;taken=true;return result;}
 };
 return analysis;
}
