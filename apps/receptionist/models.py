"""AI receptionist for local service businesses (funeral, dental, trades).

Every row is workspace-scoped: a tenant's contacts, conversations and intake
records are invisible to every other tenant, and the webhook receiver resolves
the workspace from the connected Zernio channel before writing anything.
"""

from __future__ import annotations

import uuid

from django.db import models

from apps.common.encryption import EncryptedTextField


class Industry(models.TextChoices):
    PLUMBER = "plumber", "Plumbing"
    ELECTRICIAN = "electrician", "Electrical"
    SECURITY = "security", "Security"
    SOLAR = "solar", "Solar / inverters"
    AUTO_WORKSHOP = "auto-workshop", "Auto workshop"
    MOBILE_MECHANIC = "mobile-mechanic", "Mobile mechanic"
    TOWING = "towing", "Towing / roadside"
    HVAC = "hvac", "Aircon / refrigeration"
    ROOFING = "roofing", "Roofing / waterproofing"
    GATES_ACCESS = "gates-access", "Gates / fencing / access control"
    PEST_CONTROL = "pest-control", "Pest control"
    PROPERTY_MAINTENANCE = "property-maintenance", "Property maintenance"
    CONTAINER_TRANSPORT = "container-transport", "Container transport"
    POOL = "pool", "Pool services"
    AESTHETICS = "aesthetics", "Aesthetics / cosmetic clinic"
    REAL_ESTATE = "real-estate", "Real estate"
    PROPERTY_MANAGEMENT = "property-management", "Property management"
    LEGAL = "legal", "Law firm"
    FINANCIAL_BROKER = "financial-broker", "Financial / insurance broker"
    FUNERAL = "funeral", "Funeral services"
    DENTAL = "dental", "Dental practice"
    RESTAURANT = "restaurant", "Restaurant / cafe / takeaway"
    CATERING = "catering", "Catering / food truck"
    TRADES = "trades", "Trades (general building & repairs)"
    GENERAL = "general", "General local service"


# Workspace-level signup industry -> receptionist business type. The signup
# pick drives radar presets; this maps it onto the receptionist profile so a
# new workspace's setup screen preselects the owner's actual trade.
WORKSPACE_INDUSTRY_MAP = {
    "restaurant": Industry.RESTAURANT,
    "real_estate": Industry.REAL_ESTATE,
    "dental": Industry.DENTAL,
    "auto": Industry.AUTO_WORKSHOP,
    "funeral": Industry.FUNERAL,
}


class BusinessProfile(models.Model):
    """One receptionist configuration per workspace."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_profile"
    )
    industry = models.CharField(max_length=20, choices=Industry.choices, default=Industry.GENERAL)
    business_name = models.CharField(max_length=200)
    operating_hours = models.JSONField(default=dict, blank=True)
    pricing_data = models.JSONField(default=dict, blank=True, help_text="Price list in ZAR")
    banking_details = models.JSONField(default=dict, blank=True)
    payment_link_url = models.URLField(blank=True)
    google_review_url = models.URLField(
        blank=True, help_text="The business's own Google review link, used in review requests"
    )
    review_requests_enabled = models.BooleanField(
        default=False, help_text="Owner switch: send the check-in, review request and reminder pipeline"
    )
    emergency_contact_phone = models.CharField(max_length=32, blank=True)
    call_out_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    custom_rules = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.business_name} ({self.get_industry_display()})"


class ZernioChannel(models.Model):
    """A WhatsApp number connected through Zernio, bound to one workspace."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_channels"
    )
    zernio_account_id = models.CharField(max_length=64)
    zernio_profile_id = models.CharField(max_length=64, blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    label = models.CharField(max_length=120, blank=True)
    is_sandbox = models.BooleanField(default=False)
    connected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["zernio_account_id"], name="uniq_zernio_channel_account"),
        ]

    def save(self, *args, **kwargs):
        # Stored without the leading "+" so screens can add it for display.
        self.phone_number = self.phone_number.lstrip("+")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.phone_number or self.zernio_account_id} -> {self.workspace_id}"


