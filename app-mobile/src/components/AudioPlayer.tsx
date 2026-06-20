import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  isPlaying: boolean;
  onPlayPause: () => void;
};

const BARS = [0.4, 0.9, 0.6, 1, 0.5, 0.72, 0.3, 0.85, 0.55, 0.7];

export function AudioPlayer({ title, isPlaying, onPlayPause }: Props) {

  return (
    <View style={styles.root}>
      <View style={styles.playerBar}>
        <Pressable style={styles.playButton} onPress={onPlayPause}>
          <Text style={styles.playIcon}>{isPlaying ? "⏸" : "▶"}</Text>
        </Pressable>
        <View style={styles.waveform}>
          {BARS.map((height, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: height * 16,
                  backgroundColor: i < 4 && isPlaying ? "#c98a3c" : "#c8bfae"
                }
              ]}
            />
          ))}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.controls}>
        <ControlChip label="Voice" />
        <ControlChip label="Speed" />
        <ControlChip label="Tone" />
      </View>
    </View>
  );
}

function ControlChip({ label }: { label: string }) {
  return (
    <View style={styles.controlChip}>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8
  },
  playerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#211d18",
    backgroundColor: "#fff"
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#c98a3c",
    alignItems: "center",
    justifyContent: "center"
  },
  playIcon: {
    fontSize: 10,
    color: "#fff"
  },
  waveform: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16,
    flex: 1
  },
  bar: {
    width: 2.5,
    borderRadius: 2
  },
  title: {
    fontFamily: "System",
    fontSize: 11,
    color: "#6f6657",
    maxWidth: 80
  },
  controls: {
    flexDirection: "row",
    gap: 6
  },
  controlChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfc6b5"
  },
  controlLabel: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "500",
    color: "#6f6657"
  }
});
