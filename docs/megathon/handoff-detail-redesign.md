# Handoff — Refonte écran œuvre (suite)

Date : 2026-06-21. Contexte : refonte immersive de l'écran œuvre livrée (œuvre plein
écran zoomable, hotspots = points brillants, sous-titres synchro audio, dock audio
play+vitesse, AR lueur centrée). Ce fichier liste **tout ce qui reste**, rien d'oublié.

## Fait cette session
- `ViroArtworkScanner.tsx` : cube → lueur centrée (`ViroSphere` émissive + `ViroOmniLight`,
  rayon ∝ `widthCm`, pulse doux).
- `useAudioPlayer.ts` : expose `progress {currentTime,duration}`, `rate`, `setRate`, `stop`.
- `SubtitleOverlay.tsx` (nouveau) : sous-titres haut, glass approché, révélation
  au prorata `currentTime/duration`.
- `HotspotGlow.tsx`, `AudioDock.tsx` (nouveaux).
- `ArtworkDetailScreen.tsx` : réécrit — œuvre plein écran (`ScrollView` zoom iOS),
  points brillants, 1 hotspot actif, dock audio à gauche, chat en bouton flottant « ASK ? ».
- Titres phares corrigés : original affiché en premier, anglais dessous. DB prod corrigée
  pour `SK-C-5` (`De Nachtwacht` / `The Night Watch`) et `SK-A-2344`
  (`Het melkmeisje` / `The Milkmaid`) ; app protégée côté mapping ; pipeline `refine`
  préfère les titres Wikidata/Wikipedia quand disponibles.
- Chat par-hotspot persistant : `ChatSessionProvider` garde les fils par
  `artworkId + hotspotId` pendant la session courante ; `history` brut = fil courant,
  `history_summary` = mémoire partagée inter-fils ; reset quand un nouveau profil
  onboarding est validé.
- AR sur vraie cible : marqué fait (retour Adam, 2026-06-21).

## Backlog (priorité haute → basse)

1. **Vrai liquid glass** sous-titres
   - Remplacer le `rgba`+ombre de `SubtitleOverlay` par `expo-blur` (`BlurView`).
   - = 1 rebuild natif (`npx expo install expo-blur` + prebuild). Grouper avec #3.

2. **Zoom Android**
   - `maximumZoomScale` est iOS-only. Pour Android : `react-native-gesture-handler`
     + `react-native-reanimated` (pinch + pan). Rebuild natif.

3. **Persister le signing iOS** (survit à `prebuild --clean`)
   - Config plugin local `app-mobile/plugins/withIosSigning.js` injectant
     `DEVELOPMENT_TEAM = "49XP259RX3"`, `CODE_SIGN_STYLE = "Automatic"` sur le target
     `app.laszlo.mobile` ; l'enregistrer dans `app.json > plugins`.

4. **Revalidation device des autres surfaces**
   - Onboarding/persona, switch langue (FR/EN/NL), voix `/transcribe` (mic),
     vision `/identify` (bouton Photo) — revérifier après la refonte.

5. **Sous-titres : qualité de sync**
   - Aujourd'hui = prorata temps (pas de timings mot-à-mot du TTS). Si on veut mieux :
     demander à Siffrein un endpoint TTS renvoyant des marques temporelles, ou estimer
     par mots plutôt que segments.

6. **Vidéo backup** du happy path une fois l'ensemble vert (assurance stand).

## Vérif rapide
- `cd app-mobile && npm run typecheck` (vert après chat par-hotspot persistant).
- `python3 -m pipeline.test_titles` (vert après correction titres).
- Read prod vérifié : `SK-C-5` et `SK-A-2344` retournent les titres corrigés.
- Reload Metro (`npx expo start --dev-client --tunnel -c`) — pas de rebuild requis pour
  la refonte (tout JS). Rebuild seulement pour #2/#3 (deps natives).
