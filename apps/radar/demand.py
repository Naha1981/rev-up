"""Computed demand signals: payday windows, SA public holidays, weekend
rhythm and local weather. Free only - holidays and paydays are computed
locally, weather uses the keyless Open-Meteo API with a cached geocode.

These answer the restaurant owner's real question - "when will people
walk in and what should I push?" - which keyword-matched news never can.
News items stay as a secondary "Industry news" group on the dashboard.
"""

import json
import logging
import urllib.parse
import urllib.request
from datetime import date, datetime, time, timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT = 10
_WEATHER_TTL = timedelta(hours=6)

# South African public holidays (month, day, name). When the date falls on a
# Sunday the Monday is the observed holiday; both are eating-out days.
SA_PUBLIC_HOLIDAYS = [
    (1, 1, "New Year's Day"),
    (3, 21, "Human Rights Day"),
    (4, 27, "Freedom Day"),
    (5, 1, "Workers' Day"),
    (6, 16, "Youth Day"),
    (8, 9, "National Women's Day"),
    (9, 24, "Heritage Day (braai day)"),
    (12, 16, "Day of Reconciliation"),
    (12, 25, "Christmas Day"),
    (12, 26, "Day of Goodwill"),
]

# Industry-agnostic demand hooks, with restaurant-specific weather pushes.
INDUSTRY_WEATHER_HOOKS = {
    "restaurant": {
        "rain": "Rain expected {day} - push delivery, sit-down comfort dishes and warm drinks.",
        "hot": "Hot {day} ahead - push cold drinks, salads and outdoor or shaded tables.",
        "cold": "Cold {day} ahead - push hearty specials, curries and warm desserts.",
        "clear": "Clear {day} ahead - good walk-in weather; push lunch specials and after-work crowds.",
    },
    "catering": {
        "rain": "Rain expected {day} - clients move events indoors; confirm venue cover with bookings.",
        "hot": "Hot {day} ahead - push cold platters, braai menus and drinks packages.",
        "cold": "Cold {day} ahead - push hot buffets, soups and stews for events.",
        "clear": "Clear {day} ahead - good for outdoor functions; follow up open quotes.",
    },
}
_DEFAULT_WEATHER_HOOKS = {
    "rain": "Rain expected {day} - customers stay home; push delivery or collection offers.",
    "hot": "Hot {day} ahead - plan staffing and stock for a busy day.",
    "cold": "Cold {day} ahead - push warm, comfort-focused offers.",
    "clear": "Clear {day} ahead - good foot-traffic weather; push walk-in offers.",
}


def _signal(title, summary, event_date, score):
    return {
        "title": title,
        "link": "",
        "source": "RevUp demand signals",
        "summary": summary,
        "group": "Demand signal",
        "score": score,
        "ingested": False,
        "relevant": True,
        "is_signal": True,
        "event_date": event_date.isoformat() if event_date else "",
    }


def _payday_signals(today):
    """SA pay runs cluster on the 25th and month-end. Signal the run-up."""
    signals = []
    month_end = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    for label, pay_date in (("the 25th", today.replace(day=25)), ("month-end", month_end)):
        days = (pay_date - today).days
        if 0 <= days <= 7:
            signals.append(
                _signal(
                    f"Payday in {days} day{'s' if days != 1 else ''} ({label})",
                    "Customers get paid soon - bigger groups and higher spend. "
                    "Plan a pay-weekend special and push bookings now.",
                    pay_date,
                    12 - days,
                )
            )
    return signals


def _holiday_signals(today):
    signals = []
    for month, day, name in SA_PUBLIC_HOLIDAYS:
        for year in (today.year, today.year + 1):
            hol = date(year, month, day)
            days = (hol - today).days
            if 0 <= days <= 10:
                observed = ""
                if hol.weekday() == 6:
                    observed = " (Monday is the public holiday)"
                signals.append(
                    _signal(
                        f"{name} in {days} day{'s' if days != 1 else ''}{observed}",
                        "Public holidays mean families and friends eating out. "
                        "Push table bookings and a holiday special before the rush.",
                        hol,
                        14 - days,
                    )
                )
    return signals


def _weekend_signals(today):
    # Thursday and Friday: the weekend is the demand peak for hospitality.
    if today.weekday() not in (3, 4):
        return []
    saturday = today + timedelta(days=(5 - today.weekday()) % 7)
    return [
        _signal(
            "Weekend starts tomorrow" if today.weekday() == 4 else "Weekend in 2 days",
            "Weekends are the busiest trading days. Push Friday and Saturday "
            "bookings, confirm staff and stock up on best sellers.",
            saturday,
            10,
        )
    ]


