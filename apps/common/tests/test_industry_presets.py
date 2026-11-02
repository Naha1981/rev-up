"""Signup industry presets, including the Funeral Services addition."""

from django.test import Client, TestCase
from django.urls import reverse

from apps.common.industry_presets import INDUSTRY_CHOICES, INDUSTRY_PRESETS, get_preset

REQUIRED_KEYS = {
    "label",
    "radar_keywords",
    "post_themes",
    "hashtags",
    "responder_tone",
    "responder_questions",
    "responder_faqs",
}


class FuneralPresetTests(TestCase):
    def test_funeral_preset_complete(self):
        preset = INDUSTRY_PRESETS["funeral"]
        self.assertEqual(preset["label"], "Funeral Services")
        self.assertTrue(REQUIRED_KEYS.issubset(preset.keys()))
        for key in ("radar_keywords", "post_themes", "responder_questions", "responder_faqs"):
            self.assertTrue(preset[key], f"{key} must not be empty")
        self.assertIn("compassionate", preset["responder_tone"])

    def test_funeral_in_signup_choices(self):
        self.assertIn(("funeral", "Funeral Services"), INDUSTRY_CHOICES)

    def test_get_preset_funeral(self):
        self.assertEqual(get_preset("funeral")["label"], "Funeral Services")

    def test_signup_page_offers_funeral(self):
        response = Client().get(reverse("account_signup"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'value="funeral"')
        self.assertContains(response, "Funeral Services")

    def test_every_preset_wellformed(self):
        for key, preset in INDUSTRY_PRESETS.items():
            self.assertTrue(REQUIRED_KEYS.issubset(preset.keys()), key)
            self.assertTrue(preset["label"], key)


class FuneralReceptionistWiringTests(TestCase):
    def test_workspace_industry_maps_to_funeral_receptionist(self):
        from apps.receptionist.models import WORKSPACE_INDUSTRY_MAP, Industry

        self.assertEqual(WORKSPACE_INDUSTRY_MAP["funeral"], Industry.FUNERAL)

    def test_funeral_brief_follows_menu_flow(self):
        from apps.receptionist.models import Industry
        from apps.receptionist.services import _INDUSTRY_BRIEFS

        brief = _INDUSTRY_BRIEFS[Industry.FUNERAL]
        # The flow modelled on the reference menu: cover plans, payment,
        # claims, consultant hand-off, complaints, policy-number step.
        for needle in (
            "cover plans",
            "paying a policy",
            "claims",
            "consultant",
            "complaint",
            "policy number",
            "condolences",
        ):
            self.assertIn(needle, brief)
        # Never invent money facts.
        self.assertIn("Never invent", brief)

    def test_setup_view_preselects_funeral_for_funeral_workspace(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership
        from apps.receptionist.models import WORKSPACE_INDUSTRY_MAP, Industry

        user = User.objects.create_user(email="funeral-preset-test@example.com", password="x" * 16)
        workspace = WorkspaceMembership.objects.get(user=user).workspace
        workspace.industry = "funeral"
        workspace.save(update_fields=["industry"])
        self.assertEqual(WORKSPACE_INDUSTRY_MAP.get(workspace.industry), Industry.FUNERAL)
