import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import type { Interest, Level, Pace } from "../../domain/persona";

type Props = {
  onComplete: (answers: {
    pace: Pace[];
    level: Level[];
    interests: Interest[];
    freeText: string;
  }) => void;
  onSkip: () => void;
};

type ChipData<T extends string> = { value: T; label: string };

const PACE_OPTIONS: ChipData<Pace>[] = [
  { value: "stroll", label: "Stroll" },
  { value: "easy", label: "Easy" },
  { value: "hurry", label: "Hurry" }
];

const LEVEL_OPTIONS: ChipData<Level>[] = [
  { value: "new", label: "New" },
  { value: "curious", label: "Curious" },
  { value: "connoisseur", label: "Connoisseur" }
];

const INTEREST_OPTIONS: ChipData<Interest>[] = [
  { value: "stories", label: "Stories" },
  { value: "the-people", label: "The people" },
  { value: "technique", label: "Technique" },
  { value: "symbols", label: "Symbols" }
];

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

export function QcmScreen({ onComplete, onSkip }: Props) {
  const [pace, setPace] = useState<Pace[]>([]);
  const [level, setLevel] = useState<Level[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [freeText, setFreeText] = useState("");

  const handleDone = () => {
    onComplete({ pace, level, interests, freeText });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Section label="PACE · multi-select">
        <ChipRow
          options={PACE_OPTIONS}
          selected={pace}
          onToggle={(v) => setPace(toggle(pace, v))}
        />
      </Section>

      <Section label="LEVEL · multi-select">
        <ChipRow
          options={LEVEL_OPTIONS}
          selected={level}
          onToggle={(v) => setLevel(toggle(level, v))}
        />
      </Section>

      <Section label="INTEREST · multi-select">
        <ChipRow
          options={INTEREST_OPTIONS}
          selected={interests}
          onToggle={(v) => setInterests(toggle(interests, v))}
        />
      </Section>

      <View style={styles.freeTextBox}>
        <TextInput
          style={styles.freeTextInput}
          placeholder="…and the people behind the work"
          placeholderTextColor="#b0a895"
          value={freeText}
          onChangeText={setFreeText}
          multiline
        />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneText}>Build my guide</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Section({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onToggle
}: {
  options: ChipData<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <Pressable
            key={opt.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(opt.value)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ece6da"
  },
  content: {
    padding: 28,
    paddingTop: 48,
    gap: 20
  },
  section: {
    gap: 10
  },
  sectionLabel: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: "#8a8073"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#cfc6b5",
    backgroundColor: "transparent"
  },
  chipActive: {
    backgroundColor: "#c98a3c",
    borderColor: "#c98a3c"
  },
  chipText: {
    fontFamily: "System",
    fontSize: 15,
    fontWeight: "600",
    color: "#211d18"
  },
  chipTextActive: {
    color: "#fff"
  },
  freeTextBox: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cfc6b5",
    borderStyle: "dashed",
    backgroundColor: "#fff"
  },
  freeTextInput: {
    fontFamily: "System",
    fontSize: 14,
    color: "#211d18",
    minHeight: 40
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 14
  },
  doneButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#211d18",
    alignItems: "center"
  },
  doneText: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "700",
    color: "#fff"
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 20
  },
  skipText: {
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "600",
    color: "#8a8073"
  }
});
