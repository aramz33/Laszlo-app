# ADR 0001 — Architecture hexagonale, portable multi-surface

**Statut :** Accepté · 2026-06-15

## Contexte

Cible produit progressive : web PWA (POC) → Rabbit R1 → lunettes type Meta. La surface client change, l'intelligence non. Contraintes posées par Adam : modularité et contrôle > facilité ; latence/fluidité de première classe.

## Décision

Architecture **hexagonale (ports & adapters)**. Split :

- **Front mince** (Next.js / PWA sur Vercel) : UI + transport audio uniquement.
- **Orchestrateur** (Python / FastAPI) : tout le chemin chaud — assemblage du contexte de session, streaming LLM, dispatch STT/TTS, Retriever. Déployé proche utilisateur (Fly.io/Railway) pour la latence.
- **Supabase** : Postgres + auth.

Le **cœur** (moteur de conversation + domaine musée) ne connaît aucun fournisseur ni aucune surface. Il parle à des **ports** :

- Entrant : un **protocole temps réel** (WebSocket bidirectionnel) = contrat durable. Web/R1/lunettes = adaptateurs entrants.
- Sortants (swappables) : `LLM`, `STT`, `TTS`, `Retriever`, `CV` (reconnaissance d'œuvre).

Les ports sortants `LLM` et `TTS` exposent obligatoirement `cancel()` (requis par le barge-in, cf. ADR 0003).

## Posture Megathon — 2026-06-20

La décision hexagonale reste la boussole, mais le build de 45h privilégie le
chemin le plus court vers une démo live :

- **Monorepo** : `/pipeline`, `/app-ios`, `/shared`, `/ui`.
- **Client démo** : app native iOS Swift + ARKit/RealityKit, car ARKit impose
  Xcode et donne reconnaissance + pose.
- **PWA** : repli paywall/secondaire, sur Vercel ou Base44 selon décision track.
- **Backend/pipeline** : lane Adam dans IntelliJ ; le schéma Supabase est le
  contrat entre lanes.
- **Ports fournisseurs** : Vapi/ElevenLabs/LLM/Mollie sont des adaptateurs de
  démo. Les choisir vite ne les rend pas centraux dans le domaine.

Le but du week-end est de prouver l'abstraction par le build : si un provider
est remplacé après Megathon, le coeur produit ne doit pas changer.

## Conséquences

- (+) Passage web→R1→lunettes = ajout d'un adaptateur entrant, sans toucher la logique.
- (+) Swap de fournisseur IA sans réécriture.
- (−) Deux déploiements / deux langages pour une équipe de 2 → friction opérationnelle acceptée en échange du contrôle.
- L'artefact le plus soigné est **le protocole**, pas l'UI (couche jetable).
