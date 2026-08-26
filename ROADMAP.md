# Feuille de route (Roadmap) & Idées

Ce document recense les fonctionnalités prévues, les pistes d'amélioration et les idées en cours de réflexion pour l'évolution de **MK4**.

Chaque élément est rattaché à son ticket GitHub pour suivre les discussions et l'avancement.

## Fonctionnalités documentaires & académiques

- [ ] **[Support multi-fichiers](https://github.com/Forestierr/mk4/issues/20)** (`#20`)
  - Permettre l'inclusion de sous-documents via une directive `:include ./chapitre1.md`.
  - Résolution récursive des chemins relatifs et assemblage transparent avant compilation Typst.
  - Idéal pour la rédaction de mémoires, thèses et rapports volumineux.

- [ ] **[Gestion de la bibliographie](https://github.com/Forestierr/mk4/issues/21)** (`#21`)
  - Prise en charge des fichiers de références `.bib` via `:bibliography ./references.bib`.
  - Support des citations dans le texte via la syntaxe Typst `@cle_citation` ou Markdown standard `[@cle]`.
  - Choix du style de citation (`:bib-style ieee`, `apa`, `chicago`).

## Mise en page & Typographie avancée

- [ ] **[Annotations de layout étendues](https://github.com/Forestierr/mk4/issues/9)** (`#9`)
  - Orientation de page à la volée : `:layout landscape` / `:layout portrait`.
  - Gestion du multicolonne sur une section : `:layout columns 2`.
  - Marges personnalisées par section ou globale : `:margin (x: 2cm, y: 2.5cm)`.
  - En-têtes et pieds de page dynamiques configurables sans fichier de thème externe.

- [ ] **[Watch mode sur les thèmes externes](https://github.com/Forestierr/mk4/issues/22)** (`#22`)
  - Détection automatique des modifications apportées aux fichiers `.typ` référencés dans `:theme` pour recompiler l'aperçu en direct.

## Expérience utilisateur & Outils VS Code

- [x] **Extraits de code intégrés (Snippets)**
  - Fournir des snippets VS Code (`mk4-code`, `mk4-image`, `mk4-callout`, `mk4-table`, `mk4-meta`) pour insérer rapidement des blocs annotés prêts à l'emploi avec champs interactifs.

- [x] **Documentation au survol (Hover Provider)**
  - Afficher une infobulle d'aide riche au survol d'une annotation (`:type warning`, `:highlight 2-5`, `:compact true`) décrivant la clé, les valeurs acceptées et un aperçu du rendu.
  - Afficher la cible d'une référence croisée au survol d'un identifiant `@sec_intro` ou `@fig_logo`.

- [x] **Navigation & Aller à la définition (Go to Definition `@id` → `:id`)**
  - Permettre le saut direct (`Ctrl+Clic` / `Cmd+Clic`) depuis une citation `@mon_id` vers la ligne déclarant l'ancre `:id mon_id`.
  - Support de la recherche de toutes les références (*Find All References*) et du renommage sécurisé (`F2`).

- [x] **Barre d'état & Annulation de compilation (Status Bar & Cancel)**
  - Afficher l'état du compilateur Typst et le thème actif dans la barre d'état inférieure de VS Code.
  - Sélecteur rapide de thème au clic sur la barre d'état.
  - Bouton d'annulation interactive pour les exports PDF et compilations longues (`cancellable: true` / `AbortController`).

- [x] **Coloration syntaxique avancée & Paramètres dédiés**
  - Amélioration de la grammaire TextMate pour distinguer les clés, valeurs, et références `@id`.
  - Ajout d'options de configuration dans `settings.json` pour personnaliser les couleurs et l'affichage des badges d'annotations.

- [x] **Actions rapides en en-tête (CodeLens Provider)**
  - Afficher des boutons interactifs discrets au-dessus du document pour lancer en un clic l'aperçu Typst, l'export PDF ou changer de gabarit.

- [ ] **[Validation et diagnostics stricts des annotations](https://github.com/Forestierr/mk4/issues/11)** (`#11`)
  - Avertir en temps réel en cas de valeur invalide (ex: faute de frappe dans une clé) avec suggestions de correction automatique (*Quick Fix*).

## Moteur & Infrastructure

- [ ] **[Intégration d'un compilateur Typst WebAssembly (WASM)](https://github.com/Forestierr/mk4/issues/8)** (`#8`)
  - Étudier la possibilité d'embarquer Typst via WASM pour permettre un aperçu direct sans dépendance obligatoire au binaire CLI local.

- [ ] **Mise à niveau de l'écosystème Unified / Remark**
  - Migration vers les dernières versions ESM de `unified`, `remark-parse` et `remark-gfm` avec couverture de code complète (Vitest coverage).

## Proposer une idée

Une idée ou un besoin spécifique ?
- Ouvrez une [nouvelle issue](https://github.com/Forestierr/mk4/issues/new) en décrivant le cas d'usage concret et la syntaxe souhaitée.
