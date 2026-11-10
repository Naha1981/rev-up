from playwright.sync_api import sync_playwright
from pathlib import Path
import json
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c=b.new_context(storage_state='/tmp/revup-fictional-state.json',viewport={'width':390,'height':844});page=c.new_page();base='http://127.0.0.1:8765'
 def go(x):page.goto(base+x,wait_until='networkidle')
 def click(x):page.get_by_role('button',name=x,exact=True).click();page.wait_for_load_state('networkidle');print('AFTER',x,page.locator('body').inner_text()[-900:])
 go('/menu');href=page.locator('a[href^="/m/"]').first.get_attribute('href');go(href);page.locator('input[type=checkbox]').first.check();page.locator('[name=name]').fill('Fictional Order Guest');page.locator('[name=contact]').fill('00000000002');click('Send order');assert 'Order sent' in page.locator('body').inner_text();checks.append('Public fictional menu order sent')
 go('/orders');assert 'Fictional Order Guest' in page.locator('body').inner_text();checks.append('Order persisted in owner board')
 for name,status in [('Confirm','confirmed'),('Mark ready','ready'),('Handed over','done')]:
  click(name);assert status in page.locator('body').inner_text();checks.append('Order '+status)
 page.screenshot(path='/downloads/revup-stranger-preview/fictional-order-complete.png',full_page=True)
 go('/quotes');click('Mark sent');click('Won');assert 'won' in page.locator('body').inner_text();checks.append('Unlinked quote marked sent then won, no message')
 Path('/downloads/revup-stranger-preview/fictional-order-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2));b.close()
