export type Language = "fr" | "nl" | "en";

export type Pace = "stroll" | "easy" | "hurry";
export type Level = "new" | "curious" | "connoisseur";
export type Interest = "stories" | "the-people" | "technique" | "symbols";

export type OnboardingAnswers = {
  language: Language;
  pace: Pace[];
  level: Level[];
  interests: Interest[];
  freeText: string;
};

export type Persona = {
  summary: string;
  lanes: string[];
  language: Language;
  answers: OnboardingAnswers;
};

export const DEFAULT_PERSONA: Persona = {
  summary: "Tuned to how things are made, and the people behind them.",
  lanes: ["Technique", "The people", "Easy pace"],
  language: "en",
  answers: {
    language: "en",
    pace: ["easy"],
    level: ["curious"],
    interests: ["technique", "the-people"],
    freeText: ""
  }
};
