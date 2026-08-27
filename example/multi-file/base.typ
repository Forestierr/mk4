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

#show: doc => conf(
  title: "Rapport de Recherche : Systèmes Multi-Agents",
  subtitle: "Architecture, Coordination et Évaluation Expérimentale",
  author: "Robin Forestier",
  date: "Août 2026",
  numbering_style: "1.1",
  toc: true,
  lang: "en",
  page_margin: "2.5cm",
  page_numbering: "1 / 1",
  font_family: none,
  font_size: none,
  syntax_highlighting: true,
  doc
)

#let in_outline = state("in_outline", false)
#show outline: it => { in_outline.update(true); it; in_outline.update(false) }

#metadata("9") <mk4_loc>
#heading(level: 1)[Introduction] <sec_introduction>

#metadata("12") <mk4_loc>
Les *systèmes multi-agents* (SMA) constituent un paradigme de l'intelligence artificielle distribuée dans lequel un ensemble d'entités autonomes — appelées _agents_ — interagissent dans un environnement partagé pour résoudre des problèmes complexes qu'aucun agent ne pourrait résoudre seul.

#metadata("14") <mk4_loc>
#rect(fill: rgb("eef2ff"), stroke: rgb("3b82f6"), radius: 4pt, width: 100%, inset: 10pt)[
  *Note*
  Ce rapport présente la conception, l'implémentation et l'évaluation d'un SMA pour la coordination de ressources distribuées en environnement incertain.
]

#metadata("17") <mk4_loc>
#heading(level: 2)[Problématique et motivations] <sec_problematique>

#metadata("20") <mk4_loc>
Les systèmes centralisés atteignent rapidement leurs limites face à trois contraintes fondamentales :

#metadata("22") <mk4_loc>
- *Passage à l'échelle* : un coordinateur central devient un goulot d'étranglement au-delà de quelques centaines de nœuds.
- *Tolérance aux pannes* : la défaillance du coordinateur central met hors service l'ensemble du système.
- *Adaptabilité* : les environnements dynamiques exigent des reconfigurations rapides incompatibles avec une architecture monolithique.

#metadata("26") <mk4_loc>
Les SMA répondent à ces trois enjeux grâce à leur nature décentralisée et leur capacité d'adaptation locale.

#metadata("28") <mk4_loc>
#heading(level: 2)[Périmètre et contributions]

#metadata("30") <mk4_loc>
Ce rapport apporte les contributions suivantes :

#metadata("32") <mk4_loc>
- Une architecture d'agent modulaire avec protocole de négociation formalisé.
- Un algorithme de consensus distribué tolérant aux nœuds byzantins.
- Une évaluation sur banc d'essai reproduisant des conditions de production réelles.

#pagebreak()

#metadata("39") <mk4_loc>
#heading(level: 1)[#context if in_outline.get() [État de l'art] else [État de l'Art]] <sec_etat_art>

#metadata("43") <mk4_loc>
#heading(level: 2)[Modèles d'agents existants] <sec_modeles>

#metadata("46") <mk4_loc>
Trois grandes familles de modèles dominent la littérature actuelle :

#metadata("48") <mk4_loc>
#figure(caption: [Comparaison des principaux modèles d'agents])[#table(columns: (auto, auto, auto, auto), align: (left, center, center, left),
  [Modèle],
  [Paradigme],
  [Complexité de coordination],
  [Cas d'usage typique],
  [BDI (Belief-Desire-Intention)],
  [Délibératif],
  [Élevée],
  [Planification autonome],
  [Réactif (subsomption)],
  [Réactif pur],
  [Faible],
  [Robotique comportementale],
  [Hybride],
  [Mixte],
  [Moyenne],
  [Systèmes industriels]
)] <tbl_modeles>

#metadata("56") <mk4_loc>
#heading(level: 2)[Protocoles de coordination]

#metadata("58") <mk4_loc>
Les protocoles les plus répandus pour la coordination inter-agents sont le *Contract Net Protocol* (CNP) et ses extensions hiérarchiques. Le CNP définit un cycle en trois phases :

#metadata("60") <mk4_loc>
+ *Annonce* (_Call for Proposal_) : le manager diffuse une tâche avec ses contraintes.
+ *Soumission* (_Propose_) : les agents contractants soumettent leurs offres.
+ *Attribution* (_Award_) : le manager sélectionne la meilleure offre et notifie les participants.

#metadata("64") <mk4_loc>
#rect(fill: rgb("ecfeff"), stroke: rgb("06b6d4"), radius: 4pt, width: 100%, inset: 10pt)[
  *Information*
  La complexité de la phase d'attribution est $O(n log n)$ avec $n$ agents contractants, ce qui reste acceptable jusqu'à $n approx 10^4$ nœuds sur du matériel standard.
]