def _geocode(area):
    url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
        {"name": area, "count": 1, "language": "en", "format": "json"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": "nahalabs-radar/1.0"})
    with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
        data = json.loads(resp.read())
    results = data.get("results") or []
    if not results:
        return None
    hit = results[0]
    return {"lat": hit["latitude"], "lon": hit["longitude"], "label": hit.get("name", area)}


def _forecast(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(
        {
            "latitude": lat,
            "longitude": lon,
            "daily": "precipitation_probability_max,temperature_2m_max",
            "forecast_days": 3,
            "timezone": "Africa/Johannesburg",
        }
    )
    req = urllib.request.Request(url, headers={"User-Agent": "nahalabs-radar/1.0"})
    with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
        return json.loads(resp.read())


def _weather_signals(workspace, area, today, *, geocoder=_geocode, forecaster=_forecast, settings_store=None):
    """Weather-driven signals for the workspace area. Geocode and forecast are
    cached in WorkspaceSetting so the dashboard never blocks on the network."""
    if not area:
        return []
    from apps.settings_manager.models import WorkspaceSetting

    def get_cache(key):
        row = WorkspaceSetting.objects.filter(workspace=workspace, key=key).first()
        return row.value if row else None

    def set_cache(key, value):
        WorkspaceSetting.objects.update_or_create(workspace=workspace, key=key, defaults={"value": value})

    geo = get_cache("radar.geo_cache")
    if not geo or geo.get("area") != area:
        try:
            fresh = geocoder(area)
        except Exception as exc:
            logger.warning("radar weather: geocode failed for %r: %s", area, exc)
            fresh = None
        if fresh:
            geo = {**fresh, "area": area}
            set_cache("radar.geo_cache", geo)
    if not geo:
        return []

    cached = get_cache("radar.weather_cache")
    forecast = None
    now = timezone.now()
    if cached and cached.get("fetched_at"):
        try:
            fetched = datetime.fromisoformat(cached["fetched_at"])
            if now - fetched < _WEATHER_TTL:
                forecast = cached.get("forecast")
        except (TypeError, ValueError):
            forecast = None
    if forecast is None:
        try:
            forecast = forecaster(geo["lat"], geo["lon"])
            set_cache("radar.weather_cache", {"fetched_at": now.isoformat(), "forecast": forecast})
        except Exception as exc:
            logger.warning("radar weather: forecast failed for %r: %s", area, exc)
            forecast = (cached or {}).get("forecast")
    if not forecast:
        return []

    daily = forecast.get("daily") or {}
    dates = daily.get("time") or []
    rain_probs = daily.get("precipitation_probability_max") or []
    max_temps = daily.get("temperature_2m_max") or []
    hooks = INDUSTRY_WEATHER_HOOKS.get(workspace.industry, _DEFAULT_WEATHER_HOOKS)
    signals = []
    for i, day_str in enumerate(dates):
        try:
            day = date.fromisoformat(day_str)
        except ValueError:
            continue
        if day <= today:
            continue
        rain = rain_probs[i] if i < len(rain_probs) else None
        temp = max_temps[i] if i < len(max_temps) else None
        day_name = day.strftime("%A")
        if rain is not None and rain >= 60:
            kind = "rain"
        elif temp is not None and temp >= 30:
            kind = "hot"
        elif temp is not None and temp <= 16:
            kind = "cold"
        else:
            kind = "clear"
        signals.append(
            _signal(
                hooks[kind].format(day=day_name),
                f"{geo.get('label', area)} forecast for {day_name}: "
                f"{rain if rain is not None else 0}% chance of rain, high of "
                f"{round(temp) if temp is not None else '?'}C.",
                day,
                9,
            )
        )
        if signals:
            break  # the next trading day is the actionable one
    return signals


def build_demand_items(workspace, area, *, now=None, geocoder=_geocode, forecaster=_forecast):
    """Demand signals for the dashboard, newest and closest events first."""
    now = now or timezone.now()
    today = now.date() if isinstance(now, datetime) else now
    signals = []
    signals += _holiday_signals(today)
    signals += _payday_signals(today)
    signals += _weekend_signals(today)
    try:
        signals += _weather_signals(workspace, area, today, geocoder=geocoder, forecaster=forecaster)
    except Exception as exc:  # never let weather break the dashboard
        logger.warning("radar weather: signal build failed for workspace %s: %s", workspace.id, exc)
    signals.sort(key=lambda s: (-s["score"], s["event_date"]))
    return signals[:6]
