# 001 — Bénévoles : ouvrir un créneau et s'y inscrire : plan

**Statut** : Validé

## 1. Résumé

On construit un nouveau module d'API, `volunteers`, qui gère les créneaux d'une discipline et les inscriptions des bénévoles. Une fois les tâches terminées, un responsable pourra ouvrir un créneau pour une discipline existante, et un bénévole pourra s'y inscrire tant qu'il reste de la place ; au-delà de la capacité, l'API répondra `409` avec le code `SLOT_FULL`, même si deux personnes visent la dernière place au même instant. Le travail est découpé en six tâches qui suivent les couches : schémas partagés, domaine, cas d'usage, base de données, routes HTTP, puis fausse API du front. Aucun écran n'est construit, et la consultation d'un créneau ainsi que le refus d'un email en double sont laissés à TR2.

Les mots de la spec et leur nom dans le code :

| Dans la spec     | Dans le code        | Ce que c'est                                                                     |
| ---------------- | ------------------- | -------------------------------------------------------------------------------- |
| créneau          | `Slot`              | Une plage horaire d'une discipline, avec un début, une fin et une capacité.      |
| capacité         | `capacity`          | Le nombre maximal de bénévoles sur le créneau, au moins 1.                       |
| places prises    | `takenPlaces`       | Le nombre d'inscriptions déjà enregistrées sur le créneau.                       |
| places restantes | `remainingPlaces`   | La capacité moins les places prises, calculée par l'entité `Slot`.               |
| inscription      | `Registration`      | Le nom et l'email d'un bénévole enregistrés sur un créneau.                      |
| ouvrir           | `OpenSlot`          | Le cas d'usage qui crée un créneau pour une discipline existante.                |
| s'inscrire       | `RegisterVolunteer` | Le cas d'usage qui enregistre une inscription et prend une place sur le créneau. |

## 2. Fichiers par couche

On crée le module `volunteers`, organisé comme le module Disciplines : un dossier par couche dans `apps/api/src/modules/volunteers/`. Les chemins ci-dessous sont relatifs à ce dossier, sauf ceux qui commencent par `packages/` ou `apps/`.

