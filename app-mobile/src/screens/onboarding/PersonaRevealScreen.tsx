import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Persona } from "../../domain/persona";

type Props = {
  persona: Persona;
  onContinue: () => void;
};

export function PersonaRevealScreen({ persona, onContinue }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.indicator}>
        <View style={styles.dot} />
        <Text style={styles.indicatorLabel}>1 HIDDEN CALL</Text>
      </View>

      <Text style={styles.heading}>Your guide is ready.</Text>
      <Text style={styles.subheading}>{persona.summary}</Text>

      <View style={styles.lanes}>
        {persona.lanes.map((lane) => (
          <View key={lane} style={styles.laneChip}>
            <Text style={styles.laneText}>{lane}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Shaped once, invisible after. Evolves intra-conversation, not as a saved
        rewrite.
      </Text>

      <Pressable style={styles.continueButton} onPress={onContinue}>
        <Text style={styles.continueText}>Start exploring</Text>
      </Pressable>
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
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c98a3c",
    opacity: 0.8
  },
  indicatorLabel: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: "#c98a3c"
  },
  heading: {
    fontFamily: "System",
    fontSize: 34,
    fontWeight: "700",
    color: "#211d18",
    marginBottom: 10
  },
  subheading: {
    fontFamily: "System",
    fontSize: 17,
    fontWeight: "500",
    color: "#3f392f",
    lineHeight: 24,
    marginBottom: 20
  },
  lanes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24
  },
  laneChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(201, 138, 60, 0.4)",
    backgroundColor: "rgba(201, 138, 60, 0.09)"
  },
  laneText: {
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "500",
    color: "#211d18"
  },
  note: {
    fontFamily: "System",
    fontSize: 12,
    color: "#6f6657",
    lineHeight: 18,
    marginBottom: 32
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#211d18",
    alignItems: "center"
  },
  continueText: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "700",
    color: "#fff"
  }
});
