import uuid

from django.conf import settings
from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    logo_url = models.URLField(blank=True, default="")
    default_timezone = models.CharField(max_length=63, default="UTC")

    # Intelligence billing contact (the optional hosted SaaS integration).
    # Stripe Customer email defaults to this; falls back to the activating
    # user's email if blank. Stored on the Org (not the User) so a change
    # in activator doesn't affect where billing notices land — and so
    # invoices can be routed to a finance address rather than whoever
    # happened to click Subscribe.
    billing_email = models.EmailField(blank=True, default="")

    # Platform-owner access control: when set, this org's members see a
    # suspended notice instead of the app. Staff (/platform-admin/) are
    # exempt. Toggled only from the platform-owner admin.
    access_suspended_at = models.DateTimeField(blank=True, null=True)
    access_suspension_reason = models.CharField(max_length=255, blank=True, default="")

    # Deletion workflow
    deletion_requested_at = models.DateTimeField(blank=True, null=True)
    deletion_scheduled_for = models.DateTimeField(blank=True, null=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Plan(models.TextChoices):
        STARTER = "starter", "Starter - R499/month"
        GROWTH = "growth", "Growth - R999/month"
        BUSINESS_PRO = "business-pro", "Business Pro - R1,999/month"

    PLAN_PRICES_RAND = {"starter": 499, "growth": 999, "business-pro": 1999}

    # Per-tier monthly allowances (his call, 1 Nov 2026): the AI receptionist
    # costs real money per reply, so each tier carries a monthly reply
    # allowance and a connected-channel limit. Past the allowance the
    # conversation flips to a human instead of burning shared quota.
    PLAN_MONTHLY_REPLIES = {"starter": 500, "growth": 1000, "business-pro": 2500}
    PLAN_CHANNEL_LIMITS = {"starter": 1, "growth": 2, "business-pro": 3}

    class SubscriptionStatus(models.TextChoices):
        TRIAL = "trial", "Early access"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Not active"
        # Written by the CF worker signup: account created, payment not yet
        # confirmed. Locked to the billing page like EXPIRED until the
        # verified ITN flips it to ACTIVE.
        PENDING_ACTIVATION = "pending_activation", "Activation pending"

    TRIAL_DAYS = 7

    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.STARTER)
    subscription_status = models.CharField(
        max_length=32, choices=SubscriptionStatus.choices, default=SubscriptionStatus.TRIAL
    )
    trial_started_at = models.DateTimeField(blank=True, null=True)
    payment_reference = models.CharField(max_length=20, blank=True, default="")
    # PayFast subscription token, set by the verified ITN when a plan goes
    # active; used if the subscription ever needs cancelling.
    payfast_token = models.CharField(max_length=64, blank=True, default="")
    # When the subscription first went active (first confirmed payment). Week
    # one from this moment unlocks every feature on any plan; afterwards the
    # org keeps its own plan's allowances (product rule, 5 Nov 2026).
    activated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "organizations_organization"

    def save(self, *args, **kwargs):
        if not self.payment_reference and self.id:
            self.payment_reference = "RU-" + self.id.hex[:8].upper()
        if self.trial_started_at is None and self.subscription_status == self.SubscriptionStatus.TRIAL:
            from django.utils import timezone

            self.trial_started_at = timezone.now()
        if self.activated_at is None and self.subscription_status == self.SubscriptionStatus.ACTIVE:
            from django.utils import timezone

            self.activated_at = timezone.now()
        super().save(*args, **kwargs)

    WEEK_ONE_DAYS = 7

    def _in_week_one(self) -> bool:
        """First week of a paid subscription: every plan runs all features."""
        from django.utils import timezone

        if self.activated_at is None or self.subscription_status != self.SubscriptionStatus.ACTIVE:
            return False
        return (timezone.now() - self.activated_at).days < self.WEEK_ONE_DAYS

    def monthly_reply_allowance(self) -> int:
        if self._in_week_one():
            return max(self.PLAN_MONTHLY_REPLIES.values())
        return self.PLAN_MONTHLY_REPLIES.get(self.plan, self.PLAN_MONTHLY_REPLIES["starter"])

    def channel_allowance(self) -> int:
        if self._in_week_one():
            return max(self.PLAN_CHANNEL_LIMITS.values())
        return self.PLAN_CHANNEL_LIMITS.get(self.plan, self.PLAN_CHANNEL_LIMITS["starter"])

    def trial_state(self, now=None):
        """(status, day 1-based, days_left). Active orgs short-circuit."""
        from django.utils import timezone

        if self.subscription_status == self.SubscriptionStatus.ACTIVE:
            return (self.SubscriptionStatus.ACTIVE, self.TRIAL_DAYS, 0)
        if self.subscription_status == self.SubscriptionStatus.EXPIRED:
            return (self.SubscriptionStatus.EXPIRED, self.TRIAL_DAYS, 0)
        if self.subscription_status == self.SubscriptionStatus.PENDING_ACTIVATION:
            return (self.SubscriptionStatus.PENDING_ACTIVATION, self.TRIAL_DAYS, 0)
        now = now or timezone.now()
        start = self.trial_started_at or self.created_at or now
        elapsed = max(0, (now - start).days)
        if elapsed >= self.TRIAL_DAYS:
            return (self.SubscriptionStatus.EXPIRED, self.TRIAL_DAYS, 0)
        return (self.SubscriptionStatus.TRIAL, elapsed + 1, self.TRIAL_DAYS - elapsed)

    def __str__(self):
        return self.name

    @property
    def is_deletion_pending(self):
        return self.deletion_requested_at is not None and self.deleted_at is None

    @property
    def has_intelligence(self):
        """True when the org has an active Intelligence subscription AND
        the integration is enabled in this deployment.

        Returns False when ``settings.INTELLIGENCE_ENABLED`` is off even
        if a subscription row exists — so a self-hoster who removes the
        env vars doesn't accidentally keep the feature visible. Returns
        False when the related ``IntelligenceSubscription`` doesn't
        exist yet (apps.intelligence may not even be migrated on a
        deployment that hasn't opted in).

        The decorator ``@intelligence_subscription_required`` in
        apps.intelligence layers a stricter check (must be exactly
        ``status='active'``) for tool-call endpoints.
        """
        if not getattr(settings, "INTELLIGENCE_ENABLED", False):
            return False
        sub = getattr(self, "intelligence_subscription", None)
        return bool(sub and sub.status == "active")

    def hard_delete(self, requesting_user=None):
        """Hard-delete this org and settle every member's account.

        - `requesting_user` (optional): the user who triggered the immediate-
          delete flow. Their account is deleted along with the org so they
          get a truly fresh start on re-signup. Pass `None` (the default) for
          the scheduled-grace-period path and the management-command sweeper
          — those don't carry request context and we don't want to silently
          delete accounts from a background job.
        - Every other member gets a freshly provisioned default "My
          Organization" + "My Workspace" so they land on a working dashboard
          instead of limbo on next login.
        - Any user's `last_workspace_id` that points at a workspace in this
          org is nulled first (defensive; provision-for-member would reset it
          anyway, but the delete_user path wouldn't).
        """
        from apps.accounts.models import User
        from apps.accounts.signals import provision_organization_and_workspace
        from apps.members.models import OrgMembership
        from apps.workspaces.models import Workspace

        member_ids = list(OrgMembership.objects.filter(organization=self).values_list("user_id", flat=True))
        ws_ids = list(Workspace.objects.filter(organization=self).values_list("id", flat=True))

        if ws_ids:
            User.objects.filter(last_workspace_id__in=ws_ids).update(last_workspace_id=None)

        self.delete()  # CASCADE: workspaces, memberships, credentials, media, etc.

        requesting_user_id = requesting_user.pk if requesting_user else None
        for uid in member_ids:
            if uid == requesting_user_id:
                User.objects.filter(pk=uid).delete()
                continue
            try:
                user = User.objects.get(pk=uid)
            except User.DoesNotExist:
                continue
            provision_organization_and_workspace(user)


class OrganizationPayment(models.Model):
    """PayFast ITN record: audit trail and replay idempotency (pf_payment_id unique)."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="payments")
    pf_payment_id = models.CharField(max_length=64, unique=True)
    plan = models.CharField(max_length=20)
    amount_gross = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
