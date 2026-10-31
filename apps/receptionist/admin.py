from django.contrib import admin

from .models import (
    BusinessProfile,
    Contact,
    DentalAppointment,
    FuneralClaim,
    Message,
    TradeDispatch,
    ZernioChannel,
)

for model in (BusinessProfile, ZernioChannel, Contact, Message, FuneralClaim, DentalAppointment, TradeDispatch):
    admin.site.register(model)
