---
tags: [projet/laszlo, megathon, type/reference, statut/actif]
date: 2026-06-20
---

# Megathon — Catalogue des features

> Inventaire exhaustif du panel produit laszlo, issu de la session de grilling du
> 2026-06-20. Liste **non étiquetée** (free / premium / musée) — l'étiquetage et la
> spec produit sont l'étape suivante (cf. [[0 — TODO directeur]] ligne 75).
> Le « pourquoi » des décisions business vit dans [[1 — Stratégie & arène]] (M28).
>
> **Étiquetage near-term = Modèle A (venue-gated)** : le plan du musée débloque les
> features pour ses visiteurs ; pas de paywall visiteur direct. Le visitor-paid
> (Modèle B) reste roadmap ~5 ans.
>
> **La coupe « ce qu'on construit pour le hackathon » est en bas de ce doc**
> (section « Scope démo hackathon »).

## 1. Socle visiteur (devant une œuvre)

- Reconnaissance d'œuvre — AR image tracking (ViroReact), QR, sélection manuelle, overlay 2D fallback
- Audio-guide par hotspots, généré **live** au runtime
- Q&A conversationnelle sur l'œuvre (texte + voix)
- Multilingue runtime (génération en langue cible)
- Niveau par défaut (registre grand public)
- Profil onboarding 3 questions, skippable
- Affichage des sources / provenance (anti-hallucination)

## 2. Personnalisation (3 axes runtime — M21)

- **Allure** : registre/ton de génération (1 neutre → allures alternatives)
- **Niveau** : glossaire gradué débutant → expert (+ enfant/famille)
- **Centres d'intérêt** : notices orientées + personas (génération auto d'un persona absent)
- **4 chemins de connaissance** : Défaut / Technique / Histoire / Symbolisme

## 3. Parcours, découverte & mémoire (entre et au-delà d'une œuvre)

