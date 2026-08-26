# Exemple : Support multi-fichiers

Cet exemple illustre la directive `:include` de MK4 pour assembler un rapport réparti en plusieurs fichiers Markdown.

## Structure

```
multi-file/
├── base.md                    ← Ouvrir ce fichier dans VS Code
└── chapitres/
    ├── 01-introduction.md
    ├── 02-etat-de-lart.md
    ├── 03-architecture.md
    ├── 04-resultats.md
    └── 05-conclusion.md
```

## Comment tester

1. Ouvrez **`base.md`** dans VS Code.
2. Cliquez sur le bouton **$(open-preview) Aperçu Typst** (en-tête de l'éditeur ou CodeLens).
3. Le rendu complet du rapport — tous chapitres assemblés — s'affiche instantanément.
4. Modifiez n'importe quel fichier dans `chapitres/` puis sauvegardez `base.md` pour voir la mise à jour.

## Ce que démontre cet exemple

| Fonctionnalité | Où observer |
| :--- | :--- |
| `:include ./chapitres/01-introduction.md` | `base.md` — inclusions séquentielles |
| Annotations de document ignorées dans les sous-fichiers | Aucun `:title` / `:author` dans les chapitres |
| Annotations de bloc conservées (`:caption`, `:id`, `:type`) | `03-architecture.md`, `04-resultats.md` |
| Références croisées `@id` entre chapitres | `05-conclusion.md` cite `@sec_etat_art`, `@tbl_resultats` |
| Mathématiques et blocs de code dans les sous-fichiers | `03-architecture.md` |

## Notes

- Le fichier racine (`base.md`) est le seul à définir `:title`, `:author`, `:toc`, etc.
- Les sous-fichiers peuvent eux-mêmes contenir des `:include` (récursivité).
- Si un fichier inclus est introuvable, un bloc d'erreur rouge apparaît dans le PDF plutôt qu'un crash silencieux.
