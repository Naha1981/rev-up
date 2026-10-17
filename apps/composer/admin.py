"""Admin for composer posts - primarily to unstick the publish pipeline."""

from django.contrib import admin, messages

from .models import PlatformPost, Post
from .services import transition_platform_post


@admin.register(PlatformPost)
class PlatformPostAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "social_account", "status", "scheduled_at", "published_at")
    list_filter = ("status", "social_account__platform")
    search_fields = ("id", "post__title")
    readonly_fields = ("publish_error", "platform_post_id")
    actions = ["stop_to_draft"]

    @admin.action(description="Stop publishing (move to draft, clears schedule)")
    def stop_to_draft(self, request, queryset):
        stopped = skipped = 0
        for pp in queryset:
            try:
                if pp.status == "publishing":
                    transition_platform_post(pp, "failed")
                if pp.status in ("scheduled", "failed", "draft"):
                    if pp.status != "draft":
                        transition_platform_post(pp, "draft")
                    stopped += 1
                else:
                    skipped += 1
            except ValueError:
                skipped += 1
        self.message_user(request, f"Moved {stopped} platform post(s) to draft; skipped {skipped}.", messages.SUCCESS)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "workspace", "created_at")
    search_fields = ("id", "title")
    list_filter = ("workspace",)
