---
tags: [projet/laszlo, type/reference, statut/actif]
date: 2026-06-20
---

# Stack technique — point de référence

> Photo de l'architecture et de la stack telles que verrouillées dans les ADR
> (`docs/adr/`) + `docs/megathon/2 — Tech & build.md`. Ce doc résume ; les ADR font foi.

## Principe directeur

**Architecture hexagonale** (ADR 0001) : surface client jetable + cœur + adaptateurs
sortants swappables (LLM / STT / TTS / Vision / Paiement). Les providers sont des **ports**
→ on branche le plus rapide à démoer sans se marier à la direction prod (UE + coût, ADR 0012).

## Topologie (ADR 0014) — pas de microservices

```
App RN  ──lecture──────→  Supabase (PostgREST nu, clé anon)
   │
   ├──/generate──────→  Edge Function  ──→  Supabase (relit notices) → LLM
   ├──/speak (texte)─→  Edge Function  ──→  TTS (ElevenLabs)  → audio_url
   ├──/transcribe────→  Edge Function  ──→  STT (Voxtral)     → texte
   └──/identify (img)→  Edge Function  ──→  Vision (Claude)   → artwork_id

   (clés LLM/STT/TTS toutes server-side ; l'app ne parle à aucun provider en direct)

Pipeline  ──batch offline──→  écrit Supabase puis meurt (pas un service)
```

> 1 app + 1 runtime mince + 1 DB + 1 job offline.

## La sortie visiteur = `f()`

```
output = f(notice, glossaire@niveau, profil, langue, voix/TTS)
```

**Contrat figé 2026-06-20 — détail complet dans [ADR 0014](adr/0014-runtime-generation-edge-function.md).**
Trois edge functions, clés LLM/STT/TTS **toutes serveur**, le client envoie des IDs jamais les notices :

| Endpoint | Rôle |
|---|---|
| `POST /generate` | texte. 4 `mode` : `hotspot` (batch JSON) · `ask` (SSE) · `persona` (JSON) · `followups` (JSON) |
| `POST /speak` | texte → `audio_url` (TTS ElevenLabs serveur) |
| `POST /transcribe` | audio → texte (STT Voxtral serveur, multipart) |
| `POST /identify` | image → `artwork_id` (fallback vision Claude si l'AR échoue, multipart) |

- **`hotspot`** = batch des N hotspots à l'entrée de l'œuvre, perso profil/langue + `history`
  (influence **œuvre-à-œuvre**). Tap = zéro LLM, lit le texte prêt, fallback `narration_text` à 3 s.
- **`ask`** = Q&A streamé : chat libre · point `{x,y}` · conversation depuis hotspot.
- **`persona`** = call caché d'onboarding → `persona_summary` (S5), réinjecté ensuite.
- **`followups`** = 3 questions de suivi à chaque ouverture hotspot / chat.
- Transverse : `request_id` réémis · `history` capé 8 msg + `history_summary` · `sources` structuré.
- **Voix server-side** : l'app n'appelle jamais ElevenLabs/Voxtral en direct (clés exposées
  sinon) ; elle garde seulement les contrôles de lecture. Chemin texte ship en premier.

**Sécurité (prompt injection)** : mono-appel **sans outils** = frontière volontaire. Impact
injection borné à la session de l'utilisateur (pas de fuite/escalade). Vrai vecteur = **notices
scrapées** (Wikipedia) → injection indirecte (cf. TODO D3). Défense : grounding en `system` +
notices délimitées + `sources` en sortie. Détail : ADR 0014.

## Stack par couche

| Couche | Choix verrouillé |
|---|---|
| Données | Rijksmuseum OAI-PMH (`edm`, sans clé) + IIIF Micrio. Set `260214` Top 1000 |
| Base | Supabase Postgres. Schéma = le contrat (artist/movement/museum/artwork/notice/hotspot) |
| Lecture app | PostgREST auto (pas de backend custom, pas de vue SQL) |
| Runtime `f()` | Edge Function Supabase, mono-appel, streamé (ADR 0014) |
| LLM | Modèle open hébergé **Nebius** (crédits kit), bascule **Claude API** si qualité insuffisante |
| STT | **Voxtral** cloud, derrière `/transcribe` |
| Reco / AR | **ViroReact image tracking** (ARKit iOS / ARCore Android). Pas d'embeddings au runtime |
| App mobile | Expo React Native + ViroReact (`/app-mobile`). Swift ARKit = repli iOS |
| Pipeline | Python, IntelliJ (`/pipeline`). ETL médaillon raw→enriched→refined→load, 100% sans LLM |
| Paiement | **Mollie** (live actif), hosted checkout + webhook → `premium_venue` |
| PWA (secondaire) | Next.js/Vercel pour activation Mollie / page package musée |

**Pourquoi ViroReact** : WebXR/WebAR écartés (Safari iOS n'a pas les modules AR), Unity trop
lourd, Swift iOS-only. ViroReact = cross-platform + UI/voix/chat en TS + image tracking suffisant
pour un set curé. Fallback : ViroReact → sélection manuelle/QR → overlay 2D + vidéo backup.

## Questions ouvertes 🟡

| Question | État | Échéance |
|---|---|---|
| **Voix / TTS : ElevenLabs vs Vapi** | ouvert. Vapi = track + barge-in ; ElevenLabs = qualité + compte dispo. Le runtime ne bloque plus dessus | SYNC 1 |
| **Modèle LLM Nebius validé ?** | à tester sur crédits kit, sinon Claude API payante | M32 |
| **Notices Wikipedia phares trop grosses** | dump brut → casse le grounding du chat (`ask`). À trimmer ou modèle plus fort | D3 |
| **PWA : Base44 (track) vs Vercel (libre)** | ouvert | — |
| **`location` au schéma** (AR par salle) | pas ajouté → hardcode les phares pour la démo | A3 |
| **Barge-in** | hors happy path (M16), montré seulement si stable | — |
| **Mollie clé test → live** | live actif, brancher test en dev d'abord | — |

## Répartition de propriété

| Owner | Surface |
|---|---|
| **Siffrein** | Serveur : Edge Functions `/generate` et `/transcribe`, clés LLM/STT/TTS, déploiement, secrets cloud |
| **Adam/Codex** | App : UI, design, AR point bleu ancré, vue détail, hotspots, lecteur audio, chat, états de chargement/fallback |

Le **contrat `/generate`** débloque l'app et le runtime en parallèle (comme le schéma Supabase
débloque app et pipeline). Sans `f()` codée :

- coder l'app contre ce contrat (stub `/generate` → `narration_text` brut en stopgap) ;
- avancer lecture Supabase + AR + hotspots sans rien attendre.

Couplage réel = forme exacte du payload `/generate`, surface TTS exposée côté serveur,
et format des événements SSE.
