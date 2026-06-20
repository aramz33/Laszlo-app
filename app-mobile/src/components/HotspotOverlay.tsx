import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Hotspot } from "../domain/artwork";

type Props = {
  hotspots: Hotspot[];
  activeHotspotId: string | null;
  onSelect: (hotspot: Hotspot) => void;
  imageWidth: number;
  imageHeight: number;
};

export function HotspotOverlay({
  hotspots,
  activeHotspotId,
  onSelect,
  imageWidth,
  imageHeight
}: Props) {
  if (imageWidth === 0 || imageHeight === 0) return null;

  return (
    <View style={[styles.overlay, { width: imageWidth, height: imageHeight }]}>
      {hotspots.map((hotspot) => {
        const isActive = hotspot.id === activeHotspotId;
        const left = hotspot.x * imageWidth - 12;
        const top = hotspot.y * imageHeight - 12;

        return (
          <Pressable
            key={hotspot.id}
            style={[
              styles.point,
              isActive && styles.pointActive,
              { left, top }
            ]}
            onPress={() => onSelect(hotspot)}
          >
            <View style={[styles.dot, isActive && styles.dotActive]} />
            {isActive && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{hotspot.title}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0
  },
  point: {
    position: "absolute",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  pointActive: {
    zIndex: 10
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#c98a3c",
    borderWidth: 1.5,
    borderColor: "rgba(201, 138, 60, 0.5)",
    shadowColor: "#c98a3c",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4
  },
  dotActive: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#c98a3c",
    borderColor: "#fff",
    borderWidth: 2
  },
  tooltip: {
    position: "absolute",
    top: -28,
    backgroundColor: "#211d18",
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 6
  },
  tooltipText: {
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "600",
    color: "#fff"
  }
});
