# PRD — Bénévoles

**Statut** : Validé

## Problème

Chaque discipline a besoin de bénévoles pour accueillir le public pendant les Jeux. Les responsables de discipline gèrent aujourd'hui les inscriptions sur papier, et des créneaux débordent : rien n'arrête une inscription de trop.

## Utilisateurs

- Responsable de discipline : ouvrir des créneaux avec le nombre de bénévoles nécessaire.
- Bénévole : s'inscrire à un créneau, et s'en désinscrire en cas d'empêchement.

## Proposition

Le responsable ouvre un créneau avec une capacité, les bénévoles s'y inscrivent, et l'application refuse toute inscription au-delà de la capacité. Sur papier, le débordement se constate après coup ; ici, la capacité est vérifiée à chaque inscription, donc le créneau ne peut plus déborder.

## Mesure du succès

Pendant la démo, un créneau de capacité 2 accepte deux bénévoles et refuse le troisième.

## Tranches

### TR1 — Ouvrir un créneau et s'y inscrire

Le responsable ouvre un créneau avec une capacité, et un bénévole s'y inscrit.
Règle métier : un créneau n'accepte jamais d'inscription au-delà de sa capacité.

### TR2 — Consulter un créneau et ses inscrits

On peut consulter un créneau et la liste de ses inscrits.
Règle métier : un même email ne s'inscrit pas deux fois au même créneau.

### TR3 — Se désinscrire, et un écran pour le bénévole

Un bénévole se désinscrit d'un créneau, ce qui libère sa place.
Un écran permet de voir un créneau, de s'y inscrire et de s'en désinscrire.

## Hors périmètre

- La modification ou la suppression d'un créneau.
- Les emails de confirmation.
- Les comptes des bénévoles.

## Hypothèses et risques

- Supposé : un créneau appartient à une discipline. Si un créneau peut être commun à plusieurs disciplines, TR1 change.
- Supposé : un bénévole est identifié par son email, déclaré à l'inscription et non vérifié. Sans compte, n'importe qui peut donc inscrire ou désinscrire une autre personne.
- Supposé : une désinscription libère la place pour un autre bénévole. Si elle ne la libérait pas, TR3 perdrait son intérêt.
- Risque : deux bénévoles qui prennent la dernière place au même instant ne doivent pas faire déborder le créneau ; c'est la promesse centrale du produit.
