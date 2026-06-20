# AGENTS.md

## Avant d'agir

Lire d'abord :

- `docs/megathon/0 — TODO directeur.md` pour savoir ce qui est fait / ouvert.
- `docs/data-model.md` pour le contrat Supabase et les couches produit.
- `docs/megathon/2 — Tech & build.md` pour le contexte build, en respectant les corrections de la section "Mise a jour".

## Tracker canonique

`docs/megathon/0 — TODO directeur.md` est le tableau de bord canonique des chantiers Megathon.

Il sert a synchroniser :

- Aramsis : pipeline, backend, donnees, Supabase, paiement.
- Siffrein : app iOS, ARKit, UX, integration mobile.

A chaque decision ou avancee actee :

- mettre a jour `docs/megathon/0 — TODO directeur.md` ;
- cocher uniquement ce qui est reellement fait ;
- resoudre les items `🟡` quand la decision est tranchee ;
- reecrire l'item si le scope change ;
- garder les taches non demarrees decocher, meme si elles sont planifiees.

Le "pourquoi" d'une decision doit rester dans `docs/megathon/1 — Stratégie & arène.md` (journal Mxx) et/ou dans l'ADR concerne.

Convention : `🟡` = tache de decision encore a trancher, sauf si l'item est deja coche avec la decision explicite.

## Modele mental actuel

Le produit se pense en trois couches :

1. **Connaissance** : oeuvres, artistes, mouvements, musee, notices neutres, sources, hotspots.
2. **Glossaire / vocabulaire gradue** : termes transverses expliques selon le niveau de parole.
3. **Profil utilisateur** : preferences neutres et orthogonales d'onboarding.

La couche Connaissance est deja construite pour le Megathon : Supabase contient `artist`, `movement`, `museum`, `artwork`, `notice`, `hotspot`. La table `notice` est un substrat neutre ancre, pas le texte final dit a l'utilisateur.

La sortie visiteur est generee au runtime :

```text
output = f(notice, glossaire@niveau, preferences_utilisateur, langue_visiteur, voix/TTS)
```

## Etat actuel vs prochaines couches

Actuel :

- `notice` = 1 ligne par (oeuvre x langue stockee x source).
- Pour Rijks, les langues stockees actuelles sont `en` et `nl`.
- On ne stocke pas de francais par defaut.
- L'output multilingue est genere au runtime par l'IA, puis vocalise par le provider TTS.
- L'audio n'est jamais stocke dans `notice`.
- `hotspot.audio_url` est seulement un cache optionnel si la latence live l'exige.

Prochaines couches :

- Glossaire : future table `term` / `terme`, avec definitions par niveau.
- Profil : axes neutres d'onboarding, pas personas nommes au depart.
- Angles de mediation runtime : boutons/instructions qui orientent la generation, sans changer `notice`.

## A ne pas faire

- Ne pas ajouter `notice.facet`.
- Ne pas parler de "notices default/technique/histoire/symbolisme" dans le modele de donnees.
- Utiliser "angles de mediation runtime" pour ces orientations.
- Ne pas pre-rendre d'audio dans `notice`.
- Ne pas stocker le FR par defaut.
- Ne pas confondre `hotspot.aspect` avec une facette de notice.
