# Introduction
:id sec_introduction

Les **systèmes multi-agents** (SMA) constituent un paradigme de l'intelligence artificielle distribuée dans lequel un ensemble d'entités autonomes — appelées *agents* — interagissent dans un environnement partagé pour résoudre des problèmes complexes qu'aucun agent ne pourrait résoudre seul.

> Ce rapport présente la conception, l'implémentation et l'évaluation d'un SMA pour la coordination de ressources distribuées en environnement incertain.
:type note

## Problématique et motivations
:id sec_problematique

Les systèmes centralisés atteignent rapidement leurs limites face à trois contraintes fondamentales :

- **Passage à l'échelle** : un coordinateur central devient un goulot d'étranglement au-delà de quelques centaines de nœuds.
- **Tolérance aux pannes** : la défaillance du coordinateur central met hors service l'ensemble du système.
- **Adaptabilité** : les environnements dynamiques exigent des reconfigurations rapides incompatibles avec une architecture monolithique.

Les SMA répondent à ces trois enjeux grâce à leur nature décentralisée et leur capacité d'adaptation locale.

## Périmètre et contributions

Ce rapport apporte les contributions suivantes :

- Une architecture d'agent modulaire avec protocole de négociation formalisé.
- Un algorithme de consensus distribué tolérant aux nœuds byzantins.
- Une évaluation sur banc d'essai reproduisant des conditions de production réelles.

:layout pagebreak
