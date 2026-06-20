---
tags: [projet/laszlo, megathon, type/reference, statut/actif]
date: 2026-06-20
---

# Megathon — Catalogue des features

> Inventaire exhaustif du panel produit laszlo, issu de la session de grilling du
> 2026-06-20. Liste **non étiquetée** (free / premium / musée) — l'étiquetage et la
> spec produit sont l'étape suivante (cf. [[0 — TODO directeur]] ligne 75).
> Le « pourquoi » des décisions business vit dans [[1 — Stratégie & arène]] (M28).

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
