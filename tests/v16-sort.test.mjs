import test from 'node:test';
import assert from 'node:assert/strict';
import {createSortModel} from '../public/js/sort-game.js';

test('sort queue visually fills the front slot while logical choices remain instant',()=>{
 const model=createSortModel({random:()=>0});
 const second=model.state.queue[1].key;
 assert.equal(model.choose('left'),true);
 assert.equal(model.state.queue[0].key,second);
 assert.equal(model.visualIndex(model.state.queue[0]),1);
 assert.equal(model.choose('left'),true);
 assert.equal(model.state.score,2);
 assert.equal(model.state.queue[0].key,second+1);
 assert.ok(model.visualIndex(model.state.queue[0])>1.9);
 model.tick(model.state.shiftDurationMs);
 assert.equal(model.visualIndex(model.state.queue[0]),0);
});

test('sort fill duration adapts to response speed without changing v5 rules',()=>{
 const model=createSortModel({random:()=>0});
 model.choose('left');
 assert.equal(model.state.shiftDurationMs,172);
 model.tick(100);model.choose('left');
 assert.equal(model.state.shiftDurationMs,72);
 model.tick(800);model.choose('left');
 assert.equal(model.state.shiftDurationMs,220);
 assert.equal(model.result().mode,'sort-sprint-v5');
 model.tick(19100);
 assert.equal(model.state.phase,'ending');
 assert.equal(model.state.expression,'smile');
});

test('sort feedback animation never swallows rapid mistakes',()=>{
 const model=createSortModel({random:()=>0,mode:'endless'});
 assert.equal(model.choose('right'),false);
 assert.equal(model.choose('right'),false);
 assert.equal(model.choose('right'),false);
 assert.equal(model.state.mistakes,3);
 assert.equal(model.state.phase,'ending');
 assert.equal(model.state.expression,'cry');
});
