// Helpers purs du runtime /generate — sans réseau, testables isolément.
// ponytail: les stub* sont déterministes, remplacés par l'appel LLM réel au swap
// (OpenAI-compatible, base_url + clé via env). Le contrat de sortie ne bouge pas.

export type Source = { source: string; lang: string; notice_id: string | null };
export type NoticeRow = { id: string; lang: string; source: string; text: string };
export type HotspotRow = { id: string; title: string; aspect: string; narration_text: string };

export function noticesToSources(notices: NoticeRow[]): Source[] {
  return notices.map((n) => ({ source: n.source, lang: n.lang, notice_id: n.id }));
}

export function stubHotspotText(h: HotspotRow, lang: string): string {
  return h.narration_text?.trim() || `[${lang}] ${h.title} (${h.aspect})`;
}
export function stubAskText(question: string, lang: string, nNotices: number): string {
  return `[stub ${lang}] Réponse à « ${question} » ancrée sur ${nNotices} notice(s).`;
}
export function stubPersona(onboarding: Record<string, unknown>, lang: string): string {
  const interets = Array.isArray(onboarding?.interets) ? onboarding.interets.join(", ") : "—";
  return `[persona ${lang}] allure=${onboarding?.allure ?? "?"}, niveau=${onboarding?.niveau ?? "?"}, intérêts=${interets}.`;
}
export function stubFollowups(lang: string): string[] {
  return [
    `[${lang}] Et la technique employée ?`,
    `[${lang}] Qui sont les personnages ?`,
    `[${lang}] Que symbolise cette scène ?`,
  ];
}