#metadata("67") <mk4_loc>
#heading(level: 2)[Limites des approches existantes] <sec_limites>

#metadata("70") <mk4_loc>
Les travaux recensés présentent deux lacunes majeures :

#metadata("72") <mk4_loc>
- Absence de tolérance aux *nœuds byzantins* (agents malveillants ou défaillants partiellement).
- Évaluation limitée à des *simulateurs* sans confrontation à des charges de production réelles.

#metadata("75") <mk4_loc>
Notre contribution adresse directement ces deux points (voir @sec_architecture).

#pagebreak()

#metadata("80") <mk4_loc>
#heading(level: 1)[Architecture du Système] <sec_architecture>

#metadata("83") <mk4_loc>
#heading(level: 2)[Vue d'ensemble] <sec_vue_ensemble>

#metadata("86") <mk4_loc>
L'architecture proposée repose sur trois couches hiérarchiques :

#metadata("88") <mk4_loc>
- *Couche perception* : capteurs et agrégateurs de données brutes.
- *Couche décision* : agents BDI avec mémoire d'état locale.
- *Couche coordination* : protocole de consensus distribué.

#metadata("92") <mk4_loc>
#heading(level: 2)[Modèle formel de l'agent] <sec_modele_formel>

#metadata("95") <mk4_loc>
Chaque agent $a_i$ est défini par le quadruplet $(B_i, D_i, I_i, pi_i)$ où :

#metadata("97") <mk4_loc>
#align(center)[$ B_i subset.eq cal(W), quad D_i subset.eq 2^(cal(W)), quad I_i in Pi, quad pi_i : B_i times D_i -> I_i $ <eq_agent>]

#metadata("103") <mk4_loc>
La fonction de planification $\pi_i$ est calculée à chaque cycle de délibération selon l'algorithme suivant :

#metadata("105") <mk4_loc>
#figure(caption: [Algorithme de délibération BDI — sélection et exécution d'intention])[#rect(fill: luma(250), stroke: luma(200), radius: 4pt, width: 100%, inset: 0pt)[
  #rect(fill: luma(230), width: 100%, radius: (top: 4pt), inset: 6pt)[*agent_bdi.py*]
  #block(inset: 8pt, width: 100%)[
    #block([
  #let hl_lines = (6, 7, 12, 13)
  #show raw.where(block: true): it => grid(
    columns: (auto, 1fr),
    gutter: 1em,
    ..it.lines.enumerate().map(((i, line)) => {
      let ln = i + 1
      let bg = if ln in hl_lines { rgb(255, 235, 50, 40%) } else { none }
      let styled_line = block(width: 100%, fill: bg, inset: (x: 4pt, y: 1.5pt), radius: 2pt, line)
      (align(right, text(fill: luma(150), size: 0.85em, str(ln))), styled_line)
    }).flatten()
  )
  
```python
def deliberate(beliefs: set, desires: set, intentions: list) -> list:
    """Cycle de délibération BDI standard."""
    # 1. Filtrage des désirs accessibles depuis les croyances actuelles
    achievable = [d for d in desires if is_achievable(d, beliefs)]

    # 2. Sélection de l'intention prioritaire (heuristique gloutonne)
    if achievable:
        top_desire = max(achievable, key=lambda d: priority(d, beliefs))
        intentions = [plan_for(top_desire, beliefs)]

    # 3. Exécution d'une étape du plan courant
    if intentions:
        action = intentions[0].next_action()
        beliefs = execute(action, beliefs)

    return intentions
```

])
  ]
]] <code_bdi>

#metadata("129") <mk4_loc>
#heading(level: 2)[Protocole de consensus tolérant aux byzantins] <sec_consensus>

#metadata("132") <mk4_loc>
Le protocole implémente une variante de *PBFT* (Practical Byzantine Fault Tolerance) adaptée aux contraintes de latence des SMA industriels. La propriété de sûreté garantit qu'avec $f$ agents byzantins, le consensus est atteint dès lors que $n \geq 3f + 1$ agents participent.

#metadata("134") <mk4_loc>
#rect(fill: rgb("fffbeb"), stroke: rgb("f59e0b"), radius: 4pt, width: 100%, inset: 10pt)[
  *Attention*
  Le seuil $n \geq 3f + 1$ est une borne inférieure théoriquement optimale : aucun protocole déterministe ne peut tolérer davantage de fautes byzantines avec moins d'agents.
]

#pagebreak()

