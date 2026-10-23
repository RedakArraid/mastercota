# Outreach PI-SPI — Mastercota

## Message court — premier contact

Objet : Intégration API Business PI-SPI pour Mastercota

Bonjour,

Nous développons Mastercota, une plateforme de gestion et de réconciliation de cotisations communautaires destinée à l'UEMOA.

Nous souhaitons intégrer PI-SPI comme rail de paiement principal via l'API Business d'un participant homologué par la BCEAO.

Notre besoin initial porte sur :
- demandes de paiement instantanées ;
- suivi de statut temps réel ;
- webhooks sécurisés ;
- réconciliation par référence / end2endId ;
- paiements de frais Mastercota ;
- à terme, contributions versées directement au bénéficiaire / organisateur sans transit des fonds par Mastercota.

Nous souhaitons obtenir :
- vos conditions d'onboarding KYB ;
- votre documentation PI-SPI production ;
- l'accès sandbox ;
- votre grille tarifaire complète ;
- vos SLA et délais moyens de mise en production ;
- les contraintes liées à la gestion de plusieurs bénéficiaires finaux.

Pouvez-vous nous mettre en relation avec votre équipe API Business / PI-SPI ?

Cordialement,

Équipe Mastercota

## Questions à joindre au rendez-vous

### Business

- frais d'intégration ;
- abonnement / minimum mensuel ;
- coût RTP ;
- coût paiement réussi ;
- coût échec / expiration ;
- coût remboursement / retour ;
- conditions de volume ;
- modalités de facturation.

### Technique

- OAuth2 ;
- API key ;
- mTLS ;
- PICERT ;
- scopes ;
- Request-to-Pay ;
- webhooks ;
- HMAC ;
- idempotence ;
- statuts finaux ;
- end2endId ;
- rate limits ;
- environnements sandbox / preprod / prod ;
- SLA.

### Juridique / flux

Question centrale :

> Mastercota peut-il initier et suivre une demande de paiement dont le bénéficiaire économique et le compte crédité appartiennent directement à l'organisateur de la cotisation, sans encaissement ni redistribution par Mastercota ?

Si oui, demander le modèle technique :
- alias par bénéficiaire ;
- compte business délégué ;
- sous-comptes ;
- enrôlement bénéficiaire ;
- mandat ;
- KYC/KYB requis.

## Données à ne pas transmettre avant NDA / accord approprié

- secrets API ;
- certificats ;
- données utilisateurs réelles ;
- numéros de téléphone réels de contributeurs ;
- informations bancaires de production ;
- dumps de base ;
- clés Paystack / OpenWA.
