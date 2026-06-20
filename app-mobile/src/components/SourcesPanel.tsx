import { StyleSheet, Text, View } from "react-native";

type Source = {
  label: string;
};

type Props = {
  sources: Source[];
};

const DEFAULT_SOURCES: Source[] = [
  { label: "Rijksmuseum collection record" },
  { label: "Curated KB — 1,025 works ingested" },
  { label: "Conservation archive, restoration notes" }
];

export function SourcesPanel({ sources = DEFAULT_SOURCES }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.header}>PROVENANCE</Text>
      {sources.map((source, i) => (
        <View key={i} style={styles.sourceRow}>
          <View style={styles.dot} />
          <Text style={styles.sourceText}>{source.label}</Text>
        </View>
      ))}
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Curated &amp; grounded — the anti-wrapper. Shown on every answer.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(33, 29, 24, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    gap: 10
  },
  header: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: "#8a8073"
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#c98a3c",
    marginTop: 5
  },
  sourceText: {
    fontFamily: "System",
    fontSize: 13,
    lineHeight: 19,
    color: "#5f574a",
    flex: 1
  },
  note: {
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(201, 138, 60, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(201, 138, 60, 0.3)"
  },
  noteText: {
    fontFamily: "System",
    fontSize: 11,
    lineHeight: 17,
    color: "#5f574a"
  }
});
