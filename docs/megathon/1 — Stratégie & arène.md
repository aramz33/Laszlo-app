---
tags: [projet/laszlo, megathon, type/reference, statut/actif]
date: 2026-06-19
---

# Megathon — 1. Stratégie & arène

> **Doc ground-truth 1/3** — le « pourquoi » du week-end : l'arène, la vision, la stratégie, les décisions actées.
> Suite : [[2 — Tech & build]] (le comment) · [[3 — Playbook & questions ouvertes]] (animation + à trancher).
> Hackathon **Megathon**, Amsterdam, **ven. 19 → dim. 21 juin 2026**. Build : **ven. 18:00 → dim. 15:00 (45h)**. Finale main-stage dim. 18:00, livestreamée.

## La thèse en une phrase

On n'utilise pas le week-end pour brainstormer laszlo — on l'utilise comme **moteur de validation** : transformer la fondation papier solide en **démo voice-first jouable en live, avec un signal de paiement réel**. Le R&D se prouve en shippant, pas en discutant.

## Win condition (priorisé)

1. **Principal** — Valider la direction produit : une démo voice-first qu'on met dans les mains de vrais gens (visiteurs + jury + VCs) et qui nous fait *croire davantage* au projet.
2. **Upside** — Gagner une track : **Vapi Voice** (cœur de cible) et/ou **headline Mollie·Visa Startup** (viabilité commerciale).
3. Le tout doit **rentrer dans notre storyline** — on ne code rien qui ne serve pas le pitch.

## L'idée produit pour le week-end (coup d'œil)
**Build broad, demo deep.** Un pipeline ingère une **tranche réelle du Rijksmuseum** (open data CC0) → prouve qu'on cure du contenu **à l'échelle** (la réponse à « comment tu remplis 1000 musées ? »). La **démo live va en profondeur sur 1–2 œuvres phares** (La Ronde de nuit, La Laitière) → c'est le wow voix. Reconnaissance **ancrée en AR via ViroReact** (ARKit iOS / ARCore Android) ; filets = sélection manuelle / QR / overlay 2D, cf. [[2 — Tech & build]].

## La vision (en clair)

- **Quoi :** un **guide de musée conversationnel** — tu te tiens devant une œuvre, tu lui parles à voix haute, elle te répond dans son registre, et tu peux la couper. L'alternative moderne à l'audioguide monotone.
- **Comment c'est différent :** pas un scanner d'objets générique (ArtScan), pas juste un partenariat musée (Smartify). Notre cœur = **une base de connaissance curée, ancrée par facettes** (Défaut / Technique / Histoire / Symbolisme) **+ voix bidirectionnelle (barge-in)**.
- **L'idée qui rend ça grand :** le contenu curé est produit **à l'échelle, automatiquement, et ancré** (provenance, anti-hallucination). C'est la réponse à *« comment tu remplis 1000 musées »* — et ce qui nous rend investissable.
- **Le modèle :** **B2C** freemium (expos permanentes) + **B2B** parcours co-construits avec les musées.
- **La trajectoire :** surface **jetable et portable** (web → device → lunettes) ; l'intelligence vit côté serveur. On ne parie pas sur un objet, on parie sur l'expérience + la donnée.
- **L'ambition :** Rijksmuseum aujourd'hui → 60M d'œuvres européennes (Europeana) demain. *« Unite Europe »* par la culture.

**Personnalisation (vision produit — démo = léger).** 3 axes orthogonaux : **Allure** (params de génération) · **Niveau** (glossaire gradué débutant→expert, par langue) · **Centres d'intérêt** (notices + personas). Système de personas complet (onboarding 3–4 QCM, ~9–12 profils orthogonaux, génération auto d'un nouveau persona si absent) = **vision** ; en démo on garde le **profil 3 questions** skippable.

## North star du week-end (storyline)
> **« Tu te tiens devant une œuvre. Tu lui parles. Elle te répond — à voix haute, dans son registre. »**

