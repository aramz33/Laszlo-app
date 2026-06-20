---
tags: [projet/laszlo, megathon, type/playbook, statut/actif]
date: 2026-06-20
---

# Megathon — 3. Playbook & questions ouvertes

> **Doc ground-truth 3/3** — comment animer le week-end (SYNC), le pitch, et tout ce qui reste **à trancher**.
> Contexte : [[1 — Stratégie & arène]] · Tech & plan : [[2 — Tech & build]].

---

## Playbook CEO — animer les SYNC

Le SYNC n'est pas une réunion de mise à jour — c'est une **machine à trancher**. Le CEO arrive avec les **décisions dues déjà cadrées** (options + reco), fait parler chaque lane 30s, **fait décider**, **écrit la décision**, assigne owner + « done », et **rend le temps au build**. Si un sujet n'est pas mûr → **parking lot**, pas de débat ouvert.

### Carte des sujets (comment tout se relie)

```
                 STRATÉGIE / SCOPE  (amont — figé, cf. [[1 — Stratégie & arène]])
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
   CONTENU/DONNÉES     PRODUIT/DÉMO         TECH
   (tranche Rijks,     (happy path,         (stack, Vapi voix,
    notices, ground.)  œuvres phares,        pipeline, AR/reco)
        │               activation Mollie)       │
        └──────► alimente ◄──┘  définit ►────────┘
                          │
                          ▼
                  BUSINESS / PITCH
              (Mollie, traction, narratif, slides)  ← consomme tout
```

**Dépendances :** Scope → happy path → lanes parallèles (contenu / tech / front) → reconvergence à l'intégration → pitch consomme le tout. Le CEO **séquence** dans cet ordre et **rapproche** les lanes aux SYNC d'intégration.

### Template de SYNC (répétable, timeboxé)

1. **État (≤30s/lane)** — Siffrein / Adam / designer : fait / bloqué sur quoi.
2. **Décisions dues** — le CEO sort 2–4 sujets cadrés (options + reco). On tranche.
3. **Bloqueurs** — qui débloque qui, comment.
4. **Prochain bloc** — tâches + owner + **« done » explicite** + prochain checkpoint.
5. **Parking lot** — ce qu'on reporte (avec quand on le reprend).

→ Chaque décision part dans le **journal M0–Mx** ([[1 — Stratégie & arène]]). Chaque tâche a un **owner** et un **« done »**.

### Méthode d'extraction des décisions

Pour chaque sujet ouvert : 
**(1) Cadrer** — 1 phrase de problème + 2–3 options + reco du CEO. 
**(2) Timer** — on tranche dans le SYNC (sinon parking lot avec deadline).
**(3) Logger** — décision → `Mx` + owner + « done ».
**(4) Vérifier** — « est-ce que ça sert le happy path / le pitch ? » sinon → nice-to-have.

### Agendas par SYNC (ce que chacun DOIT trancher)

| SYNC | Doit sortir avec |
|---|---|
| **0 — Scoping** (ven 18:00, tél) | Scope confirmé · lanes · **front : Expo React Native + ViroReact** · pitch recrutement prêt · **tranche Rijks + 1–2 œuvres phares** · logistique stand |
| **1 — Kickoff build** (ven 20:45) | **Happy path de démo écrit** · **schéma Supabase figé** (le contrat) · tâches bloc A + « done » de la nuit · comptes/API créés |
| **2 — Standup** (sam 08:30) | État happy path · bloqueurs · plan du matin · go/no-go pipeline |
| **3 — Intégration midi** (sam 14:30) | 1er bout-en-bout validé · triage bugs · **go/no-go ARKit → bascule 2D** · gel du périmètre ? |
| **4 — Dry-run** (sam 19:30) | Démo jouée en live · **liste de coupes** (reconnaissance en 1er) · plan vidéo backup |
| **5 — Feature freeze** (dim 08:00) | **Gel acté** · liste polish + pitch only |
| **6 — Go/no-go** (dim 14:00) | Soumis avant 15:00 · ordre de passage finale · qui dit quoi |

### Checklist prépa CEO (avant chaque SYNC, 5 min)

- [ ] Relire le journal M0–Mx + la liste « à trancher » ci-dessous.
- [ ] Lister les **2–4 décisions dues** maintenant (ni plus tôt, ni plus tard).
- [ ] Pré-rédiger **options + reco** pour chacune.
- [ ] Connaître l'état de chaque lane (ping rapide avant).
- [ ] Fixer le **timebox** et l'annoncer au début.
- [ ] Prévoir de **capturer les décisions en direct** (téléphone/Notion ouvert).

