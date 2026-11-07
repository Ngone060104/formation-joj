# 001 — Bénévoles : ouvrir un créneau et s'y inscrire

**Statut** : Validée
**PRD** : specs/prd-benevoles.md, TR1

## Contexte

Les responsables de discipline gèrent les inscriptions de bénévoles sur papier, et des créneaux débordent parce que rien n'arrête une inscription de trop. Cette première tranche pose la promesse du produit : un créneau a une capacité, et elle est vérifiée à chaque inscription.

## User stories

- En tant que responsable de discipline, je veux ouvrir un créneau avec le nombre de bénévoles nécessaire, afin de cadrer l'accueil du public.
- En tant que bénévole, je veux m'inscrire à un créneau, afin de réserver ma place.

## Scénarios d'acceptation

### AS1 — Ouvrir un créneau

- **Étant donné** une discipline « Lutte » · **Quand** le responsable ouvre pour elle un créneau avec un début, une fin après le début et une capacité de 2 · **Alors** le créneau est enregistré pour « Lutte » avec ce début, cette fin, une capacité de 2 et 2 places restantes.

### AS2 — Discipline inexistante

- **Étant donné** une discipline qui n'existe pas · **Quand** le responsable ouvre un créneau pour elle · **Alors** c'est refusé, la discipline est signalée introuvable, et aucun créneau n'est enregistré.

### AS3 — Capacité invalide

- **Étant donné** une capacité de 0, négative ou non entière · **Quand** le responsable ouvre le créneau · **Alors** c'est refusé, et aucun créneau n'est enregistré ; une capacité de 1 est acceptée.

### AS4 — Fin qui n'est pas après le début

- **Étant donné** une fin avant le début, ou égale au début · **Quand** le responsable ouvre le créneau · **Alors** c'est refusé, et aucun créneau n'est enregistré.

### AS5 — S'inscrire à un créneau

- **Étant donné** un créneau de capacité 2 sans inscrit · **Quand** un bénévole s'y inscrit avec son nom et son email · **Alors** l'inscription est enregistrée avec ce nom et cet email, et il reste 1 place.

### AS6 — Prendre la dernière place

- **Étant donné** un créneau de capacité 2 avec un inscrit · **Quand** un second bénévole s'y inscrit · **Alors** l'inscription est acceptée, et il reste 0 place.

### AS7 — Créneau complet

- **Étant donné** un créneau de capacité 2 avec deux inscrits · **Quand** un troisième bénévole s'y inscrit · **Alors** refus 409 avec le code SLOT_FULL, et le créneau compte toujours deux inscrits.

### AS8 — Deux bénévoles pour la dernière place au même instant

- **Étant donné** un créneau auquel il reste une seule place · **Quand** deux bénévoles s'y inscrivent au même instant · **Alors** une seule inscription est acceptée, l'autre reçoit un refus 409 avec le code SLOT_FULL, et le créneau ne dépasse pas sa capacité.

### AS9 — Créneau inexistant

- **Étant donné** un créneau qui n'existe pas · **Quand** un bénévole s'y inscrit · **Alors** c'est refusé, le créneau est signalé introuvable, et aucune inscription n'est enregistrée.

### AS10 — Nom ou email invalide

- **Étant donné** un nom vide ou fait d'espaces, ou un email mal formé · **Quand** le bénévole s'inscrit à un créneau qui a de la place · **Alors** c'est refusé, aucune inscription n'est enregistrée, et le nombre de places restantes ne change pas.

## Hors périmètre

- Tout écran : cette tranche s'utilise seulement par l'API.
- Consulter un créneau et ses inscrits, et refuser un même email deux fois sur un créneau (TR2).
- Se désinscrire (TR3).
- Modifier ou supprimer un créneau, les emails de confirmation, les comptes des bénévoles (PRD).

## Questions ouvertes

- Un créneau peut-il commencer dans le passé, ou chevaucher un autre créneau de la discipline ? Hypothèse : oui, aucune règle du PRD ne l'interdit.
- En attendant TR2, un même email peut s'inscrire deux fois au même créneau, et chaque inscription prend une place. Hypothèse : accepté pour cette tranche.
- Longueur maximale du nom du bénévole : le PRD n'en fixe pas. Hypothèse : le plan reprend la limite de 100 caractères du nom d'une discipline.