C'est la promesse à incarner en live. **Wow démo** = audio guide par hotspots + Q&A vocale. La coupure mid-phrase (barge-in) reste dans la vision et le pitch, mais **le build n'en dépend pas** (cf. [[2 — Tech & build]], M16) — montrée seulement si stable.

## Le principe central : « build broad, demo deep »

**« Build broad » = construire large, en coulisses.** On code un **pipeline** qui va chercher tout seul **beaucoup d'œuvres** dans l'open data du Rijksmuseum (dizaines → centaines) et les transforme automatiquement en fiches laszlo : structurées, par facettes, **ancrées sur des sources** (jamais inventées). Preuve que le *système* sait **remplir un musée entier sans écrire chaque fiche à la main**. Invisible pour le visiteur — c'est la machine.

**« Demo deep » = montrer profond, sur scène.** Devant le jury, on choisit **1–2 œuvres célèbres** et on va **au fond** : vraie conversation vocale, on coupe l'IA en plein milieu (barge-in), on change de registre (technique → histoire → symbolisme), on bascule de langue. C'est le **wow**, et il n'existe que si on se concentre sur peu d'œuvres.

**Comment les deux se relient :** c'est **un seul système**. Les œuvres phares qu'on démontre sortent **du même pipeline** que les centaines d'autres. On **raconte** la largeur (l'histoire du passage à l'échelle, pour les investisseurs) et on **joue** la profondeur (l'émotion, pour le wow). *Image : une cuisine capable de 200 plats (build broad), mais on sert 2 assiettes parfaites au jury (demo deep).*

| | Sert quel axe du jury | Pourquoi |
|---|---|---|
| **Demo deep** (1–2 phares) | le **wow** / track Vapi · Product 25% | en ~3 min sur scène, la voix + barge-in ne se montrent qu'en profondeur |
| **Build broad** (pipeline) | le **« unicorn »** / headline · Business+Edge | répond à « comment tu remplis 1000 musées ? » → contenu curé **à l'échelle** = notre **anti-wrapper** |

## Données : Rijksmuseum (+ Europeana en story)

- **Rijksmuseum Data Services** : 800k+ objets, **CC0 domaine public**, images HD via **IIIF**, métadonnées en **Linked Art / CIDOC-CRM / Europeana Data Model**.
  - **Pourquoi parfait :** (1) **Amsterdam-local** = musée du jury ; (2) **CC0** = zéro risque de droits sur un livestream mondial ; (3) le Linked Art **mappe sur notre graphe** (Œuvre→Artiste→Mouvement) → ingestion propre, pas du scraping ; (4) œuvres **iconiques** (Ronde de nuit, Laitière) pour la profondeur.
- **Europeana** : 60M+ objets, APIs ouvertes, charte domaine public → notre **story d'échelle UE** (« Rijksmuseum aujourd'hui, 60M d'œuvres européennes demain ») — rime avec le thème *Unite Europe* de Megathon.

**Critères de sélection de la tranche (ordre de priorité) :**
1. **CC0 + image HD + métadonnées riches** → notices ancrées.
2. **≥1–2 œuvres mondialement iconiques** pour la démo profonde.
3. **Cohérence thématique** (1 salle / artiste / mouvement) → le graphe s'interconnecte, follow-ups inter-œuvres (« compare à celle d'à côté »).
4. **Richesse des facettes** (technique / histoire / symbolisme).
5. **Œuvres néerlandaises / Amsterdam** → résonance jury local.

## Positionnement (ne pas diluer le moat)

Différenciateurs figés (wiki) : **KB curée ancrée par facettes** (ADR 0002) + **voix bidirectionnelle + barge-in** (ADR 0003). On reste sur **l'ART curé**, pas le scan d'objets quelconques.
Bonus jury : **Bob van Luijt (CEO Weaviate)** → RAG/graphe ; **Thomas Kluiters (Head of AI, voix)** → notre cœur ; **Jelle Prins (ex-Uber, design)** → le craft ; **Daniel Gebler (CTO Picnic)** → sondera le scaling = notre pipeline répond.

---

## L'arène — Megathon en détail

