---
tags: [projet/laszlo, megathon, type/todo, statut/actif]
date: 2026-06-20
---

# Megathon — 0. TODO directeur

> **File directeur principal — suivi.** Coche au fur et à mesure. Le contexte/raisonnement est dans [[1 — Stratégie & arène]] · [[2 — Tech & build]] · [[3 — Playbook & questions ouvertes]].
> 🟡 = **tâche de décision** (à trancher, peut générer des sous-tâches).

## Backend

- [ ] 🟡 Figer le **schéma Supabase** (le contrat) au SYNC 1
  - [ ] Créer le projet Supabase + exécuter le SQL (artist / movement / museum / artwork / notice / hotspot)
  - [ ] Générer les types partagés (`/shared`) pour l'app iOS
- [ ] Exposer une **API de lecture** fine (œuvre + notices + hotspots) pour l'app
- [ ] **Mollie serveur** : hosted checkout + webhook « débloquer premium »
- [ ] Brancher clé Mollie **test** (dev) puis **live** (stand)
- [ ] Storage Supabase pour images HD + reference images ARKit
- [ ] Déploiement backend (proche utilisateur)

## Frontend

- [ ] 🟡 Confirmer avec Siffrein : client = **natif iOS (ARKit)**, PWA en repli paywall (SYNC 0)
- [ ] 🟡 Décider : PWA sur **Base44** (track Prompt to Paid) vs **Vercel** libre
- [ ] Vérifier la **porte toolchain** : Mac + Xcode + iPhone physique + Apple ID (vendredi soir)
- [ ] Scaffold app iOS (Xcode/Swift, ARKit/RealityKit) — `/app-ios`
- [ ] **Vue AR** : détection œuvre (reference images) → **point bleu ancré** (world-locked)
- [ ] Tap point → **vue détail 2D** de l'œuvre
- [ ] **Hotspots** sur la vue détail (points pré-définis depuis la DB)
- [ ] **Lecteur audio** des hotspots + contrôles **vitesse / ton / voix** (changeables à la volée)
- [ ] **Chat libre** : poser des questions + taper hors hotspots → réponse vocale/texte
- [ ] **Fallback overlay 2D** prêt (même backend + UI, rendu marqueur différent)
- [ ] UI **paywall Mollie** dans l'app
- [ ] (designer) Identité « doux sur le regard » + transitions + **écran « scale »** (N œuvres)

## Dataset (pipeline — IntelliJ)

- [ ] 🟡 Décider : **langage pipeline** — Python (reco) vs Kotlin/JVM
- [ ] 🟡 **Session dataset** : figer la **sélection d'œuvres** (1 classique · 1 mal comprise · 1 pour enfants · abstrait = hors Rijks, lâcher ou élargir la source) + **set** (reco `26021` Dutch 17th c.) + nb d'œuvres + **2 phares**
- [ ] Scaffold projet IntelliJ (`/pipeline` : harvest / refine / transform / load + `.env`)
- [ ] **Harvest** OAI-PMH du set (`edm`, pagination `resumptionToken`)
- [ ] **Parser EDM** → titres/desc EN-NL, créateur, `extent`, sujets, rights
- [ ] **Résoudre l'image IIIF** (Linked Art `?_profile=la` → `iiif.micr.io/{id}`)
- [ ] **Refine** : `extent` → height_cm/width_cm ; labels créateur/mouvement ; filtre HD + CC0
- [ ] **Download HD** + générer **reference images ARKit** → Storage
- [ ] **Multilingue pivot-EN** : garder la source, pivot EN, générer la langue visiteur (EN+NL déjà fournis par Rijks)
- [ ] **Notices 4 facettes** ancrées (LLM) + **gate groundedness**
- [ ] **Réviser à la main** les notices des phares (statut `ok`)
- [ ] **Auteur les hotspots** des phares (coords + aspect + texte)
- [ ] **Charger** dans Supabase (upsert)
- [ ] **Mock DB** 2–3 œuvres dès la 1ère heure → débloque Siffrein
- [ ] ⛔ Ignorer le dataset « Challenge 2014 » (XML + descripteurs Matlab) — obsolète, inutile (ARKit pur)

## Produit

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
