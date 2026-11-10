import subprocess
from playwright.sync_api import sync_playwright
DB='postgres://sandbox@127.0.0.1:55432/brightbean_test'
def sql(q):return subprocess.check_output(['psql',DB,'-Atc',q],text=True).strip()
org=sql("SELECT o.id FROM organizations_organization o WHERE o.name='Mokoena Plumbing' LIMIT 1")
assert org
before=sql(f"SELECT plan||'|'||subscription_status FROM organizations_organization WHERE id='{org}'")
try:
 sql(f"UPDATE organizations_organization SET plan='starter',subscription_status='active' WHERE id='{org}'")
 with sync_playwright() as p:
  b=p.chromium.launch();c=b.new_context(storage_state='/tmp/revup-fictional-state.json');a=c.new_page();a.goto('http://127.0.0.1:8765/onboarding')
  response=c.request.post('http://127.0.0.1:8765/onboarding',form={'business_name':'Mokoena Plumbing','industry':'plumber','plan':'business-pro','goal_leads':'on','timezone':'Africa/Johannesburg'},max_redirects=0)
  assert response.status in (302,303),response.status
  assert sql(f"SELECT plan||'|'||subscription_status FROM organizations_organization WHERE id='{org}'")=='starter|active'
  print('PASS actual authenticated Worker POST paid Starter cannot select Business Pro for free')
  b.close()
finally:
 plan,status=before.split('|');sql(f"UPDATE organizations_organization SET plan='{plan}',subscription_status='{status}' WHERE id='{org}'")
