// themes/modern.typ
// Thème moderne — page de garde colorée, accents visuels, design dynamique.

#let accent = rgb("#2563eb")    // Bleu primaire
#let accent-light = rgb("#dbeafe")
#let text-muted = luma(100)

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
    margin: (x: margin_val, y: margin_val),
    header: context {
      if counter(page).get().first() > 1 {
        set text(8pt, fill: text-muted)
        grid(
          columns: (1fr, auto),
          align(left)[#if title != none { text(fill: accent, weight: "bold", title) }],
          align(right)[
            #if page_numbering != none {
              text(fill: text-muted, counter(page).display(page_numbering))
            }
          ],
        )
        v(-0.3em)
        line(length: 100%, stroke: 1.5pt + accent)
      }
    },
    footer: context {
      if counter(page).get().first() > 1 {
        set text(7.5pt, fill: text-muted)
        line(length: 100%, stroke: 0.4pt + luma(220))
        v(0.3em)
        grid(
          columns: (1fr, 1fr),
          align(left)[#if author != none { author }],
          align(right)[#if date != none { date }],
        )
      }
    },
  )

  // ── Typographie ──
  let base_font = if font_family != none { font_family } else { ("Inter", "Segoe UI", "Linux Libertine") }
  let base_size = if font_size   != none { eval(font_size) } else { 10.5pt }
  set text(font: base_font, size: base_size, lang: lang)
  set par(justify: true, leading: 0.72em)
  set math.equation(numbering: "(1)")

  // ── Coloration syntaxique ──
  set raw(syntaxes: (), theme: none) if not syntax_highlighting

  // ── Numérotation ──
  set heading(numbering: numbering_style)

  // ── Style des titres ──
  show heading.where(level: 1): it => {
    v(1.5em, weak: true)
    block(
      inset: (left: 12pt),
      stroke: (left: 3pt + accent),
    )[
      #text(size: 1.62em, weight: "bold", fill: accent.darken(15%), it.body)
    ]
    v(0.8em, weak: true)
  }

  show heading.where(level: 2): it => {
    v(1em, weak: true)
    text(size: 1.24em, weight: "bold", fill: luma(40), it)
    v(0.2em)
    line(length: 25%, stroke: 1pt + accent-light)
    v(0.5em, weak: true)
  }

  show heading.where(level: 3): it => {
    v(0.8em, weak: true)
    text(size: 1.05em, weight: "semibold", fill: accent.darken(10%), it)
    v(0.4em, weak: true)
  }

  // ── Liens ──
  show link: it => text(fill: accent, it)

  // ══════════════════════════════════════
  //  PAGE DE GARDE
  // ══════════════════════════════════════
  if title != none {
    // Bande décorative latérale gauche
    place(left + top, dx: -margin_val, dy: -margin_val,
      rect(width: 8pt, height: 100% + margin_val * 2, fill: accent)
    )

    v(5cm)

    // Titre principal
    block(inset: (left: 0.5cm))[
      #text(size: 2.86em, weight: "bold", fill: accent.darken(20%), title)

      #if subtitle != none {
        v(0.5em)
        text(size: 1.52em, fill: text-muted, subtitle)
      }

      #v(2cm)

      #if author != none {
        text(size: 1.24em, weight: "semibold", author)
      }

      #if date != none {
        v(0.4em)
        text(size: 1.05em, fill: text-muted, style: "italic", date)
      }
    ]

    pagebreak()
  }

  // ── Table des matières ──
  if toc != false {
    heading(level: 1, numbering: none, outlined: false)[Sommaire]
    outline(title: none, indent: auto, depth: 3)
    pagebreak()
  }

  // ── Corps ──
  doc
}