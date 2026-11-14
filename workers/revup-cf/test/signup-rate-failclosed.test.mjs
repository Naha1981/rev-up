import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8');const start=source.indexOf('    if (path === "/signup")');const block=source.slice(start,source.indexOf('      const f = await formData(req);',start));
test('signup only accepts GET/POST before any abuse-gate or account mutation',()=>{assert.match(block,/req.method !== "POST".*status:405/);assert.ok(block.indexOf('status:405')<block.indexOf('const rl = pool'));});
test('signup fails closed when abuse-gate lookup fails and always closes pool',()=>{assert.match(block,/catch \{[\s\S]*?return html\(signupPage\([\s\S]*?503\)/);assert.match(block,/finally \{ await rl.end/);});
