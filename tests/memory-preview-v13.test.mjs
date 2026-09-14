import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('disabled memory preview tiles stay fully opaque and unfiltered',async()=>{
 const css=await readFile(new URL('../public/css/play-tuning-v13.css',import.meta.url),'utf8');
 assert.match(css,/\.dg-game--memory \.dg-game__memory-cell:disabled\s*\{[^}]*opacity:\s*1[^}]*filter:\s*none/s);
});
