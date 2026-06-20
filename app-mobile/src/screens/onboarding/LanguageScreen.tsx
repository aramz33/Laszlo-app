import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Language } from "../../domain/persona";

type Props = {
  onSelect: (lang: Language) => void;
};

const LANGUAGES: { code: Language; label: string; hint: string }[] = [
  { code: "fr", label: "Français", hint: "FR →" },
  { code: "nl", label: "Nederlands", hint: "NL →" },
  { code: "en", label: "English", hint: "EN →" }
];

export function LanguageScreen({ onSelect }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Bonjour.</Text>
        <Text style={styles.subGreeting}>{"Goedendag.\nHello."}</Text>
      </View>

      <View style={styles.options}>
        {LANGUAGES.map((lang) => (
          <Pressable
            key={lang.code}
            style={styles.option}
            onPress={() => onSelect(lang.code)}
          >
            <Text style={styles.optionLabel}>{lang.label}</Text>
            <Text style={styles.optionHint}>{lang.hint}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.note}>
        Switchable anytime later — UI generates in the target language.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ece6da",
    padding: 28,
    justifyContent: "center"
  },
  header: {
    marginBottom: 32
  },
  greeting: {
    fontFamily: "System",
    fontSize: 42,
    fontWeight: "700",
    color: "#211d18"
  },
  subGreeting: {
    fontFamily: "System",
    fontSize: 24,
    fontWeight: "600",
    color: "#8a8073",
    marginTop: 8,
    lineHeight: 32
  },
  options: {
    gap: 12
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cfc6b5",
    backgroundColor: "#fff"
  },
  optionLabel: {
    fontFamily: "System",
    fontSize: 18,
    fontWeight: "600",
    color: "#211d18"
  },
  optionHint: {
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "500",
    color: "#c98a3c",
    letterSpacing: 0.5
  },
  note: {
    fontFamily: "System",
    fontSize: 12,
    color: "#6f6657",
    marginTop: 20,
    lineHeight: 18
  }
});
