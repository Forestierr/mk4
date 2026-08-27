// themes/academic.typ
// Thème académique — formel, inspiré LaTeX, adapté aux rapports et mémoires.

#let conf(
  title: none,
  subtitle: none,
  author: none,
  date: none,
  numbering_style: none,
  toc: false,
  // ── Réglages injectés par MK4 (depuis les paramètres VS Code) ──
  lang: "fr",
  page_margin: "2.8cm",
  page_numbering: "1",
  font_family: none,
  font_size: none,
  syntax_highlighting: true,
  doc,
) = {
  // ── Configuration de la page ──
  let margin_val = eval(page_margin)
  set page(
    paper: "a4",
    margin: (x: margin_val, y: margin_val * 1.07),
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
      if page_numbering != none {
        align(center)[— #counter(page).display(page_numbering) —]
      }
    },
  )

  // ── Typographie académique ──
  let base_font = if font_family != none { font_family } else { ("New Computer Modern", "Latin Modern Roman", "Linux Libertine") }
  let base_size = if font_size   != none { eval(font_size) } else { 11pt }
  set text(
    font: base_font,
    size: base_size,
    lang: lang,
  )
  set par(justify: true, first-line-indent: 1.5em, leading: 0.68em)
  set math.equation(numbering: "(1)")

  // ── Coloration syntaxique ──
  set raw(syntaxes: (), theme: none) if not syntax_highlighting

  // ── Numérotation ──
  set heading(numbering: numbering_style)

  // ── Style des titres ──
  show heading: it => {
    set par(first-line-indent: 0em)

    if it.level == 1 {
      v(2em, weak: true)
      block(below: 1em)[
        #text(size: 1.36em, weight: "bold", it)
        #v(-0.3em)
        #line(length: 100%, stroke: 0.6pt + luma(100))
      ]
    } else if it.level == 2 {
      v(1.4em, weak: true)
      block(below: 0.7em)[
        #text(size: 1.14em, weight: "bold", it)
      ]
    } else {
      v(1em, weak: true)
      block(below: 0.5em)[
        #text(size: 1em, weight: "bold", style: "italic", it)
      ]
    }
  }

  // ── Notes de bas de page ──
  show footnote.entry: set text(size: 0.82em)

  // ══════════════════════════════════════
  //  EN-TÊTE ACADÉMIQUE
  // ══════════════════════════════════════
  if title != none {
    set par(first-line-indent: 0em)
    v(4cm)

    align(center)[
      #text(size: 1.82em, weight: "bold", title)

      #if subtitle != none {
        v(0.5em)
        text(size: 1.27em, style: "italic", fill: luma(60), subtitle)
      }

      #v(1.5em)
      #line(length: 20%, stroke: 0.8pt + luma(100))
      #v(1em)

      #if author != none {
        text(size: 1.09em, smallcaps(author))
      }

      #if date != none {
        v(0.5em)
        text(size: 0.91em, fill: luma(80), date)
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