import { useCallback, useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { AudioPlayer } from "../components/AudioPlayer";
import { ChatInterface } from "../components/ChatInterface";
import type { ChatMessage } from "../components/ChatInterface";
import { HotspotOverlay } from "../components/HotspotOverlay";
import { SourcesPanel } from "../components/SourcesPanel";
import type { Artwork, Hotspot } from "../domain/artwork";
import type { Persona } from "../domain/persona";
import type { SessionMemory } from "../domain/session";
import { addMemoryEntry, setLens } from "../domain/session";

type Props = {
  artwork: Artwork;
  persona: Persona;
  memory: SessionMemory;
  onMemoryUpdate: (memory: SessionMemory) => void;
  onBack: () => void;
  onNavigateNext: () => void;
};

let msgCounter = 0;
function nextMsgId() {
  msgCounter += 1;
  return `msg-${msgCounter}`;
}

export function ArtworkDetailScreen({
  artwork,
  persona,
  memory,
  onMemoryUpdate,
  onBack,
  onNavigateNext
}: Props) {
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const handleImageLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setImageSize({ width, height });
  }, []);

  const handleHotspotSelect = (hotspot: Hotspot) => {
    setActiveHotspot(hotspot);
    setIsPlaying(true);
    const updated = addMemoryEntry(memory, {
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      snippet: hotspot.title
    });
    onMemoryUpdate(updated);
  };

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = { id: nextMsgId(), role: "user", text };
    const assistantMsg: ChatMessage = {
      id: nextMsgId(),
      role: "assistant",
      text: generateMockReply(text, artwork, persona)
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const updated = addMemoryEntry(memory, {
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      snippet: text
    });
    onMemoryUpdate(updated);
  };

  const handleSteer = (lens: string) => {
    const steerMsg: ChatMessage = {
      id: nextMsgId(),
      role: "user",
      text: `stop the symbolism — ${lens.toLowerCase()}`,
      isSteer: true
    };
    setMessages((prev) => [...prev, steerMsg]);
    const updated = setLens(memory, lens);
    onMemoryUpdate(updated);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← AR</Text>
        </Pressable>
        <Pressable style={styles.langChip}>
          <Text style={styles.langText}>
            {persona.language.toUpperCase()}
          </Text>
        </Pressable>
      </View>

      {/* Image with hotspot overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: artwork.imageUrl }}
          style={styles.image}
          onLayout={handleImageLayout}
        />
        <HotspotOverlay
          hotspots={artwork.hotspots}
          activeHotspotId={activeHotspot?.id ?? null}
          onSelect={handleHotspotSelect}
          imageWidth={imageSize.width}
          imageHeight={imageSize.height}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.location}>{artwork.location}</Text>
        <Text style={styles.title}>{artwork.title}</Text>
        <Text style={styles.subtitle}>{artwork.subtitle}</Text>
      </View>

      {/* Audio player (visible when a hotspot is selected) */}
      {activeHotspot && (
        <AudioPlayer
          title={activeHotspot.title}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying((p) => !p)}
        />
      )}

      {/* Active hotspot narration */}
      {activeHotspot && (
        <View style={styles.narrationBox}>
          <Text style={styles.narrationTitle}>{activeHotspot.title}</Text>
          <Text style={styles.narrationAspect}>
            {activeHotspot.aspect.toUpperCase()}
          </Text>
          <Text style={styles.narrationText}>
            {activeHotspot.narrationText}
          </Text>
        </View>
      )}

      {/* Chat / Ask & Re-steer */}
      <ChatInterface
        messages={messages}
        currentLens={memory.currentLens}
        onSend={handleSend}
        onSteer={handleSteer}
      />

      {/* Sources */}
      <SourcesPanel sources={[]} />

      {/* Session memory summary */}
      {memory.entries.length > 0 && (
        <View style={styles.memoryRail}>
          <Text style={styles.memoryHeader}>↺ Session memory</Text>
          <View style={styles.memoryChips}>
            {memory.entries.slice(-5).map((entry, i) => (
              <View key={i} style={styles.memoryChip}>
                <Text style={styles.memoryChipText}>{entry.snippet}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Navigate to next artwork */}
      <Pressable style={styles.nextButton} onPress={onNavigateNext}>
        <Text style={styles.nextText}>Walk to the next work →</Text>
      </Pressable>
    </ScrollView>
  );
}

function generateMockReply(
  question: string,
  artwork: Artwork,
  persona: Persona
): string {
  const level = persona.answers.level[0] || "curious";
  if (question.toLowerCase().includes("light")) {
    return `The light in ${artwork.title} comes from a single window on the upper left. Vermeer controlled it meticulously — every surface tells you its distance from that source.`;
  }
  if (question.toLowerCase().includes("compare")) {
    return `Both works use light as a character, not just illumination. But where Vermeer contains it in a single room, Rembrandt stages it like theatre across an entire company.`;
  }
  return `That's a great question about ${artwork.title}. At a ${level} level: the answer connects to the technique and composition choices the artist made deliberately.`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fbf9f4"
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 40
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  backButton: {
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
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#c98a3c"
  },
  langText: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#c98a3c"
  },
  imageContainer: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden"
  },
  image: {
    width: "100%",
    aspectRatio: 0.9,
    backgroundColor: "#e7e0d2"
  },
  header: {
    gap: 4
  },
  location: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#8a8073",
    textTransform: "uppercase"
  },
  title: {
    fontFamily: "System",
    fontSize: 28,
    fontWeight: "800",
    color: "#211d18"
  },
  subtitle: {
    fontFamily: "System",
    fontSize: 14,
    color: "#6f6657"
  },
  narrationBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e3dac8",
    gap: 4
  },
  narrationTitle: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "700",
    color: "#211d18"
  },
  narrationAspect: {
    fontFamily: "System",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#c98a3c"
  },
  narrationText: {
    fontFamily: "System",
    fontSize: 14,
    lineHeight: 21,
    color: "#3f392f",
    marginTop: 4
  },
  memoryRail: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(201, 138, 60, 0.4)",
    backgroundColor: "rgba(201, 138, 60, 0.06)",
    gap: 8
  },
  memoryHeader: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "700",
    color: "#211d18"
  },
  memoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  memoryChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e3dac8"
  },
  memoryChipText: {
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "500",
    color: "#3f392f"
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#211d18",
    alignItems: "center"
  },
  nextText: {
    fontFamily: "System",
    fontSize: 15,
    fontWeight: "700",
    color: "#fff"
  }
});
