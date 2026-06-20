# Harnais d'évaluation — Laszlo

Le harnais reste l'artefact durable du projet : un jeu de données doré, des
métriques et des seuils par port. Les fournisseurs changent vite ; les ports et
les scorecards survivent.

Posture Megathon : on ne construit pas le harnais complet pendant les 45h. On
fait des **smoke tests** qui protègent le happy path, puis on revient au harnais
complet après le week-end.

## Smoke tests Megathon

Jeu minimal :

1. **Catalogue Rijks** : 2-3 oeuvres mockées au schéma Supabase, puis un lot réel
   du set `26021`.
2. **Phares** : Night Watch `SK-C-5` et La Laitière si disponibles et stables.
3. **Notices** : 4 facettes par phare (`default`, `technique`, `histoire`,
   `symbolisme`), sources citées, statut `ok` après revue Adam.
4. **Hotspots** : coordonnées normalisées + texte narratif + audio optionnel.
5. **Voix** : 5-10 questions FR/EN sur les phares, avec interruption manuelle
   pour tester le barge-in.
6. **ARKit** : reference images générées depuis IIIF, testées sur iPhone
   physique. Si les anchors sont instables samedi midi, bascule overlay 2D.
7. **Paiement** : Mollie test en démo ; Mollie live au stand pour conversions
   réelles.

Critères de passage du happy path :

- AR ou fallback ouvre la bonne oeuvre.
- Une notice phare répond sans fait non sourcé évident.
- Un hotspot lance une narration.
- Une question libre reçoit une réponse vocale ou texte.
- L'utilisateur peut interrompre la réponse ou au minimum relancer une question
  sans casser la session.
- Le paywall peut être franchi en test, et le flux live est prêt pour le stand.

## Jeu doré durable

Après Megathon, construire le jeu doré à partir d'un corpus musée réel :

1. **Catalogue** : notices par facette, métadonnées, images HD, source refs,
   hotspots et éventuels codes physiques.
2. **Photos in-the-wild** : clichés par oeuvre en conditions musée, plus oeuvres
   hors catalogue.
3. **Audio** : énoncés visiteurs FR/EN/ES/DE/JP, accents variés, ambiance
   bruyante, lexique muséal.
4. **Questions/réponses** : questions visiteurs par langue, mappées à la bonne
   oeuvre/facette, avec réponse attendue ancrée + sources.
5. **Paiement/usage** : événements consentis et agrégés, pour relier qualité
   produit et willingness-to-pay.

À versionner dans `docs/eval/golden/` pour les textes et labels ; les médias
volumineux sont référencés, pas commités bruts.

## Scoring durable

Chaque port : métriques **qualité** + **latence** + **coût** + **résidence UE**.
Sortie : un scorecard CSV/MD par candidat.

## P1 — LLM

Métriques :

- faithfulness / anti-hallucination sur Q/R ancrées ;
- qualité multilingue ;
- respect de la facette et du profil ;
- tool-calling correct vers `Retriever` hors chemin chaud ;
- TTFT et tok/s ;
- coût/tour ;
- résidence.

Passe si : 0 hallucination gradée sur le lot, qualité multilingue au seuil,
latence compatible conversation et coût sous budget.

## P2 — STT

Métriques :

- WER global et WER lexique muséal ;
- latence aux partiels ;
- déclenchement du barge-in ;
- langues et auto-détection ;
- faisabilité on-device ;
- résidence.

Passe si : noms propres et titres reconnus au seuil, partiels rapides, barge-in
fiable.

## P3 — TTS

Métriques :

- cohérence de voix entre langues ;
- TTFB/TTFA ;
- annulation instantanée ;
- naturel/expressivité ;
- coût/caractère ;
- licence commerciale et résidence.

Passe si : voix stable, latence basse, coupure fiable, licence claire.

## P4 — Vision / CV

Durable : comparer embeddings image, modèles on-device et repli multimodal.

Megathon : ARKit n'est pas scoré comme un modèle IA. On vérifie seulement :

- référence image détectée ;
- identité correcte ;
- point stable assez longtemps ;
- fallback 2D/QR prêt.

Après Megathon, les métriques embeddings redeviennent : top-1/top-3,
robustesse angle/reflets/partiel, rejet hors catalogue, latence et résidence.

## P5 — Embeddings texte

Métriques :

- retrieval cross-lingue ;
- nDCG/recall@k ;
- noms propres et titres rares ;
- gain du reranking ;
- dimension et coût pgvector ;
- latence et résidence.

Passe si : recall@5 cross-lingue au seuil, hybride > dense seul sur entités
d'art, dimension compatible pgvector.

## Process

1. Megathon : smoke tests uniquement, au service du happy path.
2. Après Megathon : construire le jeu doré complet depuis les données Rijks et
   les retours live.
3. Implémenter des adaptateurs minimaux par candidat.
4. Lancer le harnais et mettre à jour l'ADR 0012 avec les fournisseurs retenus.
5. Rejouer le harnais à chaque changement de modèle ou provider.
