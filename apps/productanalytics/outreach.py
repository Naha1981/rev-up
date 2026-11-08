"""Outreach link codes: one per business contacted directly.

Links carry the code as utm_content (his spec, 3 Nov 2026):
?utm_source=whatsapp&utm_medium=outreach&utm_campaign=response_test_nov3&utm_content=<code>

Adding a business is a code change on purpose - the list is fixed by the
sender, and history stays keyed to the code if a label ever changes.
Send times are the emailed copies (SAST); WhatsApp send times live with him.
"""

OUTREACH_BUSINESSES = {
    "jd": {"name": "JD Funerals", "sent": "3 Nov, 02:23"},
    "kupane": {"name": "Kupane Funerals", "sent": "3 Nov, 02:23"},
    "vuyos": {"name": "Vuyo's Funeral Services", "sent": "3 Nov, 02:23"},
    "sfs": {"name": "SFS Style Funeral Services", "sent": "3 Nov, 02:23"},
    "legae": {"name": "Legae Funeral Services", "sent": "3 Nov, 02:23"},
    "mayfair": {"name": "Mayfair Gearbox", "sent": "3 Nov, 02:23"},
    "jfauto": {"name": "JF Auto Workshop", "sent": "3 Nov, 02:23"},
    "gearboxgarage": {"name": "Gearbox Garage", "sent": "3 Nov, 02:25"},
    "bavarian": {"name": "Bavarian Workshop", "sent": "3 Nov, 02:24"},
    "smw": {"name": "SMW Motor Worx", "sent": "3 Nov, 02:24"},
    "mercpro": {"name": "Merc Pro", "sent": "3 Nov, 02:24"},
    "stronic": {"name": "Stronic", "sent": "3 Nov, 02:24"},
    "journeyman": {"name": "Journeyman Fitment Centre", "sent": "3 Nov, 02:25"},
    "hjm": {"name": "HJM", "sent": "3 Nov, 02:27"},
    "revhouse": {"name": "RevHouse", "sent": "3 Nov, 02:28"},
    "eurospec": {"name": "Eurospec Auto", "sent": "3 Nov, 02:24"},
    # Second outreach batch (4 Nov): display names are the codes title-cased
    # until he confirms the trading names; send times land when the messages
    # go out.
    "shandus": {"name": "Shandus", "sent": ""},
    "vusana": {"name": "Vusana", "sent": ""},
    "kwavusana": {"name": "KwaVusana", "sent": ""},
    "nobela": {"name": "Nobela", "sent": ""},
    "bali": {"name": "Bali", "sent": ""},
    "matlhaela": {"name": "Matlhaela", "sent": ""},
    "chomane": {"name": "Chomane", "sent": ""},
    "dichaba": {"name": "Dichaba", "sent": ""},
    "ikhayalehae": {"name": "IKhaya Lehae", "sent": ""},
    "msawawa": {"name": "Msawawa", "sent": ""},
}
