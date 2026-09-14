import test from 'node:test';
import assert from 'node:assert/strict';
import {recentServiceIds,sortByRecent,rememberActivity} from '../public/js/recent-activity.js';
const catalog=['sort','typing','tarot','guess'].map(id=>({id}));
test('recent services merge starts and recovered completed history without duplicates',()=>{
 const result=sortByRecent(catalog,[{content:'sort',at:3},{content:'typing',at:8},{content:'typing',at:4}],[{content:'tarot',at:10},{content:'sort',at:12}]);
 assert.deepEqual(result.map(item=>item.id),['sort','tarot','typing','guess']);
 assert.deepEqual(catalog.map(item=>item.id),['sort','typing','tarot','guess']);
});
test('new visitors and invalid history retain stable catalogue order',()=>{
 assert.deepEqual(sortByRecent(catalog,null,[null,{content:'missing',at:9},{content:'typing',at:'12'},{content:'tarot',at:NaN}]),catalog);
});
test('one successful start moves that service first without manufacturing a completed result',()=>{
 const history=[{content:'typing',at:5},{content:'tarot',at:10}];
 const next=rememberActivity(catalog,history,'typing',20);
 assert.deepEqual(next,[{content:'typing',at:20},{content:'tarot',at:10}]);
 assert.deepEqual(recentServiceIds(catalog,next),['typing','tarot']);
 assert.deepEqual(rememberActivity(catalog,next,'unknown',30),next);
});
