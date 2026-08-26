:title Intelligence Artificielle Distribuée : Une Revue Critique
:subtitle Fondements théoriques et applications industrielles récentes
:author Robin Forestier
:date Août 2026
:lang fr
:numbering 1.1
:toc true
:bibliography ./references.bib
:bib-style ieee

# Introduction

Les systèmes d'intelligence artificielle distribuée (IAD) ont connu une expansion remarquable depuis les travaux fondateurs de Hewitt @hewitt1977 sur les acteurs, et ceux de Minsky @minsky1986 sur la société de l'esprit. Aujourd'hui, ces paradigmes sous-tendent des infrastructures critiques allant de la gestion de réseaux électriques intelligents à la coordination de flottes de véhicules autonomes.

> Ce document est une revue bibliographique illustrant l'utilisation de la fonctionnalité `:bibliography` de MK4. Les citations dans le texte utilisent la syntaxe Typst `@cle_citation`.
:type note

## Portée de la revue

Cette revue couvre la période 1977–2024, avec un accent particulier sur les contributions ayant eu un impact mesurable (indice H > 50) selon les bases de données Scopus et Web of Science.

:layout pagebreak

# Fondements Théoriques
:id sec_fondements

## Le modèle Acteur
:id sec_acteur

Le modèle acteur, introduit par Hewitt et al. @hewitt1977, postule que l'acteur est l'unité primitive de calcul concurrent. Chaque acteur :

- Possède une **boîte aux lettres** pour la réception de messages asynchrones.
- Maintient un **état local** inaccessible aux autres acteurs.
- Peut créer de nouveaux acteurs, envoyer des messages et définir son comportement futur.

Ce modèle a directement inspiré l'architecture des agents dans les SMA modernes @wooldridge2009.

## Coordination et protocoles de négociation
:id sec_coordination

Smith @smith1980 a formalisé le **Contract Net Protocol** (CNP), premier protocole de coordination multi-agents à avoir trouvé une adoption industrielle significative. Le CNP structure la délibération distribuée autour d'un marché de tâches où des gestionnaires (*managers*) publient des contrats et des contractants (*bidders*) soumettent des offres.

| Propriété | CNP original | Extensions hiérarchiques |
| :--- | :---: | :---: |
| Tolérance aux pannes | Aucune | Partielle |
| Passage à l'échelle | $O(n^2)$ messages | $O(n \log n)$ messages |
| Optimalité de l'allocation | Non garantie | Garantie locale |
:caption Comparaison CNP original vs extensions — d'après @wooldridge2009
:compact true
:id tbl_cnp

:layout pagebreak

# Algorithmes de Consensus Distribué
:id sec_consensus

## PBFT et ses variantes

Le problème des **généraux byzantins**, formalisé par Lamport et al. @lamport1982, constitue le fondement théorique de tout protocole de consensus tolérant aux fautes arbitraires. La borne optimale $n \geq 3f + 1$ pour tolérer $f$ fautes byzantines reste infranchissable pour les algorithmes déterministes.

Castro et Liskov @castro1999 ont proposé l'algorithme **PBFT** (Practical Byzantine Fault Tolerance), première implémentation efficace du consensus byzantin avec une complexité de message de $O(n^2)$ par phase. PBFT a depuis été déployé dans des systèmes de registres distribués à haute valeur.

> La complexité $O(n^2)$ de PBFT devient prohibitive au-delà de quelques centaines de nœuds. Les protocoles de la famille HotStuff @yin2019 réduisent cette complexité à $O(n)$ au prix d'hypothèses plus fortes sur la synchronie du réseau.
:type warning

## Applications récentes
:id sec_applications

Les consensus distribués trouvent aujourd'hui des applications dans :

1. **Registres de données médicales** : partage sécurisé et auditable de dossiers patients entre établissements @zhang2020.
2. **Réseaux électriques intelligents** : coordination des prosommateurs et équilibrage de charge temps réel.
3. **Chaînes logistiques** : traçabilité bout-en-bout des produits pharmaceutiques @nakamoto2008.

:layout pagebreak

# Discussion et Perspectives
:id sec_discussion

## Lacunes identifiées

La littérature recensée présente trois lacunes récurrentes :

- **Évaluations en conditions réelles** : la majorité des travaux @wooldridge2009 @lamport1982 s'appuient sur des simulations ou des environnements de laboratoire fortement simplifiés.
- **Interopérabilité** : peu de travaux adressent la communication entre SMA hétérogènes développés avec des cadres (*frameworks*) différents.
- **Consommation énergétique** : les protocoles de consensus intensifs en messages @castro1999 présentent une empreinte énergétique rarement mesurée dans les publications.

## Directions futures

Les recherches futures devraient s'orienter vers :

- Le **consensus asynchrone** probabiliste pour les environnements à connectivité intermittente.
- L'**apprentissage fédéré** comme alternative décentralisée à l'IA centralisée, en prolongeant les travaux de @minsky1986 sur les sociétés cognitives distribuées.
- La **vérification formelle** des protocoles de négociation à l'aide d'outils comme TLA+ ou Isabelle/HOL.

# Conclusion

Cette revue a parcouru cinq décennies de recherche en IAD, des acteurs de Hewitt @hewitt1977 aux protocoles de consensus modernes @yin2019. La richesse et la maturité de ce domaine contrastent avec l'absence de standards industriels ouverts, qui reste le principal frein à son adoption large dans des systèmes critiques.
