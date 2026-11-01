"""Signup and login events via allauth's signals."""

from __future__ import annotations

from allauth.account.signals import user_logged_in, user_signed_up
from django.dispatch import receiver

from .middleware import visitor_hash
from .models import ProductEvent


@receiver(user_signed_up)
def on_signup(sender, request, user, **kwargs):
    ProductEvent.objects.create(kind=ProductEvent.Kind.SIGNUP, visitor_hash=visitor_hash(request), user=user)


@receiver(user_logged_in)
def on_login(sender, request, user, **kwargs):
    ProductEvent.objects.create(kind=ProductEvent.Kind.LOGIN, visitor_hash=visitor_hash(request), user=user)
