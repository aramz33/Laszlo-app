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
App RN  ──lecture──→  Supabase (PostgREST nu, clé anon)
   │
   ├──génération──→  Edge Function f()  ──→  Supabase (relit notices server-side) → LLM
   │
   └──voix──→  STT/TTS providers (en direct)

Pipeline  ──batch offline──→  écrit Supabase puis meurt (pas un service)
```

> 1 app + 1 runtime mince + 1 DB + 1 job offline.

## La sortie visiteur = `f()`

```
output = f(notice, glossaire@niveau, profil, langue, voix/TTS)
```

- **Où** : Edge Function Supabase (`POST /functions/v1/generate`), Deno/TS. Pas de FastAPI
  (coût réel = tokens + TTS, identique quel que soit l'hôte → on optimise robustesse + pièces mobiles).
- **Forme** : **mono-appel LLM**, pas un agent. Œuvre connue (tapée) → on injecte toutes ses
  notices d'un coup. Zéro retrieval, zéro tool-calling. Le multi-étapes = open-world (post-hackathon).
- **Streamé** (`text/event-stream`) : le TTS parle avant la fin + effet machine à écrire en texte-only.
- **2e edge function** `POST /transcribe` (Voxtral) : audio → texte.

**Contrat `/generate`** (surface app ↔ runtime) :

```jsonc
{
  "artwork_id": "uuid",        // le runtime relit ses notices server-side
  "mode": "hotspot" | "ask",
  "hotspot_id": "uuid | null", // requis si mode = hotspot ; contexte possible si mode = ask
  "point": { "x": 0.42, "y": 0.58 } | null,
  "question": "string | null", // requis si mode = ask (déjà STT si venu de la voix)
  "history": [ { "role": "user|assistant", "content": "..." } ], // tenu par l'app
  "lang": "fr",
  "profile": { "allure": "court|moyen|long", "niveau": "decouverte|amateur|passionne", "interet": "string|null" }
}
// → SSE : data: {"delta":"..."} … data: {"done":true,"sources":["rijks","wikipedia"]}
```

Le client envoie `artwork_id`, **jamais les notices** (grounding pas confié au client).
Pour les hotspots, l'app lance **un `/generate mode=hotspot` par hotspot** à l'entrée
dans la vue œuvre, en parallèle, avec le profil/langue courants. Le tap hotspot ne lance
pas de LLM : il lit le texte personnalisé déjà prêt, ou `narration_text` en fallback.

**Conversation** : l'`history` est **tenu par l'app** et renvoyé à chaque appel → runtime
**stateless** (modèle des API chat, pas de table `session`). La capture des intérêts dans le
temps = couche **Profil/Mémoire**, hors scope démo.

**Sécurité (prompt injection)** : mono-appel **sans outils** = frontière volontaire. La fonction
lit des notices publiques et appelle le LLM, rien d'autre → impact injection borné à la session
de l'utilisateur (pas de fuite/escalade). `history` n'ajoute pas de surface vs `question`. Vrai
vecteur = **notices scrapées** (Wikipedia) → injection indirecte (cf. TODO D3). Défense : grounding
en `system` + notices délimitées + `sources` en sortie. Détail : ADR 0014.

**La voix est une brique séparée** : le runtime reste texte→texte, STT/TTS l'encadrent.
→ **le chemin texte ship en premier, sans décision voix.**

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
