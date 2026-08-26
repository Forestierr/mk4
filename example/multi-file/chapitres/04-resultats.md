# Résultats Expérimentaux
:id sec_resultats

## Protocole d'évaluation
:id sec_protocole

Les expériences ont été conduites sur un cluster de **32 nœuds** (Intel Xeon E5-2690, 64 Go RAM) interconnectés par un réseau 10 GbE. Trois scénarios de charge ont été évalués :

- **Scénario A** — Charge légère : 100 agents, taux de requêtes 50 req/s.
- **Scénario B** — Charge nominale : 500 agents, taux de requêtes 500 req/s.
- **Scénario C** — Charge extrême : 2 000 agents, taux de requêtes 5 000 req/s.

## Métriques de performance
:id sec_metriques

| Scénario | Agents | Latence médiane | Latence P99 | Débit (req/s) | Taux d'erreur |
| :--- | :---: | :---: | :---: | :---: | :---: |
| A — Léger | 100 | 2,1 ms | 8,4 ms | 50 | < 0,01 % |
| B — Nominal | 500 | 5,7 ms | 21,3 ms | 498 | 0,02 % |
| C — Extrême | 2 000 | 18,2 ms | 67,1 ms | 4 823 | 0,31 % |
:caption Synthèse des performances mesurées sur les trois scénarios de charge
:compact true
:id tbl_resultats

Comme le montre le @tbl_resultats, la latence P99 reste inférieure à **70 ms** même en charge extrême, ce qui satisfait la contrainte métier de 100 ms définie en @sec_problematique.

## Comportement face aux fautes byzantines
:id sec_fautes

Avec $f = 3$ agents byzantins injectés (sur $n = 10$ participants), le protocole PBFT adapté converge systématiquement vers le consensus en **moins de 4 tours de messages**, conformément à la borne théorique établie en @sec_consensus.

> Aucune perte de cohérence des données n'a été observée lors des 1 000 injections de fautes byzantines réalisées sur 72 heures de test continu.
:type tip

:layout pagebreak
