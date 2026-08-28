:title Exemple d'orientation
:subtitle Utilisation de :layout landscape et portrait
:author MK4
:date 2026

# Introduction

Par défaut, le document s'affiche en format portrait. L'annotation `:layout landscape` permet de basculer en mode paysage.

# Tableau très large

Parfois, on a besoin d'insérer un tableau avec beaucoup de colonnes, qui déborderait sur une page portrait classique.
En utilisant `:layout landscape` sur le tableau, on force MK4/Typst à l'isoler sur une page dédiée en format paysage !

| ID | Nom du client | Adresse e-mail | Téléphone | Date de création | Dernière commande | Statut du compte | Remarques complémentaires |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1001 | Alice Dupont | alice.dupont@email.com | +33 6 12 34 56 78 | 12/03/2024 | 01/08/2026 | Actif | Client Premium, livraison prioritaire. |
| 1002 | Bob Martin | b.martin@entreprise.com | +33 7 98 76 54 32 | 05/11/2025 | 15/07/2026 | Inactif | En attente de renouvellement d'abonnement. |
| 1003 | Chloé Leroy | chloe.l@domaine.fr | +33 6 11 22 33 44 | 22/01/2026 | 28/08/2026 | Actif | Nouveau client, utiliser le code de bienvenue. |
| 1004 | David Dubois | david.dubois@mail.net | +33 7 55 44 33 22 | 30/09/2023 | 10/12/2025 | Suspendu | Problème de facturation non résolue depuis janvier. |
:layout landscape

# Retour au format portrait

Le document reprend ensuite son cours normal en format portrait, car l'annotation `:layout landscape` était appliquée uniquement au tableau précédent !
