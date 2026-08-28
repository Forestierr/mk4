:title Exemple de colonnes
:subtitle Utilisation de :layout columns
:author MK4
:date 2026

# Introduction

La nouvelle fonctionnalité de MK4 permet de séparer votre texte en plusieurs colonnes de manière très simple. Vous pouvez choisir de l'appliquer à l'ensemble du document (en le plaçant tout en haut) ou uniquement sur un bloc spécifique.

# Texte standard

Ce paragraphe est affiché normalement, sur une seule colonne, car il ne possède aucune annotation de layout. La lecture est linéaire de gauche à droite sur toute la largeur de la page.

# Affichage en colonnes

Ce bloc de texte, quant à lui, est divisé en deux colonnes distinctes. C'est particulièrement pratique pour les longues listes, les énumérations ou pour comparer deux idées côte à côte. Typst se charge d'équilibrer automatiquement le texte entre la colonne de gauche et la colonne de droite.
Vous pouvez également utiliser 3 colonnes ou plus, selon vos besoins.
:layout columns 2

# Retour à la normale

Le texte redevient normal ici, car l'annotation `:layout columns 2` ne s'appliquait qu'au paragraphe précédent !

## Exemple de liste sur 3 colonnes

- Pommes
- Poires
- Bananes
- Fraises
- Kiwis
- Oranges
- Mangues
- Raisins
- Cerises
:layout columns 3
