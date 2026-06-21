import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Artwork } from "../../domain/artwork";
import type { IdentifyArtwork } from "../../domain/artworkIdentifier";
import { colors, fonts, radii } from "../../theme";

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
            <Text style={styles.title}>{artwork.originalTitle}</Text>
            {artwork.englishTitle ? (
              <Text style={styles.englishTitle}>{artwork.englishTitle}</Text>
            ) : null}
            <Text style={styles.meta}>{artwork.subtitle}</Text>
          </View>
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
    borderColor: colors.hairline,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    backgroundColor: colors.glass
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 18
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 14,
    marginTop: 3
  },
  englishTitle: {
    color: colors.text,
    fontFamily: fonts.serifRegular,
    fontSize: 14,
    marginTop: 2
  }
});
