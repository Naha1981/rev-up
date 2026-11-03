"""Custom allauth forms."""

from allauth.account.forms import SignupForm
from django import forms

from apps.common import web_presence
from apps.common.industry_presets import INDUSTRY_CHOICES


def _website_field() -> forms.CharField:
    return forms.CharField(
        required=False,
        max_length=500,
        label="Your website",
        help_text="If you have one.",
        widget=forms.TextInput(attrs={"placeholder": "https://www.yourbusiness.co.za", "inputmode": "url"}),
    )


def _facebook_field() -> forms.CharField:
    return forms.CharField(
        required=False,
        max_length=500,
        label="Your Facebook page",
        help_text="Needed if you don't have a website. Open your page and copy its link.",
        widget=forms.TextInput(attrs={"placeholder": "https://www.facebook.com/yourbusiness", "inputmode": "url"}),
    )


class RevUpSignupForm(SignupForm):
    """Signup with an industry pick - drives radar/responder presets.

    New accounts must also show where customers find them online: a website,
    or - when they have none - their Facebook page. That keeps the trial for
    real businesses only.
    """

    industry = forms.ChoiceField(
        choices=INDUSTRY_CHOICES,
        required=False,
        label="What industry are you in?",
        help_text="We tune your demand radar, reply tone and post ideas to it.",
    )
    website_url = _website_field()
    facebook_url = _facebook_field()

    field_order = ["email", "password1", "industry", "website_url", "facebook_url"]

    def clean(self):
        cleaned = super().clean()
        return web_presence.validate_web_presence_form(self, cleaned)


class WebPresenceForm(forms.Form):
    """The business-details step for accounts that signed up without web
    presence (Google sign-in): same two fields, same checks."""

    website_url = _website_field()
    facebook_url = _facebook_field()

    def clean(self):
        cleaned = super().clean()
        return web_presence.validate_web_presence_form(self, cleaned)
