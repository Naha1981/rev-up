from django.core.management.base import BaseCommand, CommandError

from apps.receptionist.models import Message
from apps.receptionist.sending import send_draft


class Command(BaseCommand):
    help = "Send one stored receptionist draft through the sandbox guard."

    def add_arguments(self, parser):
        parser.add_argument("message_id", type=str)

    def handle(self, *args, **options):
        message = Message.objects.filter(id=options["message_id"]).select_related("contact").first()
        if message is None:
            raise CommandError("no such message")
        from apps.receptionist.models import ZernioChannel

        channel = ZernioChannel.objects.filter(workspace=message.workspace).first()
        if channel is None:
            raise CommandError("no Zernio channel for workspace")
        if send_draft(channel, message.contact, message):
            self.stdout.write(self.style.SUCCESS(f"sent {message.id}"))
        else:
            raise CommandError("send refused (guard, already sent, or missing conversation id)")
