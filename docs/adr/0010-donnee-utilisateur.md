# ADR 0010 — Donnée utilisateur & télémétrie

**Statut :** Accepté (direction) · sous-arbitrage à scoper plus tard · 2026-06-15

## Contexte

Deux sources de données : musée (lecture) × utilisateur (écriture). Adam ne veut pas se brider pour le RGPD mais le prendre en compte, et voit la donnée utilisateur comme un **actif B2B** ("améliorer le contenu sur données réelles des visiteurs du musée").

## Décision (direction)

- **Flux d'événements cloud pseudonyme** (clé = id device anonyme + session + musée + œuvre), réservé dès maintenant : question posée, temps/œuvre, follow-up cliqué, facette consultée, point d'abandon, parcours.
- **Deux sorties du même flux** : (1) profil par utilisateur → personnalisation (affine les 3 cadrans) ; (2) **analytics agrégées/anonymisées par musée → actif B2B + flywheel d'amélioration du contenu**.
- **L'actif B2B est l'agrégat** (insight clé) : plus vendeur ET régime RGPD le plus sûr → pas d'arbitrage vie privée vs actif.
- **Consentement opt-in propre à l'onboarding** (granulaire perso/analytics) — pas un dark pattern.
- **Audio jamais envoyé au cloud** (STT on-device, ADR 0005) ; seuls événements/transcripts y vont, avec consentement.
- **POC = pseudonyme, pas de compte** ; comptes plus tard (cross-device/social V1).
- **Rétention / résidence des données = décidée plus tard.**

## Posture Megathon — 2026-06-20

Le signal de validation principal est volontairement simple :

- **Mollie live au stand** : nombre de paiements réels et montant total.
- **Mollie test** : uniquement pour répétitions et scène.
- **Interactions produit** : oeuvres ouvertes, hotspots lancés, questions posées,
  interruptions voix si faciles à logger.
- **Traction légère** : QR scans, signups ou contacts si disponibles.

Les payeurs sont des builders, pas des visiteurs de musée : le signal est
directionnel, mais il vaut plus qu'une intention déclarée. Aucun flux lourd de
CRM ou de donnée par-utilisateur n'est requis pendant le Megathon.

## À scoper plus tard (non décidé)

Exploitation **par-utilisateur** côté musée (CRM/retargeting) avec PII assumée et consentement plus lourd — vs **agrégat-d'abord**. Pour l'instant on ne s'en soucie pas.

## Options considérées

| Option | Statut | Raison |
|---|---|---|
| On-device anonyme privacy-first | Écarté | prive de l'actif B2B |
| **Cloud event-stream, consent-gated, agrégat = actif** | **Retenu** | actif B2B + RGPD défendable |
| Actif par-utilisateur (PII, CRM) | **Différé** | consentement lourd ; à scoper plus tard |

## Conséquences

- (+) L'actif s'accumule dès le 1er testeur ; pitch B2B "on améliore votre médiation sur vos vrais visiteurs".
- (−) Construire un schéma d'événements propre + le flux de consentement maintenant.