**En une ligne :** *« Europe's biggest launchpad »* — 500 builders vettés, ~150 startups, **€100K+** de prix, finale **livestreamée**. Slogan : *« Built to launch startups, not side projects. »* Partie de l'**Amsterdam Tech Week**. Organisé par **TAG**. Lieu : **The HUBB**, Amsterdam (4 étages).

### Format & déroulé

- Build : **ven. 18:00 → dim. 15:00** (45h). Doors ven. 16:00.
- **BYOS — Bring Your Own Startup** : ton vrai projet, pas un jouet de week-end.
- **Tunnel de sélection :**
  1. **Demo rounds** — 5 salles, juges *pré-sélection* (surtout VCs/accélérateurs) voient **chaque** démo et choisissent les finalistes.
  2. **Main-stage finals** (dim. 18:00) — top 10 pitch devant le jury headline.
  3. **Tier-1 pitch battle** (20:00) — finalistes des tracks les plus dotées.
  4. **Awards** (20:30).
- → **On doit d'abord gagner une petite salle devant des VCs** avant la grande scène. La démo doit convaincre en intime.

### Comment on est jugé (rubrique du track headline)

> *« Most hackathons measure features. MEGATHON measures founders. »*

| Critère | Poids | Ce que ça veut dire |
|---|---|---|
| **Execution Power** | **35%** | Le delta vendredi→dimanche. *« Un solo qui a shippé de zéro bat une équipe financée qui a juste poli une landing page. »* |
| **Product** | **25%** | Ça marche ? Vraiment **AI-native** — ou un *wrapper autour d'un appel API* ? Craft, design, qualité de l'idée. |
| **Business** | **15%** | Vrai marché, vrai wedge, vrai chemin vers le revenu. |
| **The Edge** | **15%** | Avantage déloyal. Why this, why now, why you — et où ça va. |
| **Distribution Instinct** | **10%** | Tu sais comment ça atteint les gens ? Le réflexe GTM. |

- **⚠ Implication n°1 :** « AI-native, pas un wrapper » → dans un hackathon **plein de démos voix** (Vapi sponsor), une voix sur LLM = wrapper banal. **Notre anti-wrapper = le pipeline de contenu curé + ancré + graphe + reconnaissance.** À mettre en avant fort.
- **Implication n°2 :** 40% du score (Business+Edge+Distribution) = **récit fondateur**. La lane CEO d'Adam pèse autant que le code.

### Tracks principales (finale main-stage)

| Track | Qualif | Récompense |
|---|---|---|
| **MEGATHON Startup** (Mollie·Visa) — *headline* | Créer un compte **Mollie** | #1 **€10K cash + €15K Codex** · #2 €3K Codex · #3 €2K Codex |
| ↳ **Bounty Mollie** (usage le plus malin de Mollie) | Intégrer Mollie | 1er **€20K** de volume gratuit · 2e €5K · 3e €2K |
| **Base44 — Prompt to Paid** (Base44·Tulip) | Une app **live sur Base44** dim. | 1er €2K cash + interview accélérateur Base44 fast-track + 3 mois Builder · 2e €1K + 1 mois |
| **Best Build with Devin** (Cognition) | **Commits Devin** dans le repo | Crédits Devin + swag |

*Critères Base44 :* Traction 25% · Product 20% · Exécution Base44 20% · GTM 20% · Pitch & founder energy 15%.

### Tracks sponsors (stackables)

| Track | Qualif | Récompense |
|---|---|---|
| **Vapi Voice** | Flow voix Vapi **live** dans la démo | $500 crédits + **AirPods Pro** au gagnant ; $50 à tous |
| **Cala — Best Use** | Clé API **Cala** en prod (data structurée *sourcée* JSON) | 1er €1K cash + **trip Barcelone** + 6 mois Cala Build · 2e 6 mois Explore |
| Pixverse Creative Video | Vidéo d'équipe faite sur Pixverse | €500 |
| Pixverse Creative Product | Produit avec Pixverse au cœur | €500 |
| AnyBiz — Auction | Opt-in + soumettre la boîte | Moment d'enchère live sur scène |

### Tracks spéciales (open à tous)

