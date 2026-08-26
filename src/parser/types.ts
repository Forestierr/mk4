import type { Node, Parent } from 'unist';
import type {
    Root, Heading, Paragraph, Text, Strong, Emphasis,
    InlineCode, Image, Link, List, ListItem, Blockquote,
    Code, Table, ThematicBreak, Delete,
} from 'mdast';

/**
 * Annotations MK4 attachees a un noeud AST via `node.data.typstAnnotations`.
 * Represente toutes les cles `:key value` reconnues par l extension.
 */
export interface TypstAnnotations {
    // Cles universelles
    id?: string;
    align?: string;
    layout?: string;
    // Images
    width?: string;
    caption?: string;
    // Titres
    short?: string;
    numbering?: string | boolean;
    // Blocs de code
    lines?: string | boolean;
    highlight?: string | number;
    filename?: string;
    // Tableaux
    compact?: string | boolean;
    // Citations
    type?: string;
    author?: string;
    link?: string;
    source?: string;
    // Document
    theme?: string;
    title?: string;
    subtitle?: string;
    date?: string;
    lang?: string;
    toc?: string | boolean;
    // Multi-fichiers & Bibliographie
    include?: string;         // clé reconnue mais traitée en pré-processeur (non transmise à Typst)
    bibliography?: string;    // chemin vers le fichier .bib
    'bib-style'?: string;     // style de citation : ieee, apa, chicago, mla, vancouver
    [key: string]: string | boolean | number | undefined;
}

/** Structure du champ `data` pour les noeuds enrichis par MK4 */
export interface MK4NodeData {
    typstAnnotations?: TypstAnnotations;
    [key: string]: unknown;
}

/**
 * Noeud math inline - ajoute par remark-math, non couvert par @types/mdast.
 * Exemple : `$x^2$`
 */
export interface MathInlineNode extends Node {
    type: 'inlineMath';
    value: string;
}

/**
 * Noeud math bloc - ajoute par remark-math, non couvert par @types/mdast.
 */
export interface MathBlockNode extends Node {
    type: 'math';
    value: string;
}

/**
 * Reference a une note de bas de page - ajoute par remark-footnotes.
 */
export interface FootnoteReferenceNode extends Node {
    type: 'footnoteReference';
    identifier: string;
}

/**
 * Definition d une note de bas de page - ajoute par remark-footnotes.
 */
export interface FootnoteDefinitionNode extends Parent {
    type: 'footnoteDefinition';
    identifier: string;
}

/**
 * Extension de ListItem avec la propriete interne `_mk4Ordered`
 * injectee par le traitement des listes ordonnees.
 */
export interface MK4ListItem extends ListItem {
    _mk4Ordered?: boolean;
    checked?: boolean | null;
}

/**
 * Union de tous les types de noeuds AST traites par le stringifier MK4.
 */
export type MK4Node =
    | Root
    | Heading
    | Paragraph
    | Text
    | Strong
    | Emphasis
    | Delete
    | InlineCode
    | Image
    | Link
    | List
    | MK4ListItem
    | Blockquote
    | Code
    | Table
    | ThematicBreak
    | MathInlineNode
    | MathBlockNode
    | FootnoteReferenceNode
    | FootnoteDefinitionNode;

/**
 * Noeud MK4 avec le champ `data` potentiellement enrichi par les annotations.
 * C est le type de base du parametre `node` dans `stringifyToTypst`.
 */
export type MK4NodeWithData = MK4Node & { data?: MK4NodeData };
