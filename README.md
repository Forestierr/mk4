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

Ajoutez des attributs à vos éléments Markdown en utilisant le préfixe `:` juste en dessous de ceux-ci.

### Métadonnées du Document & Thèmes

À placer tout en haut de votre fichier `document.md` :
```markdown
:theme ./template.typ
:title Spécifications de l'Architecture
:author Robin Forestier
:date Juillet 2026
:toc true
```

### Images & Figures

```markdown
![Schéma du réseau](./network.png)
:width 80%
:align center
:caption Architecture Docker Swarm et Traefik
:id fig_network
```

### Blocs de Code

```markdown
\```rust
fn main() {
    println!("Hello Typst!");
}
\```
:caption Script principal
:align center
```

### Tableaux
```markdown
| Composant | Langage | Description |
| :--- | :---: | ---: |
| Serveur | Rust | Pipeline de traitement |
| Hardware | VHDL | Contrôle bas niveau |
:caption Matrice des technologies
:align center
```

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