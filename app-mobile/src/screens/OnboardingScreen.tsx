import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  DEMO_LANGS,
  LANG_NAMES,
  useLanguage,
} from "../context/LanguageContext";
import { generatePersona, type Lang } from "../services/runtime";
import type {
  Depth,
  Knowledge,
  Motivation,
  OnboardingAnswers,
  StoredProfile,
  VisitTime,
} from "../services/profile";
import { colors, fonts, radii } from "../theme";

type Props = {
  onComplete: (stored: StoredProfile) => void;
  initialAnswers?: OnboardingAnswers;
};

type Option<T> = { value: T; label: string };

const MOTIVATION_OPTIONS: Option<Motivation>[] = [
  { value: "contemplate", label: "Just to take it in" },
  { value: "understand", label: "To understand it" },
  { value: "stories", label: "The stories behind it" },
];

const KNOWLEDGE_OPTIONS: Option<Knowledge>[] = [
  { value: "newcomer", label: "I'm new to this" },
  { value: "comfortable", label: "I know the basics" },
  { value: "expert", label: "I know my stuff" },
];

const DEPTH_OPTIONS: Option<Depth>[] = [
  { value: "quick", label: "Just the highlight" },
  { value: "standard", label: "A solid take" },
  { value: "deep", label: "The deep dive" },
];

const TIME_OPTIONS: Option<VisitTime>[] = [
  { value: "short", label: "Just passing through" },
  { value: "medium", label: "An hour or so" },
  { value: "long", label: "No rush at all" },
];

const LAST_STEP = 4;

export function OnboardingScreen({ onComplete, initialAnswers }: Props) {
  const { lang, setLang } = useLanguage();
  const [step, setStep] = useState(0);
  const [motivation, setMotivation] = useState<Motivation | undefined>(
    initialAnswers?.motivation,
  );
  const [knowledge, setKnowledge] = useState<Knowledge | undefined>(
    initialAnswers?.knowledge,
  );
  const [depth, setDepth] = useState<Depth | undefined>(initialAnswers?.depth);
  const [time, setTime] = useState<VisitTime | undefined>(initialAnswers?.time);
  const [freeText, setFreeText] = useState(initialAnswers?.free_text ?? "");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{
    summary: string;
    stored: StoredProfile;
  } | null>(null);

  const finish = async (answers: OnboardingAnswers) => {
    if (busy) return;
    setBusy(true);
    let personaSummary: string | null = null;
    try {
      personaSummary = await generatePersona({
        lang,
        onboarding: {
          motivation: answers.motivation,
          knowledge: answers.knowledge,
          time: answers.time,
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
        motivation: answers.motivation,
        knowledge: answers.knowledge,
        depth: answers.depth,
        time: answers.time,
        free_text: answers.free_text ?? null,
        persona_summary: personaSummary,
      },
    };
    setBusy(false);
    if (personaSummary) {
      setReveal({ summary: personaSummary, stored });
    } else {
      onComplete(stored);
    }
  };

  const buildAnswers = (
    overrides: Partial<OnboardingAnswers> = {},
  ): OnboardingAnswers => ({
    motivation,
    knowledge,
    depth,
    time,
    free_text: freeText.trim() || undefined,
    ...overrides,
  });

  const onStart = (answers = buildAnswers()) => {
    finish({
      ...answers,
    });
  };

  const onNext = () => {
    if (step < LAST_STEP) {
      setStep((current) => current + 1);
    } else {
      onStart();
    }
  };

  const onSkip = () => {
    if (step === 1) {
      setMotivation(undefined);
      setStep(2);
    } else if (step === 2) {
      setKnowledge(undefined);
      setStep(3);
    } else if (step === 3) {
      setDepth(undefined);
      setTime(undefined);
      setStep(4);
    } else if (step === 4) {
      setFreeText("");
      onStart(buildAnswers({ free_text: undefined }));
    } else {
      setStep((current) => Math.min(LAST_STEP, current + 1));
    }
  };

  const onBack = () => setStep((current) => Math.max(0, current - 1));

  const renderStep = (): ReactNode => {
    if (step === 0) {
      return (
        <Question label="Choose the voice">
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
      );
    }

    if (step === 1) {
      return (
        <Question label="What should the first minute feel like?">
          <View style={styles.optionRow}>
            {MOTIVATION_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={motivation === o.value}
                onPress={() => setMotivation(o.value)}
              />
            ))}
          </View>
        </Question>
      );
    }

    if (step === 2) {
      return (
        <Question label="How much should Laszlo assume?">
          <View style={styles.optionRow}>
            {KNOWLEDGE_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={knowledge === o.value}
                onPress={() => setKnowledge(o.value)}
              />
            ))}
          </View>
        </Question>
      );
    }

    if (step === 3) {
      return (
        <>
          <Question label="How deep should each stop go?">
            <View style={styles.optionRow}>
              {DEPTH_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  active={depth === o.value}
                  onPress={() => setDepth(o.value)}
                />
              ))}
            </View>
          </Question>
          <Question label="Visit tempo">
            <View style={styles.optionRow}>
              {TIME_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  active={time === o.value}
                  onPress={() => setTime(o.value)}
                />
              ))}
            </View>
          </Question>
        </>
      );
    }

    return (
      <Question label="Anything to tune?">
        <TextInput
          style={styles.freeText}
          value={freeText}
          onChangeText={setFreeText}
          placeholder="An architect who loves how light falls..."
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={240}
        />
      </Question>
    );
  };

  if (reveal) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text style={styles.kicker}>LASZLO</Text>
          <Text style={styles.title}>Your guide is tuned</Text>
        </View>
        <View style={styles.revealCard}>
          <Text style={styles.revealText}>"{reveal.summary}"</Text>
        </View>
        <Pressable
          style={styles.primary}
          onPress={() => onComplete(reveal.stored)}
        >
          <Text style={styles.primaryText}>LET'S GO →</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.kicker}>LASZLO · {step + 1} / {LAST_STEP + 1}</Text>
        <Text style={styles.title}>Tune your guide</Text>
      </View>

      <View style={styles.stage}>{renderStep()}</View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.secondary, step === 0 && styles.secondaryDisabled]}
          onPress={onBack}
          disabled={step === 0 || busy}
        >
          <Text style={styles.secondaryText}>BACK</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onSkip} disabled={busy}>
          <Text style={styles.secondaryText}>SKIP</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, busy && styles.primaryDisabled]}
          onPress={onNext}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryText}>
              {step === LAST_STEP ? "REVEAL" : "NEXT"}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Question({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
    flexGrow: 1,
    gap: 22,
  },
  head: {
    gap: 8,
  },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 32,
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    minHeight: 340,
    gap: 20,
  },
  question: {
    gap: 14,
  },
  questionLabel: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 27,
    lineHeight: 32,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minHeight: 44,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primary: {
    minHeight: 48,
    minWidth: 108,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: colors.onAccent,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0,
  },
  secondary: {
    minHeight: 48,
    minWidth: 74,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
  },
  secondaryDisabled: {
    opacity: 0.35,
  },
  secondaryText: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0,
  },
  freeText: {
    minHeight: 132,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 15,
    backgroundColor: "rgba(8, 6, 4, 0.28)",
    textAlignVertical: "top",
  },
  revealCard: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 22,
    paddingVertical: 26,
    backgroundColor: colors.accentSoft,
  },
  revealText: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 20,
    lineHeight: 29,
  },
});
