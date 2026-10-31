"""AI receptionist for local service businesses (funeral, dental, trades).

Every row is workspace-scoped: a tenant's contacts, conversations and intake
records are invisible to every other tenant, and the webhook receiver resolves
the workspace from the connected Zernio channel before writing anything.
"""

from __future__ import annotations

import uuid

from django.db import models


class Industry(models.TextChoices):
    FUNERAL = "funeral", "Funeral services"
    DENTAL = "dental", "Dental practice"
    TRADES = "trades", "Trades (plumbing, electrical, building)"
    GENERAL = "general", "General local service"


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
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["workspace", "status", "created_at"], name="booking_ws_status_ts")]

    def __str__(self) -> str:
        return f"{self.service or 'Booking'} - {self.contact.wa_id} ({self.status})"


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
