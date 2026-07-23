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
        set text(8pt, fill: text-muted)
        grid(
          columns: (1fr, auto),
          align(left)[#if title != none { text(fill: accent, weight: "bold", title) }],
          align(right)[#text(fill: text-muted, counter(page).display())],
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
  set text(font: ("Inter", "Segoe UI", "Linux Libertine"), size: 10.5pt, lang: lang)
  set par(justify: true, leading: 0.72em)

  // ── Numérotation ──
  if numbering_style != none {
    set heading(numbering: numbering_style)
  }

  // ── Style des titres ──
  show heading.where(level: 1): it => {
    v(1.5em, weak: true)
    block(
      inset: (left: 12pt),
      stroke: (left: 3pt + accent),
    )[
      #text(size: 17pt, weight: "bold", fill: accent.darken(15%), it.body)
    ]
    v(0.8em, weak: true)
  }

  show heading.where(level: 2): it => {
    v(1em, weak: true)
    text(size: 13pt, weight: "bold", fill: luma(40), it)
    v(0.2em)
    line(length: 25%, stroke: 1pt + accent-light)
    v(0.5em, weak: true)
  }

  show heading.where(level: 3): it => {
    v(0.8em, weak: true)
    text(size: 11pt, weight: "semibold", fill: accent.darken(10%), it)
    v(0.4em, weak: true)
  }

  // ── Liens ──
  show link: it => text(fill: accent, it)

  // ══════════════════════════════════════
  //  PAGE DE GARDE
  // ══════════════════════════════════════
  if title != none {
    // Bande décorative latérale gauche
    place(left + top, dx: -2.5cm, dy: -2.5cm,
      rect(width: 8pt, height: 100% + 5cm, fill: accent)
    )

    v(5cm)

    // Titre principal
    block(inset: (left: 0.5cm))[
      #text(size: 30pt, weight: "bold", fill: accent.darken(20%), title)

      #if subtitle != none {
        v(0.5em)
        text(size: 16pt, fill: text-muted, subtitle)
      }

      #v(2cm)

      #if author != none {
        text(size: 13pt, weight: "semibold", author)
      }

      #if date != none {
        v(0.4em)
        text(size: 11pt, fill: text-muted, style: "italic", date)
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