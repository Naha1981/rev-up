import uuid

from django.db import models

from apps.common.managers import OrgScopedManager
from apps.common.validators import validate_hex_color


class Workspace(models.Model):
    class ApprovalWorkflowMode(models.TextChoices):
        NONE = "none", "None"
        OPTIONAL = "optional", "Optional"
        REQUIRED_INTERNAL = "required_internal", "Required (Internal)"
        REQUIRED_INTERNAL_AND_CLIENT = "required_internal_and_client", "Required (Internal + Client)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="workspaces",
    )
    name = models.CharField(max_length=100)
    icon = models.ImageField(upload_to="workspaces/icons/%Y/%m/", blank=True)
    description = models.CharField(max_length=500, blank=True, default="")
    timezone = models.CharField(max_length=63, blank=True, default="")
    primary_color = models.CharField(max_length=7, blank=True, default="", validators=[validate_hex_color])
    secondary_color = models.CharField(max_length=7, blank=True, default="", validators=[validate_hex_color])
    industry = models.CharField(max_length=32, default="general", db_index=True)
    default_hashtags = models.JSONField(default=list, blank=True)
    default_first_comment = models.TextField(blank=True, default="")
    approval_workflow_mode = models.CharField(
        max_length=40,
        choices=ApprovalWorkflowMode.choices,
        default=ApprovalWorkflowMode.NONE,
    )
    is_archived = models.BooleanField(default=False)
    # Server-enforced test mode: while on, the publish engine never calls the
    # live publishing provider for this workspace - publishes are simulated
    # and marked as such. For trying RevUp end-to-end before a real account
    # goes anywhere near it. Server-side only; no endpoint can clear it but
    # the workspace settings save.
    publish_test_mode = models.BooleanField(default=False)

    # Web-presence gate: where customers find this business online. New
    # accounts must supply at least one (website, or Facebook page when they
    # have no website). Workspaces that existed when the gate shipped were
    # grandfathered via web_presence_gate_exempt in migration 0006.
    website_url = models.CharField(max_length=500, blank=True, default="")
    facebook_url = models.CharField(max_length=500, blank=True, default="")
    web_presence_gate_exempt = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = OrgScopedManager()

    class Meta:
        db_table = "workspaces_workspace"

    def __str__(self):
        return self.name

    @property
    def effective_timezone(self):
        return self.timezone or self.organization.default_timezone
