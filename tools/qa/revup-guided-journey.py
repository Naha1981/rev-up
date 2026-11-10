import json
import secrets
from pathlib import Path

from playwright.sync_api import sync_playwright

checks = []


def check(name, condition):
    assert condition, name
    checks.append(name)
    print("PASS", name)


with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(
        storage_state="/tmp/revup-fictional-state.json", viewport={"width": 390, "height": 844}, reduced_motion="reduce"
    )
    a = c.new_page()
    for path in ["/", "/setup", "/customers", "/work", "/growth", "/settings"]:
        a.goto("http://127.0.0.1:8765" + path, wait_until="networkidle")
        check(path + " five nav destinations", a.locator(".journey-nav a").count() == 5)
        check(path + " exactly one active nav item", a.locator(".journey-nav [aria-current=page]").count() == 1)
        check(
            path + " primary action visible",
            a.locator("main .attention-action,main .setup-compact a,main .btn-primary,main .next-action a,main .tool-row").first.bounding_box()["y"] < 740,
        )
        check(
            path + " readable nav",
            all(
                x >= 16
                for x in a.locator(".journey-nav a").evaluate_all(
                    "(es)=>es.map(e=>parseFloat(getComputedStyle(e).fontSize))"
                )
            ),
        )
        for width in [320, 390, 768, 1440]:
            a.set_viewport_size({"width": width, "height": 900})
            check(path + " overflow " + str(width), a.evaluate("document.documentElement.scrollWidth") <= width)
        a.set_viewport_size({"width": 390, "height": 844})
    a.goto("http://127.0.0.1:8765/settings", wait_until="networkidle")
    a.keyboard.press("Control+k")
    check("Command palette opens", a.locator("dialog").evaluate("(e)=>e.open"))
    a.locator("#command-search").fill("quote")
    check("Search filters tools", a.locator(".command-results a:visible").count() == 1)
    a.locator("#command-search").fill("xxxxxxxx")
    check("Search empty state", a.locator(".command-empty").is_visible())
    a.keyboard.press("Escape")
    a.wait_for_function('!document.querySelector("dialog").open')
    check("Escape closes search", not a.locator("dialog").evaluate("(e)=>e.open"))
    a.goto("http://127.0.0.1:8765/")
    a.get_by_role("button", name="Change colour theme").click()
    a.reload(wait_until="networkidle")
    check("Dark theme persists", a.evaluate("document.documentElement.dataset.theme") == "dark")
    a.get_by_role("button", name="Change colour theme").click()
    a.reload(wait_until="networkidle")
    check("Light theme persists", a.evaluate("document.documentElement.dataset.theme") == "light")
    # All disclosed modules remain discoverable without the crowded nav.
    discovered = set()
    for path in ["/customers", "/work", "/growth", "/settings"]:
        a.goto("http://127.0.0.1:8765" + path, wait_until="networkidle")
        a.locator("main details").evaluate_all("(es)=>es.forEach(e=>e.open=true)")
        discovered.update(a.locator("main a").evaluate_all('(es)=>es.map(e=>e.getAttribute("href"))'))
    for path in [
        "/inbox",
        "/frontdesk",
        "/bookings",
        "/quotes",
        "/approvals",
        "/posts",
        "/reviews",
        "/team",
        "/media",
        "/competitors",
        "/radar",
        "/campaigns",
        "/analytics",
        "/loyalty",
        "/waitlist",
        "/menu",
        "/orders",
        "/receptionist",
        "/receptionist/connect",
        "/assistant",
        "/billing",
        "/onboarding",
        "/support",
        "/switch",
        "/wifi-card",
        "/prospects",
    ]:
        check("Module reachable " + path, path in discovered)
    fresh = b.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    a = fresh.new_page()
    a.goto("http://127.0.0.1:8765/signup")
    check(
        "Signup asks only name email password",
        a.locator("input").evaluate_all("(es)=>es.map(e=>e.name)") == ["name", "email", "password"],
    )
    a.locator("[name=name]").fill("Fictional Journey Owner")
    a.locator("[name=email]").fill("flow-" + secrets.token_hex(5) + "@example.invalid")
    a.locator("[name=password]").fill(secrets.token_urlsafe(18))
    a.get_by_role("button", name="Create account").click()
    a.wait_for_url("**/business-type")
    check("Signup leads to business type", True)
    a.locator("select").select_option("restaurant")
    a.get_by_role("button", name="Continue to setup").click()
    a.wait_for_url("**/setup")
    check("Business type leads to checklist", a.locator(".setup-item").count() == 5)
    a.get_by_role("link", name="Add business details").click()
    check("Business type persists", a.locator("[name=industry]").input_value() == "restaurant")
    a.locator("[name=business_name]").fill("Fictional Morula Kitchen")
    a.locator("[name=website_url]").fill("https://example.invalid")
    a.get_by_role("button", name="Save and continue").click()
    a.wait_for_url("**/setup?*")
    a.reload(wait_until="networkidle")
    check("Checklist persists one completed step", a.get_by_role("progressbar").get_attribute("aria-valuenow") == "1")
    check("Next missing step expanded", a.locator(".setup-item[open]").inner_text().startswith("2\nConnect WhatsApp"))
    a.goto("http://127.0.0.1:8765/billing")
    check("Unpaid status plain payment needed", "Payment needed" in a.locator("body").inner_text())
    check("No free-trial offer", "free trial" not in a.locator("body").inner_text().lower())
    a.goto("http://127.0.0.1:8765/frontdesk")
    a.get_by_role("link", name="Preview with sample data").click()
    check(
        "Preview explicitly sample-only",
        "Sample data. Nothing here is sent or saved." in a.locator("body").inner_text(),
    )
    b.close()
Path("/downloads/revup-guided/ui-regression-results.json").write_text(
    json.dumps({"passed": len(checks), "checks": checks}, indent=2)
)
print("TOTAL", len(checks))
