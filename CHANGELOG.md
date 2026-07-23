# Changelog

Tous les changements notables sur l'extension "mk4" seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), 
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

*Les futurs changements en cours de développement iront ici.*

## [0.0.3] - 22-07-2026

### Added (Ajouts)

- **Auto scroll** : Scroll automatique entre la page de preview et markdown (dans les deux sens).
- **Colorations** : Ajout de coloration des annotaion dans le fichier markdown.
- **CI** : Ajout d'un ci permetant de valider un PR et de push une nouvelle version de l'extention automatiquement.

## [0.0.2] - 22-07-2026

### Added (Ajouts)

- **Métadonnées** : Ajout du champ `:subtitle` pour la page de garde par défaut et les templates Typst.
- **Autocomplétion intelligente** : Amélioration majeure du contexte. Les métadonnées globales ne sont désormais suggérées qu'au tout début du document, et les clés universelles ne viennent plus polluer cette zone.
- **Titres** : Support des titres courts pour la table des matières via `:short` (implémentation via les *states* Typst pour conserver la numérotation native).
- **Code** : Surlignage de lignes spécifiques (Highlight) avec un parseur avancé supportant de multiples syntaxes (ex: `:highlight 2, 4-6, -3, 8:10`).
- **Tableaux** : Mode resserré avec `:compact true` (réduction de la police à `0.9em` et des marges internes).

### Fixed (Corrections)

- **Sécurité Typst (Sandbox)** : Résolution de l'erreur d'accès aux fichiers externes (ex: `../../public/image.png`) en fixant dynamiquement l'argument `--root` sur le dossier parent de l'espace de travail VS Code au lieu du dossier du fichier.
- **Coloration Syntaxique** : Correction du bug où Typst ignorait le langage du bloc de code lors de l'utilisation de `:lines` ou `:filename` (ajout de sauts de ligne obligatoires autour des *backticks*).
- **Alignement des Légendes** : Correction du centrage forcé par défaut en Typst pour les blocs de code et tableaux avec une légende. Application dynamique de `#show figure.caption: set align(...)` pour suivre la clé `:align`.

---

## [0.0.1] - 21-07-2026

### Added (Ajouts)

- **Moteur de rendu Typst intégré** : Conversion à la volée du Markdown vers Typst.
- **Interface UI** : Boutons d'action pour générer l'aperçu SVG (Live Preview), l'export `.typ` source et l'export PDF final.
- **Autocomplétion Contextuelle (Base)** : Système de suggestions d'annotations déclenchées par le préfixe `:`.
- **Métadonnées de Document (Base)** : Support des options de page de garde et d'import de template (`:title`, `:author`, `:date`, `:theme`, `:lang`, `:toc`, `:numbering`).
- **Gestion du Code (Base)** : Traduction des blocs de code Markdown, encadrés avec noms de fichiers (`:filename`) et numérotation (`:lines`).
- **Tableaux (Base)** : Conversion automatique des alignements de colonnes natifs de Markdown (via *remark-gfm*) vers Typst.
- **Admonitions (Callouts)** : Transformation des citations `>` en blocs colorés d'avertissement via `:type` (`note`, `info`, `tip`, `warning`, `error`).
- **Clés Universelles** : Gestion globale des identifiants croisés (`:id`), de l'alignement (`:align`) et des légendes (`:caption`).
- **Mise en page** : Ajout de la commande d'action globale `:layout pagebreak`.