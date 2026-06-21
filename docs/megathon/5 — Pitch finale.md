---
tags: [projet/laszlo, megathon, type/pitch, statut/actif]
date: 2026-06-21
---

# Megathon — 5. Pitch finale

> **Doc de montage du pitch.** Le pitch émotionnel + les trois blocs de fond à
> assembler en présentation (slides + parole). Sources : [[1 — Stratégie & arène]]
> (rubrique jury, moat, business), [[0 — TODO directeur]] (état réel du build),
> `data-model.md` (architecture). À répéter ×2-3 (cf. lane Pitch).

## Carte de la rubrique → ce doc

La finale **mesure des fondateurs, pas des features**. Les trois sujets demandés
mappent directement sur la grille de notation :

| Sujet pitch | Critère jury | Poids |
|---|---|---|
| **The Edge** — why this, why now, why you | The Edge | 15% |
| **Le business** — vrai marché, vrai wedge, vrai revenu | Business | 15% |
| **Le produit** — ça marche, AI-native, craft | Product | 25% |
| *(porté par la démo live + le delta ven→dim)* | Execution | 35% |
| *(porté par le réflexe GTM B2B2C)* | Distribution | 10% |

→ La démo **incarne** Execution + Product ; la parole **vend** Edge + Business +
Distribution. 40% du score est récit fondateur : ces trois blocs sont le pitch.

---

## 0. Le script scène (pitch complet, EN)

> Le pitch de bout en bout, dans l'ordre où chaque beat arme le suivant.
> Arc : problème → magie → définition → anti-wrapper → coût → donnée → exécution → vision.
> Cible : **finale VC (dimanche)**. Démo live (Night Watch) à enchaîner après ②.

**① Le problème**
> You're standing in front of a masterpiece. Four centuries of genius, right there.
> And you have no idea why it matters.
> Your only tool? A dusty recording, droning a script nobody has touched in years, on an impersonal audioguide.

**② Le retournement** *(→ enchaîner sur la démo live)*
> Now imagine you could just… ask.
> You lift your phone toward the painting — and you talk to it.
> *"Who's the little girl glowing in the middle of all these soldiers?"*
> And it answers. Out loud. Live. In your language.
> **Laszlo turns any museum into a conversation.**

**③ Ce que c'est**
> Laszlo replaces the prehistoric audioguide with a guide you can actually talk to. Point your phone at any artwork, and the conversation starts.
> We sell it to museums — so every visitor finally gets a guide that speaks to *them*, not to everyone.

**④ Pourquoi ce n'est pas un wrapper**
> You might think: nice ChatGPT wrapper. It's not.
> While we demo two paintings, our engine has already ingested a thousand masterpieces — every fact tied to a real, verified source.
> Nothing is pre-written. Nothing is pre-recorded. Every answer is generated live, on the spot, for you.
> **The AI isn't the source — the Rijksmuseum is. The AI is just the sauce.**
> That's how we'll fill not one museum, but every museum in Europe.

**⑤ Le coût**
> For the museum, it's not just better. It's cheaper: 15 to 50 cents per visitor, against an audioguide that costs thousands to update.
> And we haven't even implemented caching yet.

**⑥ La donnée (le flywheel)**
> Today, museums are blind — the audioguide tells them nothing.
> Laszlo shows them, in real time: what visitors look for, what they ask, where they zone out.
> Every visit teaches Laszlo, and makes the museum more lucid.

**⑦ L'exécution**
> Everything you just saw — the pipeline, a thousand artworks, the AR, the voice — we built it from scratch this weekend. Two people. Less than 48 hours.

**⑧ Vision + ask (clôture)**
> Today, one phone, one museum. Tomorrow, every museum in Europe.
> **We're giving Europe's culture a voice.**
> We're looking for the first museums to pilot Laszlo — and the partners to help us bring it to all of them.

### Réserve Q&A — Smartify / concurrents

> Ne PAS nommer de concurrent dans le script (le *« pre-recorded »* du ④ vaccine déjà).
> Sortir ceci seulement si un juré pose la question.

**Smartify = playback. Laszlo = generation.** Smartify est architecturalement un
catalogue : contenu écrit/enregistré à la main → stocké → rejoué, la même fiche
pour tous. Coller une IA dessus ne change pas que leur valeur, c'est le catalogue
figé. Laszlo est generation-first depuis la couche données : rien n'est pré-écrit,
tout est généré + ancré au runtime. Punchline : **« they scale by hiring writers,
we scale by ourselves. »** Idem Google Arts & Culture = *« a museum you browse at
home »* vs *« the guide you talk to, standing in the room, that the museum owns. »*

