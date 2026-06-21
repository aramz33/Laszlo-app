import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Lang, Profile } from "./runtime";

/**
 * Persists the visitor profile produced by onboarding so it is built once and
 * reinjected into every `/generate` call. `profile.persona_summary` is the
 * server-generated summary (`mode=persona`); the raw axes are kept too so the
 * runtime can still personalize if the summary call ever failed.
 */

const STORAGE_KEY = "laszlo.profile.v1";

export type Allure = "court" | "moyen" | "long";
export type Niveau = "debutant" | "amateur" | "expert";
export type Interet = "technique" | "people" | "stories" | "symbols";

export type OnboardingAnswers = {
  allure?: Allure;
  niveau?: Niveau;
  interets: Interet[];
  free_text?: string;
};

export type StoredProfile = {
  lang: Lang;
  profile: Profile;
  answers: OnboardingAnswers;
};

export async function loadStoredProfile(): Promise<StoredProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
}

export async function saveStoredProfile(value: StoredProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Non-fatal: the session still works, it just won't persist across launches.
  }
}

export async function clearStoredProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal: worst case the next launch still sees the old profile.
  }
}
