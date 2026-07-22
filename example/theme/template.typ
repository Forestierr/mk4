#let conf(
  title: none,
  subtitle: none,
  author: none,
  date: none,
  lang: "fr",
  toc: false,
  doc,
) = {
  // Configuration globale de la page
  set page(
    paper: "a4",
    margin: (x: 2cm, y: 2.5cm),
    header: align(right)[_ #title _],
    numbering: "1 / 1"
  )
  set text(font: "Linux Libertine", lang: lang)
  set heading(numbering: "1.1.")

  // --- PAGE DE GARDE STYLISÉE ---
  if title != none {
    v(4cm)
    align(center)[
      #text(size: 26pt, weight: "bold", fill: blue.darken(20%), title)
      #v(1cm)
      #text(size: 14pt, author)
      #v(0.5cm)
      #text(size: 12pt, style: "italic", date)
    ]
    pagebreak()
  }

  // --- TABLE DES MATIÈRES ---
  if toc != false {
    outline(title: "Sommaire", indent: auto)
    pagebreak()
  }

  // Affiche le reste du document
  doc
}