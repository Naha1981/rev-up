"""Industry presets for RevUp workspaces.

Chosen at signup (or later on the Radar screen). One preset shapes three
client-facing surfaces at once:

- Radar: which feed signals get ingested (keywords) and the post themes
  shown as guidance.
- Responder: tone, qualifying questions and FAQ starters for dry-run replies.
- Drafts: default hashtags appended to radar-generated post drafts.

Keys are stored on Workspace.industry; keep them stable.
"""

INDUSTRY_PRESETS = {
    "general": {
        "label": "General / other",
        "radar_keywords": [],  # no filtering: every feed item is relevant
        "post_themes": ["Industry news with a local angle", "Customer questions answered", "Behind-the-scenes"],
        "hashtags": [],
        "responder_tone": "warm and professional",
        "responder_questions": [],
        "responder_faqs": [],
    },
    "restaurant": {
        "label": "Restaurants & Food",
        "radar_keywords": ["restaurant", "food", "menu", "chef", "eatery", "takeaway", "braai", "cuisine", "dining", "coffee", "bakery", "catering", "halaal", "vegan"],
        "post_themes": ["Today's specials and limited-time dishes", "Behind the pass: meet the kitchen", "Customer favourites and reviews", "Weekend and payday promos", "Local food culture and events"],
        "hashtags": ["#JoburgEats", "#SAFoodie"],
        "responder_tone": "warm and welcoming",
        "responder_questions": [
            "Would you like a table, and for how many people?",
            "Is this for today or another day - and what time suits you?",
            "Any dietary needs we should know about (halaal, vegetarian, allergies)?",
        ],
        "responder_faqs": ["Do I need to book, or can I walk in?", "What's on the menu today?", "Do you deliver or offer collection?"],
    },
    "real_estate": {
        "label": "Real Estate",
        "radar_keywords": ["property", "housing", "bond", "mortgage", "transfer", "estate", "rental", "conveyancing", "suburb"],
        "post_themes": ["Rate moves and what they mean for buyers", "Suburb spotlight", "Listing marketing tips", "First-time buyer guidance"],
        "hashtags": ["#PropertySA", "#RealEstateSA"],
        "responder_tone": "warm and professional",
        "responder_questions": [
            "What price range are you working with?",
            "Are you pre-approved for a bond, or buying cash?",
            "Would a weekday late afternoon or a Saturday morning suit you better?",
        ],
        "responder_faqs": ["Is the property still available?", "Can I book a viewing?", "What are the transfer costs?"],
    },
    "dental": {
        "label": "Dentists & Clinics",
        "radar_keywords": ["dental", "dentist", "clinic", "healthcare", "medical aid", "teeth", "oral", "health"],
        "post_themes": ["Oral health tips patients actually read", "Medical aid and payment options", "New treatment announcements", "School-holiday checkup reminders"],
        "hashtags": ["#DentalCareSA", "#HealthySmile"],
        "responder_tone": "caring and reassuring",
        "responder_questions": [
            "Is this for a check-up, or is something bothering you?",
            "Do you have medical aid, and if so which one?",
            "Would a morning or afternoon appointment suit you better?",
        ],
        "responder_faqs": ["Do you accept my medical aid?", "How do I book an appointment?", "Do you see children?"],
    },
    "auto": {
        "label": "Car Dealers",
        "radar_keywords": ["car", "vehicle", "auto", "dealership", "bakkie", "sedan", "suv", "fuel", "petrol", "diesel"],
        "post_themes": ["Fuel price moves and what they mean for buyers", "New stock announcements", "Finance and trade-in explainers", "Weekend test-drive invites"],
        "hashtags": ["#CarsSA", "#AutoDealer"],
        "responder_tone": "helpful and energetic",
        "responder_questions": [
            "What's your budget range?",
            "Are you trading in, and do you need finance?",
            "When suits you for a test drive - weekday or Saturday?",
        ],
        "responder_faqs": ["Is this vehicle still in stock?", "Can I book a test drive?", "Do you take trade-ins?"],
    },
}

INDUSTRY_CHOICES = [(key, p["label"]) for key, p in INDUSTRY_PRESETS.items()]
DEFAULT_INDUSTRY = "general"


def get_preset(industry: str | None) -> dict:
    return INDUSTRY_PRESETS.get(industry or DEFAULT_INDUSTRY, INDUSTRY_PRESETS[DEFAULT_INDUSTRY])
