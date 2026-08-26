# Guide de création et personnalisation des thèmes Typst

Dans **MK4**, la mise en page de votre document (polices, marges, en-têtes, pieds de page, page de garde) est entièrement pilotée par un gabarit [Typst](https://typst.app/).

Ce guide détaille le fonctionnement des thèmes, la structure attendue pour créer vos propres modèles, et les caractéristiques des 3 thèmes intégrés.

## 1. Fonctionnement et ordre de priorité

MK4 résout le thème Typst à utiliser selon l'ordre de priorité suivant :

1. **Priorité 1 — Au niveau du document :** Annotation `:theme ./chemin/vers/theme.typ` tout en haut de votre fichier Markdown.
2. **Priorité 2 — Au niveau de l'éditeur :** Paramètre `"mk4.typst.customThemePath": "/chemin/absolu/theme.typ"` dans vos `settings.json` VS Code.
3. **Priorité 3 — Thème par défaut de l'extension :** Paramètre `"mk4.typst.defaultTheme": "default"` (`default`, `modern`, ou `academic`).

## 2. Les 3 thèmes intégrés

MK4 inclut 3 thèmes conçus pour des cas d'usage distincts :

### `default` (Standard & Minimaliste)
- **Police :** *Linux Libertine* (serif, 11pt).
- **Style :** Épuré, sans page de garde séparée. Idéal pour les fiches techniques, mémos et notes de synthèse.
- **En-têtes :** Titre et auteur discrets avec ligne de séparation à partir de la page 2.
- **Pied de page :** Numérotation centrée `Page X / Y`.

### `modern` (Rapports d'entreprise & Documentation)
- **Police :** *Inter*, *Segoe UI* (sans-serif, 10.5pt).
- **Style :** Accents graphiques bleus (`#2563eb`), titres soulignés avec liseré vertical gauche.
- **Page de garde :** Bandeau coloré moderne avec métadonnées structurées.
- **Idéal pour :** Rapports de projet, spécifications fonctionnelles, livrables clients.

### `academic` (Articles scientifiques & Thèses)
- **Police :** *New Computer Modern*, *Latin Modern Roman* (11pt).
- **Style :** Rendu sobre inspiré des publications LaTeX universitaires.
- **Spécificités :** Retrait d'alinéa automatique (`first-line-indent`), numérotation automatique des équations mathématiques `(1)`, en-têtes avec rappel du titre de chapitre courant.

## 3. Structure requise pour un thème personnalisé

Pour être compatible avec MK4, votre fichier `.typ` doit impérativement déclarer une fonction `#let conf(...)` acceptant les arguments suivants :

```typst
#let conf(
  title: none,             // Chaîne transmise par :title (ou none)
  subtitle: none,          // Chaîne transmise par :subtitle (ou none)
  author: none,            // Chaîne transmise par :author (ou none)
  date: none,              // Chaîne transmise par :date (ou none)
  numbering_style: none,   // Chaîne transmise par :numbering (ex: "1.1")
  lang: "fr",              // Langue transmise par :lang (défaut : "fr")
  toc: false,              // Booléen transmis par :toc (true / false)
  doc,                     // Corps du document Markdown compilé (obligatoire)
) = {
  // 1. Configuration globale de la page
  set page(
    paper: "a4",
    margin: (x: 2.5cm, y: 3cm),
    header: context {
      if counter(page).get().first() > 1 {
        set text(8pt, fill: luma(120))
        grid(
          columns: (1fr, 1fr),
          align(left)[#if title != none { emph(title) }],
          align(right)[#if author != none { author }],
        )
      }
    },
    footer: context {
      set text(8pt, fill: luma(120))
      align(center)[#counter(page).display("1 / 1", both: true)]
    },
  )

  // 2. Typographie
  set text(font: "Linux Libertine", size: 11pt, lang: lang)
  set par(justify: true, leading: 0.7em)

  // 3. Numérotation des titres
  set heading(numbering: numbering_style)

  // 4. Style des titres
  show heading.where(level: 1): it => {
    v(1.2em, weak: true)
    text(size: 16pt, weight: "bold", it)
    v(0.6em, weak: true)
  }

  // 5. Bloc de titre / Page de garde
  if title != none {
    align(center)[
      #v(2cm)
      #text(22pt, weight: "bold")[#title] \
      #if subtitle != none { text(13pt, fill: luma(100))[#subtitle] }
      #v(1cm)
      #if author != none { text(11pt)[Par #author] }
      #if date != none { text(10pt, style: "italic", fill: luma(120))[\ #date] }
      #v(2cm)
    ]
  }

  // 6. Table des matières
  if toc {
    outline(title: "Table des matières", indent: auto, depth: 3)
    pagebreak()
  }

  // 7. Rendu final du corps Markdown (obligatoire en fin de fonction)
  doc
}
```

## 4. Exemple pratique : Thème d'entreprise personnalisé

Voici un exemple prêt à l'emploi avec logo, bordure colorée et page de garde distincte :

```typst
// mon-theme-entreprise.typ
#let brand-color = rgb("#0f766e") // Couleur primaire (Teal)

#let conf(
  title: none,
  subtitle: none,
  author: none,
  date: none,
  numbering_style: "1.1",
  lang: "fr",
  toc: false,
  doc,
) = {
  // Page de garde
  if title != none {
    set page(margin: (x: 3cm, top: 4cm, bottom: 3cm))
    
    // Logo d'entreprise (si présent dans le workspace)
    align(left)[#rect(fill: brand-color, width: 40pt, height: 40pt, radius: 4pt)]
    v(3cm)
    
    // Titres
    text(size: 26pt, weight: "bold", fill: brand-color, title)
    if subtitle != none {
      v(0.5em)
      text(size: 14pt, fill: luma(80), subtitle)
    }
    
    v(1fr)
    line(length: 100%, stroke: 1.5pt + brand-color)
    v(0.5em)
    
    grid(
      columns: (1fr, 1fr),
      align(left)[#if author != none { text(11pt, weight: "medium", author) }],
      align(right)[#if date != none { text(11pt, fill: luma(100), date) }]
    )
    
    pagebreak()
  }

  // Configuration des pages de contenu
  set page(
    paper: "a4",
    margin: (x: 2.5cm, top: 3cm, bottom: 2.5cm),
    header: context {
      set text(8pt, fill: luma(100))
      grid(
        columns: (1fr, auto),
        align(left)[#title],
        align(right)[#text(fill: brand-color, weight: "bold")[CONFIDENTIEL]]
      )
      v(-0.3em)
      line(length: 100%, stroke: 0.5pt + luma(200))
    },
    footer: context {
      set text(8pt, fill: luma(120))
      line(length: 100%, stroke: 0.3pt + luma(220))
      v(0.3em)
      align(center)[#counter(page).display("Page 1 sur 1", both: true)]
    }
  )

  set text(font: "Segoe UI", size: 10pt, lang: lang)
  set par(justify: true)
  set heading(numbering: numbering_style)

  // Style des titres
  show heading.where(level: 1): it => {
    v(1.5em, weak: true)
    text(fill: brand-color, size: 14pt, weight: "bold", it)
    v(0.5em, weak: true)
  }

  if toc {
    outline(title: "Sommaire", depth: 3, indent: true)
    pagebreak()
  }

  doc
}
```

Pour utiliser ce thème dans un fichier Markdown :

```markdown
:theme ./mon-theme-entreprise.typ
:title Rapport d'Audit Technique
:subtitle Infrastructure Cloud & Sécurité
:author Robin Forestier
:date Août 2026
:toc true

# 1. Contexte et Objectifs
...
```
