import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Artwork } from "../../domain/artwork";
import type { SessionMemory } from "../../domain/session";

type Props = {
  fromArtwork: Artwork;
  toArtwork: Artwork;
  memory: SessionMemory;
  onArrive: () => void;
  onBack: () => void;
};

export function NavigationScreen({
  fromArtwork,
  toArtwork,
  memory,
  onArrive,
  onBack
}: Props) {
  const hasMemory = memory.entries.length > 0;

  return (
    <View style={styles.root}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      {/* AR Arrow section */}
      <View style={styles.arrowSection}>
        <View style={styles.arrowCircle}>
          <Text style={styles.arrowIcon}>→</Text>
        </View>
        <Text style={styles.distance}>~5 m</Text>
        <Text style={styles.direction}>TO YOUR RIGHT</Text>
      </View>

      {/* Gallery layout hint */}
      <View style={styles.galleryRow}>
        <View style={styles.galleryThumb} />
        <View style={[styles.galleryThumb, styles.galleryThumbActive]} />
        <View style={styles.galleryThumb} />
      </View>
      <Text style={styles.galleryLabel}>GALLERY LAYOUT · 3 WORKS</Text>

      {/* Destination info */}
      <View style={styles.destinationCard}>
        <Text style={styles.destinationKicker}>NEXT ARTWORK</Text>
        <Text style={styles.destinationTitle}>{toArtwork.title}</Text>
        <Text style={styles.destinationSubtitle}>{toArtwork.subtitle}</Text>

        {hasMemory && (
          <View style={styles.memoryLink}>
            <Text style={styles.memoryLinkIcon}>↺</Text>
            <Text style={styles.memoryLinkText}>
              FROM MEMORY · GRAPH-LINKED
            </Text>
          </View>
        )}

        <Text style={styles.connectionHint}>
          {hasMemory
            ? `The guide will connect ${toArtwork.title} to what you asked about ${fromArtwork.title} — carrying the whole session's memory forward.`
            : `Point at ${toArtwork.title} to start a new conversation.`}
        </Text>
      </View>

      {/* Arrive / start button */}
      <Pressable style={styles.arriveButton} onPress={onArrive}>
        <Text style={styles.arriveText}>Commencer cette œuvre ▸</Text>
      </Pressable>

      {/* 2D fallback note */}
      <View style={styles.fallbackNote}>
        <Text style={styles.fallbackBadge}>VIO LOST</Text>
        <Text style={styles.fallbackText}>
          If world-tracking drops, this flat 2D arrow takes over. The
          destination stays the same.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fbf9f4",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 16
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(33, 29, 24, 0.2)"
  },
  backText: {
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "700",
    color: "#211d18"
  },
  arrowSection: {
    alignItems: "center",
    gap: 8,
    marginTop: 40
  },
  arrowCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: "rgba(201, 138, 60, 0.45)",
    alignItems: "center",
    justifyContent: "center"
  },
  arrowIcon: {
    fontSize: 42,
    color: "#c98a3c",
    transform: [{ rotate: "38deg" }]
  },
  distance: {
    fontFamily: "System",
    fontSize: 36,
    fontWeight: "700",
    color: "#211d18"
  },
  direction: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: "#8a8073"
  },
  galleryRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  galleryThumb: {
    width: 22,
    height: 28,
    borderWidth: 1,
    borderColor: "#cfc6b5",
    backgroundColor: "#e7e0d2"
  },
  galleryThumbActive: {
    borderWidth: 1.5,
    borderColor: "#c98a3c",
    backgroundColor: "transparent"
  },
  galleryLabel: {
    fontFamily: "System",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: "#9a907d"
  },
  destinationCard: {
    width: "100%",
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e3dac8",
    gap: 6
  },
  destinationKicker: {
    fontFamily: "System",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: "#c98a3c"
  },
  destinationTitle: {
    fontFamily: "System",
    fontSize: 22,
    fontWeight: "700",
    color: "#211d18"
  },
  destinationSubtitle: {
    fontFamily: "System",
    fontSize: 13,
    color: "#6f6657"
  },
  memoryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(201, 138, 60, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 138, 60, 0.32)",
    alignSelf: "flex-start"
  },
  memoryLinkIcon: {
    fontSize: 12,
    color: "#c98a3c"
  },
  memoryLinkText: {
    fontFamily: "System",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#c98a3c"
  },
  connectionHint: {
    fontFamily: "System",
    fontSize: 13,
    lineHeight: 19,
    color: "#6f6657",
    marginTop: 4
  },
  arriveButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#211d18",
    alignItems: "center"
  },
  arriveText: {
    fontFamily: "System",
    fontSize: 15,
    fontWeight: "700",
    color: "#fff"
  },
  fallbackNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(33, 29, 24, 0.12)",
    borderStyle: "dashed"
  },
  fallbackBadge: {
    fontFamily: "System",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#c0473b",
    borderWidth: 1,
    borderColor: "rgba(192, 71, 59, 0.4)",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 7
  },
  fallbackText: {
    flex: 1,
    fontFamily: "System",
    fontSize: 12,
    lineHeight: 17,
    color: "#6f6657"
  }
});
