# Conclusion et Perspectives
:id sec_conclusion

## Synthèse des contributions

Ce rapport a présenté une architecture SMA originale répondant aux limites identifiées dans l'@sec_etat_art :

- Un modèle d'agent formel (@eq_agent) et son algorithme de délibération (@code_bdi) garantissent un comportement prévisible et testable.
- Le protocole de consensus tolérant aux byzantins assure la cohérence des données en présence de nœuds défaillants.
- Les résultats expérimentaux du @tbl_resultats démontrent le passage à l'échelle jusqu'à 2 000 agents avec une latence P99 inférieure à 70 ms.

## Perspectives
:id sec_perspectives

Trois axes d'amélioration sont envisagés pour les travaux futurs :

1. **Apprentissage par renforcement décentralisé** : remplacer la fonction de priorité heuristique par un modèle appris pour améliorer l'adaptation dynamique.
2. **Déploiement sur architecture hétérogène** : tester le système sur des nœuds ARM et RISC-V pour valider la portabilité.
3. **Intégration du protocole Gossip** : réduire la complexité de communication du consensus de $O(n^2)$ à $O(n log n)$ par diffusion épidémique.

> L'ensemble du code source, des jeux de données et des scripts de reproduction des expériences est disponible en accès libre sur GitHub.
:type note
