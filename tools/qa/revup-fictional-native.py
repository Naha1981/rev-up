import json
from pathlib import Path

from playwright.sync_api import sync_playwright

checks = []


def ok(name):
    checks.append(name)
    print("PASS", name)


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    c = b.new_context(storage_state="/tmp/revup-fictional-state.json", viewport={"width": 390, "height": 844})
    page = c.new_page()
    base = "http://127.0.0.1:8765"

    def go(path):
        page.goto(base + path, wait_until="networkidle")

    def click(name):
        page.get_by_role("button", name=name, exact=True).click()
        page.wait_for_load_state("networkidle")
        assert "Error\n" not in page.locator("body").inner_text()

    go("/onboarding")
    assert all(
        page.locator("input[name=goal_" + k + "]").is_checked() for k in ["receptionist", "reviews", "social", "leads"]
    )
    assert page.locator("input[name=plan][value=business-pro]").is_checked()
    ok("Onboarding goals and chosen plan persist after refresh")
    go("/waitlist")
    for k, v in {
        "name": "Fictional Party",
        "wa_id": "00000000001",
        "party_size": "3",
        "wanted_time": "Tomorrow 12:30",
    }.items():
        page.locator("[name=" + k + "]").fill(v)
    click("Add to the waitlist")
    assert "Fictional Party" in page.locator("body").inner_text()
    ok("Waitlist native create")
    print("WAITLIST", page.locator("body").inner_text()[-1000:])
    print("BUTTONS", page.locator("button").all_text_contents())
    for name in ["Offer a table", "Mark accepted", "Remove"]:
        if page.get_by_role("button", name=name, exact=True).count() == 1:
            click(name)
            ok("Waitlist " + name)
    go("/quotes")
    for k, v in {
        "customer_name": "Fictional Quote",
        "title": "Fictional catering",
        "amount": "150",
        "follow_up_on": "2026-11-11",
    }.items():
        page.locator("[name=" + k + "]").fill(v)
    click("Save quote")
    assert "Fictional catering" in page.locator("body").inner_text()
    ok("Quote created, unlinked so no send")
    print("QUOTE BUTTONS", page.locator("button").all_text_contents())
    go("/campaigns")
    page.locator("[name=name]").fill("Fictional Draft Only")
    page.locator("[name=body_a]").fill("Fictional QA text. No recipient and no send.")
    click("Save draft")
    assert "Fictional Draft Only" in page.locator("body").inner_text()
    ok("Campaign saved as draft without approving send")
    click("Cancel")
    assert "cancelled" in page.locator("body").inner_text()
    ok("Campaign draft cancellation")
    go("/support")
    page.locator("[name=question]").fill("How many bookings do we have today?")
    click("Ask")
    print("SUPPORT RESULT", page.locator("body").inner_text())
    assert "0 bookings in the last 7 days" in page.locator("body").inner_text()
    ok("Support grounds a real zero count without external AI")
    page.locator("[name=question]").fill("Tell me a fictional unsupported statistic")
    click("Ask")
    assert "flagged for a human" in page.locator("body").inner_text()
    ok("Unsupported support question routes to human")
    go("/menu")
    page.locator('form[action="/menu/categories"] input[name=name]').fill("Fictional Mains")
    click("Add section")
    ok("Menu section creation")
    for k, v in {
        "name": "Fictional Test Meal",
        "description": "Synthetic only",
        "price": "49",
        "food_cost": "15",
    }.items():
        page.locator('form[action="/menu/items"] [name=' + k + "]").fill(v)
    click("Add dish")
    assert "Fictional Test Meal" in page.locator("body").inner_text()
    ok("Menu item creation")
    click("Hide")
    assert "hidden" in page.locator("body").inner_text()
    ok("Menu item hidden")
    click("Show")
    ok("Menu item restored")
    Path("/downloads/revup-stranger-preview/fictional-native-results.json").write_text(
        json.dumps({"checks": checks, "passed": len(checks)}, indent=2)
    )
    b.close()