class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_contacts"
    )
    wa_id = models.CharField(max_length=32, help_text="WhatsApp id (phone digits)")
    zernio_conversation_id = models.CharField(max_length=64, blank=True, default="")
    name = models.CharField(max_length=120, blank=True)
    tags = models.JSONField(default=list, blank=True)
    needs_human = models.BooleanField(default=False)
    opted_out = models.BooleanField(
        default=False, help_text="Customer replied STOP: no automated messages without fresh consent"
    )
    opted_out_at = models.DateTimeField(null=True, blank=True, help_text="When the customer replied STOP")
    review_status = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Review pipeline position: check_in_sent, review_requested, clicked, issue_flagged, unsubscribed",
    )
    issue_note = models.TextField(blank=True, help_text="Latest issue flagged from a check-in reply")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["workspace", "wa_id"], name="uniq_receptionist_contact_ws_wa"),
        ]

    def __str__(self) -> str:
        return f"{self.name or self.wa_id}"


class Booking(models.Model):
    """One customer booking request, from WhatsApp intake or the owner."""

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        DONE = "done", "Done"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_bookings"
    )
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="bookings")
    service = models.CharField(max_length=200, blank=True)
    preferred_time = models.CharField(max_length=200, blank=True)
    scheduled_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Confirmed date and time, Johannesburg local time. Empty until confirmed.",
    )
    duration_minutes = models.PositiveIntegerField(default=60, help_text="How long the booking blocks on the calendar.")
    google_event_id = models.CharField(
        max_length=200, blank=True, help_text="Google Calendar event created for this booking."
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["workspace", "status", "created_at"], name="booking_ws_status_ts")]

    def __str__(self) -> str:
        return f"{self.service or 'Booking'} - {self.contact.wa_id} ({self.status})"


class CalendarConnection(models.Model):
    """One Google Calendar connection per workspace, for confirmed bookings."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_calendar"
    )
    google_email = models.EmailField(blank=True)
    access_token = EncryptedTextField(blank=True, default="")
    refresh_token = EncryptedTextField(blank=True, default="")
    token_expiry = models.DateTimeField(null=True, blank=True)
    calendar_id = models.CharField(max_length=200, default="primary")
    connected_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Calendar for {self.workspace.name} ({self.google_email or 'no email'})"


class Quote(models.Model):
    """A quote the owner sends a customer, with a chase date for follow-up."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_quotes")
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name="quotes")
    customer_name = models.CharField(max_length=200)
    title = models.CharField(max_length=200, blank=True)
    amount_cents = models.PositiveBigIntegerField(default=0)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.DRAFT)
    sent_on = models.DateField(null=True, blank=True)
    follow_up_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["status", "follow_up_on", "-created_at"]
        indexes = [models.Index(fields=["workspace", "status", "follow_up_on"], name="quote_ws_status_fup")]

    @property
    def amount_rand(self) -> str:
        return f"{self.amount_cents / 100:,.2f}"

    def due_for_chase(self, today) -> bool:
        return self.status == self.Status.SENT and self.follow_up_on is not None and self.follow_up_on <= today

    def __str__(self) -> str:
        return f"{self.customer_name}: {self.title or 'Quote'} R{self.amount_rand} ({self.status})"


class Message(models.Model):
    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    class SenderType(models.TextChoices):
        USER = "user", "Customer"
        AI = "ai", "AI receptionist"
        HUMAN_AGENT = "human_agent", "Human agent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_messages"
    )
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="messages")
    direction = models.CharField(max_length=10, choices=Direction.choices)
    sender_type = models.CharField(max_length=12, choices=SenderType.choices)
    body = models.TextField()
    zernio_message_id = models.CharField(max_length=64, blank=True, db_index=True)
    is_draft = models.BooleanField(
        default=False, help_text="Draft replies are stored, never sent, until live sending is enabled"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            # Every webhook does per-workspace budget counts and per-contact
            # history reads; at 100+ tenants these tables are the hot path.
            models.Index(fields=["workspace", "direction", "created_at"], name="msg_ws_dir_ts"),
            models.Index(fields=["contact", "created_at"], name="msg_contact_ts"),
        ]

    def __str__(self) -> str:
        return f"{self.direction}:{self.sender_type} {self.body[:40]}"


