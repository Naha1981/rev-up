/** Industry presets for reply tone + qualifying questions.
 * Mirrors apps/common/industry_presets.py - keep keys in sync. */

/** Qualifying-question topics a customer's message can already answer. */
export type QuestionKey = "what" | "party" | "when" | "dietary" | "budget" | "finance" | "issue" | "medical" | "reach";

export interface IndustryPreset {
  tone: string;
  /** Qualifying questions used in the instant reply. */
  questions: string[];
  /** Topic of each question, same order as questions; answered topics are skipped. */
  questionKeys: QuestionKey[];
  /** The "what I can do for you" line, industry-flavored. */
  cta: string;
  /** What the enquiry is about when no listing/product was named. */
  about: string;
  /** Closing line confirming what happens next. */
  nextStep: string;
}

export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  general: {
    tone: "warm and professional",
    questions: [
      "What exactly do you need?",
      "When do you need it by?",
      "Anything else the team should know?",
    ],
    questionKeys: ["what", "when", "reach"],
    cta: "I can help you right away.",
    about: "",
    nextStep: "I'll pass this to the team and confirm here on WhatsApp shortly.",
  },
  restaurant: {
    tone: "warm and welcoming",
    questions: [
      "How many people are you?",
      "What day and time would suit you?",
      "Any dietary needs or allergies we should note for the kitchen?",
    ],
    questionKeys: ["party", "when", "dietary"],
    cta: "I can check our tables and book you in right away.",
    about: "a table",
    nextStep: "I'll confirm your table here on WhatsApp shortly.",
  },
  real_estate: {
    tone: "warm and professional",
    questions: [
      "What price range are you working with?",
      "Are you pre-approved for a bond, or buying cash?",
      "Would a weekday late afternoon or a Saturday morning suit you better?",
    ],
    questionKeys: ["budget", "finance", "when"],
    cta: "I can book you in for a viewing right away.",
    about: "the property",
    nextStep: "I'll confirm your viewing here on WhatsApp shortly.",
  },
  dental: {
    tone: "caring and reassuring",
    questions: [
      "Is this for a check-up, or is something bothering you?",
      "Do you have medical aid, and if so which one?",
      "Would a morning or afternoon appointment suit you better?",
    ],
    questionKeys: ["issue", "medical", "when"],
    cta: "I can book your appointment right away.",
    about: "your appointment",
    nextStep: "I'll confirm your appointment here on WhatsApp shortly.",
  },
  auto: {
    tone: "helpful and energetic",
    questions: [
      "What's your budget range?",
      "Are you trading in, and do you need finance?",
      "When suits you for a test drive - weekday or Saturday?",
    ],
    questionKeys: ["budget", "finance", "when"],
    cta: "I can set up a test drive for you right away.",
    about: "the car",
    nextStep: "I'll confirm your test drive here on WhatsApp shortly.",
  },
};

export function presetFor(industry: string | undefined): IndustryPreset {
  return INDUSTRY_PRESETS[industry ?? "general"] ?? INDUSTRY_PRESETS["general"]!;
}
