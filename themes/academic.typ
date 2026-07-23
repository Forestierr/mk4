// themes/academic.typ
// Thème académique — formel, inspiré LaTeX, adapté aux rapports et mémoires.

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
    margin: (x: 2.8cm, y: 3cm),
    header: context {
      if counter(page).get().first() > 1 {
        set text(8pt, style: "italic", fill: luma(80))
        grid(
          columns: (1fr, 1fr),
          align(left)[#if title != none { title }],
          align(right)[
            #let h = query(selector(heading.where(level: 1)).before(here()))
            #if h.len() > 0 { h.last().body }
          ],
        )
        v(-0.4em)
        line(length: 100%, stroke: 0.5pt + luma(120))
      }
    },
    footer: context {
      set text(8pt, fill: luma(100))
      line(length: 100%, stroke: 0.3pt + luma(200))
      v(0.3em)
      align(center)[— #counter(page).display("1") —]
    },
  )

  // ── Typographie académique ──
  set text(
    font: ("New Computer Modern", "Latin Modern Roman", "Linux Libertine"),
    size: 11pt,
    lang: lang,
  )
  set par(justify: true, first-line-indent: 1.5em, leading: 0.68em)
  set math.equation(numbering: "(1)")

  // ── Numérotation ──
  if numbering_style != none {
    set heading(numbering: numbering_style)
  }

  // ── Style des titres ──
  show heading: it => {
    set par(first-line-indent: 0em)

    if it.level == 1 {
      v(2em, weak: true)
      block(below: 1em)[
        #text(size: 15pt, weight: "bold", it)
        #v(-0.3em)
        #line(length: 100%, stroke: 0.6pt + luma(100))
      ]
    } else if it.level == 2 {
      v(1.4em, weak: true)
      block(below: 0.7em)[
        #text(size: 12.5pt, weight: "bold", it)
      ]
    } else {
      v(1em, weak: true)
      block(below: 0.5em)[
        #text(size: 11pt, weight: "bold", style: "italic", it)
      ]
    }
  }

  // ── Notes de bas de page ──
  show footnote.entry: set text(size: 9pt)

  // ══════════════════════════════════════
  //  EN-TÊTE ACADÉMIQUE
  // ══════════════════════════════════════
  if title != none {
    set par(first-line-indent: 0em)
    v(4cm)

    align(center)[
      #text(size: 20pt, weight: "bold", title)

      #if subtitle != none {
        v(0.5em)
        text(size: 14pt, style: "italic", fill: luma(60), subtitle)
      }

      #v(1.5em)
      #line(length: 20%, stroke: 0.8pt + luma(100))
      #v(1em)

      #if author != none {
        text(size: 12pt, smallcaps(author))
      }

      #if date != none {
        v(0.5em)
        text(size: 10pt, fill: luma(80), date)
      }
    ]

    v(3cm)
  }

  // ── Table des matières ──
  if toc != false {
    set par(first-line-indent: 0em)

    if title != none { pagebreak() }

    heading(level: 1, numbering: none, outlined: false)[Table des matières]
    outline(title: none, indent: auto, depth: 3)
    pagebreak()
  }

  // ── Corps du document ──
  doc
}