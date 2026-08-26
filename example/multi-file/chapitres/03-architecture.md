# Architecture du Système
:id sec_architecture

## Vue d'ensemble
:id sec_vue_ensemble

L'architecture proposée repose sur trois couches hiérarchiques :

- **Couche perception** : capteurs et agrégateurs de données brutes.
- **Couche décision** : agents BDI avec mémoire d'état locale.
- **Couche coordination** : protocole de consensus distribué.

## Modèle formel de l'agent
:id sec_modele_formel

Chaque agent $a_i$ est défini par le quadruplet $(B_i, D_i, I_i, pi_i)$ où :

$$
B_i subset.eq cal(W), quad D_i subset.eq 2^(cal(W)), quad I_i in Pi, quad pi_i : B_i times D_i -> I_i
$$
:id eq_agent
:align center

La fonction de planification $\pi_i$ est calculée à chaque cycle de délibération selon l'algorithme suivant :

```python
def deliberate(beliefs: set, desires: set, intentions: list) -> list:
    """Cycle de délibération BDI standard."""
    # 1. Filtrage des désirs accessibles depuis les croyances actuelles
    achievable = [d for d in desires if is_achievable(d, beliefs)]

    # 2. Sélection de l'intention prioritaire (heuristique gloutonne)
    if achievable:
        top_desire = max(achievable, key=lambda d: priority(d, beliefs))
        intentions = [plan_for(top_desire, beliefs)]

    # 3. Exécution d'une étape du plan courant
    if intentions:
        action = intentions[0].next_action()
        beliefs = execute(action, beliefs)

    return intentions
```
:filename agent_bdi.py
:lines true
:highlight 6-7,12-13
:caption Algorithme de délibération BDI — sélection et exécution d'intention
:id code_bdi

## Protocole de consensus tolérant aux byzantins
:id sec_consensus

Le protocole implémente une variante de **PBFT** (Practical Byzantine Fault Tolerance) adaptée aux contraintes de latence des SMA industriels. La propriété de sûreté garantit qu'avec $f$ agents byzantins, le consensus est atteint dès lors que $n \geq 3f + 1$ agents participent.

> Le seuil $n \geq 3f + 1$ est une borne inférieure théoriquement optimale : aucun protocole déterministe ne peut tolérer davantage de fautes byzantines avec moins d'agents.
:type warning

:layout pagebreak