- **shared** :
  - `packages/shared/src/volunteers.ts` contient les schémas Zod : `createSlotSchema` (identifiant de discipline, début, fin après le début, capacité entière d'au moins 1 et tenant sur 32 bits), `slotSchema`, `slotIdParamsSchema`, `createRegistrationSchema` (nom, email), `registrationSchema`, `volunteerEmailSchema`, ainsi que la constante `VOLUNTEER_NAME_MAX_LENGTH` qui vaut 100.
  - `packages/shared/src/index.ts` exporte ce nouveau fichier.
- **domain** :
  - `domain/volunteers.errors.ts` déclare la classe `VolunteerError`, ses codes et les fabriques `slotFull()` et `slotNotFound()`.
  - `domain/slot.ts` contient l'entité `Slot` : `create()` revérifie la capacité et l'ordre des dates, `remainingPlaces` donne les places restantes, et `takePlace()` porte la règle centrale en levant `SLOT_FULL` quand le créneau est complet.
  - `domain/registration.ts` contient l'entité `Registration` : `create()` revérifie le nom et l'email, celui-ci avec `volunteerEmailSchema` pour que l'API et le domaine appliquent la même règle.
- **application** :
  - `application/slot.repository.ts` est le port `SlotRepository`, avec deux méthodes : `insert(slot)` et `addRegistration(registration)`, qui prend une place et enregistre l'inscription d'un seul bloc, puis renvoie le créneau à jour.
  - `application/testing/in-memory-slot.repository.ts` est le faux repository des tests, fidèle au contrat du port.
  - `application/use-cases/open-slot.ts` vérifie que la discipline existe en appelant le cas d'usage `GetDiscipline` du module Disciplines, puis crée et enregistre le créneau.
  - `application/use-cases/register-volunteer.ts` crée l'inscription, appelle `addRegistration`, et renvoie l'inscription avec les places restantes.
- **infra** :
  - `infra/volunteers.schema.ts` déclare les tables `slots` et `registrations`.
  - `infra/slot.mapper.ts` et `infra/registration.mapper.ts` contiennent les conversions `toDomain()` et `toRow()`.
  - `infra/drizzle-slot.repository.ts` implémente le port. `addRegistration` ouvre une transaction, verrouille la ligne du créneau (`SELECT … FOR UPDATE`), lève `SLOT_NOT_FOUND` si elle n'existe pas, appelle `slot.takePlace()`, insère l'inscription et écrit `taken_places`. Le verrou oblige la deuxième inscription simultanée à attendre la première, puis à voir le créneau à jour : c'est ce qui protège AS8.
- **http** :
  - `http/slots.controller.ts` valide, appelle un cas d'usage et sérialise avec `toResponse()`. Il expose deux routes :
    - `POST /api/slots` ouvre un créneau et renvoie `201` avec `id`, `disciplineId`, `startsAt`, `endsAt`, `capacity`, `remainingPlaces` et `createdAt`.
    - `POST /api/slots/:id/registrations` inscrit un bénévole et renvoie `201` avec `id`, `slotId`, `name`, `email`, `remainingPlaces` et `createdAt`. Les places restantes figurent dans cette réponse parce que la consultation d'un créneau n'arrive qu'avec TR2.
  - `volunteers.module.ts` relie le port à `DrizzleSlotRepository` et importe `DisciplinesModule`.
  - `apps/api/src/modules/disciplines/disciplines.module.ts` exporte `GetDiscipline`, pour que `OpenSlot` puisse l'injecter.
  - `apps/api/src/app.module.ts` importe `VolunteersModule`.
- **web** : aucun écran, car il est hors périmètre. La règle du dépôt impose seulement de reproduire les deux routes dans la fausse API : `apps/web/src/mocks/handlers.ts` les ajoute avec les mêmes schémas et les mêmes codes d'erreur, et `apps/web/src/mocks/fixture.ts` garde les créneaux en mémoire.

## 3. Données

On stocke les créneaux et leurs inscriptions dans deux nouvelles tables. Migration : `pnpm db:generate --name=create_volunteers`.

Table `slots` :

| Colonne         | Type                         | Contrainte et règle protégée                                                                                               |
| --------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `uuid`                       | Clé primaire.                                                                                                              |
| `discipline_id` | `uuid`                       | Clé étrangère vers `disciplines.id`, avec `ON DELETE CASCADE` : un créneau appartient toujours à une discipline existante. |
| `starts_at`     | `timestamp` avec fuseau (ms) | Non nul.                                                                                                                   |
| `ends_at`       | `timestamp` avec fuseau (ms) | Non nul. Le `CHECK (ends_at > starts_at)` protège AS4.                                                                     |
| `capacity`      | `integer`                    | Non nul. Le `CHECK (capacity >= 1)` protège AS3.                                                                           |
| `taken_places`  | `integer`                    | Non nul, 0 par défaut. Le `CHECK (taken_places <= capacity)` est le dernier filet de la promesse centrale du produit.      |
| `created_at`    | `timestamp` avec fuseau (ms) | Non nul.                                                                                                                   |

Table `registrations` :

| Colonne      | Type                         | Contrainte et règle protégée                                                           |
| ------------ | ---------------------------- | -------------------------------------------------------------------------------------- |
| `id`         | `uuid`                       | Clé primaire.                                                                          |
| `slot_id`    | `uuid`                       | Clé étrangère vers `slots.id`, avec `ON DELETE CASCADE` : pas d'inscription orpheline. |
| `name`       | `varchar(100)`               | Non nul.                                                                               |
| `email`      | `text`                       | Non nul. Aucune unicité ici : le refus d'un email en double appartient à TR2.          |
| `created_at` | `timestamp` avec fuseau (ms) | Non nul.                                                                               |

## 4. Erreurs

Chaque refus de la spec devient une erreur métier (`AppError`), avec un code stable et un statut HTTP. Par HTTP, une entrée invalide est arrêtée dès le schéma partagé et reçoit le code générique `VALIDATION_FAILED`, comme dans le module Disciplines ; les codes du domaine servent quand le domaine est appelé sans passer par HTTP.

| Code AppError              | Catégorie  | HTTP | Quand                                                       | Scénario       |
| -------------------------- | ---------- | ---- | ----------------------------------------------------------- | -------------- |
| `VALIDATION_FAILED`        | VALIDATION | 400  | Le corps de la requête ne respecte pas le schéma partagé.   | AS3, AS4, AS10 |
| `SLOT_CAPACITY_INVALID`    | VALIDATION | 400  | La capacité n'est pas un entier d'au moins 1.               | AS3            |
| `SLOT_END_NOT_AFTER_START` | VALIDATION | 400  | La fin est avant le début, ou égale au début.               | AS4            |
| `VOLUNTEER_NAME_REQUIRED`  | VALIDATION | 400  | Le nom est vide, ou fait seulement d'espaces.               | AS10           |
| `VOLUNTEER_NAME_TOO_LONG`  | VALIDATION | 400  | Le nom dépasse 100 caractères.                              | AS10           |
| `VOLUNTEER_EMAIL_INVALID`  | VALIDATION | 400  | L'email est mal formé.                                      | AS10           |
| `DISCIPLINE_NOT_FOUND`     | NOT_FOUND  | 404  | La discipline du créneau n'existe pas (code déjà existant). | AS2            |
| `SLOT_NOT_FOUND`           | NOT_FOUND  | 404  | Le créneau visé par l'inscription n'existe pas.             | AS9            |
| `SLOT_FULL`                | CONFLICT   | 409  | Le créneau n'a plus de place restante.                      | AS7, AS8       |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit. Le test e2e est ajouté quand le « Alors » porte sur un statut HTTP ou sur la réponse de l'API. Dans ce tableau, `<module>` désigne `apps/api/src/modules/volunteers`.

| Scénario | Fichier de test                                                                  | Niveau      | Ce que le test vérifie                                                                                              |
| -------- | -------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La réponse `201` contient la discipline, le début, la fin, une capacité de 2 et 2 places restantes.                 |
| AS2      | `<module>/application/volunteers.application.spec.ts`                            | unitaire    | `OpenSlot` lève `DISCIPLINE_NOT_FOUND`, et le faux repository ne contient aucun créneau.                            |
| AS2      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La réponse est `404` avec le code `DISCIPLINE_NOT_FOUND`.                                                           |
| AS3      | `packages/shared/src/volunteers.spec.ts`, `<module>/domain/slot.spec.ts`         | unitaire    | Les capacités 0, -1 et 1,5 sont refusées par le schéma et par `Slot.create()` ; la capacité 1 est acceptée.         |
| AS3      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La réponse est `400` avec le code `VALIDATION_FAILED` et une erreur sur `capacity`.                                 |
| AS4      | `packages/shared/src/volunteers.spec.ts`, `<module>/domain/slot.spec.ts`         | unitaire    | Une fin avant le début et une fin égale au début sont refusées par le schéma et par `Slot.create()`.                |
| AS4      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La réponse est `400` avec le code `VALIDATION_FAILED` et une erreur sur `endsAt`.                                   |
| AS5      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La réponse `201` contient le nom, l'email et 1 place restante.                                                      |
| AS6      | `<module>/domain/slot.spec.ts`                                                   | unitaire    | `takePlace()` sur la dernière place ne lève rien, et `remainingPlaces` vaut 0.                                      |
| AS6      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La deuxième inscription d'un créneau de capacité 2 renvoie `201` et 0 place restante.                               |
| AS7      | `<module>/infra/drizzle-slot.repository.int.spec.ts`                             | intégration | `addRegistration` lève `SLOT_FULL`, et la table contient toujours deux inscriptions pour ce créneau.                |
| AS7      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La troisième inscription renvoie `409` avec le code `SLOT_FULL`.                                                    |
| AS8      | `<module>/infra/drizzle-slot.repository.int.spec.ts`                             | intégration | Deux `addRegistration` lancés ensemble sur la dernière place : un succès, un `SLOT_FULL`, une seule ligne ajoutée.  |
| AS8      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | Deux requêtes lancées ensemble renvoient l'une `201`, l'autre `409` avec le code `SLOT_FULL`.                       |
| AS9      | `<module>/infra/drizzle-slot.repository.int.spec.ts`                             | intégration | `addRegistration` lève `SLOT_NOT_FOUND`, et aucune ligne n'est ajoutée.                                             |
| AS9      | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La réponse est `404` avec le code `SLOT_NOT_FOUND`.                                                                 |
| AS10     | `packages/shared/src/volunteers.spec.ts`, `<module>/domain/registration.spec.ts` | unitaire    | Un nom vide, un nom fait d'espaces et un email mal formé sont refusés par le schéma et par `Registration.create()`. |
| AS10     | `apps/api/test/volunteers.e2e.spec.ts`                                           | e2e         | La réponse est `400`, puis une inscription valide montre que les places restantes n'ont pas changé.                 |

La fausse API a aussi ses tests dans `apps/web/src/mocks/handlers.test.ts`, pour AS1, AS2, AS5, AS7 et AS9. Un test e2e de `apps/api/test/discipline-by-id.e2e.spec.ts`, titré `000-AS10`, vérifie en plus qu'une discipline qui a des créneaux se supprime toujours.

## 6. Tâches

Six tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [001-AS3, AS4, AS10] Écrire d'abord `packages/shared/src/volunteers.spec.ts` (« 001-AS3: rejects a capacity below 1 »), puis les schémas de `packages/shared/src/volunteers.ts` et leur export dans `index.ts`
- [x] T02 [001-AS3, AS4, AS6, AS10] Écrire d'abord `domain/slot.spec.ts` et `domain/registration.spec.ts` (« 001-AS6: takes the last place without refusing »), puis les entités `Slot` et `Registration` et `domain/volunteers.errors.ts`
- [ ] T03 [001-AS2] Écrire d'abord `application/volunteers.application.spec.ts` (« 001-AS2: refuses a slot for an unknown discipline »), puis le port `SlotRepository`, le faux repository et les cas d'usage `OpenSlot` et `RegisterVolunteer`
- [ ] T04 [001-AS7, AS8, AS9] Écrire d'abord `infra/drizzle-slot.repository.int.spec.ts` (« 001-AS8: accepts only one of two simultaneous registrations »), puis `infra/volunteers.schema.ts`, la migration générée, les mappers et `DrizzleSlotRepository`
- [ ] T05 [001-AS1, AS2, AS3, AS4, AS5, AS6, AS7, AS8, AS9, AS10] Écrire d'abord `apps/api/test/volunteers.e2e.spec.ts` (« 001-AS7: rejects a registration on a full slot (409) »), puis `http/slots.controller.ts`, `volunteers.module.ts`, l'export de `GetDiscipline` et l'import dans `app.module.ts`
- [ ] T06 [001-AS1, AS2, AS5, AS7, AS9] Écrire d'abord les cas de `apps/web/src/mocks/handlers.test.ts` (« 001-AS7: rejects a full slot with a 409 SLOT_FULL problem »), puis les deux routes dans `handlers.ts` et les créneaux dans `fixture.ts`
