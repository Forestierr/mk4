# MK4 - Markdown to Typst

[![Visual Studio Marketplace](https://vsmarketplacebadges.dev/version-short/rob1forest.mk4.svg)](https://marketplace.visualstudio.com/items?itemName=rob1forest.mk4)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

> **Alliez la simplicité d'écriture du Markdown à l'excellence typographique de [Typst](https://typst.app/).**  
> Rédigez vos rapports d'ingénierie, documentations techniques et articles scientifiques en Markdown standard tout en générant instantanément des PDF de qualité publication.

<!-- SCREENSHOT_HERO_START -->
<!-- Remplacez le lien ci-dessous par votre GIF animé ou capture d'écran principale -->
![Aperçu interactif de MK4 dans VS Code](https://raw.githubusercontent.com/Forestierr/mk4/main/assets/demo.gif)
*Édition Markdown en direct à gauche, aperçu Typst vectoriel instantané avec synchronisation bidirectionnelle à droite.*
<!-- SCREENSHOT_HERO_END -->

## Pourquoi MK4 ?

Le Markdown classique est universel et rapide à écrire, mais s'avère limité dès qu'il s'agit de produire un PDF soigné (gestion des pages, en-têtes, légendes, figures). Typst offre un moteur typographique moderne et ultra-rapide, mais impose une syntaxe de programmation dédiée et s'éloigne de la portabilité du Markdown.

**MK4 propose une approche équilibrée :** conservez des fichiers Markdown lisibles et compatibles avec vos outils habituels (Git, Obsidian, générateurs statiques), tout en pilotant la puissance de Typst via des annotations légères (`:key value`).

### Tableau comparatif

| Critère | Markdown standard *(+ HTML/CSS)* | Typst natif | MK4 (Markdown + Typst) |
| :--- | :--- | :--- | :--- |
| **Lisibilité brute du source** | Élevée (texte brut simple) | Moyenne (syntaxe fonctionnelle) | **Élevée (Markdown standard)** |
| **Qualité typographique du PDF** | Basique (rendu navigateur) | Excellente (moteur vectoriel) | **Excellente (moteur Typst natif)** |
| **Contrôle de mise en page** | Limité ou via HTML/CSS complexe | Total mais verbeux | **Simple et sémantique via annotations** |
| **Callouts & Blocs d'alerte** | Citations non stylisées | Fonctions `#rect()` manuelles | **Sémantique (`> texte` + `:type warning`)** |
| **Blocs de code avancés** | Pas de surlignage natif | Configuration `#show raw` avancée | **En-tête, numérotation et surlignage ciblés** |
| **Portabilité du document** | Universelle | Format propriétaire `.typ` | **Fichiers `.md` 100% exploitables partout** |
| **Prise en main** | Immédiate | Apprentissage d'un langage | **Immédiate** |

### Comparatif de syntaxe

#### 1. Images : dimensionnement, légende et alignement

<details open>
<summary><b>Voir le comparatif de code</b></summary>

<br>

##### Markdown standard *(nécessite du HTML intrusif)*
```html
<figure align="center">
  <img src="logo.png" width="50%" />
  <figcaption>Logo MK4</figcaption>
</figure>
```

##### Typst natif *(syntaxe programmatique)*
```typst
#align(center)[
  #figure(
    image("logo.png", width: 50%),
    caption: [Logo MK4]
  )
]
```

##### MK4 *(Markdown naturel + annotations ciblées)*
```markdown
![Logo MK4](logo.png)
:width 50%
:align center
:caption Logo MK4
```

> **Avantage MK4 :** Vous conservez la syntaxe standard d'image Markdown (`![alt](url)`) sans alourdir le document avec du balisage HTML.

</details>

---

#### 2. Blocs d'avertissement (Callouts / Admonitions)

<details open>
<summary><b>Voir le comparatif de code</b></summary>

<br>

##### Markdown standard *(citation monochrome)*
```markdown
> **Attention**
> 
> Vérifiez l'alimentation de la carte avant le flashage.
```

##### Typst natif *(boîte personnalisée manuellement)*
```typst
#rect(
  fill: rgb("fffbeb"),
  stroke: rgb("f59e0b"),
  radius: 4pt,
  width: 100%,
  inset: 10pt
)[
  *Attention*
  Vérifiez l'alimentation de la carte avant le flashage.
]
```

##### MK4 *(citation avec typage sémantique)*
```markdown
> Vérifiez l'alimentation de la carte avant le flashage.
:type warning
```

> **Avantage MK4 :** Une simple citation Markdown est traduite en un encadré coloré professionnel (types : `note`, `info`, `tip`, `warning`, `error`).

</details>

---

#### 3. Blocs de code : nom de fichier, numérotation et surlignage

<details open>
<summary><b>Voir le comparatif de code</b></summary>

<br>

##### Markdown standard *(bloc brut non configurable)*
````markdown
```rust
fn main() {
    println!("Hello Typst!");
}
```
````

##### Typst natif *(définition de grilles et règles de contexte)*
````typst
#rect(fill: luma(250), stroke: luma(200), radius: 4pt, width: 100%)[
  #rect(fill: luma(230), width: 100%, inset: 6pt)[*main.rs*]
  #show raw.where(block: true): it => grid(
    columns: (auto, 1fr),
    gutter: 1em,
    ..it.lines.enumerate().map(...)
  )
  ```rust
  fn main() {
      println!("Hello Typst!");
  }
  ```
]
````

##### MK4 *(bloc standard enrichi d'attributs)*
````markdown
```rust
fn main() {
    println!("Hello Typst!");
}
```
:filename main.rs
:lines true
:highlight 2
````

> **Avantage MK4 :** Vous disposez d'un encadré avec en-tête de fichier, numérotation de lignes et surlignage précis sans écrire de script Typst.

</details>

## Fonctionnalités principales

- **Aperçu en direct (Live Preview) :** Rendu SVG vectoriel instantané recalculé à chaque frappe avec mise à jour incrémentale du DOM.
- **Synchronisation du défilement :** Le panneau de prévisualisation et l'éditeur restent parfaitement synchronisés dans les deux sens.
- **Autocomplétion intelligente :** Saisie assistée des annotations dès la frappe du préfixe `:` sous un élément.
- **Formules mathématiques :** Conversion native des équations inline (`$E=mc^2$`) et blocs (`$$\int_0^\infty f(x) dx$$`).
- **Tableaux avancés :** Prise en charge des tableaux GFM avec alignement de colonnes, mode compact et légendes.
- **Thèmes personnalisables :** Injection de gabarits Typst complets (`:theme ./rapport.typ`) pour définir marges, polices, en-têtes et pieds de page.
- **Export multiple :** Génération directe du PDF final haute résolution ou du fichier source `.typ`.

---

<!-- SCREENSHOT_FEATURES_START -->
<!-- Placeholders pour vos captures d'écran des fonctionnalités -->
| Autocomplétion intelligente | Export PDF & Thèmes |
| :---: | :---: |
| ![Autocomplétion](https://raw.githubusercontent.com/Forestierr/mk4/main/assets/completion.png) | ![Rendu PDF](https://raw.githubusercontent.com/Forestierr/mk4/main/assets/pdf-export.png) |
<!-- SCREENSHOT_FEATURES_END -->

## Démarrage rapide

### 1. Prérequis

Le compilateur **Typst CLI** doit être installé et accessible dans votre variable d'environnement `PATH` :

```bash
# Cargo (Rust)
cargo install --locked typst-cli

# macOS (Homebrew)
brew install typst

# Windows (Winget / Scoop)
winget install --id Typst.Typst
# ou : scoop install typst

# Linux (Arch / AUR)
pacman -S typst
```

Vérifiez l'installation avec la commande : `typst --version`

### 2. Installation de l'extension

Installez **MK4** depuis le [Marketplace VS Code](https://marketplace.visualstudio.com/items?itemName=rob1forest.mk4) ou recherchez `MK4` dans le panneau Extensions (`Ctrl+Shift+X` ou `Cmd+Shift+X`).

### 3. Commandes disponibles

Ouvrez un fichier `.md` et utilisez les boutons d'action en haut à droite de l'éditeur :

| Commande | ID de commande | Action |
| :--- | :--- | :--- |
| **Aperçu Typst** | `mk4.showPreview` | Ouvre le panneau de prévisualisation en direct |
| **Aperçu Markdown** | `mk4.showMarkdownPreview` | Affiche l'aperçu HTML avec badges d'annotations |
| **Exporter en Typst** | `mk4.exportTypst` | Génère et ouvre le fichier source `.typ` |
| **Exporter en PDF** | `mk4.exportPdf` | Compile et enregistre le document final en PDF |

---

## Configuration

Vous pouvez configurer les options globales de MK4 dans vos paramètres VS Code (`settings.json`) :

```json
{
  // Thème par défaut appliqué si aucune annotation :theme n'est spécifiée
  // Options disponibles : "default" | "modern" | "academic"
  "mk4.typst.defaultTheme": "default",

  // Chemin absolu vers un fichier de thème Typst personnalisé (.typ) global
  // Si défini, ce thème écrase le thème par défaut pour tous vos documents
  "mk4.typst.customThemePath": ""
}
```

> **Ordre de priorité des thèmes :**
> 1. Annotation `:theme ./mon_theme.typ` dans le document Markdown (priorité maximale).
> 2. Paramètre `mk4.typst.customThemePath` dans les paramètres utilisateur / workspace.
> 3. Thème par défaut défini par `mk4.typst.defaultTheme` (`default`, `modern`, `academic`).

### Métadonnées du document

À placer au tout début du fichier Markdown :

```markdown
:theme ./template.typ
:title Spécifications Techniques
:subtitle Architecture logicielle embarquée
:author Robin Forestier
:date Août 2026
:lang fr
:numbering 1.1
:toc true
```

### Titres

```markdown
# Architecture du système de détection
:short Architecture
:numbering false
:id sec_architecture
```

- `:short <texte>` : Titre abrégé pour la table des matières (TOC).
- `:numbering false` : Masque le numéro de section pour ce titre.
- `:id <nom>` : Définit un identifiant pour les références croisées (`@sec_architecture`).

### Images et figures

```markdown
![Schéma fonctionnel](./assets/schema.png)
:width 75%
:align center
:caption Diagramme des flux de données
:id fig_schema
```

### Blocs de code

````markdown
```rust
fn main() {
    println!("Hello Typst!");
}
```
:filename main.rs
:lines true
:highlight 2
:caption Point d'entrée du programme
:align center
````

- `:filename <nom>` : Affiche un bandeau d'en-tête contenant le nom du fichier.
- `:lines true` : Active la numérotation des lignes de code.
- `:highlight <lignes>` : Surligne une sélection de lignes (ex: `2`, `1-3`, `2,5,8-10`).

### Tableaux

```markdown
| Composant | Rôle | Statut |
| :--- | :--- | :---: |
| Microcontrôleur | Traitement temps réel | Opérationnel |
| Émetteur RF | Transmission télémétrie | En test |
:caption Matrice des composants matériels
:compact true
:align center
```

### Citations et avertissements

```markdown
> Pensez à vérifier la tension d'alimentation avant toute mise sous tension.
:type warning
```

> **Types supportés :** `note` (bleu), `info` (cyan), `tip` (vert), `warning` (orange), `error` (rouge). Les citations classiques acceptent également `:author <nom>` et `:link <url>`.

### Saut de page

```markdown
:layout pagebreak
```

## Thèmes personnalisés

MK4 intègre 3 thèmes par défaut (`default`, `modern`, `academic`) et permet d'injecter n'importe quel gabarit Typst sur-mesure via `:theme ./template.typ`.

Consultez le [Guide complet de création de thèmes](docs/themes.md) pour apprendre à créer vos propres modèles d'entreprise ou académiques.

```typst
#let conf(
  title: none,
  subtitle: none,
  author: none,
  date: none,
  lang: "fr",
  toc: false,
  doc,
) = {
  // Configuration de la page
  set page(
    paper: "a4",
    margin: (x: 2.5cm, y: 3cm),
    header: align(right)[_ #title _],
    footer: locate(loc => align(center)[#loc.page() / #counter(page).final(loc).at(0)])
  )

  // En-tête de document
  if title != none {
    align(center)[
      #text(20pt, weight: "bold")[#title] \
      #if subtitle != none { text(13pt, fill: luma(100))[#subtitle] }
    ]
  }

  if toc { outline(depth: 3, indent: true) }

  // Corps du document
  doc
}
```

## Gestion des fichiers temporaires

Afin d'assurer la résolution immédiate des chemins d'images locales et des polices, MK4 génère des fichiers temporaires discrets (`.mk4-temp-*`) dans le répertoire de travail.

Ces fichiers sont **automatiquement purgés** à la fermeture de l'aperçu ou lors de la déconnexion de l'extension.

## Feuille de route (Roadmap)

Découvrez les prochaines fonctionnalités en cours de réflexion ou de développement (multi-fichiers, bibliographie, annotations de layout étendues) en consultant le fichier [ROADMAP.md](ROADMAP.md).

## Contribution

Les contributions sont les bienvenues. Consultez le fichier [CONTRIBUTING.md](CONTRIBUTING.md) pour obtenir des détails sur l'architecture et les instructions de développement local.

## Licence

Ce projet est distribué sous licence **MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.