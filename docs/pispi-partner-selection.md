# Sélection du partenaire PI-SPI

Mise à jour : 23 octobre 2026.

## Décision recommandée

Mastercota doit engager en priorité trois participants dont l'API Business PI-SPI est homologuée par la BCEAO en Côte d'Ivoire :

1. **CONNEKT4 / HUB2** — priorité 1
2. **PayMeTrust** — priorité 2
3. **Ecobank Côte d'Ivoire** — priorité 3

**MTN MFS** reste une alternative de négociation utile.

La BCEAO publie au 17 septembre 2026 huit API Business PI-SPI homologuées en Côte d'Ivoire : CONNEKT4, ECOBANK, MANSA BANK, MTN MFS, PAYMETRUST, STANDARD CHARTERED BANK, SYCA SA et TOUCHPOINT FINANCIAL SERVICES.

Source officielle :
- https://www.bceao.int/fr/communique-presse/homologation-des-api-business-de-la-plateforme-interoperable-du-systeme-de
- https://developer.pispi.bceao.int/

## Pourquoi cette shortlist

### 1. CONNEKT4 / HUB2

**Pourquoi en premier**

- API Business PI-SPI homologuée en Côte d'Ivoire.
- Positionnement déjà orienté fintech et intégration B2B.
- API de pay-in / pay-out déjà commercialisée.
- Présence multi-pays en Afrique francophone.
- Reporting et suivi de statut temps réel déjà au coeur de leur offre.

**Hypothèse**

C'est probablement le meilleur candidat pour Mastercota si l'objectif est d'obtenir un partenaire techniquement rapide, compatible avec une architecture de plateforme et capable d'accompagner une expansion UEMOA.

**A vérifier commercialement**

- prix par demande de paiement PI-SPI ;
- prix par paiement réussi ;
- minimum mensuel ;
- frais d'onboarding ;
- frais de compte / settlement ;
- SLA et support ;
- délais sandbox -> production ;
- capacité à générer / gérer des alias ou QR dynamiques pour des flux liés aux cotisations ;
- conditions pour recevoir directement chez l'organisateur plutôt que sur un compte Mastercota.

### 2. PayMeTrust

**Pourquoi en deuxième**

- API Business PI-SPI homologuée en Côte d'Ivoire.
- Documentation développeur publique.
- Sandbox et production documentés.
- Webhooks / `notify_url` déjà documentés.
- Processus d'accès API relativement explicite.

Documentation publique :
- https://docs.paymetrust.com/

**Hypothèse**

Très bon candidat pour un POC rapide et pour obtenir tôt une tarification claire.

**A vérifier**

- compatibilité exacte de leur API exposée avec le standard PI-SPI homologué ;
- coût unitaire PI-SPI ;
- frais fixes ;
- mTLS / certificats ;
- gestion des remboursements / retours de fonds ;
- possibilités de compte de cantonnement ou de compte business ;
- modèle de settlement.

### 3. Ecobank Côte d'Ivoire

**Pourquoi en troisième**

- API Business PI-SPI homologuée.
- Ecobank dispose d'un portail développeur et d'API corporate pour paiements, collections et comptes.
- Présence régionale forte, intéressante pour la stratégie UEMOA.

Portail développeur :
- https://apimuat-developer.ecobank.com/

**Hypothèse**

Très bon partenaire pour crédibilité bancaire, stabilité et expansion régionale. L'onboarding commercial peut toutefois être plus lent que chez un PSP / fintech spécialisé.

**A vérifier**

- disponibilité commerciale de l'API PI-SPI pour PME / startup ;
- délais KYC / KYB ;
- compte business requis ;
- frais d'accès et minimums ;
- sandbox spécifique PI-SPI ;
- SLA ;
- support d'intégration.

### 4. MTN MFS — alternative

- API Business PI-SPI homologuée en Côte d'Ivoire.
- MTN dispose d'une plateforme développeur et d'offres MoMo Business.
- Forte distribution locale.

Liens utiles :
- https://developers.mtn.com/
- https://www.mtn.ci/momo/business/

A garder dans la négociation pour créer une pression concurrentielle sur prix et délais.

## Cas d'usage Mastercota à présenter

### Frais Mastercota

Organisateur -> PI-SPI -> Mastercota

- montant fixe ;
- demande de paiement instantanée ;
- confirmation automatique ;
- référence unique ;
- webhook ;
- Paystack proposé uniquement si l'utilisateur choisit explicitement le secours.

### Contributions

Contributeur -> PI-SPI -> Organisateur

Objectif long terme :

