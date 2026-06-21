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

## Backlog (priorité haute → basse)

1. **Chat par-hotspot persistant** *(le plus gros)*
   - Un fil de discussion distinct par hotspot ; tap un point = reprendre SON fil.
   - Tous les fils participent à la **mémoire de session** partagée (`history_summary`).
   - Persistance que le point soit ouvert ou refermé.
   - Touche : `useChat` (state par hotspotId), `ChatPanel`, `ArtworkDetailScreen`.
   - Actuellement : chat global unique derrière le bouton « ASK ? », `hotspot_id` passé = hotspot actif.

2. **Vrai liquid glass** sous-titres
   - Remplacer le `rgba`+ombre de `SubtitleOverlay` par `expo-blur` (`BlurView`).
   - = 1 rebuild natif (`npx expo install expo-blur` + prebuild). Grouper avec #3.

3. **Zoom Android**
   - `maximumZoomScale` est iOS-only. Pour Android : `react-native-gesture-handler`
     + `react-native-reanimated` (pinch + pan). Rebuild natif.

4. **Data titres (lane Siffrein)**
   - `title_en` « The Night Watch Militia Company of District II… » = dump trop long.
   - « Het melkmeisje » mal résolu (NL servi comme EN). Nettoyer `title_en`/`title_nl`
     en base (probable mauvais mapping de scrape EDM).

5. **AR sur vraie cible**
   - Valider la lueur sur le **vrai tableau / impression taille réelle** (le test sur
     petite image laptop fausse l'échelle `physicalWidth` → ajuster le coeff `0.05`).
   - Go/no-go AR vs fallback picker/`identify`.

6. **Persister le signing iOS** (survit à `prebuild --clean`)
   - Config plugin local `app-mobile/plugins/withIosSigning.js` injectant
     `DEVELOPMENT_TEAM = "49XP259RX3"`, `CODE_SIGN_STYLE = "Automatic"` sur le target
     `app.laszlo.mobile` ; l'enregistrer dans `app.json > plugins`.

7. **Revalidation device des autres surfaces**
   - Onboarding/persona, switch langue (FR/EN/NL), voix `/transcribe` (mic),
     vision `/identify` (bouton Photo) — revérifier après la refonte.

8. **Sous-titres : qualité de sync**
   - Aujourd'hui = prorata temps (pas de timings mot-à-mot du TTS). Si on veut mieux :
     demander à Siffrein un endpoint TTS renvoyant des marques temporelles, ou estimer
     par mots plutôt que segments.

9. **Vidéo backup** du happy path une fois l'ensemble vert (assurance stand).

## Vérif rapide
- `cd app-mobile && npm run typecheck` (vert au moment du handoff).
- Reload Metro (`npx expo start --dev-client --tunnel -c`) — pas de rebuild requis pour
  la refonte (tout JS). Rebuild seulement pour #2/#3 (deps natives).
