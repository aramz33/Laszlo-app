export type MemoryEntry = {
  artworkId: string;
  artworkTitle: string;
  snippet: string;
  timestamp: number;
};

export type SessionMemory = {
  entries: MemoryEntry[];
  currentLens: string | null;
};

export function createSessionMemory(): SessionMemory {
  return { entries: [], currentLens: null };
}

export function addMemoryEntry(
  memory: SessionMemory,
  entry: Omit<MemoryEntry, "timestamp">
): SessionMemory {
  return {
    ...memory,
    entries: [...memory.entries, { ...entry, timestamp: Date.now() }]
  };
}

export function setLens(memory: SessionMemory, lens: string | null): SessionMemory {
  return { ...memory, currentLens: lens };
}

export function getEntriesForArtwork(
  memory: SessionMemory,
  artworkId: string
): MemoryEntry[] {
  return memory.entries.filter((e) => e.artworkId === artworkId);
}

export function getEntriesExcludingArtwork(
  memory: SessionMemory,
  artworkId: string
): MemoryEntry[] {
  return memory.entries.filter((e) => e.artworkId !== artworkId);
}
