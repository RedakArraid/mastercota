# Positionnement métier Mastercota

Ce document est la source de vérité pour les textes produit, marketing, onboarding et support.

## Ce que Mastercota vend

Mastercota est un outil de gestion et de suivi de cotisations communautaires.

La valeur vendue n'est pas le paiement lui-même. Mastercota aide un organisateur à :

- créer une page claire pour sa cotisation ;
- partager un lien unique dans son groupe ;
- suivre les contributions signalées ;
- confirmer ce qui a réellement été reçu ;
- montrer une progression compréhensible ;
- garder un historique exploitable sans listes, captures d'écran ou calculs dispersés.

Formulation courte :

> Organisez votre cotisation. Gardez le suivi clair.

Formulation détaillée :

> Créez une page, partagez-la dans votre groupe et suivez les contributions au même endroit. Les fonds sont versés directement à l'organisateur ; Mastercota prend 0 % sur les contributions.

## Client principal

Le client payant est l'organisateur de la cotisation.

Profil prioritaire :

- responsable d'un groupe WhatsApp ;
- environ 20 à 200 participants ;
- collecte ponctuelle ou communautaire ;
- suit aujourd'hui les paiements dans WhatsApp, Notes, Excel ou avec des captures d'écran.

Cas d'usage prioritaires :

- mariage ;
- funérailles ;
- entraide familiale ou médicale ;
- association ;
- promotion / groupe d'anciens ;
- équipe ou communauté ;
- projet commun.

## Rôle du participant

Le participant ne paie pas Mastercota.

Il doit pouvoir :

1. ouvrir le lien sans créer de compte ;
2. comprendre l'objectif ;
3. envoyer sa contribution au bénéficiaire ;
4. signaler son transfert ;
5. comprendre qu'il reste à confirmer par l'organisateur.

## Flux d'argent

### Contributions

Participant -> moyen de réception -> organisateur

Mastercota ne doit pas recevoir, conserver ou redistribuer les fonds de la cotisation.

Aujourd'hui, le produit prend en charge Wave Business ou un numéro Wave pour les contributions.

L'objectif PI-SPI à terme est de conserver le même principe : paiement directement au bénéficiaire final avec réconciliation automatisée, sous réserve du contrat et des capacités du participant PI-SPI retenu.

### Frais Mastercota

Organisateur -> prestataire de paiement -> Mastercota

Le prestataire de paiement des frais Mastercota est une infrastructure interne. Il ne doit pas devenir le centre du discours client.

Architecture cible :

- PI-SPI : rail principal lorsqu'il est validé en production ;
- Paystack : rail de secours explicite ;
- aucun fallback automatique après un échec de paiement afin d'éviter un double débit.

## Tarification actuelle

Le modèle actuel est un forfait payé par l'organisateur selon la durée :

- première cotisation : 35 jours offerts, une fois par numéro ;
- jusqu'à 15 jours : 2 000 FCFA ;
- jusqu'à 35 jours : 4 000 FCFA ;
- jusqu'à 60 jours : 10 000 FCFA ;
- prolongation de 10 jours : 2 000 FCFA ;
- 0 % sur les contributions.

La communication doit parler d'un **forfait Mastercota** ou d'un **forfait de cotisation**, pas de « frais sur l'argent collecté ».

Ne pas modifier la grille de production avant d'avoir :

- les coûts réels d'au moins deux participants PI-SPI ;
- le nombre médian et le 95e percentile de contributions par cotisation ;
- la durée médiane ;
- le taux de réutilisation ;
- le coût support ;
- la part de paiements passant par le rail de secours.

## Promesses autorisées

- « 0 % sur les contributions »
- « Les fonds sont versés directement à l'organisateur »
- « Les participants n'ont pas besoin de compte Mastercota pour contribuer »
- « Le total augmente après confirmation de l'organisateur »
- « Le forfait Mastercota dépend de la durée, pas du montant collecté »
- « Pensé pour les groupes WhatsApp »
- « Première cotisation offerte » lorsque l'éligibilité est vérifiée par le produit

## Promesses à ne pas faire aujourd'hui

Ne pas écrire que Mastercota :

- confirme automatiquement tous les paiements ;
- suit chaque paiement « en temps réel » pour les contributions Wave ;
- envoie des rappels personnalisés aux retardataires ;
- garantit la réussite ou la sécurité d'un paiement tiers ;
- est une banque, un portefeuille ou un service de conservation de fonds ;
- applique un tarif Wave précis sans source actuelle ;
- utilise PI-SPI en production tant que le partenaire, mTLS/PICERT et l'activation production ne sont pas validés.

## Vocabulaire

Préférer :

- cotisation ;
- organisateur ;
- participant / contributeur ;
- contribution ;
- transfert signalé ;
- contribution confirmée ;
- objectif ;
- progression ;
- forfait Mastercota ;
- mode de réception.

Éviter sauf contexte spécifique :

- cagnotte ;
- encaissement Mastercota ;
- solde Mastercota ;
- portefeuille ;
- commission ;
- prélèvement sur la collecte.

## Règle de contenu

Toute nouvelle fonctionnalité ou page doit pouvoir répondre clairement à trois questions :

1. Qui fait l'action ?
2. Où va l'argent ?
3. Qu'est-ce qui est confirmé automatiquement et qu'est-ce qui nécessite encore une vérification humaine ?

Si une phrase donne l'impression que Mastercota détient les fonds ou automatise une étape qui reste manuelle, elle doit être réécrite.
