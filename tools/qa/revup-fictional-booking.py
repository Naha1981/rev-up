from playwright.sync_api import sync_playwright
from pathlib import Path
import json
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_context(storage_state='/tmp/revup-fictional-state.json',viewport={'width':390,'height':844}).new_page();base='http://127.0.0.1:8765'
 def go(x):page.goto(base+x,wait_until='networkidle')
 def click(x):page.get_by_role('button',name=x,exact=True).click();page.wait_for_load_state('networkidle');print('AFTER',x,page.locator('body').inner_text()[-1000:])
 go('/bookings');page.locator('input[name=when]').fill('2026-11-11T14:00');click('Confirm');assert 'Booking confirmed.' in page.locator('body').inner_text();checks.append('Booking confirmed natively in empty disconnected test calendar')
 page.locator('input[name=when]').fill('2026-11-11T14:30');click('Move booking');assert '14:30' in page.locator('body').inner_text();checks.append('Booking moved natively and time persists')
 go('/loyalty');page.locator('[name=points_for_voucher]').fill('30');click('Save rules')
 go('/bookings');click('Mark done');assert 'done' in page.locator('body').inner_text();checks.append('Booking completed natively')
 go('/loyalty');print('LOYALTY',page.locator('body').inner_text());assert '35 pts' in page.locator('body').inner_text();checks.append('Loyalty welcome25 plus earned10 persisted')
 print('BUTTONS',page.locator('button').all_text_contents())
 page.get_by_role('button',name='Issue R50 voucher',exact=True).click();page.wait_for_load_state('networkidle');assert 'issued' in page.locator('body').inner_text();checks.append('Fictional reward voucher issued')
 click('Redeem');assert 'redeemed' in page.locator('body').inner_text();checks.append('Fictional reward voucher redeemed once');page.screenshot(path='/downloads/revup-stranger-preview/fictional-loyalty.png',full_page=True)
 Path('/downloads/revup-stranger-preview/fictional-booking-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2));b.close()
