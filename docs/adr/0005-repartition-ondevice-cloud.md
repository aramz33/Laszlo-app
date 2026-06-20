# ADR 0005 — Répartition on-device / cloud & résilience indoor

**Statut :** Accepté · 2026-06-15

## Contexte

Défi télécom indoor majeur (murs épais, sous-sols, WiFi variable) + exigence de latence. L'orchestrateur est cloud (ADR 0001) → il faut minimiser la dépendance réseau sur le chemin chaud.

## Décision — chemin rapide on-device + chemin qualité cloud, KB en cache local

| Brique | Choix |
|---|---|
| STT | **on-device par défaut** (Apple Speech / whisper.cpp), cloud en option |
| TTS | **hybride** (on-device si réseau faible, cloud pour voix premium) |
| LLM | **cloud** (qualité + grounding), flux de tokens léger ; small LLM on-device = port futur |
| KB (graphe + notices) | **cache local du musée visité**, téléchargé à l'entrée |

Résultat : seul le **flux de tokens du LLM** transite par le réseau (quelques Ko). STT/TTS sur l'appareil retirent 2 round-trips du chemin chaud → gain latence même avec bon réseau, et robustesse quand le réseau lâche.

Chaque port STT et TTS porte **deux adaptateurs** (`on-device` + `cloud`) ; l'orchestrateur arbitre selon la qualité réseau.

## Posture Megathon — 2026-06-20

Le week-end ne construit pas la double pile on-device/cloud. On privilégie les
providers managés et la stabilité de démo :

- STT/TTS/voix : Vapi ou ElevenLabs selon décision SYNC 1.
- LLM : provider managé le plus rapide à intégrer.
- KB : cache local des notices et hotspots des phares sur l'iPhone ou dans la
  session, pour survivre au WiFi de venue.
- Réseau : tester WiFi + hotspot tôt ; vidéo backup obligatoire.

La direction produit reste hybride et UE/coût après le hackathon. Le Megathon
est une validation d'expérience, pas une preuve d'infrastructure souveraine.

## Options considérées

| Option | Statut | Raison |
|---|---|---|
| Tout cloud | Rejeté | fragile en musée + 2 round-trips de plus |
| **Hybride on-device/cloud + KB cache** | **Retenu** | sert latence ET connectivité |
| Tout on-device | Rejeté | qualité LLM/voix mobile plafonne, grounding dégradé |

## Conséquences

- (+) Expérience fluide même réseau dégradé ; latence réduite.
- (−) Double adaptateur par brique dès le départ + composant de sync/cache KB à construire.
