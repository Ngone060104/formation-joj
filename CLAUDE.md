# CLAUDE.md

Application d'organisation des JOJ Dakar 2026 : une API NestJS (`apps/api`), un front React (`apps/web`) et des schémas partagés (`packages/shared`), dans un monorepo pnpm. Commandes et structure détaillée : `README.md`.

## Méthodologie

- Une fonctionnalité suit `/prd` → `/spec` → `/spec-plan` → `/tdd-task` → `/converge`, avec une validation humaine du PRD, de la spec et du plan. Les principes sont dans `specs/constitution.md`.
- Hors de ce cycle, suivre l'ordre de « Ajouter une fonctionnalité » du `README.md` : schéma partagé, domaine, cas d'usage, table, repository, controller, fausse API, écran.
- Test d'abord : un test vu en échec pour la bonne raison (`pnpm tdd:red <fichier>`), puis le code minimal, puis `pnpm verify`.
- Une tâche = un commit. Si le pré-commit échoue, corriger la cause : jamais de `--no-verify`.
- Avant de conclure une fonctionnalité : `pnpm check`, puis le sous-agent `relecteur`, sans lui transmettre l'avis de l'auteur.

## Architecture

- `packages/shared` porte les schémas Zod et les types du contrat ; `apps/api` et `apps/web` l'importent et ne s'importent jamais entre eux.
- Un module par domaine dans `apps/api/src/modules/<domaine>/`, découpé en `domain/`, `application/`, `infra/`, `http/`, sur le modèle de `disciplines`. Le transverse (config, erreurs, base, santé) est dans `src/core/`.
- `domain/` reste en TypeScript pur : ni NestJS, ni Drizzle, ni accès à la base, à l'horloge ou au hasard (imports vérifiés par oxlint).
- `application/` contient le port et les cas d'usage ; `infra/` contient la table, le mapper et le repository Drizzle ; `<domaine>.module.ts` relie le port à son implémentation.
- Le controller de `http/` valide, appelle un cas d'usage et sérialise : aucune règle métier, aucun accès au repository.
- Front : une route dans `apps/web/src/routes/` ne fait que monter une page de `src/features/<nom>/components/` ; `api/<nom>.api.ts` fait les appels HTTP, `api/<nom>.queries.ts` les hooks TanStack Query.
- `apps/web/src/mocks/` est une fausse API au même contrat que `apps/api` : toute route ajoutée à l'API y est reproduite, avec les mêmes schémas et codes d'erreur.
- Les migrations sont générées (`pnpm db:generate --name=<sujet>`), jamais éditées à la main. `routeTree.gen.ts` est généré aussi.

## Concepts appréciés

- Typage strict : pas de `any`, types déduits des schémas (`z.infer`), codes d'erreur en union littérale.
- Entité à constructeur privé : `create()` applique les règles, `restore()` relit la base sans les rejouer. L'identifiant et la date lui sont passés par le cas d'usage.
- Un cas d'usage = une classe `@Injectable()` avec une seule méthode `execute()`.
- Un port = une classe abstraite, qui sert aussi de jeton d'injection, et qui déclare seulement ce dont les cas d'usage ont besoin.
- Conversions explicites : `toDomain()` et `toRow()` dans le mapper, `toResponse()` dans le controller.
- Front : composants en fonctions à export nommé (pas d'`export default`), clés de cache regroupées dans `<nom>Keys`, liste relue depuis l'API après une écriture plutôt que modifiée à la main.
- Commentaires en français, courts, qui disent pourquoi ; un `/** … */` d'une ligne sur les classes et les méthodes de port.

## Bonnes pratiques

- Toute erreur métier dérive d'`AppError`, avec un code stable et une catégorie (VALIDATION, NOT_FOUND, CONFLICT, BUSINESS_RULE). Pas de `throw new Error()` hors `infra/` et du démarrage, pas de `HttpException` dans le code applicatif.
- `ProblemDetailsFilter` est le seul endroit où une erreur devient une réponse HTTP (RFC 9457).
- Une entrée est validée par un schéma de `packages/shared` via `createZodDto`, et une réponse via `@ZodSerializerDto`, jamais à la main. Le domaine revérifie ses règles : il ne fait pas confiance à la validation HTTP.
- Une unicité se vérifie dans le cas d'usage (message clair) et par une contrainte en base, traduite en erreur métier par le repository (`isUniqueViolation`).
- Front : chaque réponse est validée par son schéma dans `api.request` ; l'erreur affichée vient de `ApiError.code`, traduit en français (`error-message.ts`).
- L'environnement est validé au démarrage par `AppConfig`. Aucun secret dans le code : les vraies valeurs vont dans `apps/api/.env`, ignoré par git.
- Tests API : `*.spec.ts` pour le domaine et les cas d'usage (repository en mémoire), `*.int.spec.ts` pour le repository, `test/*.e2e.spec.ts` pour HTTP. Base PGlite en mémoire : ni Docker, ni réseau.
- Tests front : à côté du fichier testé, sur la fausse API (`fixture`, `mockControl`, `renderRoute`), en commençant par un commentaire qui dit ce qu'ils prouvent. Un audit `*.a11y.test.tsx` par état d'écran.
- Un test vérifie le « Alors » du scénario (valeur, statut HTTP, code d'erreur). Pas de `skip`, `todo` ni `only`.

## Nommage

- Fichiers en kebab-case, suffixés par leur rôle : `create-discipline.ts`, `discipline.mapper.ts`, `disciplines.schema.ts`, `drizzle-discipline.repository.ts`, `disciplines.controller.ts`.
- Entité au singulier, module au pluriel : `Discipline`, `DisciplinesModule`, `disciplines.errors.ts`.
- Classes en PascalCase, cas d'usage nommés par un verbe : `CreateDiscipline`, `ListDisciplines`. Implémentations préfixées par leur technique : `DrizzleDisciplineRepository`, `InMemoryDisciplineRepository`.
- Schémas Zod en camelCase suffixés `Schema`, types en `Input` ou `Response` : `createDisciplineSchema`, `CreateDisciplineInput`, `DisciplineResponse`. Constantes en `UPPER_SNAKE_CASE` : `DISCIPLINE_NAME_MAX_LENGTH`.
- Codes d'erreur en majuscules, préfixés par l'entité : `DISCIPLINE_NAME_TAKEN`. Fabriques en camelCase : `disciplineNameTaken()`.
- Colonnes en snake_case, propriétés en camelCase : `created_at`, `createdAt`.
- Code, messages d'erreur de l'API, titres de tests et commits en anglais ; interface en français.
- Titres de tests préfixés par le numéro de spec et le scénario : `it('000-AS2: rejects a discipline without a name')`. Fichiers : `*.spec.ts` côté API et `packages/shared`, `*.test.ts(x)` côté front.
- Commits Conventional Commits, 100 caractères au plus : `feat(benevoles): T03 refuse a full slot (001-AS2)`.
