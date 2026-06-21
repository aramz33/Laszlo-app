import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DEMO_LANGS,
  LANG_NAMES,
  useLanguage,
} from "../context/LanguageContext";
import { generatePersona, type Lang } from "../services/runtime";
import type {
  Allure,
  Interet,
  Niveau,
  OnboardingAnswers,
  StoredProfile,
} from "../services/profile";
import { colors, fonts, radii } from "../theme";

type Props = {
  onComplete: (stored: StoredProfile) => void;
  initialAnswers?: OnboardingAnswers;
};

type Option<T> = { value: T; label: string };

const ALLURE_OPTIONS: Option<Allure>[] = [
  { value: "court", label: "Quick" },
  { value: "moyen", label: "Balanced" },
  { value: "long", label: "In depth" },
];

const NIVEAU_OPTIONS: Option<Niveau>[] = [
  { value: "debutant", label: "New to it" },
  { value: "amateur", label: "Curious" },
  { value: "expert", label: "Connoisseur" },
];

const INTEREST_OPTIONS: Option<Interet>[] = [
  { value: "technique", label: "Technique" },
  { value: "people", label: "The people" },
  { value: "stories", label: "Stories" },
  { value: "symbols", label: "Symbols" },
];

export function OnboardingScreen({ onComplete, initialAnswers }: Props) {
  const { lang, setLang } = useLanguage();
  const [allure, setAllure] = useState<Allure | undefined>(
    initialAnswers?.allure,
  );
  const [niveau, setNiveau] = useState<Niveau | undefined>(
    initialAnswers?.niveau,
  );
  const [interets, setInterets] = useState<Interet[]>(
    initialAnswers?.interets ?? [],
  );
  const [busy, setBusy] = useState(false);

  const toggleInterest = (value: Interet) => {
    setInterets((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const finish = async (answers: OnboardingAnswers) => {
    if (busy) return;
    setBusy(true);
    let personaSummary: string | null = null;
    try {
      personaSummary = await generatePersona({
        lang,
        onboarding: {
          allure: answers.allure,
          niveau: answers.niveau,
          interets: answers.interets,
          free_text: answers.free_text ?? null,
        },
      });
    } catch {
      // Persona is best-effort: still proceed with the raw axes.
      personaSummary = null;
    }
    const stored: StoredProfile = {
      lang,
      answers,
      profile: {
        allure: answers.allure,
        niveau: answers.niveau,
        interets: answers.interets,
        free_text: answers.free_text ?? null,
        persona_summary: personaSummary,
      },
    };
    setBusy(false);
    onComplete(stored);
  };

  const onStart = () => {
    finish({ allure, niveau, interets });
  };

  const onSkip = () => {
    onComplete({
      lang,
      answers: { interets: [] },
      profile: {},
    });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.kicker}>LASZLO</Text>
        <Text style={styles.title}>Tune your guide</Text>
        <Text style={styles.lede}>
          Three quick taps shape how the guide talks to you. Skip anytime.
        </Text>
      </View>

      <Question label="Language">
        <View style={styles.optionRow}>
          {DEMO_LANGS.map((value: Lang) => (
            <Chip
              key={value}
              label={LANG_NAMES[value]}
              active={lang === value}
              onPress={() => setLang(value)}
            />
          ))}
        </View>
      </Question>

      <Question label="How much do you want to hear?">
        <View style={styles.optionRow}>
          {ALLURE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={allure === o.value}
              onPress={() => setAllure(o.value)}
            />
          ))}
        </View>
      </Question>

      <Question label="How familiar are you with art?">
        <View style={styles.optionRow}>
          {NIVEAU_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={niveau === o.value}
              onPress={() => setNiveau(o.value)}
            />
          ))}
        </View>
      </Question>

      <Question label="What pulls you in? (pick any)">
        <View style={styles.optionRow}>
          {INTEREST_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={interets.includes(o.value)}
              onPress={() => toggleInterest(o.value)}
            />
          ))}
        </View>
      </Question>

      <Pressable
        style={[styles.primary, busy && styles.primaryDisabled]}
        onPress={onStart}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.onAccent} />
        ) : (
          <Text style={styles.primaryText}>START</Text>
        )}
      </Pressable>

      <Pressable style={styles.skip} onPress={onSkip} disabled={busy}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </ScrollView>
  );
}

function Question({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom,
  },
  content: {
    padding: 24,
    paddingTop: 64,
    gap: 22,
  },
  head: {
    gap: 8,
  },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 32,
  },
  lede: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 16,
    lineHeight: 23,
  },
  question: {
    gap: 10,
  },
  questionLabel: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 18,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.glass,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
  },
  chipTextActive: {
    color: colors.text,
  },
  primary: {
    marginTop: 8,
    borderRadius: radii.pill,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: colors.accent,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: colors.onAccent,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
  },
  skip: {
    alignItems: "center",
    paddingVertical: 6,
  },
  skipText: {
    color: colors.textFaint,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
});
