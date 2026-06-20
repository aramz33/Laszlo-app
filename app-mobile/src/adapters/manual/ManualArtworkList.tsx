import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "../../theme";
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
    gap: 8,
  },
  row: {
    borderColor: colors.dim12,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    backgroundColor: colors.fill05,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: 19,
  },
  meta: {
    color: colors.dim62,
    fontFamily: fonts.serifLight,
    fontSize: 14,
    marginTop: 3,
  },
  location: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 6,
    textTransform: "uppercase",
  },
});