- Mastercota crée une demande de paiement liée à une cotisation ;
- l'argent est crédité directement au compte / alias de l'organisateur ;
- Mastercota reçoit le statut de la transaction ;
- la contribution passe automatiquement à `paid` après notification irrévocable.

Cette architecture doit être confirmée juridiquement et techniquement avec le participant : Mastercota ne doit pas devenir dépositaire des fonds des cotisations.

## Exigences techniques minimales

Le standard API Business PI-SPI publié par la BCEAO couvre notamment :

- OAuth2 client credentials ;
- clé API ;
- certificat mTLS ;
- paiements ;
- demandes de paiement (`POST /demandes-paiements`) ;
- suivi de statut ;
- gestion des webhooks ;
- signatures HMAC des webhooks ;
- alias ;
- retours de fonds / annulations.

Références :
- https://developer.pispi.bceao.int/guides/api-business
- https://developer.pispi.bceao.int/guides/securite-overview
- https://developer.pispi.bceao.int/guides/webhook-securiser
- https://developer.pispi.bceao.int/guides/rtp-lifecycle

## Questions commerciales à envoyer à chaque participant

1. Votre API Business PI-SPI homologuée est-elle ouverte aux startups / PME en Côte d'Ivoire ?
2. Quels documents KYB sont requis ?
3. Quel compte doit être ouvert chez vous ?
4. Quels sont les frais d'onboarding ?
5. Existe-t-il un abonnement ou minimum mensuel ?
6. Quel est le coût d'une demande de paiement ?
7. Quel est le coût d'un paiement réussi ?
8. Existe-t-il des frais sur les paiements rejetés / expirés ?
9. Y a-t-il des frais de webhook ou de reporting ?
10. Quel est le coût d'un retour de fonds ?
11. Quel SLA proposez-vous ?
12. Quel délai moyen entre validation KYB et production ?
13. La sandbox expose-t-elle exactement le contrat PI-SPI standard ?
14. Fournissez-vous les certificats / procédures PICERT nécessaires ?
15. Acceptez-vous un modèle où les fonds de contribution vont directement sur le compte de l'organisateur final ?
16. Si oui, comment représentez-vous techniquement plusieurs bénéficiaires finaux ?
17. Quel niveau de réconciliation fournissez-vous par référence / end2endId ?
18. Existe-t-il des plafonds par transaction ou par jour spécifiques à votre offre Business ?
19. Quels pays UEMOA pouvez-vous onboarder contractuellement aujourd'hui ?
20. Fournissez-vous un support technique dédié pendant l'intégration ?

## Grille de score

Chaque candidat sera noté sur 100.

| Critère | Poids |
| --- | ---: |
| Coût variable par paiement | 20 |
| Frais fixes / minimum mensuel | 10 |
| Délai d'onboarding | 10 |
| Qualité sandbox / docs | 10 |
| Fiabilité webhooks / statuts | 10 |
| Support technique | 10 |
| Couverture UEMOA | 10 |
| Modèle direct-to-organizer compatible | 15 |
| SLA / exploitation | 5 |

## Seuils de décision

### Go

- API Business homologuée ;
- sandbox accessible ;
- coûts compatibles avec une marge brute cible >= 70 % sur les frais Mastercota ;
- pas d'obligation de faire transiter les contributions par un compte Mastercota ;
- webhooks signés + mTLS ;
- délai de production raisonnable.

### No-go

- frais variables rendant impossible un prix fixe ;
- obligation de conserver / redistribuer les contributions ;
- absence de webhook fiable ;
- sandbox différente de la production ;
- minimum mensuel trop élevé pour la phase de lancement ;
- absence de support en cas d'incident de paiement.

## Pricing provisoire pendant la négociation

Ne pas changer encore le pricing production.

Cible à valider :

- première cotisation : gratuite ;
- Collecte : 3 000 FCFA / 30 jours ;
- extension : 1 500 FCFA / 15 jours ;
- 0 % sur les contributions.

La grille finale ne sera activée qu'après obtention des coûts réels d'au moins deux participants.

## Ordre d'exécution

1. Contacter CONNEKT4 / HUB2.
2. Contacter PayMeTrust.
3. Contacter Ecobank.
4. Contacter MTN MFS comme alternative.
5. Collecter les devis et contrats techniques.
6. Remplir la grille de score.
7. Choisir un partenaire principal et un partenaire de secours potentiel.
8. Implémenter l'adaptateur sandbox PI-SPI.
9. Tester end-to-end.
10. Activer `PLATFORM_PAYMENT_PRIMARY=pispi` uniquement après validation production.
