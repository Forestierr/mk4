// themes/default.typ
// Thème par défaut — propre, lisible, sans page de garde séparée.

#let conf(
  title: none,
  subtitle: none,
  author: none,
  date: none,
  numbering_style: none,
  lang: "fr",
  toc: false,
  doc,
) = {
  // ── Configuration de la page ──
  set page(
    paper: "a4",
    margin: (x: 2.5cm, y: 2.5cm),
    header: context {
      if counter(page).get().first() > 1 {
        set text(8pt, fill: luma(120))
        grid(
          columns: (1fr, 1fr),
          align(left)[#if title != none { emph(title) }],
          align(right)[#if author != none { author }],
        )
        v(-0.4em)
        line(length: 100%, stroke: 0.4pt + luma(200))
      }
    },
    footer: context {
      set text(8pt, fill: luma(120))
      align(center)[
        #counter(page).display("1 / 1", both: true)
      ]
    },
  )

  // ── Typographie ──
  set text(font: "Linux Libertine", size: 11pt, lang: lang)
  set par(justify: true, leading: 0.7em)

  // ── Numérotation des titres ──
  if numbering_style != none {
    set heading(numbering: numbering_style)
  }

  // ── Style des titres ──
  show heading.where(level: 1): it => {
    v(1.2em, weak: true)
    text(size: 16pt, weight: "bold", it)
    v(0.3em)
    line(length: 40%, stroke: 1pt + luma(180))
    v(0.6em, weak: true)
  }
  show heading.where(level: 2): it => {
    v(1em, weak: true)
    text(size: 13pt, weight: "bold", it)
    v(0.5em, weak: true)
  }
  show heading.where(level: 3): it => {
    v(0.8em, weak: true)
    text(size: 11pt, weight: "bold", style: "italic", it)
    v(0.4em, weak: true)
  }

  // ── Bloc titre (sans saut de page) ──
  if title != none {
    v(3cm)
    align(center)[
      #text(size: 22pt, weight: "bold", title)

      #if subtitle != none {
        v(0.4em)
        text(size: 14pt, fill: luma(80), subtitle)
      }

      #v(1cm)
      #line(length: 30%, stroke: 0.8pt + luma(180))
      #v(0.6cm)

      #if author != none {
        text(size: 12pt, author)
      }

      #if date != none {
        v(0.3em)
        text(size: 10pt, style: "italic", fill: luma(100), date)
      }
    ]
    v(2cm)
  }

  // ── Table des matières ──
  if toc != false {
    outline(title: "Table des matières", indent: auto, depth: 3)
    pagebreak()
  }

  // ── Corps du document ──
  doc
}