class IntakeStatus(models.TextChoices):
    NEW = "new", "New"
    IN_PROGRESS = "in_progress", "In progress"
    RESOLVED = "resolved", "Resolved"


class FuneralClaim(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    deceased_name = models.CharField(max_length=200, blank=True)
    claimant_name = models.CharField(max_length=200, blank=True)
    policy_number = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=20, choices=IntakeStatus.choices, default=IntakeStatus.NEW)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DentalAppointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    patient_name = models.CharField(max_length=200, blank=True)
    reason = models.CharField(max_length=300, blank=True)
    preferred_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=IntakeStatus.choices, default=IntakeStatus.NEW)
    created_at = models.DateTimeField(auto_now_add=True)


class TradeDispatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    job_type = models.CharField(max_length=120, blank=True)
    address = models.CharField(max_length=300, blank=True)
    urgent = models.BooleanField(default=False)
    call_out_fee_quoted = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=IntakeStatus.choices, default=IntakeStatus.NEW)
    created_at = models.DateTimeField(auto_now_add=True)


class ReviewLink(models.Model):
    """Tracked short link to the business's Google review page (/r/<code>)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_review_links"
    )
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="review_links")
    short_code = models.CharField(max_length=12, unique=True)
    original_url = models.URLField()
    clicked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"/r/{self.short_code} -> {self.original_url}"


class ReviewEvent(models.Model):
    """One scheduled pipeline step: check-in, review request or reminder."""

    class Step(models.TextChoices):
        CHECK_IN = "check_in", "Check-in"
        REVIEW_REQUEST = "review_request", "Review request"
        REMINDER = "reminder", "Reminder"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        SENDING = "sending", "Sending"
        SENT = "sent", "Sent"
        CANCELLED = "cancelled", "Cancelled"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace", on_delete=models.CASCADE, related_name="receptionist_review_events"
    )
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="review_events")
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name="review_events")
    step = models.CharField(max_length=16, choices=Step.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_for = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_for"]
        indexes = [models.Index(fields=["status", "scheduled_for"], name="reviewevent_due")]

    def __str__(self) -> str:
        return f"{self.step} for {self.contact.wa_id} at {self.scheduled_for} ({self.status})"


class TenantMessagingConnection(models.Model):
    """A workspace's OWN messaging account (customer-owned WhatsApp path).

    The tenant pastes their own API key from their own messaging account;
    every WhatsApp call for that workspace then runs on THEIR key and THEIR
    plan, never the shared NahaLabs one. The key is encrypted at rest and
    never shown again after paste. ``webhook_secret`` is generated by us at
    connect time and signs only this tenant's deliveries.
    """

    class Status(models.TextChoices):
        KEY_VALID = "key_valid", "Key validated"
        CONNECTING = "connecting", "Connect started"
        CONNECTED = "connected", "Connected"
        NEEDS_ATTENTION = "needs_attention", "Needs attention"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField("workspaces.Workspace", on_delete=models.CASCADE, related_name="tenant_messaging")
    api_key = EncryptedTextField()
    profile_id = models.CharField(max_length=64, blank=True)
    account_id = models.CharField(max_length=64, blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    webhook_id = models.CharField(max_length=64, blank=True)
    webhook_secret = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.KEY_VALID)
    last_error = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.phone_number = self.phone_number.lstrip("+")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"tenant messaging for {self.workspace_id} ({self.status})"