- Navigation spatiale (« le Renoir est derrière toi, à gauche »)
- Follow-ups inter-œuvres (« compare à celle d'à côté »)
- Recommandations de parcours (par intérêt / par temps dispo / highlights)
- Plan du musée
- Mémoire inter-visites (historique, reprise de session)
- Carnet / favoris / collection perso (sauvegarder, envoyer par mail)
- Résumé post-visite (« ce que tu as vu / appris »)
- Mode enfant / famille
- *Exclus du catalogue : gamification/quiz, partage social, billetterie*

## 4. Console musée (back-office B2B)

- Gestion du catalogue (ingestion pipeline raw → enriched → refined)
- Couche éditoriale (override / curation des notices, contenu maison type Guernica)
- Éditeur de hotspots (poser/déplacer les points `x,y`)
- Branding (logo, palette, **voix de marque** TTS custom)
- Gestion des langues activées
- Dashboard analytics (signaux d'usage agrégés privacy-safe)
- Gestion des expositions / parcours temporaires
- Gestion des accès (QR / billets / lien d'activation visiteur)
- Export de données (CSV / API)
- Facturation / abonnement (activation Mollie : package / pilot / abonnement)
- *Console v2 (scale) : multi-sites, rôles/permissions équipe, A/B test notices, modération des questions*

## 5. Accessibilité & robustesse terrain

- Lecture audio intégrale (malvoyants — natif vu le voice-first)
- Transcription / sous-titres du flux audio (malentendants)
- Taille de texte / contraste réglables (esprit Kindle N&B)
- Mode hors-ligne / cache local des notices phares
- Simplification cognitive (FALC — réutilise l'axe Niveau)
- Multilingue comme accessibilité (touristes non-locuteurs)
- Commande 100 % mains-libres / vocale
- Compatibilité lecteurs d'écran natifs (VoiceOver / TalkBack)
- *Hors-catalogue, noté comme demande marché : langue des signes (avatar vidéo)*

## 6. Identité visiteur & vie privée

- Identité anonyme device-based **par défaut** (zéro friction)
- Compte léger **optionnel** (mail / Apple / Google) pour persistance multi-visites/appareils
- Consentement & RGPD (opt-in mémoire, droit à l'oubli)
- Export / suppression des données visiteur
- Anonymisation des signaux remontés au musée (« privacy-safe »)

## 7. Intégrations (B2B)

- Paiement : Mollie (checkout hosted + webhook activation)
- Billetterie / contrôle d'accès (lien QR depuis le système de billets)
- Voix : provider TTS/STT (ElevenLabs / Vapi — M15 ouvert)
- Données source : pipeline open-data (Rijks OAI-PMH / IIIF, Wikidata, Wikipedia)
- Export analytics : CSV / API vers les outils du musée
- SSO / annuaire équipe musée (console)
- *Intégration v2/scale : connecteur CMS/collections existant (TMS, MuseumPlus…)*
- *Reporté roadmap : CRM musée, hardware audioguide loué, API publique partenaires*

## 8. Vision / roadmap (raconté au pitch, non codé)

- Reconnaissance open-world par embeddings (60M œuvres, sans reference library)
- Échelle Europeana (Rijks aujourd'hui → 60M œuvres UE demain)
- Multi-surface (web → device → lunettes / coda phone-less)
- Signaux d'usage agrégés privacy-safe → bascule **B2C** (~5 ans)
- Mémoire longue / apprentissage dans le temps (couche 3 de M21)
- Barge-in (archi capable, montré si stable — M16)
- Couche éditoriale avancée (workflow rédactionnel musée)

---

# Scope démo hackathon

> La **coupe « ce qu'on construit maintenant »** parmi le panel ci-dessus, actée
> en session de scoping (2026-06-20). Orientée écrans, base du wireframe. Le reste
> du catalogue = post-hackathon. Détail du chemin de démo : [[0 — TODO directeur]]
> (happy path) et le contrat `f()`.

## Onboarding (crée l'utilisateur de la démo)

- 3 questions **QCM multi-sélection** (allure · niveau · intérêt) — profils qui se croisent
- **Champ libre** langage naturel (« autre / dis-nous en plus »)
- **Picker langue** (init locale), le tout **skippable**
- → génère le **persona** (1 appel LLM caché, `AsyncStorage`) + identité anonyme device-based

## Entrée dans l'œuvre

- **Scanner AR** ViroReact → point ancré tappable
- Filets : vision Claude (overlay 2D) · sélection manuelle · QR

## Vue détail 2D (écran riche)

- **Hotspots personnalisés** : à l'entrée de la vue œuvre, l'app lance en parallèle un
  `/generate mode=hotspot` par hotspot ; tap hotspot = texte déjà prêt + TTS live
- **Lecteur audio** : vitesse / ton / voix changeables à la volée
- **Chat libre** voix/texte → `/generate mode=ask`
- **Point placé par l'utilisateur** (pointer un endroit + question) → `/generate mode=ask`
- **Sources / provenance** affichées
- *Pas de boutons d'angle* — pilotage par la conversation

## Personnalisation (invisible, niveau prompt)

- Couche **lanes / persona** injectée dans chaque `/generate` + **fragments de lane pré-écrits** dans le system prompt
- **Adaptation intra-conversation** via l'historique (`/generate` stateless) — ex. « arrête le symbolisme »
- **Niveau** mocké = paramètre de prompt (pas de table glossaire)
- **Multilingue** = génération en langue cible (2 langues en démo)

## Navigation spatiale (3 posters au mur)

- Fin d'œuvre → **flèche AR ancrée** (offset hardcodé œuvre 2), `gallery_layout` des 3 phares
- **Fallback flèche 2D** si la VIO décroche · **gate go/no-go ViroReact**
- Arrivée → « Commencer cette œuvre » / « Scanner AR »

## Liens & langue

- **Follow-up inter-œuvres** (« compare à celle d'à côté », graphe, 2 phares reliés)
- **Bascule de langue** à tout moment

## Surface musée (pitch)

- **Activation Mollie** (package venue) → webhook débloque premium venue + mini-CSV

## Coulisses (backend)

- `f()` Edge Function = `/generate` (modes `hotspot` + `ask`, streamé) + `/transcribe`
- Pipeline d'ingestion déjà livré (1025 œuvres en prod)
- Modèle LLM (mini-éval Nebius / Mistral / Claude) + TTS (ElevenLabs / Vapi) à trancher

## Explicitement hors démo (plus tard)

Réécriture persona persistante (couche Mémoire) · table glossaire réelle · compte
visiteur · carnet/favoris · résumé post-visite · recommandations de parcours ·
console musée (éditorial / hotspots editor / branding / analytics / expositions) ·
transcription/contraste · intégrations CMS/SSO · toute la section Vision/roadmap
(open-world embeddings · Europeana · lunettes · B2C visitor-paid · barge-in).

## Décisions de scoping (référence)

- **S1** — Étiquetage near-term = **Modèle A (venue-gated)** ; visitor-paid (B) en roadmap ~5 ans.
- **S2** — Niveau gradué = **mocké au prompt** pour la démo (pas de table glossaire).
- **S3** — Navigation spatiale = **AR world-tracked « fakée »** : offset hardcodé de l'œuvre 2 depuis l'ancre de l'œuvre 1 (i), fallback flèche 2D, derrière le go/no-go ViroReact.
- **S4** — **Pas de « 4 chemins » en UI** : ce sont des **lanes**, une couche de préférences générée depuis l'onboarding et injectée aux prompts.
- **S5** — Persona **généré par LLM** (1 appel caché) ; **évolue intra-conversation** via l'historique (`/generate` stateless) ; réécriture persistante = plus tard.
- **S6** — Onboarding = **QCM multi-sélection + champ libre** ; profils qui se croisent.
