# Exemple : Bibliographie BibTeX

Cet exemple illustre les annotations `:bibliography` et `:bib-style` de MK4 pour générer automatiquement une section de références à partir d'un fichier BibTeX.

## Structure

```
bibliographie/
├── bibliographie.md    ← Ouvrir ce fichier dans VS Code
└── references.bib      ← Fichier de références BibTeX (8 entrées)
```

## Comment tester

1. Ouvrez **`bibliographie.md`** dans VS Code.
2. Cliquez sur **$(open-preview) Aperçu Typst** ou **$(file-pdf) Exporter en PDF**.
3. La section **Bibliographie** est automatiquement générée en fin de document.

## Annotations utilisées

```markdown
:bibliography ./references.bib   ← chemin vers le fichier .bib
:bib-style ieee                   ← style : ieee | apa | chicago | mla | vancouver
```

## Citations dans le texte

Les citations s'insèrent avec la syntaxe Typst `@cle_citation` directement dans le texte :

```markdown
...les travaux fondateurs de Hewitt @hewitt1977 sur les acteurs...
```

Typst génère automatiquement le numéro de référence `[1]` (style IEEE) ou `(Hewitt, 1977)` (style APA) selon le style choisi.

## Ce que démontre cet exemple

| Fonctionnalité | Où observer |
| :--- | :--- |
| `:bibliography ./references.bib` | En-tête de `bibliographie.md` |
| `:bib-style ieee` | En-tête de `bibliographie.md` |
| Citations `@hewitt1977`, `@lamport1982`… | Corps du document |
| Section bibliographie auto-générée | Fin du PDF / aperçu |
| Tableau avec source citée | Section `sec_coordination` |

## Styles disponibles

| Clé | Exemple de rendu |
| :--- | :--- |
| `ieee` (défaut) | `[1] C. Hewitt et al., …` |
| `apa` | `Hewitt, C. et al. (1977). …` |
| `chicago` | `Hewitt, Carl, et al. "A Universal…"` |
| `mla` | `Hewitt, Carl, et al. "A Universal…"` |
| `vancouver` | `1. Hewitt C, Bishop P, Steiger R. …` |
