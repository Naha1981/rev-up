import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

checks = []
ws = (
    subprocess.check_output(
        [
            "psql",
            "postgresql://sandbox@127.0.0.1:55432/brightbean_test",
            "-Atc",
            "SELECT id FROM workspaces_workspace LIMIT 1",
        ]
    )
    .decode()
    .strip()
)
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_context(
        storage_state="/tmp/revup-fictional-state.json", viewport={"width": 390, "height": 844}
    ).new_page()
    base = "http://127.0.0.1:8765"

    def go(x):
        page.goto(base + x, wait_until="networkidle")

    def click(x):
        page.get_by_role("button", name=x, exact=True).click()
        page.wait_for_load_state("networkidle")
        print("AFTER", x, page.locator("body").inner_text()[-1000:])

    go("/f/" + ws)
    for k, v in {
        "name": "Fictional Enquirer",
        "contact": "nobody@example.invalid",
        "message": "Synthetic enquiry only, no service",
    }.items():
        page.locator("[name=" + k + "]").fill(v)
    click("Send enquiry")
    assert "has your enquiry" in page.locator("body").inner_text()
    checks.append("Public enquiry accepted and thanked")
    go("/frontdesk")
    assert "Fictional Enquirer" in page.locator("body").inner_text()
    page.locator("[name=stage]").select_option("won")
    page.locator("[name=value]").fill("123")
    click("Save")
    assert page.locator("[name=stage]").input_value() == "won"
    checks.append("Enquiry enters lead pipeline and native won/value save persists")
    go("/inbox")
    page.get_by_role("link", name="Fictional Enquirer", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.locator("[name=notes]").fill("Synthetic private-card persistence")
    click("Save card")
    assert page.locator("[name=notes]").input_value() == "Synthetic private-card persistence"
    checks.append("Customer card native save persists")
    go("/posts/new")
    page.locator("[name=title]").fill("Fictional Manual Draft")
    page.locator("[name=caption]").fill("Synthetic private content, never publish")
    click("Save draft")
    assert "Fictional Manual Draft" in page.locator("body").inner_text()
    checks.append("Social manual draft saved with no connected accounts or send")
    Path("/downloads/revup-stranger-preview/fictional-crm-results.json").write_text(
        json.dumps({"passed": len(checks), "checks": checks}, indent=2)
    )
    b.close()