#metadata("140") <mk4_loc>
#heading(level: 1)[Résultats Expérimentaux] <sec_resultats>

#metadata("143") <mk4_loc>
#heading(level: 2)[Protocole d'évaluation] <sec_protocole>

#metadata("146") <mk4_loc>
Les expériences ont été conduites sur un cluster de *32 nœuds* (Intel Xeon E5-2690, 64 Go RAM) interconnectés par un réseau 10 GbE. Trois scénarios de charge ont été évalués :

#metadata("148") <mk4_loc>
- *Scénario A* — Charge légère : 100 agents, taux de requêtes 50 req/s.
- *Scénario B* — Charge nominale : 500 agents, taux de requêtes 500 req/s.
- *Scénario C* — Charge extrême : 2 000 agents, taux de requêtes 5 000 req/s.

#metadata("152") <mk4_loc>
#heading(level: 2)[Métriques de performance] <sec_metriques>

#metadata("155") <mk4_loc>
#figure(caption: [Synthèse des performances mesurées sur les trois scénarios de charge])[#block([
  #set text(size: 0.9em)
  #table(columns: (auto, auto, auto, auto, auto, auto), align: (left, center, center, center, center, center), inset: (x: 0.4em, y: 0.3em),
  [Scénario],
  [Agents],
  [Latence médiane],
  [Latence P99],
  [Débit (req/s)],
  [Taux d'erreur],
  [A — Léger],
  [100],
  [2,1 ms],
  [8,4 ms],
  [50],
  [< 0,01 %],
  [B — Nominal],
  [500],
  [5,7 ms],
  [21,3 ms],
  [498],
  [0,02 %],
  [C — Extrême],
  [2 000],
  [18,2 ms],
  [67,1 ms],
  [4 823],
  [0,31 %]
)
])] <tbl_resultats>

#metadata("164") <mk4_loc>
Comme le montre le @tbl_resultats, la latence P99 reste inférieure à *70 ms* même en charge extrême, ce qui satisfait la contrainte métier de 100 ms définie en @sec_problematique.

#metadata("166") <mk4_loc>
#heading(level: 2)[Comportement face aux fautes byzantines] <sec_fautes>

#metadata("169") <mk4_loc>
Avec $f = 3$ agents byzantins injectés (sur $n = 10$ participants), le protocole PBFT adapté converge systématiquement vers le consensus en *moins de 4 tours de messages*, conformément à la borne théorique établie en @sec_consensus.

#metadata("171") <mk4_loc>
#rect(fill: rgb("ecfdf5"), stroke: rgb("10b981"), radius: 4pt, width: 100%, inset: 10pt)[
  *Astuce*
  Aucune perte de cohérence des données n'a été observée lors des 1 000 injections de fautes byzantines réalisées sur 72 heures de test continu.
]

#pagebreak()

#metadata("177") <mk4_loc>
#heading(level: 1)[Conclusion et Perspectives] <sec_conclusion>

#metadata("180") <mk4_loc>
#heading(level: 2)[Synthèse des contributions]

#metadata("182") <mk4_loc>
Ce rapport a présenté une architecture SMA originale répondant aux limites identifiées dans l'@sec_etat_art :

#metadata("184") <mk4_loc>
- Un modèle d'agent formel (@eq_agent) et son algorithme de délibération (@code_bdi) garantissent un comportement prévisible et testable.
- Le protocole de consensus tolérant aux byzantins assure la cohérence des données en présence de nœuds défaillants.
- Les résultats expérimentaux du @tbl_resultats démontrent le passage à l'échelle jusqu'à 2 000 agents avec une latence P99 inférieure à 70 ms.

#metadata("188") <mk4_loc>
#heading(level: 2)[Perspectives] <sec_perspectives>

#metadata("191") <mk4_loc>
Trois axes d'amélioration sont envisagés pour les travaux futurs :

#metadata("193") <mk4_loc>
+ *Apprentissage par renforcement décentralisé* : remplacer la fonction de priorité heuristique par un modèle appris pour améliorer l'adaptation dynamique.
+ *Déploiement sur architecture hétérogène* : tester le système sur des nœuds ARM et RISC-V pour valider la portabilité.
+ *Intégration du protocole Gossip* : réduire la complexité de communication du consensus de $O(n^2)$ à $O(n log n)$ par diffusion épidémique.

#metadata("197") <mk4_loc>
#rect(fill: rgb("eef2ff"), stroke: rgb("3b82f6"), radius: 4pt, width: 100%, inset: 10pt)[
  *Note*
  L'ensemble du code source, des jeux de données et des scripts de reproduction des expériences est disponible en accès libre sur GitHub.
]

