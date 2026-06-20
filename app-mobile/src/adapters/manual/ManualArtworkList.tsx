import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Artwork } from "../../domain/artwork";
import type { IdentifyArtwork } from "../../domain/artworkIdentifier";

type Props = {
  artworks: Artwork[];
  onIdentify: IdentifyArtwork;
};

export function ManualArtworkList({ artworks, onIdentify }: Props) {
  return (
    <View style={styles.list}>
      {artworks.map((artwork) => (
        <Pressable
          key={artwork.objectNumber}
          style={styles.row}
          onPress={() => onIdentify({ artwork, source: "manual" })}
        >
          <View>
            <Text style={styles.title}>{artwork.title}</Text>
            <Text style={styles.meta}>{artwork.subtitle}</Text>
          </View>
          <Text style={styles.location}>{artwork.location}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8
  },
  row: {
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)"
  },
  title: {
    color: "#f7f1e7",
    fontSize: 17,
    fontWeight: "700"
  },
  meta: {
    color: "#b8afa2",
    fontSize: 13,
    marginTop: 3
  },
  location: {
    color: "#8fc7ff",
    fontSize: 12,
    textTransform: "uppercase"
  }
});