### Règles de facilitation

1. **Un sujet à la fois.** On ne saute pas.
2. **Décider > discuter.** Pas de reco claire en 3 min → parking lot + deadline.
3. **Toujours owner + « done ».** Une tâche sans les deux n'existe pas.
4. **Écrire la décision** (sinon re-débattue à 3h du matin).
5. **Finir à l'heure.** Le build est roi.

---

## Playbook crédits IA épuisés — mode survie

Objectif : garder la démo vivante si les crédits ou limites IA sautent
(`Codex`, `Claude`, `Devin`, LLM, STT, TTS, vision, Nebius/Vapi/etc.).

### Règle de base

Couper ce qui consomme de l'IA avant de couper le produit. Le happy path prime :
œuvre ouverte → hotspot lisible → question/réponse ou fallback → pitch clair.

### Procédure immédiate

1. **Figer l'état.** Noter l'erreur exacte, le provider, l'heure, et le dernier commit/diff utile.
2. **Arrêter les dépenses inutiles.** Pas de sous-agents, pas de génération longue, pas de reformulation de docs, pas de recherche IA si `rg`, tests, mocks ou code local suffisent.
3. **Basculer local/offline.** Utiliser mocks, fixtures, `narration_text`, cache local, vidéo backup, QR/sélection manuelle, ou réponses prédéfinies de démo.
4. **Protéger les secrets et la prod.** Ne pas déplacer les clés dans l'app mobile ; ne pas contourner un quota avec une clé perso non validée.
5. **Écrire le prochain geste humain.** Laisser une commande, un fichier, ou une tâche précise que quelqu'un peut reprendre sans IA.

### Choix par surface

| Surface bloquée | Fallback |
|---|---|
| Agent build IA | Continuer en local avec `rg`, tests ciblés, petites patches manuelles ; pas de sous-agent. |
| LLM `/generate` | Réponse stub conforme + `narration_text` hotspot ; garder le contrat HTTP. |
| TTS `/speak` | Afficher le texte et/ou audio fixe ; dire dans le pitch que la voix live est branchée mais limitée par quota. |
| STT `/transcribe` | Champ texte manuel ; garder l'upload audio hors happy path. |
| Vision `/identify` / AR | Sélection manuelle, QR, overlay 2D, vidéo backup. |
| Déploiement cloud | Démo locale ou Bruno/curl enregistré ; ne pas casser une version qui marche. |

### Mise à jour automatique du playbook

À chaque contournement réellement prouvé, ajouter une ligne ici, sans attendre la fin
du sprint :

```text
YYYY-MM-DD HH:MM — blocage → action qui marche → preuve/commande → owner
```

- Ne journaliser que ce qui a marché ou ce qui bloque encore vraiment.
- Si le contournement change le scope, mettre aussi à jour [[0 — TODO directeur]].
- Si le "pourquoi" devient une décision produit/tech durable, l'ajouter au journal Mxx
  dans [[1 — Stratégie & arène]] ou dans l'ADR concerné.

### Journal des contournements

- 2026-06-20 — playbook créé → règle ajoutée dans `AGENTS.md` et `CLAUDE.md` → prochaine panne IA doit être traitée ici → Adam/Codex

---

## Pitch

> Pitchs délivrés **en anglais** (event international).

### A. Pitch recrutement — Ven 19:00 (1 min)

**Objectif :** attirer **un front-end / design builder**. Énergie haute, vision claire, ask net.

**Script (~60s) :**

> Hi everyone, I'm **Adam** — and with my co-founder Siffrein, we're building **laszlo**, a conversational museum guide. Two founders from Paris.
>
> The idea: **you stand in front of a painting, you talk to it out loud, and it answers — in character, and tailored to how much you know about art. And you can cut it off mid-sentence, like a real conversation.**
>
> The hard thinking is already done — architecture, the knowledge model, the voice pipeline. This weekend we make it *talk*, put it in real hands, and take a first **real payment**. We're going for the **Vapi Voice** track and the **headline startup** track.
>
> We need **one person**: a **front-end / design builder** who wants to own how this looks and feels — on a livestreamed main stage. No back-end or ML needed — we've got that covered.
>
> If making something beautiful *land* is your thing, come build with us. I'm Adam — find me right after, [repère visuel].

