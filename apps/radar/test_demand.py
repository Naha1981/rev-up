from datetime import date, datetime

from django.test import TestCase

from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .demand import build_demand_items


def make_workspace(industry="restaurant"):
    org = Organization.objects.create(name=f"Org {industry} {date.today()}")
    return Workspace.objects.create(organization=org, name="Test Bistro", industry=industry)


class PaydaySignalTests(TestCase):
    def test_signal_in_run_up_to_25th(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 11, 22, 9, 0))
        titles = [i["title"] for i in items]
        self.assertTrue(any("Payday in 3 days (the 25th)" in t for t in titles), titles)

    def test_no_signal_far_from_payday(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 11, 10, 9, 0))
        self.assertFalse(any("Payday" in i["title"] for i in items))


class HolidaySignalTests(TestCase):
    def test_reconciliation_day_signalled_within_window(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 12, 10, 9, 0))
        self.assertTrue(
            any("Day of Reconciliation in 6 days" in i["title"] for i in items), [i["title"] for i in items]
        )

    def test_no_holiday_signal_outside_window(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 11, 10, 9, 0))
        self.assertFalse(any("holiday" in i["summary"].lower() and "Public holidays" in i["summary"] for i in items))


class WeekendSignalTests(TestCase):
    def test_thursday_signals_weekend(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 11, 12, 9, 0))  # a Thursday
        self.assertTrue(any("Weekend" in i["title"] for i in items), [i["title"] for i in items])

    def test_monday_no_weekend_signal(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 11, 9, 9, 0))  # a Monday
        self.assertFalse(any("Weekend" in i["title"] for i in items))


class WeatherSignalTests(TestCase):
    def _forecast(self, rain=80, temp=24, day="2026-11-14"):
        return {
            "daily": {
                "time": ["2026-11-13", day, "2026-11-15"],
                "precipitation_probability_max": [10, rain, 0],
                "temperature_2m_max": [22, temp, 25],
            }
        }

    def test_rain_signal_uses_restaurant_hook(self):
        ws = make_workspace()
        items = build_demand_items(
            ws,
            "Soweto",
            now=datetime(2026, 11, 13, 9, 0),
            geocoder=lambda area: {"lat": -26.24, "lon": 27.85, "label": "Soweto"},
            forecaster=lambda lat, lon: self._forecast(),
        )
        rain = [i for i in items if "Rain expected" in i["title"]]
        self.assertTrue(rain, [i["title"] for i in items])
        self.assertIn("delivery", rain[0]["title"])

    def test_no_area_no_weather(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 11, 13, 9, 0))
        self.assertFalse(any("Rain expected" in i["title"] for i in items))

    def test_geocode_failure_degrades_quietly(self):
        ws = make_workspace()

        def boom(area):
            raise RuntimeError("offline")

        items = build_demand_items(ws, "Soweto", now=datetime(2026, 11, 13, 9, 0), geocoder=boom, forecaster=boom)
        self.assertIsInstance(items, list)


class ShapeTests(TestCase):
    def test_items_match_dashboard_shape(self):
        ws = make_workspace()
        items = build_demand_items(ws, "", now=datetime(2026, 12, 10, 9, 0))
        self.assertTrue(items)
        for item in items:
            self.assertTrue(item["is_signal"])
            self.assertEqual(item["group"], "Demand signal")
            self.assertEqual(item["link"], "")
            self.assertTrue(item["relevant"])
