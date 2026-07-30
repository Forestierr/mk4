# Contribuer à MK4

Merci de contribuer à MK4 ! Ce guide décrit les conventions à suivre.

## Commits

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/fr/) avec [commitlint](https://commitlint.js.org/).  
Chaque message de commit doit suivre ce format :

```
type(scope): description courte
```

Le `scope` est optionnel. La description doit être en **minuscules** et ne pas se terminer par un point.

### Types autorisés

| Type         | Usage                                                        |
| ------------ | ------------------------------------------------------------ |
| `feat`       | Nouvelle fonctionnalité                                      |
| `fix`        | Correction de bug                                            |
| `docs`       | Modification de la documentation uniquement                  |
| `style`      | Formatage, point-virgules manquants… (aucun changement de logique) |
| `refactor`   | Refactorisation du code (ni fix, ni feat)                    |
| `perf`       | Amélioration des performances                                |
| `test`       | Ajout ou correction de tests                                 |
| `build`      | Changements du système de build ou des dépendances           |
| `ci`         | Changements de la configuration CI/CD                        |
| `chore`      | Tâches de maintenance (nettoyage, config…)                   |
| `revert`     | Annulation d'un commit précédent                             |

### Scopes courants

| Scope        | Concerne                                      |
| ------------ | --------------------------------------------- |
| `parser`     | Conversion Markdown → Typst (`src/parser/`)   |
| `preview`    | Webview de prévisualisation Typst             |
| `export`     | Export PDF / Typst                            |
| `completion` | Autocomplétion des annotations `:`           |
| `diagnostics`| Validation des annotations + erreurs Typst   |
| `webviews`   | Templates HTML des webviews                   |
| `tests`      | Fichiers de test                              |
| `ci`         | Pipeline GitHub Actions                       |

### Exemples

```bash
# ✅ Correct
git commit -m "feat(parser): add nested list support"
git commit -m "fix(preview): kill stale typst process on update"
git commit -m "refactor: split parser.ts into focused modules"
git commit -m "perf(preview): incremental DOM update instead of full reload"
git commit -m "test(diagnostics): add parseTypstErrors test cases"
git commit -m "docs: update CONTRIBUTING with module structure"

# ❌ Incorrect
git commit -m "Added new feature"       # pas de type
git commit -m "Feat: new feature"       # majuscule
git commit -m "patch: fix something"    # "patch" n'est pas un type valide
```

### Breaking changes

Pour signaler un changement cassant, ajoutez `!` après le type ou un footer `BREAKING CHANGE:` :

```bash
git commit -m "feat!: remove legacy theme format support"
```

## Architecture du projet

```
src/
├── extension.ts          # Point d'entrée VS Code (activate / deactivate)
├── parser/
│   ├── index.ts          # API publique (compileMarkdownToTypst, compileMarkdownToHtml)
│   ├── annotations.ts    # Plugin remark : extraction des annotations :key
│   ├── stringifier.ts    # Conversion AST → Typst (un case par type de nœud)
│   └── theme.ts          # Chargement du thème + assemblage du document final
├── commands/
│   ├── preview.ts        # mk4.showPreview (webview Typst, scroll sync)
│   ├── export.ts         # mk4.exportPdf + mk4.exportTypst
│   └── markdown-preview.ts # mk4.showMarkdownPreview
├── providers/
│   ├── completion.ts     # Autocomplétion des annotations :key
│   └── diagnostics.ts    # Validation + mapping erreurs Typst → lignes Markdown
├── webviews/
│   ├── preview-html.ts   # HTML de la webview Typst (mise à jour incrémentale)
│   ├── markdown-html.ts  # HTML de la webview Markdown
│   └── error-html.ts     # HTML d'erreur
└── test/                 # Tests unitaires Vitest (1 fichier par feature)
```

### Ajouter un nouveau type de nœud Markdown

1. Ajouter le `case 'monType':` dans [`src/parser/stringifier.ts`](src/parser/stringifier.ts)
2. Si le nœud supporte des annotations, les déclarer dans [`src/providers/diagnostics.ts`](src/providers/diagnostics.ts) (`CONTEXT_KEYS`)
3. Ajouter les suggestions d'autocomplétion dans [`src/providers/completion.ts`](src/providers/completion.ts)
4. Créer un test dans `src/test/` et un exemple dans `example/basics/`

## Tests

Ce projet utilise **Vitest** (rapide, sans dépendance VS Code) :

```bash
npm test           # compile + lint + tests (une passe)
npm run test:watch # mode watch pour le développement
```

Les tests sont organisés par feature dans `src/test/` :

| Fichier                    | Feature testée                          |
| -------------------------- | --------------------------------------- |
| `admonitions.test.ts`      | Blocs citation typés (note, warning…)   |
| `code.test.ts`             | Blocs de code avec annotations          |
| `diagnostics.test.ts`      | Validation des annotations + erreurs    |
| `document.test.ts`         | Métadonnées du document                 |
| `footnotes.test.ts`        | Notes de bas de page                    |
| `headings.test.ts`         | Titres avec ID, short, numbering        |
| `images.test.ts`           | Images avec légende et alignement       |
| `inline.test.ts`           | Formatage inline (gras, italique…)      |
| `layout.test.ts`           | Sauts de page                           |
| `lists.test.ts`            | Listes imbriquées et task lists         |
| `math.test.ts`             | Équations LaTeX                         |
| `references.test.ts`       | Références croisées (@id)               |
| `tables.test.ts`           | Tableaux avec mode compact              |
| `webviews.test.ts`         | Structure HTML des webviews             |

## Branches

| Branche   | Rôle                            |
| --------- | ------------------------------- |
| `master`  | Production stable               |
| `dev`     | Développement, base des PRs     |

Créez vos branches depuis `dev` avec un nom descriptif :

```bash
git checkout -b feat/include-external-files dev
git checkout -b fix/preview-race-condition dev
```

## Pull Requests

1. Créez votre branche depuis `dev`
2. Faites vos changements avec des commits conformes
3. Vérifiez que tout passe : `npm test`
4. Ouvrez une PR vers `dev`
