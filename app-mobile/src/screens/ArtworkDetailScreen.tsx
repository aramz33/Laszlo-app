import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Artwork } from "../domain/artwork";

type Props = {
  artwork: Artwork;
  onBack: () => void;
};

export function ArtworkDetailScreen({ artwork, onBack }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Image source={{ uri: artwork.imageUrl }} style={styles.image} />

      <View style={styles.header}>
        <Text style={styles.location}>{artwork.location}</Text>
        <Text style={styles.title}>{artwork.title}</Text>
        <Text style={styles.subtitle}>{artwork.subtitle}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hotspots</Text>
        {artwork.hotspots.map((hotspot) => (
          <View key={hotspot.id} style={styles.hotspotRow}>
            <Text style={styles.hotspotTitle}>{hotspot.title}</Text>
            <Text style={styles.hotspotAspect}>{hotspot.aspect}</Text>
            <Text style={styles.hotspotText}>{hotspot.narrationText}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111"
  },
  content: {
    padding: 18,
    gap: 18
  },
  backButton: {
    alignSelf: "flex-start",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  backText: {
    color: "#f7f1e7",
    fontSize: 14,
    fontWeight: "700"
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#26231f"
  },
  header: {
    gap: 6
  },
  location: {
    color: "#8fc7ff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#f7f1e7",
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: "#c5beb4",
    fontSize: 15
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    color: "#f7f1e7",
    fontSize: 18,
    fontWeight: "800"
  },
  hotspotRow: {
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  },
  hotspotTitle: {
    color: "#f7f1e7",
    fontSize: 16,
    fontWeight: "800"
  },
  hotspotAspect: {
    color: "#8fc7ff",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase"
  },
  hotspotText: {
    color: "#d6cec3",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  }
});
