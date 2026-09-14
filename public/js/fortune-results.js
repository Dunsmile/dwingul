const FORTUNE_CONTENTS=new Set(['daily','tarot','character','chemistry']);
export const isFortuneContent=id=>FORTUNE_CONTENTS.has(id);

export function fortuneResultModel(result={}){
 const sections=Array.isArray(result.sections)?result.sections.filter(section=>Array.isArray(section)&&section.length>=2).map(([heading,body])=>({heading:String(heading||''),body:String(body||'')})):[];
 const date=String(result.subtitle||'').match(/\d{4}-\d{2}-\d{2}/)?.[0]||'';
 return {
  content:String(result.content||''),
  name:String(result.name||result.birth?.name||'나'),
  title:String(result.title||result.display||'나의 이야기'),
  subtitle:String(result.subtitle||''),
  date,
  element:String(result.element||result.birth?.element||''),
  takeaway:sections[0]?.body||'오늘의 마음을 천천히 살펴보세요.',
  sections
 };
}
