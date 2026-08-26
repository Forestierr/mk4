# Guide des annotations

Les annotations s'insèrent sur la ligne suivant immédiatement le bloc cible (ou tout en haut pour le document).

## Tableau récapitulatif (Aide-mémoire)

| Clé | Valeurs acceptées | Cible | Description |
| :--- | :--- | :--- | :--- |
| `:theme` | `./theme.typ` | Document | Spécifie le modèle Typst à appliquer |
| `:title` | `<texte>` | Document | Titre principal du document |
| `:subtitle` | `<texte>` | Document | Sous-titre du document |
| `:author` | `<nom>` | Document / Citation | Auteur du document ou de la citation |
| `:date` | `<date>` | Document | Date du document |
| `:lang` | `fr`, `en`, `de`, `es` | Document | Langue du document (gestion des césures Typst) |
| `:numbering` | `1.1`, `1.a`, `false` | Document / Titre | Format de numérotation des titres |
| `:toc` | `true`, `false` | Document | Génère automatiquement la table des matières |
| `:short` | `<texte>` | Titre | Titre abrégé pour la table des matières |
| `:id` | `<identifiant>` | Universel | Ancre pour référence croisée (`@id`) |
| `:align` | `left`, `center`, `right` | Universel | Alignement horizontal du bloc |
| `:layout` | `pagebreak` | Universel | Insère un saut de page immédiatement après l'élément |
| `:width` | `50%`, `4cm`, `300pt` | Image | Largeur de l'image |
| `:caption` | `<texte>` | Image / Code / Tableau | Ajoute une légende numérotée (figure Typst) |
| `:filename` | `fichier.rs` | Code | Affiche un bandeau d'en-tête avec le nom du fichier |
| `:lines` | `true`, `false` | Code | Active la numérotation des lignes de code |
| `:highlight` | `2`, `1-3`, `2,5,8-10` | Code | Surligne des lignes spécifiques |
| `:compact` | `true`, `false` | Tableau | Réduit les marges intérieures et la taille du texte |
| `:type` | `note`, `info`, `tip`, `warning`, `error` | Citation | Transforme la citation en callout stylisé |
| `:link` / `:source` | `<url>` | Citation | Ajoute un lien source cliquable |