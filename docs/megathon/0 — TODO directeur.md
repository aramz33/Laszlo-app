---
tags: [projet/laszlo, megathon, type/todo, statut/actif]
date: 2026-06-20
---

# Megathon — 0. TODO directeur

> **File directeur principal — suivi.** Coche au fur et à mesure. Le contexte/raisonnement est dans [[1 — Stratégie & arène]] · [[2 — Tech & build]] · [[3 — Playbook & questions ouvertes]].
> 🟡 = **tâche de décision** (à trancher, peut générer des sous-tâches).

## Backend

- [x] 🟡 Figer le **schéma Supabase** (le contrat) au SYNC 1
  - [x] Créer le projet Supabase + exécuter le SQL (artist / movement / museum / artwork / notice / hotspot)
  - [ ] Générer les types partagés (`/shared`) pour l'app iOS
- [ ] Exposer une **API de lecture** fine (œuvre + notices + hotspots) pour l'app
- [ ] **Mollie serveur** : hosted checkout + webhook « débloquer premium »
- [ ] Brancher clé Mollie **test** (dev) puis **live** (stand)
- [x] Storage Supabase pour images HD + reference images ARKit
- [ ] Déploiement backend (proche utilisateur)

## Frontend

- [x] 🟡 Confirmer avec Siffrein : client = **natif iOS (ARKit)**, PWA en repli paywall (SYNC 0)
- [ ] 🟡 Décider : PWA sur **Base44** (track Prompt to Paid) vs **Vercel** libre
- [ ] Vérifier la **porte toolchain** : Mac + Xcode + iPhone physique + Apple ID (vendredi soir)
- [ ] Scaffold app iOS (Xcode/Swift, ARKit/RealityKit) — `/app-ios`
- [ ] **Vue AR** : détection œuvre (reference images) → **point bleu ancré** (world-locked)
- [ ] Tap point → **vue détail 2D** de l'œuvre
- [ ] **Hotspots** sur la vue détail (points pré-définis depuis la DB)
- [ ] **Lecteur audio** des hotspots + contrôles **vitesse / ton / voix** (changeables à la volée) — *audio généré **live** au runtime (M24), pas de pré-rendu*
- [ ] **Chat libre** : poser des questions + taper hors hotspots → réponse vocale/texte
- [ ] **Fallback overlay 2D** prêt (même backend + UI, rendu marqueur différent)
- [ ] UI **paywall Mollie** dans l'app
- [ ] (designer) Identité « doux sur le regard » + transitions + **écran « scale »** (N œuvres)

## Dataset (pipeline — IntelliJ)

- [x] 🟡 Décider : **langage pipeline** — **Python** (acté, ADR 0001/0011)
- [x] 🟡 **Session dataset** : set **`260214`** (Top 1000, ~1040 œuvres) + **2 phares** = **Night Watch** + **La Laitière** ; demo profonde sur les phares (M23)
- [x] Scaffold projet IntelliJ (`/pipeline` : harvest / enrich / refine / transform / load + `.env`)
- [x] **Harvest** OAI-PMH du set (`edm`, pagination `resumptionToken`)
- [x] **Parser EDM** → titres/desc EN-NL, créateur, `extent`, sujets, rights
- [x] **Résoudre l'image IIIF** (Linked Art `?_profile=la` → `iiif.micr.io/{id}`)
- [x] **Refine** : `extent` → height_cm/width_cm ; labels créateur/mouvement ; filtre HD + CC0
- [x] **Download HD** + générer **reference images ARKit** → Storage
- [x] **Multilingue pivot-EN** : garder la source, pivot EN, générer la langue visiteur (EN+NL déjà fournis par Rijks)
- [x] **Enrich multi-source sans LLM** : Wikidata (Q-ids, mouvement P135, tags P180/P136) + Wikipedia (narratif, gate = article existe) — M19
- [ ] **Notices = substrat neutre** (sans LLM cette semaine, M19) ; **4 facettes = lentilles runtime** (M18) ; **LLM + gate groundedness différés** post-megathon
- [ ] **Réviser à la main** les notices des phares (statut `ok`)
- [x] **Auteur les hotspots** des phares (coords + aspect + texte) — `hotspots/flagships.py`
- [x] **Charger** dans Supabase (upsert)
- [x] **Mock DB** 2–3 œuvres → *superseded : vraies données chargées, Siffrein débloqué*
- [ ] ⛔ Ignorer le dataset « Challenge 2014 » (XML + descripteurs Matlab) — obsolète, inutile (ARKit pur)

## Produit

- [x] Audio hotspots généré **live** au runtime (M24) : texte stocké, pas d'`audio_url` pré-rempli par le pipeline
- [ ] 🟡 Décider : **voix / TTS** (compte ElevenLabs dispo)
  - [ ] Recherche intensive : ElevenLabs vs Vapi (latence, barge-in, voix de marque, qualif track Vapi)
  - [ ] Trancher au plus tard SYNC 1
- [ ] **Barge-in = hors happy path** (M16) : archi capable, montré si stable, sinon pitch-only — wow démo = hotspots + Q&A
- [ ] Écrire le **happy path** de démo (le chemin exact de dimanche) — SYNC 1
- [ ] Définir les **4 chemins de connaissance** en démo (Défaut/Technique/Histoire/Symbolisme)
- [ ] **Profil 3 questions** skippables (réutiliser, léger) — *persona auto = vision, hors démo*
- [ ] Définir le **montant paywall** premium (1–3 €)
- [ ] 🟡 Décider : **recrue n°2** (ML/full-stack) vendredi soir selon vivier
- [ ] Cadrer la **coda « phone-less / lunettes »** pour le pitch (non développée)

## Démo

- [ ] **Logistique stand** : poster A3 vs écran/tablette pour œuvres + QR
- [ ] Vérifier **impression** au venue (sinon imprimer avant)
- [ ] **Go/no-go ARKit → bascule overlay 2D** si anchors instables (SYNC 3, sam. midi)
- [ ] **Paiement réel au stand** (clé live) → compter les **conversions €** + mini-CSV
- [ ] **Dry-run** chronométré + **liste de coupes** (reco en 1er) — SYNC 4
- [ ] **Vidéo backup** de la démo (avant la nuit de samedi)
- [ ] Tester **wifi/hotspot** + **cache local** des notices phares
- [ ] **QR fallback** systématique prêt
- [ ] Barge-in montré **seulement si stable** (sinon hors démo)

## Pitch

- [ ] **Répéter ×2-3** le pitch recrutement 1 min (dans le train)
- [ ] **Pitcher** vendredi 19:00 → **recruter le designer**
- [ ] **Draft pitch finale** (hook / démo live / why-now / momentum / ask)
- [ ] **1 chiffre-choc** (inclure le nb de paiements réels)
- [ ] **1 slide** unique de secours
- [ ] **Q/R jury** : coût IA/visiteur · moat vs ArtScan/Smartify · GTM musées · scaling pipeline
- [ ] **Mentionner (sans implémenter)** : barge-in · couche éditoriale musée (ex. Guernica) · reco open-world par embeddings (scale)
- [ ] **Build-in-Public** : poster la journey (X/LinkedIn) → track gratuite
- [ ] **Pitch workshop** dimanche 12:30
- [ ] **Répéter** dimanche matin (temps protégé, code-free)
- [ ] **SYNC 6** : ordre de passage finale + qui dit quoi

<!-- maj : 2026-06-20 -->
