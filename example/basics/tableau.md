# Tableau

> : Annotations pour les tableaux \\ \\
> id \\
> caption \\
> compact \\
:type info

# Basic

| column  1 | column 2 | column 3 |
| :--- | :---: | ---: |
| 1 | 2 | 3 |
| 4 | 5 | 6 |

:id tab1
:caption Tableau 1

> \\ Pour les tableaux il faut obligatoirement une ligne d'espace entre le tableau et les annotations
> ```markdown
> | x | y | z |
> _ligne vide_
> :anotation
> ```
> Sinon les annotations seront visibles dans le tableau et ne serront pas prise en compte.
:type warning

# Position

| column  1 | column 2 | column 3 |
| :--- | :---: | ---: |
| 1 | 2 | 3 |
| 4 | 5 | 6 |

:align left

---

| column  1 | column 2 | column 3 |
| :--- | :---: | ---: |
| 1 | 2 | 3 |
| 4 | 5 | 6 |

:align center

---

| column  1 | column 2 | column 3 |
| :--- | :---: | ---: |
| 1 | 2 | 3 |
| 4 | 5 | 6 |

:align right

# Compact

| Composant   | Fréquence (MHz) | Tension (V) |
| :---------- | :-------------: | ----------: |
| CPU         | 2400            | 1.25        |
| RAM         | 3200            | 1.35        |
| GPU         | 1800            | 1.10        |

:caption Tableau sans le compact

---

| Composant   | Fréquence (MHz) | Tension (V) |
| :---------- | :-------------: | ----------: |
| CPU         | 2400            | 1.25        |
| RAM         | 3200            | 1.35        |
| GPU         | 1800            | 1.10        |

:compact true
:caption Tableau avec le compact