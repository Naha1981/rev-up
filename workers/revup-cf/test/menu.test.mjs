import { test } from 'node:test';
import assert from 'node:assert/strict';
import { menuBlock, publicMenuHtml, createOrder } from '../dist-test/menu.mjs';

test('menuBlock: exact names and rand prices, specials flagged, empty menu yields nothing', () => {
  const b = menuBlock([
    { name: 'Chicken kota', price: '45.50', is_special: true },
    { name: 'Beef burger', price: 60, is_special: false },
  ]);
  assert.match(b, /ONLY dishes and prices/i);
  assert.match(b, /- Chicken kota - R45\.50 \(on special\)/);
  assert.match(b, /- Beef burger - R60\.00/);
  assert.equal(menuBlock([]), '');
});

test('menuBlock: no vendor or AI language leaks into the prompt block', () => {
  const b = menuBlock([{ name: 'X', price: 1 }]);
  assert.ok(!/AI|Zernio|Groq|OpenRouter/.test(b));
});

test('publicMenuHtml: renders dishes, prices, specials banner and order form; escapes HTML', () => {
  const html = publicMenuHtml('QA <Grill> House', [
    { id: 'aaa', name: 'Kota', price: '45.50', description: 'Chips & cheese', is_special: true, is_available: true, category_name: 'Mains' },
    { id: 'bbb', name: 'Chips', price: '20.00', description: '', is_special: false, is_available: true, category_name: 'Sides' },
  ], 'ws-1', false, '');
  assert.match(html, /QA &lt;Grill&gt; House/);
  assert.match(html, /This week's specials/);
  assert.match(html, /Kota/);
  assert.match(html, /R45\.50/);
  assert.match(html, /action="\/m\/ws-1\/order"/);
  assert.match(html, /Mains/);
  assert.match(html, /Sides/);
});

test('publicMenuHtml: empty menu says it is being updated, no order form', () => {
  const html = publicMenuHtml('Empty Place', [], 'ws-1', false, '');
  assert.match(html, /being updated/);
  assert.ok(!/Place your order/.test(html));
});

test('publicMenuHtml: sent state shows confirmation instead of the form', () => {
  const html = publicMenuHtml('X', [{ id: 'a', name: 'Kota', price: '10.00', is_special: false, is_available: true, category_name: null }], 'ws-1', true, '');
  assert.match(html, /Order sent/);
  assert.ok(!/<button type="submit">Send order<\/button>/.test(html));
});

function stubDb(items, inserted) {
  return {
    async query(sql, params) {
      if (/FROM menus_item/i.test(sql)) return { rows: items };
      if (/INSERT INTO menus_order\(/i.test(sql)) { inserted.order = params; return { rows: [{ id: 'order-1' }] }; }
      if (/INSERT INTO menus_orderitem/i.test(sql)) { (inserted.items ||= []).push(params); return { rows: [] }; }
      throw new Error('unexpected query: ' + sql);
    },
  };
}

test('createOrder: rejects missing name/contact and empty basket', async () => {
  const ins = {};
  const db = stubDb([], ins);
  let r = await createOrder(db, 'ws-1', { name: '', contact: '072' }, '');
  assert.equal(r.ok, false);
  r = await createOrder(db, 'ws-1', { name: 'Sipho', contact: '0720000000' }, '');
  assert.equal(r.ok, false);
  assert.match(r.err, /at least one dish/);
});

test('createOrder: totals from server-side prices only, quantities clamped, items snapshotted', async () => {
  const ins = {};
  const items = [
    { id: 'aaa', name: 'Kota', price: '45.50', is_available: true, category_name: null },
    { id: 'bbb', name: 'Chips', price: '20.00', is_available: true, category_name: null },
    { id: 'ccc', name: 'Hidden', price: '99.00', is_available: false, category_name: null },
  ];
  const db = stubDb(items, ins);
  const r = await createOrder(db, 'ws-1', { name: 'Sipho', contact: '0720000000', item_aaa: '1', qty_aaa: '2', item_bbb: '1', qty_bbb: '500', item_ccc: '1', notes: 'no chilli' }, '');
  assert.equal(r.ok, true);
  // 2x45.50 + 20x20.00(clamped) = 491.00; hidden dish excluded
  assert.equal(r.totalCents, 49100);
  assert.equal(ins.items.length, 2);
  assert.deepEqual(ins.items.map((p) => p[5]).sort((a, b) => a - b), [2, 20]);
  assert.equal(ins.order[2], 'Sipho');
  assert.equal(ins.order[4], 'no chilli');
});
