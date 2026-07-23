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

### Exemples

```bash
# ✅ Correct
git commit -m "feat: add theme selection in settings"
git commit -m "fix(parser): handle empty markdown files"
git commit -m "docs: update README with new theme options"
git commit -m "refactor(parser): simplify root node generation"

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

## Branches

| Branche   | Rôle                            |
| --------- | ------------------------------- |
| `master`  | Production stable               |
| `dev`     | Développement, base des PRs     |

Créez vos branches depuis `dev` avec un nom descriptif :

```bash
git checkout -b feat/theme-selection dev
git checkout -b fix/modern-theme-display dev
```

## Pull Requests

1. Créez votre branche depuis `dev`
2. Faites vos changements avec des commits conformes
3. Vérifiez que le projet compile : `npm run compile`
4. Ouvrez une PR vers `dev`
