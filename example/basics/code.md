# Code

> : Annotations pour le code \\ \\
> id \\
> caption \\
> line [true, false] \\
> filename \\
> highlight \\
:type info

# Basic

```python
print("Hello, World!")
x = x + 1
```
:id hello_world
:caption Hello world en python
:filename filename.py

Référencement du code : @hello_world .

# Alignement

```python
print("Hello, World!")
```
:align left

---

```python
print("Hello, World!")
```
:align center

---

```python
print("Hello, World!")
```
:align right

# Numéro de ligne

```python
print("Hello, World!")
print("Hello, World!")
print("Hello, World!")
```
:lines true
:caption Code avec numérotation des lignes

# Higlight

```python
print("Hello, World!")
print("Hello, World!")
print("Hello, World!")
```
:lines true
:highlight 2
:caption Code avec la ligne numéro 2 en évidence.

---

```python
print("Hello, World 1")
print("Hello, World 2")
print("Hello, World 3")
print("Hello, World 4")
```
:lines true
:highlight 2-3
:caption Code avec la ligne numéro 2-3 en évidence.

---

```python
print("Hello, World 1")
print("Hello, World 2")
print("Hello, World 3")
print("Hello, World 4")
```
:lines true
:highlight 1, 3
:caption Code avec la ligne numéro 1 et 3 (1, 3) en évidence.

---

```python
print("Hello, World 1")
print("Hello, World 2")
print("Hello, World 3")
print("Hello, World 4")
```
:lines true
:highlight -3
:caption Code avec les ligne jusqu'a 3 misent en évidence (-3).