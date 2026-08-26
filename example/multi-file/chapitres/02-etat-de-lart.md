# État de l'Art
:id sec_etat_art
:short État de l'art

## Modèles d'agents existants
:id sec_modeles

Trois grandes familles de modèles dominent la littérature actuelle :

| Modèle | Paradigme | Complexité de coordination | Cas d'usage typique |
| :--- | :---: | :---: | :--- |
| BDI (Belief-Desire-Intention) | Délibératif | Élevée | Planification autonome |
| Réactif (subsomption) | Réactif pur | Faible | Robotique comportementale |
| Hybride | Mixte | Moyenne | Systèmes industriels |
:caption Comparaison des principaux modèles d'agents
:id tbl_modeles

## Protocoles de coordination

Les protocoles les plus répandus pour la coordination inter-agents sont le **Contract Net Protocol** (CNP) et ses extensions hiérarchiques. Le CNP définit un cycle en trois phases :

1. **Annonce** (*Call for Proposal*) : le manager diffuse une tâche avec ses contraintes.
2. **Soumission** (*Propose*) : les agents contractants soumettent leurs offres.
3. **Attribution** (*Award*) : le manager sélectionne la meilleure offre et notifie les participants.

> La complexité de la phase d'attribution est $O(n \log n)$ avec $n$ agents contractants, ce qui reste acceptable jusqu'à $n \approx 10^4$ nœuds sur du matériel standard.
:type info

## Limites des approches existantes
:id sec_limites

Les travaux recensés présentent deux lacunes majeures :

- Absence de tolérance aux **nœuds byzantins** (agents malveillants ou défaillants partiellement).
- Évaluation limitée à des **simulateurs** sans confrontation à des charges de production réelles.

Notre contribution adresse directement ces deux points (voir @sec_architecture).

:layout pagebreak
