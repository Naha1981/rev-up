import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postsPage} from '../dist-test/index.mjs';
const render=rows=>postsPage({query:async()=>({rows})},{name:'Fictional'},{workspace_id:'fictional'});
const post={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Fictional saved draft',caption:'Synthetic QA content',created_at:'2026-11-11T00:00:00Z',statuses:null,channels:null};
test('post without channel children is visibly draft but cannot be submitted',async()=>{const h=await render([post]);assert.ok(h.includes('>draft</span>'));assert.ok(h.includes('No channel selected'));assert.ok(!h.includes('Submit for review'));});
test('draft linked channels keep real submit form and mixed statuses stay honest',async()=>{const linked=await render([{...post,statuses:'draft',channels:'Facebook'}]);assert.ok(linked.includes('Submit for review'));const mixed=await render([{...post,statuses:'published, failed',channels:'Facebook, Instagram'}]);assert.ok(mixed.includes('>published</span>'));assert.ok(mixed.includes('>failed</span>'));assert.ok(!mixed.includes('Submit for review'));});
test('posts stack as labelled readable content at phone widths without changing desktop headings',async()=>{const h=await render([post]);for(const label of ['Post','Status','Channels','When','Action'])assert.ok(h.includes('data-label="'+label+'"'));assert.ok(h.includes('@media(max-width:640px)'));assert.ok(h.includes('grid-template-columns:88px minmax(0,1fr)'));assert.ok(h.includes('<thead>'));assert.ok(h.includes('scope="col"'));});
