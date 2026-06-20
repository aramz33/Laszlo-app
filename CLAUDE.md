# CLAUDE.md

## Megathon tracker

`docs/megathon/0 — TODO directeur.md` est le tableau de bord canonique des chantiers Megathon.

Il sert a synchroniser :

- Aramsis : pipeline, backend, donnees, Supabase, paiement.
- Siffrein : app iOS, ARKit, UX, integration mobile.

## Regle de mise a jour

A chaque decision ou avancee actee :

- mettre a jour `docs/megathon/0 — TODO directeur.md` ;
- cocher uniquement ce qui est reellement fait ;
- resoudre les items `🟡` quand la decision est tranchee ;
- reecrire l'item si le scope change ;
- garder les taches non demarrees decocher, meme si elles sont planifiees.

Le "pourquoi" d'une decision doit rester dans `docs/megathon/1 — Stratégie & arène.md` (journal Mxx) et/ou dans l'ADR concerne.

Convention : `🟡` = tache de decision encore a trancher, sauf si l'item est deja coche avec la decision explicite.
