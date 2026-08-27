// themes/default.typ
// Thème par défaut — propre, lisible, sans page de garde séparée.

#let conf(
  title: none,
  subtitle: none,
  author: none,
  date: none,
  numbering_style: none,
  toc: false,
  // ── Réglages injectés par MK4 (depuis les paramètres VS Code) ──
  lang: "fr",
  page_margin: "2.5cm",
  page_numbering: "1 / 1",
  font_family: none,
  font_size: none,
  syntax_highlighting: true,
  doc,
) = {
  // ── Configuration de la page ──
  let margin_val = eval(page_margin)
  set page(
    paper: "a4",
    margin: (x: margin_val, y: margin_val),
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
      if page_numbering != none {
        align(center)[
          #counter(page).display(page_numbering, both: page_numbering == "1 / 1")
        ]
      }
    },
  )

  // ── Typographie ──
  let base_font = if font_family != none { font_family } else { "Linux Libertine" }
  let base_size = if font_size   != none { eval(font_size) } else { 11pt }
  set text(font: base_font, size: base_size, lang: lang)
  set par(justify: true, leading: 0.7em)
  set math.equation(numbering: "(1)")

  // ── Coloration syntaxique ──
  set raw(syntaxes: (), theme: none) if not syntax_highlighting

  // ── Numérotation des titres ──
  set heading(numbering: numbering_style)

  // ── Style des titres ──
  show heading.where(level: 1): it => {
    v(1.2em, weak: true)
    text(size: 1.45em, weight: "bold", it)
    v(0.3em)
    line(length: 40%, stroke: 1pt + luma(180))
    v(0.6em, weak: true)
  }
  show heading.where(level: 2): it => {
    v(1em, weak: true)
    text(size: 1.18em, weight: "bold", it)
    v(0.5em, weak: true)
  }
  show heading.where(level: 3): it => {
    v(0.8em, weak: true)
    text(size: 1em, weight: "bold", style: "italic", it)
    v(0.4em, weak: true)
  }

  // ── Bloc titre (sans saut de page) ──
  if title != none {
    v(3cm)
    align(center)[
      #text(size: 2em, weight: "bold", title)

      #if subtitle != none {
        v(0.4em)
        text(size: 1.27em, fill: luma(80), subtitle)
      }

      #v(1cm)
      #line(length: 30%, stroke: 0.8pt + luma(180))
      #v(0.6cm)

      #if author != none {
        text(size: 1.09em, author)
      }

      #if date != none {
        v(0.3em)
        text(size: 0.91em, style: "italic", fill: luma(100), date)
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