**Ce qu'on cherche (à dire / afficher) :** 1 front-end/design (React/Next + sens du beau). Bonus : motion / UI audio. **Pas besoin :** back, ML (on couvre).

**Pourquoi c'est attractif (munitions si on te questionne) :**
- Vrai projet avec fondation solide → tu shippes du concret, pas un toy.
- Plan clair + tracks ciblées → vraie chance de podium.
- Tu **possèdes le visuel** d'une démo vue en livestream mondial.

### B. Pitch finale — Dim 18:00 (squelette, à affiner samedi)

> Jouer **les 2 axes du jury** : *momentum* (« vendredi on avait X, là on a Y ») + *malin* (tech & business). Polish ≠ critère, mais la **démo live** est le cœur.

1. **Hook (problème)** — Le fossé : 40 questions devant l'œuvre, 3 phrases sur le cartel. L'audioguide est monotone, on décroche. *(chiffre marquant à insérer)*
2. **Démo live (le wow)** — Parler à l'œuvre, à voix haute, barge-in, réponse en registre. **Le faire en vrai**, pas des slides. → bascule FR/EN si possible.
3. **Pourquoi nous / pourquoi maintenant** — Voix AI mûre ; **moat = KB curée par facettes + voix bidirectionnelle** (angle mort d'ArtScan ; terrain B2B de Smartify). **Et curé À L'ÉCHELLE** : pipeline d'ingestion ancré (Rijksmuseum CC0 → 60M d'œuvres Europeana) = la réponse à « comment tu remplis 1000 musées ». Archi portable.
4. **Momentum** — « Vendredi : archi + modèle de connaissance sur papier. Dimanche : ça **parle aux visiteurs**, peut être **activé par un venue via Mollie**, et un **pipeline a ingéré N œuvres du Rijksmuseum tout seul**. »
5. **Business / ask** — **B2B2C d'abord** : musées / expositions paient, visiteurs adoptent via le lieu. **B2C plus tard** (~5 ans) : les signaux d'usage agrégés et privacy-safe guideront le bon public, les langues, les intérêts et les comportements premium à cibler.

**À préparer en parallèle (Adam) :** 1 chiffre-choc, slide unique de secours, vidéo backup de la démo, réponses Q/R jury (coût IA/visiteur, moat vs ArtScan/Smartify, go-to-market musées, comment le pipeline scale).

---

## Questions ouvertes & risques