---

## 1. The Edge — why this, why now, why you

> **Avantage déloyal.** Ce qui nous rend dur à copier et investissable.

### L'anti-wrapper (le point le plus important)

Dans un hackathon plein de démos voix, **une voix sur LLM = un wrapper banal**.
Notre défense « AI-native » n'est pas la voix — c'est ce qu'il y a **dessous** :

- **Un graphe de connaissance curé et ancré.** Chaque fait porte sa source
  (`notice.sources`, provenance dans le modèle). L'IA ne brode pas : elle est
  contrainte par un substrat sourcé. **Anti-hallucination by design** — critique
  pour une institution culturelle qui met son nom dessus.
- **Une génération au runtime, pas du contenu pré-écrit.** La sortie visiteur =
  `f(notice, glossaire@niveau, profil, langue, voix)`. On ne stocke aucun texte
  final, aucun audio. Un audioguide classique a *un* enregistrement ; Laszlo en a
  une infinité, adaptés à la volée.
- **Une surface jetable, une intelligence côté serveur.** Web → device → lunettes.
  On ne parie pas sur un objet, on parie sur l'expérience + la donnée.

### Why now

- **Open data culturel mûr** : Rijksmuseum (800k+ objets CC0, IIIF, Linked Art),
  Europeana (60M+). La matière première est ouverte, légale, structurée — **zéro
  risque de droits sur un livestream mondial**.
- **LLM rapides et peu chers** : runtime mesuré ~2 s (overview ~2,2 s, ask TTFT
  ~1,1 s). Il y a deux ans, cette latence tuait le wow. Aujourd'hui ça tient.
- **STT/TTS commodisés** : la voix bidirectionnelle est enfin un composant qu'on
  branche, pas un projet de recherche.

### Where it goes if it works

**Rijksmuseum aujourd'hui → 60M d'œuvres européennes demain.** Le même pipeline
qui a rempli un musée remplit un continent. *« Unite Europe » par la culture* —
en plein dans le thème Megathon. À terme : reconnaissance open-world par
embeddings (60M œuvres), couche éditoriale par musée, mémoire visiteur qui
apprend dans le temps.

### Why you (founder energy)

- **Build broad, demo deep** : on a déjà ingéré **1025 œuvres réelles** en prod
  (373 artistes, 1769 notices) — pas un mock. On *montre* la largeur, on *joue* la
  profondeur. C'est la réponse vivante à « comment tu remplis 1000 musées ? ».
- **Delta ven→dim** : pipeline réel + 4 edge functions déployées + app AR — du
  zéro au shippé en 45h.

---

## 2. Le business — real market, real wedge, real path to revenue

> **Is this a business or a feature ?** Un business. Démonstration.

### Le marché

Les musées et lieux culturels dépensent déjà — **budget audioguide, médiation,
accessibilité, analytics, multilingue, expositions temporaires**. Ce n'est pas un
marché à créer : c'est un budget existant qu'on capte avec un produit 10× meilleur
et infiniment moins cher à maintenir (zéro réenregistrement par langue, par
exposition, par niveau de public).

### Le wedge : B2B2C d'abord

- **Les musées paient. Les visiteurs adoptent sans friction** (via billet, QR,
  parcours du lieu). Pas de micro-paywall visiteur.
- **Mollie** active un *paid pilot*, un *package exposition*, ou un *abonnement
  venue*. Démo : une activation venue débloque le premium → webhook → analytics.
- Le wedge initial est étroit et défendable : **l'art curé**, pas le scan d'objets
  génériques. On ne se dilue pas vers ArtScan ; on ne dépend pas d'un seul
  partenariat comme Smartify. Notre moat = **la KB ancrée par sources**.

### Path to revenue

1. **Aujourd'hui** : activation venue via Mollie (pilot / package / abonnement).
2. **Court terme** : déploiements multi-musées, le pipeline encaisse le coût
   marginal d'un nouveau musée ≈ 0.
3. **~5 ans, B2C** : une fois assez de signaux d'usage agrégés et *privacy-safe*
   (quels publics, langues, intérêts, comportements premium), on ouvre un rail
   visiteur. **Pas avant d'avoir appris du réel.**

### Coût unitaire (à avoir en Q/R jury)

Runtime mono-appel LLM, ~2 s, modèle open hébergé (`gpt-oss-120b`). Pistes de
réduction citables : prompt-caching du préfixe system+grounding (batch hotspots &
multi-tour quasi gratuits), budgets de grounding par mode. **Le coût/visiteur est
maîtrisé et baisse avec le volume.**

---

