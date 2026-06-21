import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Artwork } from "../../domain/artwork";
import type { IdentifyArtwork } from "../../domain/artworkIdentifier";
import { colors, fonts, radii } from "../../theme";

type Props = {
  artworks: Artwork[];
  onIdentify: IdentifyArtwork;
  flagshipObjectNumbers?: ReadonlySet<string>;
};

const EMPTY_FLAGSHIPS = new Set<string>();

export function ManualArtworkList({
  artworks,
  onIdentify,
  flagshipObjectNumbers = EMPTY_FLAGSHIPS,
}: Props) {
  return (
    <FlatList
      data={artworks}
      keyExtractor={(artwork) => artwork.id}
      showsVerticalScrollIndicator={false}
      style={styles.listSurface}
      contentContainerStyle={styles.list}
      renderItem={({ item: artwork }) => {
        const flagship = flagshipObjectNumbers.has(artwork.objectNumber);

        return (
          <Pressable
            style={styles.row}
            onPress={() => onIdentify({ artwork, source: "manual" })}
          >
            <Image source={{ uri: artwork.imageUrl }} style={styles.thumb} />
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {artwork.originalTitle}
                </Text>
                {flagship ? <Text style={styles.badge}>DEMO</Text> : null}
              </View>
              {artwork.englishTitle ? (
                <Text style={styles.englishTitle} numberOfLines={1}>
                  {artwork.englishTitle}
                </Text>
              ) : null}
              <Text style={styles.meta} numberOfLines={1}>
                {artwork.subtitle}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listSurface: {
    flex: 1,
  },
  list: {
    gap: 9,
    paddingBottom: 18
  },
  row: {
    minHeight: 82,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 8,
    gap: 12,
    backgroundColor: colors.glass,
    flexDirection: "row",
    alignItems: "center"
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: radii.sm,
    backgroundColor: colors.surface
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  title: {
    color: colors.text,
    fontFamily: fonts.serifSemibold,
    fontSize: 17,
    flex: 1,
    minWidth: 0
  },
  badge: {
    color: colors.onAccent,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
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
