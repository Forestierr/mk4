# MK4 - Markdown to Typst

MK4 est une extension VS Code conçue pour allier la simplicité de frappe du Markdown avec la puissance de rendu mathématique et typographique de **Typst**. Pensée pour la documentation technique, les rapports d'ingénierie et la prise de notes structurée.

## Fonctionnalités Principales

- **Aperçu en Direct (Live Preview) :** Visualisez votre document rendu par Typst en temps réel (via SVG) directement dans un panneau VS Code.
- **Annotations Typst (`:`) :** Étendez la syntaxe Markdown standard pour contrôler finement le rendu (alignement, taille, légendes, identifiants) sans polluer votre texte avec du code Typst.
- **Autocomplétion Intelligente :** Tapez `:` en dessous d'un élément (titre, image, code) pour afficher les annotations compatibles.
- **Mathématiques & Tableaux :** Support complet des formules LaTeX (`$x^2$`) et des tableaux GitHub Flavored Markdown, traduits nativement pour Typst.
- **Thèmes Personnalisés :** Injectez vos propres templates Typst pour un design sur mesure.
- **Exports Multiples :** Générez le rapport final en PDF, ou exportez le code source `.typ` généré.

## Comment ça marche ? (La magie des Annotations)

Ajoutez des attributs à vos éléments Markdown en utilisant le préfixe `:` juste en dessous (ou au-dessus pour le document) de ceux-ci. 

Les **Clés Universelles** comme `:id mon_identifiant` et `:align center|left|right` peuvent être appliquées à presque tous les blocs.

Aucune annotations n'est obligatoire pour le fonctionnement du rendu.

## Annotations disponibles

### Métadonnées du Document & Thèmes

À placer tout en haut de votre fichier `document.md` :

```markdown
:theme ./template.typ
:title Spécifications de l'Architecture
:subtitle Système embarqué temps réel
:author Robin Forestier
:date Juillet 2026
:lang fr
:numbering 1.1
:toc true
```

_Exemple : [document.md](example/basics/document.md)_

### Titres

Contrôlez l'affichage de vos titres dans le document et la table des matières (TOC) :

```markdown
# Architecture du système de détection
:short Architecture
:numbering false
:id sec_architecture
```

_Exemple : [titre.md](example/basics/titre.md)_

### Images & Figures

```markdown
![Logo mk4](/public/logo.png)
:width 50%
:align center
:caption Logo MK4
:id fig_logo
```

_Exemple : [image.md](example/basics/image.md)_

### Blocs de Code

```markdown
\`\`\`rust
fn main() {
    println!("Hello Typst!");
}
\`\`\`
:filename main.rs
:lines true
:highlight 2
:caption Script principal
:align center
```

_Exemple : [code.md](example/basics/code.md)_

### Tableaux

```markdown
| Composant | Langage | Description |
| :--- | :---: | ---: |
| Serveur | Rust | Pipeline de traitement |
| Hardware | VHDL | Contrôle bas niveau |
:caption Matrice des technologies
:compact true
:align center
```

_Exemple : [tableau.md](example/basics/tableau.md)_

### Citations (Admonitions / Callouts)

Transformez les citations classiques en blocs d'avertissement colorés :

```markdown
> Il est crucial de vérifier l'alimentation avant le flashage de la carte.
:type warning
```
_(Types supportés : note, info, tip, warning, error)_

_Exemple : [citation.md](example/basics/citation.md)_

### Actions Globales

Insérez des commandes de mise en page n'importe où dans le texte :

```markdown
:layout pagebreak
```

_Exemple : [layout.md](example/basics/layout.md)_

### Theme

Utiliser un thème typst pour modifier le style du document.

```markdown
:theme ./template.typ
```

_Exemple : [theme.md](example/theme/theme.md)_

```Typst
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

  (...)

  // Affiche le reste du document
  doc
}
```

_Exemple : [template.typ](example/theme/template.typ)_

## Commandes & Interface

MK4 ajoute 4 boutons pratiques en haut à droite de l'éditeur lors de l'édition d'un fichier Markdown :
1. 🔍 **Aperçu Typst :** Ouvre le panneau de rendu en direct.
2. 📄 **Aperçu Markdown :** Affiche un rendu HTML léger avec vos annotations sous forme de badges visuels.
3. 💾 **Exporter Typst :** Génère et ouvre le fichier `.typ` source.
4. 🖨️ **Exporter PDF :** Compile et sauvegarde le document final en PDF.

## Prérequis

- **Typst CLI** doit être installé sur votre machine et accessible via la variable d'environnement `PATH` (tapez `typst --version` dans votre terminal pour vérifier).

## Gestion des fichiers temporaires

L'extension crée des fichiers temporaires cachés (`.mk4-temp-*`) dans le dossier de votre projet pour permettre au moteur Typst de résoudre correctement les chemins de vos images locales. Ces fichiers sont **automatiquement nettoyés** à la fermeture de l'aperçu ou de VS Code.