| Track | Qualif | Récompense |
|---|---|---|
| **Build-in-Public** (TAG) | Commits publics + journey postée dim. | **Office space** + spot TAG Hack Island + session stratégie créative |
| Wispr — Prompt Roulette | Défi au stand (dicter l'idée 60s, sans clavier) | Cartes prépayées top 3 + 1 mois Wispr Pro à tous |

### Ce qu'on vise (et pas) — décision

| Track | Viser ? | Pourquoi |
|---|---|---|
| **Headline Startup** (Mollie·Visa) | ✅ **Cœur** | Notre histoire commerciale ; qualif = compte Mollie (fait). 40% du score = founder/business → notre terrain. |
| **Vapi Voice** | ✅ **Cœur** | La démo *est* voix-first + barge-in ; qualif = flow Vapi live. |
| **Build-in-Public** (TAG) | 🟢 Quasi-gratuit | Adam poste la journey + commits publics. ~0 effort → visibilité + office space. |
| **Devin** (Cognition) | 🟢 Quasi-gratuit | Si on code avec Devin, les commits suffisent. À activer si on l'utilise vraiment. |
| **Wispr — Prompt Roulette** | 🟢 Quasi-gratuit | Défi au stand (60s). Fun + swag, zéro impact build. |
| **Cala — Best Use** | 🟡 À investiguer | Data structurée *sourcée* → colle à notre provenance. Décider au workshop sam. 12:30. Bonus €1k + Barcelone. |
| **Base44 — Prompt to Paid** | 🟡 Conditionnel | Seulement si front sur Base44 → 1 track de plus, mais lock-in. À trancher avec Siffrein. |
| **AnyBiz — Auction** | 🟡 Optionnel | Opt-in pas cher = visibilité, mais hors focus. Seulement si gratuit en effort. |
| **Pixverse** (Video & Product) | ❌ Non | Vidéo AI créative = hors produit, distraction. |

**Lecture :** 2 cœurs · 3 quasi-gratuites · 3 à décider · 2 à ignorer. Tout ✅/🟢 se cumule sur **un seul build**.

### Jury — qui compte pour nous (mindset VC)

Panel headline (11) — surtout **VCs + opérateurs** :
- **Bob van Luijt** (CEO **Weaviate**) → vector DB / RAG : notre retrieval & graphe lui parlent.
- **Jelle Prins** (Cradle, **ex-Uber, designer fondateur**) → le **design / craft** compte pour lui.
- **Thomas Kluiters** (Head of AI **Reson8**, *« making all voices heard »*) → **voix AI**, notre cœur.
- **Daniel Gebler** (CTO **Picnic**) → scaling/ops → il sondera *« est-ce que ça scale ? »* = notre pipeline répond.
- **Tea Elezi** (GP **Peak**), **Evert Beeckman** (**Entourage**), **Lennard Kooy** (Lleverage), **Ksenia Zvereva** (**Mollie**), **Pierre Castronovo** (**Visa**, fintech), Lian Boerma (EWOR), Silvia Berberi (EIT).
- **Demo rounds** (pré-sélection) : baby vc, Plug and Play, Startupbootcamp, PROfounders, SET Ventures, United Founders… → **investisseurs early-stage** ; il faut les accrocher en petite salle.

→ **Mindset : on se présente en fondateurs devant des VCs**, pas en hackers devant des ingénieurs. Traction, edge, scale, GTM — autant que la démo.

### Sponsors & builder kit

- **Presenting :** Codex (OpenAI), Mollie, Visa, Base44, Cognition, Peak (VC), TAG.
- **Powered by :** Miro, Wispr Flow, Vapi, Nebius, PixVerse, Cala, Netlify, Lemlist, Neno, AI AM, EventsPoint, Tectonic, Livestream Lab, Provoke.
- **Builder kit (à claim à l'onboarding) :** Codex MAX · Devin MAX · Nebius 100$ inference · PixVerse ~30k crédits · **Vapi 50$ voix** · Cala (clés + Scale plan) · Base44 (crédits + Builder) · Miro Enterprise · HubSpot for Startups · Wispr Flow Pro 3 mois.

---

## Les décisions de cette session (question → décision → pourquoi)

### 1. Cadrage — à quoi sert le week-end ?
- **Décision :** le hackathon = **moteur de validation**, pas une retraite R&D. On shippe une démo réelle.
- **Pourquoi :** l'arène récompense le **delta ven→dim (35%)** et une **démo live** devant des VCs. La seule chose qu'on ne peut pas obtenir dans notre vault, c'est un verdict du marché. On valide *en shippant*.

### 2. Produit / démo — quel périmètre ?
- **Décision :** **build broad, demo deep** (cf. ci-dessus).
- **Pourquoi :** les 2 axes du jury tirent différemment. Profondeur = wow (Vapi) ; largeur = « unicorn » (headline, scaling). On sépare ce qu'on *construit* de ce qu'on *montre*.
- **Écarté :** mapper tout le venue (time-sink + dilue vers le scan générique d'ArtScan, devant les juges les plus pointus).

### 3. Données — quoi et d'où ?
- **Décision :** **Rijksmuseum** (CC0, IIIF, Linked Art), Amsterdam-local. Europeana = story d'échelle UE.
- **Pourquoi :** CC0 = zéro risque de droits en livestream ; Linked Art mappe sur notre graphe ; œuvres iconiques pour la profondeur ; musée du jury = résonance locale.

### 4. Reconnaissance — comment on identifie l'œuvre ?
- **Décision révisée (20/06) :** **Expo React Native + ViroReact** pour la démo produit. ViroReact fournit le tracking image et le point ancré, en utilisant ARKit sur iOS et ARCore sur Android. **Pas de similarity search embeddings au runtime.** Filets = sélection manuelle + QR + overlay 2D.
- **Pourquoi :** l'horizon produit est cross-platform mobile et agent-friendly. Pour notre besoin AR étroit (identifier une œuvre plate, afficher un point, ouvrir la vue détail), ViroReact garde l'app en TypeScript sans sacrifier l'ancrage. Les embeddings restent la **story d'échelle du pitch** (reco open-world, 60M œuvres) + un chantier post-hackathon.

### 5. Angle business — comment on prouve la valeur ?
- **Décision :** **paywall Mollie** « débloquer le guide premium » + viser **headline + Vapi**, stacker Devin / Build-in-Public / (Cala à investiguer).
- **Pourquoi :** le paywall est à la fois **qualif headline**, **entrée bounty Mollie**, et surtout **test de willingness-to-pay** (signal de marché réel). 40% du score est founder/business → on traite le pitch et la traction comme du produit.
- **Anti-wrapper :** notre défense « AI-native » = le **pipeline curé + ancré**, pas la voix elle-même.

### 6. Style / design — quelle sensation ?
- **Décision :** **« high tech, low tech »** — interface douce sur le regard (esprit Kindle N&B), qui n'enlève pas l'attention de l'œuvre. On recrute **un designer / front-end** dédié.
- **Pourquoi :** sur scène livestreamée, le wow est en partie **esthétique** (Jelle Prins). Le « Product 25% » inclut le craft. C'est notre plus gros gap → 1ère recrue.

### 7. Équipe / charge — qui fait quoi ?
- **Décision :** **Adam code en parallèle** (moteur de données) **+** reste CEO (lead SYNC, business, pitch). **Siffrein** = expérience temps réel (front + voix Vapi + deploy). **Designer** = UI. (cf. [[2 — Tech & build]])
- **Pourquoi :** Siffrein seul sur voix+pipeline+CV était surchargé. Répartir le long des **coutures hexagonales** (contrat = schéma Supabase) = parallélisme sans collision. Nouveau risque : Adam double-casquette → **temps pitch protégé** (dim. matin) + Codex/Devin en assist.

### 8. Form factor / Rabbit R1
- **Décision :** **hors scope** comme pari central (coda 20s max).
- **Pourquoi :** nos notes ont déjà tranché « surface = jetable, edge = KB + voix » ; devant des sponsors voix & paiement, prouver un R1 optimise ce que personne ne juge ; l'économie hardware est mauvaise (Master_Model).

## Ce que la validation doit nous apprendre (au-delà du prix)

- Le moment « parler à l'œuvre » crée-t-il un **wow** réel chez des inconnus ?
- **Quelqu'un paierait *vraiment* ?** → deux rails (détail Mollie dans [[2 — Tech & build]]) :
  - **Test mode** = sert la **démo** + la qualif track. Mais un « paiement » en test **ne prouve rien**.
  - **Live mode** (SIRET, lancé dès vendredi + aide du stand Mollie) = **vrai argent au stand** → on compte les **conversions réelles**. *C'est ça* le signal willingness-to-pay.
  - **Caveat :** payeurs = builders ≠ visiteurs de musée → signal **directionnel**, pas définitif.
- Le pipeline d'ingestion **tient-il** sur des données réelles (Rijks) → preuve que le **contenu scale** ?
- Retours **jury / VCs / mentors** → croire plus (ou pivoter) en connaissance de cause.

---

## Journal de décisions (M0–M17)

| # | Décision | Statut |
|---|---|---|
| M0 | Le week-end = moteur de validation, pas une retraite R&D | ✅ acté |
| M1 | Rabbit R1 **hors scope** comme pari central (coda 20s max) | ✅ acté |
| M2 | **Build broad / demo deep** : pipeline ingère une tranche réelle (scale) + démo profonde sur 1–2 œuvres phares (wow) | ✅ acté |
| M3 | Démo au stand : poster/écran + reconnaissance, le jury teste lui-même | ✅ acté |
| M4 | Tracks visées : **Vapi Voice** + headline **Mollie·Visa** — *track Vapi conditionnée à M15 (voix) et relativisée par M16 (barge-in)* | ✅ acté |
| M5 | Stack week-end (Supabase, données Rijks) — **front révisé par M12/M14** | 🔄 à confirmer Siffrein |
| M5b | **Mollie LIVE actif** (compte, banque, identité, CB/Apple/Google Pay) → dev sur test, live pour le signal stand | ✅ fait |
| M6 | **Données = Rijksmuseum** (CC0, OAI-PMH `edm`, IIIF), Amsterdam-local ; set démo pressenti **`26021` Dutch 17th c.** ; **Europeana** = story scale UE | ✅ acté (set/œuvres → M17) |
| M7 | Reconnaissance — **clôturé par M13** : embeddings **hors runtime** (gardés = story d'échelle pitch) | ☑️ remplacé par M13 |
| M8 | Rôles : **Adam** = moteur de données (dev) + CEO/pitch ; **Siffrein** = expérience temps réel ; **designer** = UI. **Lanes outils précisées par M14** | ✅ acté (révisé par M14) |
| M9 | Priorité build : **voix-phare → pipeline breadth → reconnaissance bonus** | ✅ acté |
| M10 | **Stacking tracks** : core Vapi + headline ; quasi-gratuit Devin / Build-in-Public / Wispr ; **Cala à investiguer** ; Base44 conditionnel | ✅ acté |
| M11 | **Parallélisation** : découpe hexagonale, **contrat = schéma Supabase** figé au SYNC 1, monorepo | ✅ acté |
| M12 | **Reconnaissance spatiale = point ancré 3D via ARKit natif iOS** ; client démo **natif iOS**, PWA Vercel repli paywall. Détail : [[2 — Tech & build]] | ☑️ remplacé par M25 |
| M13 | **Reconnaissance démo = ARKit pur** : ARKit image tracking fait reco + pose, **pas de similarity search embeddings au runtime**. Embeddings = story d'échelle (pitch) + post-hackathon. Filets = overlay 2D / QR | ☑️ remplacé par M25 |
| M14 | **Codebase = monorepo** ; pipeline + backend en **IntelliJ** (Adam, Python reco) ; app AR native iOS en **Xcode/Swift** (Siffrein) | ☑️ remplacé par M25/M26 |
| M15 | **Voix / TTS = OUVERT** : compte **ElevenLabs** dispo ; arbitrage ElevenLabs vs Vapi (track) à trancher **après recherche** ; pipeline gardé agnostique à la voix | 🔄 recherche (cf. [[3 — Playbook & questions ouvertes]]) |
| **M16** | **Barge-in = hors happy path** : archi voix full-duplex **capable**, mais couper l'IA en cours de parole n'est pas dans le chemin de démo (« pas un vrai waouh », notes 20/06) → montré si stable, sinon **pitch-only**. Simplifie M15 (sans barge-in, ElevenLabs seul peut suffire) | ✅ acté |
| **M17** | **Sélection des œuvres démo** (critères : classique / souvent mal comprise / pour enfants ; *abstrait hors Rijks*) + source → **à figer à la session dataset** | 🔄 session dataset |

<!-- maj : 2026-06-20 -->



## Journal de décisions — addendum (session pipeline, 2026-06-20 soir)

> Session de build solo Adam (pipeline IntelliJ). Décisions issues du grilling + reconnaissance live des endpoints. Docs repo `docs/` mises à jour en conséquence.

| # | Décision | Statut |
|---|---|---|
| M18 | **Notice = substrat neutre ancré**, jamais le texte final. 1 ligne par (œuvre × lang × source). **Colonne `facet` supprimée** : les 4 chemins = **lentilles runtime** + boutons UI (taxonomie non figée, à repenser humain/social) | ✅ acté |
| M19 | **Enrichissement multi-sources SANS LLM** : Rijks (métadonnées fiables) + **Wikidata** (Q-id, mouvement P135, tags P180/P136, sitelinks — pour les 747) + **Wikipedia** (narration, gate = article existant, repli Rijks). Notices par source (rijks `ok`, wikipedia `review`) | ✅ acté |
| M20 | **Set Rijks = `26121`** (≠ `26021` = coquille), **747 œuvres**. IIIF imageId **direct** dans `edm:isShownBy` (pas de détour Linked Art pour l'image) | ✅ vérifié live |
| M21 | **Architecture en 3 couches** : Connaissance (construite ce soir) → Personnalisation (profil 3 axes / persona / cadrage musée) → Mémoire (apprend dans le temps). Les **3 cadrans (Allure/Niveau/Centre d'intérêt) s'appliquent tous au runtime** ; perso+mémoire = designées + pitchées (sessions suivantes) | ✅ acté |
| M22 | **ETL médaillon** (raw → enriched → refined → load), **Supabase direct** (pas de mock), client démo alors **natif iOS confirmé** (Adam = expert iOS), **pas de recrue n2**. LLM (faceting/génération) + TTS = déférés | ☑️ front remplacé par M25/M26 |


| M23 | **Corpus corrigé : `26121` → `260214` (Top 1000)**. Le set `26121` (catalogue Dutch 17e) **excluait les phares** (Night Watch/Laitière sont dans `260213`/`260214`) + ~6 % de couverture Wikipedia → mauvais pour un guide conversationnel. Top 1000 = **1040 masterpieces**, phares garantis, forte couverture Wikipedia. (M20 révisé) | ✅ acté (corpus réel vérifié) |


| M24 | **Audio des hotspots = généré LIVE au runtime** (pas de pré-rendu). Cohérent avec notice-substrat : un fichier pré-rendu ne s'adapte pas (niveau/langue/voix). `audio_url` = cache optionnel seulement si la latence live casse le wow. Supprime l'étape TTS du pipeline. | ✅ acté |
| M25 | **Frontend produit = Expo React Native + ViroReact**. ViroReact est le premier adaptateur `ArtworkIdentifier` (ARKit iOS / ARCore Android). Swift ARKit direct devient repli iOS si ViroReact bloque. | ✅ acté |
| M26 | **Codebase mobile = `/app-mobile`**. Le produit UI/voix/chat reste en TypeScript pour maximiser la vélocité coding agents ; Expo dev builds sont acceptés pour l'AR. | ✅ acté |
| M27 | **Surface AR réduite** : reconnaître l'œuvre, afficher un point ancré tappable, puis ouvrir une vue détail 2D. Pas de scène AR riche dans le chemin critique. | ✅ acté |
