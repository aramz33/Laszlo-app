import { useState } from "react";
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

export function OnboardingScreen({ onComplete, initialAnswers }: Props) {
  const { lang, setLang } = useLanguage();
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

  const onStart = () => {
    finish({
      motivation,
      knowledge,
      depth,
      time,
      free_text: freeText.trim() || undefined,
    });
  };

  if (reveal) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text style={styles.kicker}>LASZLO</Text>
          <Text style={styles.title}>Here's how I read you</Text>
        </View>
        <View style={styles.revealCard}>
          <Text style={styles.revealText}>“{reveal.summary}”</Text>
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
        <Text style={styles.kicker}>LASZLO</Text>
        <Text style={styles.title}>Tune your guide</Text>
      </View>

      <Question label="Laszlo speaks…">
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

      <Question label="What are you here for?">
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

      <Question label="Art and you?">
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

      <Question label="From each work, you want…">
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

      <Question label="How much time do you have?">
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

      <Question label="Tell Laszlo more (optional)">
        <TextInput
          style={styles.freeText}
          value={freeText}
          onChangeText={setFreeText}
          placeholder="An architect who loves how light falls…"
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={240}
        />
        <Text style={styles.freeHint}>
          The more you share, the sharper I get.
        </Text>
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
  freeText: {
    minHeight: 64,
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
  freeHint: {
    color: colors.textFaint,
    fontFamily: fonts.serifRegular,
    fontSize: 13,
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
