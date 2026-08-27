# Changelog

Tous les changements notables sur l'extension "mk4" seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), 
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1](https://github.com/Forestierr/mk4/compare/v1.3.0...v1.3.1) (2026-08-26)


### Bug Fixes

* **build:** add clean step before compile to prevent stale build artifacts and fix launch task ([a3a2735](https://github.com/Forestierr/mk4/commit/a3a273583cfdbdccb52abc6e44d41fdd475e1a1f))
* **build:** add esbuild bundler and optimize vscodeignore for lightweight packaging ([621e782](https://github.com/Forestierr/mk4/commit/621e782b55dd6ce96be35bd52218d8643a4f6b3b))
* **completion:** restrict bibliography suggestions to document header only ([d8b23fd](https://github.com/Forestierr/mk4/commit/d8b23fd65fc539c146b35ddfecdc8c9e7bfe476d))
* **diagnostics:** allow standalone document directives and clear sub diagnostics ([ee98f44](https://github.com/Forestierr/mk4/commit/ee98f44c379f462a57fa38c8003327b21b6b4267))
* multi-file workflow, interactive preview navigation, and esbuild packaging ([773061f](https://github.com/Forestierr/mk4/commit/773061f17e00339245c45ab09bed6a47c1a27915))
* **multi-file:** open source on preview click and attribute errors to includes ([87631c6](https://github.com/Forestierr/mk4/commit/87631c63de185d2efcd1f093339100ff8e2177f5))
* **parser:** normalize include paths on Windows and fix document metadata propagation ([5e07ab5](https://github.com/Forestierr/mk4/commit/5e07ab571686241987a13b1526f7266def61e6d4))
* **preview:** add live reactive updates for includes, themes, and Typst root ([ba4c744](https://github.com/Forestierr/mk4/commit/ba4c7444e65a4e079e4cf35d489a838a61d27af4))
* **providers:** support multi-file definition lookup and file path diagnostics with normalized paths ([64bf73b](https://github.com/Forestierr/mk4/commit/64bf73bdf8bde05469d66185493848060adc714f))
* **test:** skip Typst CLI execution in CI if binary is not installed ([13ec9d6](https://github.com/Forestierr/mk4/commit/13ec9d60c9fa70a239c7e16aef664736bc924127))

## [1.3.0](https://github.com/Forestierr/mk4/compare/v1.2.1...v1.3.0) (2026-08-26)


### Features

* **parser:** add :include multi-file support and :bibliography with :bib-style ([5e0b070](https://github.com/Forestierr/mk4/commit/5e0b0709eef221edf0b5fa6c5786b93dbcdf14bb))
* **parser:** add table annotations and stringifier improvements ([dcb252d](https://github.com/Forestierr/mk4/commit/dcb252d9d6b5454ae58dbdf4d660346559a8832a))
* **ux:** add code actions for typo quick fixes and enhance hover and completion ([745bc0e](https://github.com/Forestierr/mk4/commit/745bc0eb5f6c426fe83dfe3a0e29c6fc55267c12))
* **ux:** add hover, definition, status bar, codelens, snippets and improved grammar ([62b38cd](https://github.com/Forestierr/mk4/commit/62b38cdd8705609a13eb920ff4a98a877f49d98c))


### Bug Fixes

* **parser:** fix bibliography placement after document body and support biblio aliases ([ea2bc52](https://github.com/Forestierr/mk4/commit/ea2bc52c21c824e816637c268f6f86b173f7f6f5))

## [1.2.1](https://github.com/Forestierr/mk4/compare/v1.2.0...v1.2.1) (2026-08-24)


### Bug Fixes

* **commands:** replace exec with execFile to prevent shell injection ([6d8e68b](https://github.com/Forestierr/mk4/commit/6d8e68b7e95bd5c85cd3484fab8dc4ce27d7d5ad))
* **export:** add --root flag to pdf export for correct image path resolution ([b18101c](https://github.com/Forestierr/mk4/commit/b18101ccc8ef440a4d3025881e3a6a1739d8672c))
* **extension:** detect missing typst binary on activation and show install prompt ([8a99b14](https://github.com/Forestierr/mk4/commit/8a99b142329f306cf8f6596e84181e5ebfdeba9c))
* **preview:** use postMessage for parse errors instead of replacing webview html ([a687d81](https://github.com/Forestierr/mk4/commit/a687d81c89c6d5727d90e650f6cd3240516c4dbb))

## [1.2.0](https://github.com/Forestierr/mk4/compare/v1.1.0...v1.2.0) (2026-07-30)


### Features

* ajout des foot notes & listes imbriquées & références ([a299588](https://github.com/Forestierr/mk4/commit/a29958806b1b94089719317f545eba60f9fd5e0d))
* bannière d'erreur & soulignement d'erreur ([f304c83](https://github.com/Forestierr/mk4/commit/f304c8396372ea177fb078ea6f18e1b2241967c7))
* soulignement annotations inconues & formatage inline ([fb2d7f7](https://github.com/Forestierr/mk4/commit/fb2d7f787bc4652b8e6921fce1d4aa8b0b38b004))


### Bug Fixes

* suppresion de la dernière page après resize ([5fce718](https://github.com/Forestierr/mk4/commit/5fce71814cfca0be6c809f1058ac4b66c1e23a61))
* suppression des fichiers temporaires ([3ff066a](https://github.com/Forestierr/mk4/commit/3ff066adbb9e1b4d658f2a3c5d0274aab9239515))

## [1.1.0](https://github.com/Forestierr/mk4/compare/v1.0.0...v1.1.0) (2026-07-23)


### Features

* ajout de thème & paramètres ([18f3f85](https://github.com/Forestierr/mk4/commit/18f3f85c4bbf59a95223c164b8d6149e77b63ae9))
* ajout de theme et parametres ([b24c789](https://github.com/Forestierr/mk4/commit/b24c7896b0c2c73e38cf21a18bc684d67289f18c))


### Bug Fixes

* compileMarkdownToTypst missing parameter ([a33f82d](https://github.com/Forestierr/mk4/commit/a33f82d5e22943f2609926b9c8e6c9af0c7df94e))

## 1.0.0 (2026-07-23)


### Features

* add auto scroling for preview ([0b414d6](https://github.com/Forestierr/mk4/commit/0b414d658c370a1e082ef69a70331960389ebe31))
* create ci / cd pipeline ([f7c62f0](https://github.com/Forestierr/mk4/commit/f7c62f0a6e19de1d9cb5a44dd77827a39c522f13))
* create ci / cd pipeline ([a0e17af](https://github.com/Forestierr/mk4/commit/a0e17afce332fc8459d29761dd87413bace30071))

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
