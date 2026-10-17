/** Industry presets for reply tone + qualifying questions.
 * Mirrors apps/common/industry_presets.py - keep keys in sync. */

export interface IndustryPreset {
  tone: string;
  /** Three qualifying questions used in the instant reply. */
  questions: string[];
  /** The "what I can do for you" line, industry-flavored. */
  cta: string;
}

export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  general: {
    tone: "warm and professional",
    questions: [
      "What exactly are you looking for?",
      "Do you have a budget or price range in mind?",
      "When would suit you to take the next step?",
    ],
    cta: "I can help you right away.",
  },
  real_estate: {
    tone: "warm and professional",
    questions: [
      "What price range are you working with?",
      "Are you pre-approved for a bond, or buying cash?",
      "Would a weekday late afternoon or a Saturday morning suit you better?",
    ],
    cta: "I can book you in for a viewing right away.",
  },
  dental: {
    tone: "caring and reassuring",
    questions: [
      "Is this for a check-up, or is something bothering you?",
      "Do you have medical aid, and if so which one?",
      "Would a morning or afternoon appointment suit you better?",
    ],
    cta: "I can book your appointment right away.",
  },
  auto: {
    tone: "helpful and energetic",
    questions: [
      "What's your budget range?",
      "Are you trading in, and do you need finance?",
      "When suits you for a test drive - weekday or Saturday?",
    ],
    cta: "I can set up a test drive for you right away.",
  },
};

export function presetFor(industry: string | undefined): IndustryPreset {
  return INDUSTRY_PRESETS[industry ?? "general"] ?? INDUSTRY_PRESETS["general"]!;
}
