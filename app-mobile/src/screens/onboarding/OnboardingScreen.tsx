import { useState } from "react";
import { View, StyleSheet } from "react-native";

import type {
  Interest,
  Language,
  Level,
  Pace,
  Persona
} from "../../domain/persona";
import { DEFAULT_PERSONA } from "../../domain/persona";

import { LanguageScreen } from "./LanguageScreen";
import { PersonaRevealScreen } from "./PersonaRevealScreen";
import { QcmScreen } from "./QcmScreen";

type Props = {
  onComplete: (persona: Persona) => void;
};

type Step = "language" | "qcm" | "reveal";

function buildPersona(
  language: Language,
  pace: Pace[],
  level: Level[],
  interests: Interest[],
  freeText: string
): Persona {
  const lanes: string[] = [];
  if (interests.includes("technique")) lanes.push("Technique");
  if (interests.includes("the-people")) lanes.push("The people");
  if (interests.includes("stories")) lanes.push("Stories");
  if (interests.includes("symbols")) lanes.push("Symbols");
  if (pace.includes("easy")) lanes.push("Easy pace");
  else if (pace.includes("stroll")) lanes.push("Stroll pace");
  else if (pace.includes("hurry")) lanes.push("Quick pace");

  const interestDescription = interests
    .map((i) => i.replace("-", " "))
    .join(" and ");
  const summary =
    freeText ||
    `Tuned to ${interestDescription || "a broad exploration"}, at a ${pace[0] || "comfortable"} pace.`;

  return {
    summary,
    lanes,
    language,
    answers: { language, pace, level, interests, freeText }
  };
}

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("language");
  const [language, setLanguage] = useState<Language>("en");
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);

  const handleLanguage = (lang: Language) => {
    setLanguage(lang);
    setStep("qcm");
  };

  const handleQcm = (answers: {
    pace: Pace[];
    level: Level[];
    interests: Interest[];
    freeText: string;
  }) => {
    const built = buildPersona(
      language,
      answers.pace,
      answers.level,
      answers.interests,
      answers.freeText
    );
    setPersona(built);
    setStep("reveal");
  };

  const handleSkip = () => {
    const skipPersona: Persona = { ...DEFAULT_PERSONA, language };
    onComplete(skipPersona);
  };

  return (
    <View style={styles.root}>
      {step === "language" && <LanguageScreen onSelect={handleLanguage} />}
      {step === "qcm" && <QcmScreen onComplete={handleQcm} onSkip={handleSkip} />}
      {step === "reveal" && (
        <PersonaRevealScreen
          persona={persona}
          onContinue={() => onComplete(persona)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
