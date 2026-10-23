# Cœur de métier et modèle économique Mastercota

## Positionnement

Mastercota est un outil de gestion et de réconciliation de cotisations communautaires dans l'UEMOA.

L'argent d'une contribution doit aller directement au bénéficiaire ou à l'organisateur. Mastercota vend l'organisation, le suivi, la transparence et la réconciliation; il ne vend pas la conservation des fonds.

Promesse:

> Créez. Partagez. Recevez directement. Mastercota s'occupe du suivi.

## Principes non négociables

1. 0 % Mastercota sur le montant collecté.
2. Le contributeur ne paie pas Mastercota.
3. L'organisateur paie l'outil.
4. PI-SPI est le rail stratégique principal dès qu'un participant homologué fournit l'accès API Business.
5. Paystack reste un secours explicite, jamais un fallback silencieux.
6. Une confirmation de paiement et l'application du service Mastercota restent deux événements distincts.
7. Les tarifs doivent rester lisibles et prévisibles.

## Architecture financière cible

### Contributions

Contributeur -> PI-SPI / Wave -> Organisateur

Mastercota reçoit uniquement les statuts et références nécessaires au suivi et à la réconciliation.

### Frais Mastercota

Organisateur -> PI-SPI -> Mastercota

Si PI-SPI est indisponible, l'interface peut proposer explicitement Paystack comme autre moyen de paiement. Aucun second paiement ne doit être lancé automatiquement.

## Hypothèse de facturation à tester

Ne pas figer ces montants avant d'avoir les coûts réels du participant PI-SPI.

### Particulier

- Première cotisation: gratuite.
- Offre Collecte: cible de test 3 000 FCFA pour 30 jours.
- Extension: cible de test 1 500 FCFA pour 15 jours.
- 0 % sur les contributions.

Si le coût PI-SPI par transaction est significatif, préférer des quotas simples de contributions incluses plutôt qu'un pourcentage sur les montants.

Exemple à tester:

- Gratuit: première collecte, jusqu'à 30 contributions confirmées.
- Collecte: 3 000 FCFA, 30 jours, jusqu'à 150 contributions.
- Collecte Plus: 5 000 FCFA, 60 jours, plafond élevé ou illimité selon économie unitaire.

### Organisations

Une offre Pro ne doit être lancée qu'après observation d'usages récurrents.

Cible fonctionnelle:

- plusieurs collectes simultanées;
- plusieurs gestionnaires;
- membres;
- exports;
- rappels;
- reporting;
- personnalisation.

Fourchette à tester ensuite: 10 000 à 20 000 FCFA / mois.

## Décision de prix

Avant de remplacer la grille actuelle, obtenir au minimum:

1. deux propositions tarifaires de participants PI-SPI;
2. coût fixe mensuel éventuel;
3. coût par demande de paiement;
4. coût par paiement réussi;
5. coût des notifications / webhooks s'il existe;
6. nombre moyen de contributions par cotisation;
7. taux de cotisations payantes;
8. coût OTP et support par organisateur.

Économie unitaire:

Prix Mastercota
- coût PI-SPI
- coût OTP
- coût Paystack de secours
- infrastructure
- support variable
= marge contributive

## KPI principal

Le nombre de comptes n'est pas le KPI principal.

Suivre surtout:

- cotisations activées;
- cotisations avec au moins une contribution confirmée;
- délai création -> première contribution;
- nombre de contributions par cotisation;
- montant total organisé via Mastercota;
- taux d'utilisation du secours Paystack;
- coût de paiement par cotisation;
- marge contributive par cotisation;
- taux de réachat / deuxième cotisation.

## Plan de migration

Phase 1: conserver le comportement Paystack existant, ajouter le modèle multi-provider et contractualiser un participant PI-SPI.

Phase 2: implémenter l'adaptateur API Business du participant en sandbox, avec Request-to-Pay, statut, webhook et idempotence.

Phase 3: proposer PI-SPI en premier et Paystack comme bouton de secours explicite.

Phase 4: étendre PI-SPI aux contributions directes vers l'organisateur lorsque le contrat et l'API du participant permettent ce flux.

Phase 5: remplacer la grille de durée actuelle par le pricing validé par les coûts réels et les données d'usage.