## 3. Le produit — does it work, is it AI-native, is it crafted

> **Ça marche, c'est bâti, et c'est AI-native — pas un wrapper.** Preuves.

### Ça marche (état réel, vérifié en prod)

- **Couche Connaissance livrée** : Supabase, 1025 œuvres · 373 artistes · 7
  mouvements · 1769 notices · hotspots phares (vérifié 2026-06-20).
- **4 edge functions déployées, testées** (86 tests offline, e2e Bruno) :
  - `/generate` — 5 modes : `overview` · `hotspot` · `ask` · `persona` · `followups`
  - `/speak` — TTS (ElevenLabs opt-in · Edge · Mistral · Google), voix par langue
  - `/transcribe` — Voxtral, multipart
  - `/identify` — Pixtral, fallback vision AR
- **App mobile** : Expo React Native + ViroReact, reconnaissance AR → point ancré
  → vue détail 2D → hotspots → audio → chat.
- **Latence tenue** : ~2 s, dans le budget du wow vocal.

### C'est AI-native (architecture, pas slogan)

- **Génération runtime** `f()` en Edge Function, mono-appel, texte→texte ; la voix
  (STT/TTS) encadre, séparée. Pas d'agent multi-étapes inutile sur le chemin chaud.
- **Grounding sourcé** : le LLM ne parle que depuis des notices ancrées ; les
  notices Wikipedia volumineuses sont résolues au runtime (Night Watch 16k→3,9k
  tok) sans casser la provenance.
- **Personnalisation 3 axes orthogonaux** appliqués au runtime, zéro migration :
  **Motivation** (contempler / comprendre / histoires) · **Connaissance**
  (newcomer / comfortable / expert) · **Profondeur** (quick / standard / deep).
- **Hotspots personnalisés** : à l'ouverture d'une œuvre, batch `mode=hotspot` par
  profil/langue/session ; le tap lit un texte déjà prêt (fallback `narration_text`
  à 3 s). **Influence œuvre-à-œuvre** via l'historique de session.
- **Robustesse** : filets en cascade — ViroReact → vision `/identify` → QR →
  sélection manuelle → overlay 2D → vidéo backup. Le happy path ne casse jamais.

### C'est crafté

- Direction **« high tech, low tech »** : interface douce sur le regard (esprit
  Kindle N&B) qui ne vole pas l'attention à l'œuvre. Le craft compte (Jelle Prins
  au jury). Recrue designer dédiée.
- Séparation propre fait/narration/voix/rendu → un produit qui *peut apprendre et
  s'adapter*, là où un texte pré-mâché reste figé.

---

## 4. La coda (fermeture, ~15 s)

> Élargir juste avant l'ask.

Les musées ont des trésors que personne ne comprend vraiment. **Nous, on rend
chaque visiteur capable de les écouter.** Aujourd'hui le Rijksmuseum. Demain,
60 millions d'œuvres. Le téléphone aujourd'hui — les lunettes après.

*Laszlo. Tu ne lis plus l'art. Tu lui parles.*

→ **Ask** : [à compléter — recrue designer ven. 19:00 / track headline / pilot].

---

## Trame de slides (proposition)

| # | Slide | Contenu | Durée |
|---|---|---|---|
| 1 | **Hook** | Le carton de 3 lignes vs la toile. Une image. | 50 s |
| 2 | **Démo live** | Night Watch : parler → réponse vocale → changer de registre/langue. | ~2-3 min |
| 3 | **The Edge** | Anti-wrapper : graphe ancré + runtime. Why now. Where it goes (Europeana). | 40 s |
| 4 | **Business** | B2B2C, marché existant, Mollie, path to revenue. 1 chiffre-choc. | 40 s |
| 5 | **Produit / scale** | Build broad : 1025 œuvres réelles, 1 pipeline. AI-native, pas wrapper. | 30 s |
| 6 | **Coda + Ask** | Vision + demande claire. | 20 s |

## À compléter avant la finale

- [ ] **1 chiffre-choc** : œuvres ingérées (1025) · coût/visiteur estimé · package
  venue activable via Mollie. Choisir le plus fort.
- [ ] **1 slide de secours** unique (si la démo live tombe → vidéo backup).
- [ ] **Q/R jury préparées** : coût IA/visiteur · moat vs ArtScan/Smartify · GTM
  musées · scaling pipeline. (Pistes perf : prompt-caching, budgets grounding.)
- [ ] **Mentionner sans implémenter** : barge-in · couche éditoriale musée
  (ex. Guernica) · reco open-world par embeddings.
- [ ] **Wording de l'ask** selon le moment (recrutement ven. vs finale dim.).
