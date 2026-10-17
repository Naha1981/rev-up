"""Custom allauth forms."""

from allauth.account.forms import SignupForm
from django import forms

from apps.common.industry_presets import INDUSTRY_CHOICES


class RevUpSignupForm(SignupForm):
    """Signup with an industry pick - drives radar/responder presets."""

    industry = forms.ChoiceField(
        choices=INDUSTRY_CHOICES,
        required=False,
        label="What industry are you in?",
        help_text="We tune your demand radar, reply tone and post ideas to it.",
    )

    field_order = ["email", "password1", "industry"]
