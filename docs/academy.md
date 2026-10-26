# Mastercota Academy

Mastercota Academy est le module LMS de Mastercota. Il complète le produit de cotisations sans modifier son modèle de garde des fonds.

## Positionnement

Academy permet à un instructeur de créer, publier et vendre des cours en ligne, tandis que l'apprenant dispose d'un espace de progression structuré.

Le modèle financier reste cohérent avec Mastercota :

- l'apprenant ne verse pas le prix du cours à Mastercota ;
- le paiement du cours est envoyé directement à l'instructeur ;
- l'apprenant signale le paiement ;
- l'instructeur confirme la réception ;
- l'accès est ensuite activé ;
- PI-SPI pourra plus tard automatiser cette réconciliation sans faire transiter les fonds par Mastercota.

## Fonctionnalités instructeur

- profil instructeur ;
- cours brouillon / publié / archivé ;
- catégories, niveau, langue, couverture et bande-annonce ;
- cours gratuits, payants ou privés sur invitation ;
- sections et leçons ;
- leçons texte, vidéo, live et ressource téléchargeable ;
- aperçu gratuit ;
- progression séquentielle ;
- déblocage différé ;
- quiz avec score minimum et nombre de tentatives ;
- questions à choix unique, multiple et vrai/faux côté API ;
- coupons pourcentage ou montant fixe avec limites d’usage atomiques ;
- invitations limitées et éventuellement réservées à un numéro, protégées contre les consommations concurrentes ;
- annonces envoyées aux inscrits ;
- devoirs notés, feedback et demandes de révision ;
- cohortes, capacité, affectation d’apprenants et sessions live planifiées ;
- signalements de paiement à confirmer / rejeter ;
- analytics : inscriptions, complétion, progression moyenne, volume confirmé, avis et complétion par leçon.

## Fonctionnalités apprenant

- catalogue public ;
- recherche et filtres ;
- inscription gratuite ;
- coupon ;
- code d'invitation ;
- paiement direct à l'instructeur pour un cours payant ;
- suivi de l'accès en attente ;
- espace Mes cours ;
- progression par leçon ;
- reprise du cours ;
- ressources ;
- sessions live ;
- quiz corrigés côté serveur ;
- devoirs à remettre et corrections de l’instructeur ;
- notes privées et favoris par leçon ;
- calendrier de cohorte, sessions live et replay ;
- historique de progression ;
- questions / discussions ;
- avis après inscription ;
- certificat après complétion du parcours et des quiz requis ;
- certificat publiquement vérifiable.

## Mobile

Android et iOS proposent nativement :

- Academy dans la barre de navigation ;
- catalogue ;
- Mes cours ;
- fiche cours ;
- inscription gratuite / payante / invitation ;
- ouverture du moyen de paiement ;
- signalement du paiement ;
- programme ;
- lecture des contenus texte ;
- ouverture des vidéos, lives et ressources ;
- progression ;
- quiz ;
- devoirs ;
- notes privées ;
- calendrier de cohorte et sessions live.

La création et l'administration avancée des cours restent sur l'interface web instructeur, plus adaptée au travail éditorial.

## Accès premium et sécurité

Les contenus complets d'un cours ne sont jamais retournés dans le catalogue public.

Une leçon est accessible uniquement si :

- elle est explicitement en aperçu, ou
- l'utilisateur est l'instructeur / un admin, ou
- l'utilisateur possède une inscription active ou terminée.

Pour les cours séquentiels, les leçons précédentes doivent être terminées.

Pour le drip content, la date d'inscription détermine le déblocage.

Les bonnes réponses aux quiz ne sont jamais renvoyées par l'endpoint de lecture. La notation est effectuée côté serveur. Les options et réponses correctes sont validées lors de la création, et le mélange des questions est réellement appliqué lorsque l'option correspondante est activée.

Un cours ne peut pas être publié avec une leçon incomplète (vidéo sans URL, live sans lien, ressource vide, texte vide) ni avec un quiz sans question. Les mêmes règles s'appliquent à une publication effectuée par un administrateur.

Les URLs externes de contenu doivent utiliser HTTPS hors développement local.

## Paiements

Le premier rail opérationnel pour la vente de cours reprend le modèle direct actuel de Mastercota : réception chez l'instructeur via son mode Wave configuré.

Ce flux ne doit pas être présenté comme une automatisation bancaire :

1. l'apprenant effectue le transfert ;
2. il le signale ;
3. l'instructeur vérifie le transfert reçu ;
4. il confirme ou rejette ;
5. l'inscription devient active uniquement après confirmation.

Un double clic sur le signalement de paiement réutilise le signalement déjà en attente et ne crée pas de doublon.

## Certificats

Un cours peut activer ou désactiver le certificat.

Le certificat est émis quand :

- toutes les leçons publiées sont terminées ;
- tous les quiz du cours ont au moins une tentative réussie ;
- tous les devoirs obligatoires ont été corrigés et validés.

Un devoir obligatoire ne peut pas être ajouté après la certification d’apprenants. Les remises peuvent être limitées dans le temps à partir de la date d’inscription.

Chaque certificat possède un code public de vérification. La page publique expose le nom affiché, le cours, la date et le code, mais jamais le numéro de téléphone de l'apprenant.

## Administration

L'admin Mastercota dispose d'une vue Academy pour :

- lister les cours ;
- publier, repasser en brouillon ou archiver ;
- suivre les inscriptions ;
- voir le volume de paiements directs confirmé ;
- suivre les certificats émis.

## Limites externes

Le LMS fonctionne sans nouveau PSP grâce au flux direct + confirmation humaine.

Les améliorations futures possibles sont :

- réconciliation PI-SPI automatisée ;
- stockage / streaming vidéo managé ;
- visioconférence intégrée plutôt qu'un lien live ;
- téléversement de fichiers de devoirs vers un stockage managé ;
- abonnement Academy Pro ;
- facturation instructeur.

Ces points ne doivent pas être annoncés comme disponibles avant leur implémentation.