### À trancher avec Siffrein (SYNC 0/1)
1. **Front / client** — acté : client démo **Expo React Native + ViroReact** dans `/app-mobile`, PWA Vercel/Base44 en repli activation Mollie/secondaire.
2. **Voix / TTS — DÉCISION OUVERTE, recherche requise.** Compte **ElevenLabs** dispo. Arbitrage : (a) ElevenLabs TTS live + Vapi pour le live → garde la track Vapi ; (b) tout-ElevenLabs (Conversational AI) → perd la track Vapi ; (c) Vapi partout si le workflow est plus rapide. **Le downgrade barge-in (M16) simplifie : sans interruption, ElevenLabs seul peut suffire.** À trancher après recherche.
3. **Reconnaissance** — acté : **ViroReact image tracking** (ARKit iOS / ARCore Android ; embeddings = story d'échelle + post-hackathon, hors runtime). Filets = sélection manuelle / QR / overlay 2D.
4. **AR = priorité ou bonus ?** Dans M9 (voix-phare → breadth → reconnaissance), l'ancrage AR se place où ? *(reco : bonus coupable, voix-phare reste P1)*
5. **Langage du pipeline** — Python *(reco : libs harvest/parse/LLM/Supabase ; tourne IntelliJ IDEA Ultimate ou PyCharm)* vs Kotlin/JVM (IntelliJ natif). À trancher (Adam).
6. **Sélection des œuvres démo + tranche Rijks → SESSION DATASET.** Critères (notes 20/06) : 1 classique · 1 souvent mal comprise · 1 pour enfants · (1 abstraite *— hors collection Rijks* → soit on lâche, soit on élargit la source). + set (reco `26021` Dutch 17th c.) + nb d'œuvres + phares (Night Watch `SK-C-5`…).
7. **Hotspots des phares** — qui les auteur, combien par œuvre, textes **ancrés** (Adam révise). Coords normalisées sur l'image.
8. **Base44** — la PWA (repli) sur **Base44** (track « Prompt to Paid ») vs **Vercel** libre ?
9. **Repo** — repartir vierge (penché) vs réutiliser `Laszlo-app/docs/` comme cache de décisions ?
10. **Charge Siffrein / recrue n°2** — révisé : Siffrein porte serveur/runtime/secrets/deploy ; Adam/Codex porte app mobile. Recrue n°2 seulement si le runtime ou l'app bloque malgré cette coupe.
11. **Barge-in** — acté **hors happy path** (M16, archi capable, montré si stable). Reste seulement à décider la profondeur **si** on le tente (couper la voix vs full-duplex).
12. **Qui tient les devices** pour la boucle de test on-device (iPhone + Android physique) pendant que Codex écrit le TypeScript ?

### Risques & mitigations
| Risque | Impact | Mitigation |
|---|---|---|
| **Contrat app↔serveur flou** (`/generate`, SSE, TTS) | intégration tardive | figer payload + events + surface TTS avant build ; stubs app et serveur en parallèle |
| **AR/CV en live** (lumière salle, reflets, anchors instables) | casse sur scène | **Go/no-go ViroReact → sélection/QR/overlay 2D** · **QR fallback** + **vidéo backup** · reco = bonus, pas dépendance |
| **Porte toolchain mobile** (build natif / device manquant) | pas d'AR live | Vérifier Expo dev build/EAS, Xcode et Android tôt · sinon repli sélection/QR + overlay 2D |
| **Voix non tranchée** (ElevenLabs vs Vapi) | latence à câbler + qualif track Vapi | recherche dès vendredi · garder le pipeline agnostique (texte des hotspots) · décision au plus tard SYNC 1 |
| **Breaking change OAI-PMH** (nouvelle version EDM, 11/06/2026) | parser qui casse | parser **défensif** / consommer en graphe · tester le harvest **tôt** (dans le train) |
| **Scope blowup** | rien de fini dimanche | priorité build = loi (voix→pipeline→reco) · feature freeze dim. matin |
| **Intégration Mollie** plus longue que prévu | pas de signal commercial | activation package/pilot minimal (1 bouton, 1 offre) · acceptable de simuler si l'API bloque, mais viser le vrai |
| **Latence voix** (chaîne STT→LLM→TTS) | wow émoussé | streaming · tester tôt · cache audio seulement si la génération live casse le wow |
| **Connectivité venue** | démo qui rame | tester le wifi tôt · plan hotspot · cache local des notices phares |
| **Énergie / sommeil** | pitch raté dimanche | 2 blocs sommeil planifiés, **dim. matin protégé** |
| **Notices hallucinées** | crédibilité | notices neutres ancrées sur Rijks/Wikipedia/Wikidata + Adam révise les phares |

### Inconnues contenu

- Tranche Rijks exacte + œuvres phares finales (à figer SYNC 0).
- Qualité/longueur des notices auto vs main sur les phares.
- Multilingue : quelles langues démoées (FR/EN sûr ; NL bonus jury local ?).

### Logistique (à régler vendredi)

- [ ] **Stand** : poster A3 imprimé vs tablette/écran pour afficher les œuvres + QR.
- [ ] **Impression** possible au venue ? sinon imprimer avant / venir avec.
- [ ] Comptes & clés : **Mollie**, **Vapi**, **Vercel/Base44**, **API Rijks** (OAI-PMH sans clé, IIIF).
- [ ] **Qui détient le compte Mollie** (qualif headline track).
- [ ] **Toolchain AR** : Expo dev build/EAS, Mac + Xcode, Android Studio si build local, iPhone + Android physiques.
- [ ] **Vidéo backup** de la démo (avant nuit de samedi).
- [ ] Claim du **builder kit** à l'onboarding (Codex, Devin, Nebius, Vapi, Base44…).

### Décisions volontairement laissées ouvertes

- Combien d'œuvres dans le pipeline (30 → 300) — la story d'échelle tient quel que soit le nombre ; on maximise selon le temps.
- Recrue n°2 — décidé selon le vivier vendredi soir.
- Base44 oui/non — dépend de l'appétit pour une 2e track vs simplicité.

<!-- maj : 2026-06-20 -->
- **Cache de traductions multilingues** — optimisation, à décider plus tard (« 4h du mat »).
- **Système de personas complet** (génération auto de personas orthogonaux) = **vision produit**, hors démo (démo = profil 3 questions).
