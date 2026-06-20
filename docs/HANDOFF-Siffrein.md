---
tags: [projet/laszlo, megathon, type/handoff, statut/actif]
date: 2026-06-20
---

# Handoff — lane backend (Siffrein)

> Pour reprendre la lane **serveur/runtime** à froid. Lire ce doc, puis
> `supabase/PLAYBOOK.md` (opérations) et `docs/adr/0014-…md` (le contrat).
> La lane app est `docs/HANDOFF.md` (Adam).

## Qui fait quoi

- **Siffrein = backend / Supabase edge functions** (cette lane). `.env` à la racine du repo.
- **Adam = app mobile** (Expo RN + ViroReact, `/app-mobile`) + pipeline data.
  Il consomme le runtime via **`supabase/functions/API.md`**.

## Ce que la lane livre — état actuel ✅

`output = f(notice, glossaire, profil, langue, voix)` vit dans **4 edge functions**,
toutes déployées, testées (86 tests offline), e2e vérifiées via Bruno.

| Function     | Modes / rôle                                                                       | Provider                                      |
| ------------ | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| `generate`   | `overview` · `hotspot` (batch) · `ask` (SSE) · `persona` · `followups`             | Scaleway LLM (mistral-small-3.2-24b)          |
| `transcribe` | audio → texte                                                                       | Scaleway Voxtral                              |
| `identify`   | photo → artwork_id (fallback AR)                                                   | Scaleway Pixtral                              |
| `speak`      | texte → audio_url · engines : **elevenlabs** · edge · mistral · google             | ElevenLabs (opt-in) / Edge (auto) / Google   |

Projet Supabase : `spbrkgoseabpsxzkkyzj` (EU).
URL live : `…supabase.co/functions/v1/<name>`, header `Authorization: Bearer <publishable key>`.

### `mode=overview` (ajouté en session)

Hotspot virtuel « ✦ L'œuvre » : présentation générale de l'œuvre entière, généré
en parallèle du batch hotspot à l'ouverture de la vue détail. JSON (pas SSE).
Affiché actif par défaut dans le playground + app. Re-tap ✦ = retour sans re-générer
(cache côté app). Contrat dans ADR 0014.

### TTS ElevenLabs

Intégré en tant qu'engine `elevenlabs` dans `/speak`. **Désactivé du chain `auto`**
pour économiser les crédits — opt-in explicite avec `provider:"elevenlabs"`.
Voix par langue (env Supabase Secrets) :
- `ELEVENLABS_VOICE_ID_FR` → défaut : Célian (`DGTOOUoGpoP6UZ9uSWfA`)
- `ELEVENLABS_VOICE_ID_NL` → défaut : Daniel van der Meer (`MqvxHuZP0MWXPlNUh65f`)
- `ELEVENLABS_VOICE_ID_EN` → défaut : Sarah (`EXAVITQu4vr4xnSDxMaL`)

Pour réactiver ElevenLabs en auto (avant enregistrement démo) : dans
`supabase/functions/speak/index.ts`, changer :
```ts
const AUTO_CHAIN: Engine[] = ["edge", "google"];
// → ["elevenlabs", "edge", "google"]
```
Puis `./supabase/deploy.sh speak`.

## Conventions (à respecter)

- Code **anglais uniquement**, commenté. Docs/Obsidian restent en français.
- **Deno/TypeScript.** Structure par fonction : `index.ts` (HTTP + `handle(req,deps)`),
  `lib.ts` (pure helpers), `*_test.ts`, `README.md`. Shared : `_shared/`.
- **Deps injectées** via `deps` → tests offline sans réseau. `Deno.serve` gardé
  derrière `if (import.meta.main)`. Env lu lazily.
- **Grounding server-side** : client envoie `artwork_id`, jamais les notices.
  Mono-appel LLM, sans tools (frontière sécurité ADR 0014 §security).
- **Chaque mode a un fallback** (stub / chain engine) → la démo ne blanche jamais.
- Providers swappables via config (`SCW_*`, `MISTRAL_API_KEY`, `ELEVENLABS_API_KEY`,
  `TTS_PROVIDER`). ADR 0012.

## Ce qui reste à faire (priorité ordre)

### 1. Coords des hotspots phares — À FAIRE EN PREMIER

Les coords sont actuellement estimées à l'œil et fausses. Workflow :

1. Ouvrir le playground (`supabase/playground.html`)
2. Sélectionner SK-C-5 (Night Watch), cliquer sur l'image à l'endroit exact
   de chaque élément → noter le `point: x, y` affiché
3. Reporter dans `pipeline/hotspots/flagships.py`
4. Répéter pour SK-A-2344 (Milkmaid)
5. Pousser en DB :
   ```bash
   cd /path/to/repo
   python3.11 -m pipeline.main update-hotspots
   ```
   (Pas besoin du cache local — upsert direct Supabase depuis flagships.py)

### 2. Notices Wikipedia phares (D3)

Les notices wikipedia des 2 phares sont des dumps bruts de l'article entier →
trop gros pour un petit modèle, grounding du chat (`mode=ask`) dégradé.
À trimmer en substrat propre (4 notices : SK-C-5 + SK-A-2344 × en/nl).
Bloque la qualité du Q&A libre sur les phares.

### 3. Choix du modèle LLM (M32)

Défaut actuel : `mistral-small-3.2-24b-instruct-2506` (Scaleway).
Si qualité insuffisante sur les phares → tester d'autres modèles via `SCW_MODEL` env.
Voir PLAYBOOK §5.B pour la procédure.

### 4. Mollie (dernier)

Nouvelle edge function `mollie` : checkout hébergé + webhook → débloquer
`premium_venue`. Clé séparée. À faire après que le chemin démo est solide.

## Checklist reprise à froid

```bash
export PATH="$HOME/.local/share/supabase:$HOME/.deno/bin:$PATH"
deno test supabase/functions/                          # → 86 passed
cd bruno && npx @usebruno/cli run --env Deployed       # → tout passe
```

Modifier → `deno test` + `deno check` → `./supabase/deploy.sh <name>` → re-run Bruno.
Push : remote = `aramz33/Laszlo-app` via l'alias SSH `github`.

## Gotchas

Voir PLAYBOOK §6 : deno PATH · 401 · `[stub]` = LLM a échoué · `/speak` 502 =
`SUPABASE_SERVICE_ROLE_KEY` non exporté · deploy nécessite `--use-api` ·
Mistral filtre le contenu → engine fallback.
