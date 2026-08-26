import visit from 'unist-util-visit';
import type { MK4NodeData } from './types';

const DOCUMENT_ONLY_KEYS = new Set([
    'theme', 'title', 'subtitle', 'author', 'date',
    'lang', 'toc', 'bibliography', 'biblio', 'bib-style', 'bibStyle',
]);

/**
 * Plugin remark : extrait les annotations `:key value` qui suivent un bloc
 * et les attache au nœud parent sous `node.data.typstAnnotations`.
 */
export function remarkTypstAnnotations() {
    return (tree: any) => {
        visit(tree, 'paragraph', (node: any, index: number | undefined, parent: any) => {
            if (!node.children || node.children.length === 0) {
                return;
            }

            // On regarde le TOUT DERNIER élément du paragraphe
            const lastChild = node.children[node.children.length - 1];

            if (lastChild.type === 'text') {
                const lines = lastChild.value.split('\n');
                const annotations: Record<string, string | boolean> = {};
                let i = lines.length - 1;

                // On remonte les lignes depuis la fin pour trouver les :annotations
                while (i >= 0) {
                    const trimmed = lines[i].trim();
                    if (trimmed === '') {
                        i--;
                        continue;
                    }
                    if (trimmed.startsWith(':')) {
                        const spaceIdx = trimmed.indexOf(' ');
                        let key = '';
                        let value: string | boolean = true;
                        if (spaceIdx !== -1) {
                            key = trimmed.substring(1, spaceIdx).trim();
                            value = trimmed.substring(spaceIdx + 1).trim();
                        } else {
                            key = trimmed.substring(1).trim();
                        }
                        if (key.endsWith(':')) {
                            key = key.slice(0, -1);
                        }
                        if (key) {
                            annotations[key] = value;
                        }
                        i--;
                    } else {
                        break; // Fin des annotations
                    }
                }

                // Si on a trouvé des annotations à la fin de ce bloc
                if (Object.keys(annotations).length > 0) {
                    const cleanText = lines.slice(0, i + 1).join('\n').trimEnd();
                    lastChild.value = cleanText;

                    // Est-ce que ce paragraphe n'était QUE des annotations ?
                    const isEntirelyAnnotations = node.children.length === 1 && cleanText === '';

                    if (isEntirelyAnnotations) {
                        // Premier bloc du document : toutes les annotations vont à la racine
                        if (parent && parent.type === 'root' && index === 0) {
                            tree.data = tree.data || {};
                            tree.data.typstAnnotations = { ...(tree.data.typstAnnotations || {}), ...annotations };
                        } else {
                            // Séparer les annotations strictement document des annotations de bloc
                            const docAnnotations: Record<string, string | boolean> = {};
                            const blockAnnotations: Record<string, string | boolean> = {};

                            for (const [k, v] of Object.entries(annotations)) {
                                if (DOCUMENT_ONLY_KEYS.has(k)) {
                                    docAnnotations[k] = v;
                                } else {
                                    blockAnnotations[k] = v;
                                }
                            }

                            // Les annotations strictement document vont à la racine de l'AST
                            if (Object.keys(docAnnotations).length > 0) {
                                tree.data = tree.data || {};
                                tree.data.typstAnnotations = { ...(tree.data.typstAnnotations || {}), ...docAnnotations };
                            }

                            // On donne les annotations de bloc au bloc du dessus
                            if (parent && index !== undefined && index > 0 && Object.keys(blockAnnotations).length > 0) {
                                const prevNode = parent.children[index - 1] as { data?: MK4NodeData };
                                prevNode.data = prevNode.data || {};
                                prevNode.data.typstAnnotations = { ...(prevNode.data.typstAnnotations || {}), ...blockAnnotations };
                            }
                        }

                        // On supprime ce paragraphe vide
                        parent.children.splice(index, 1);
                        return index;
                    } else {
                        // On les garde pour ce paragraphe (ex: une image suivie de ses annotations)
                        const nodeTyped = node as { data?: MK4NodeData; children: unknown[] };
                        nodeTyped.data = nodeTyped.data || {};
                        nodeTyped.data.typstAnnotations = { ...(nodeTyped.data.typstAnnotations || {}), ...annotations };

                        // Si le texte est devenu vide, on le supprime de l'arbre
                        if (cleanText === '') {
                            node.children.pop();
                        }
                    }
                }
            }
        });

        // Extraction des annotations collées directement sous un tableau (sans ligne vide)
        visit(tree, 'table', (node: any) => {
            if (!node.children || node.children.length === 0) {
                return;
            }
            const annotations: Record<string, string | boolean> = {};
            while (node.children.length > 0) {
                const lastRow = node.children[node.children.length - 1];
                if (lastRow.type === 'tableRow' && lastRow.children) {
                    let allAnnotations = true;
                    const rowAnns: Record<string, string | boolean> = {};
                    for (const cell of lastRow.children) {
                        if (cell.type === 'tableCell' && cell.children && cell.children.length === 1 && cell.children[0].type === 'text') {
                            const text = cell.children[0].value.trim();
                            if (text.startsWith(':')) {
                                const spaceIdx = text.indexOf(' ');
                                if (spaceIdx !== -1) {
                                    rowAnns[text.substring(1, spaceIdx)] = text.substring(spaceIdx + 1).trim();
                                } else {
                                    rowAnns[text.substring(1)] = true;
                                }
                            } else {
                                allAnnotations = false;
                                break;
                            }
                        } else {
                            allAnnotations = false;
                            break;
                        }
                    }
                    if (allAnnotations && Object.keys(rowAnns).length > 0) {
                        Object.assign(annotations, rowAnns);
                        node.children.pop();
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            if (Object.keys(annotations).length > 0) {
                node.data = node.data || {};
                node.data.typstAnnotations = { ...(node.data.typstAnnotations || {}), ...annotations };
            }
        });
    };
}

/**
 * Plugin remark : transforme les annotations stockées en `node.data.typstAnnotations`
 * en badges HTML visibles dans la preview Markdown.
 */
export function remarkHtmlAnnotations() {
    return (tree: any) => {
        visit(tree, (node: any) => {
            const typedNode = node as { data?: MK4NodeData; children?: unknown[]; type: string };
            const anns = typedNode.data?.typstAnnotations;
            if (anns && Object.keys(anns).length > 0) {
                // Création des badges HTML pour chaque annotation
                const badgesHtml = Object.entries(anns)
                    .map(([k, v]) => `<span class="mk4-badge">:${k}${v === true ? '' : ' ' + v}</span>`)
                    .join(' ');

                // On injecte ces badges à la fin de l'élément (titre, image, paragraphe...)
                // On évite les éléments stricts (list, table, tableRow, etc.)
                const strictNodes = ['list', 'table', 'tableRow', 'math', 'code'];
                if (typedNode.children && !strictNodes.includes(typedNode.type)) {
                    (typedNode.children as unknown[]).push({
                        type: 'html',
                        value: ` <span class="mk4-badges-container">${badgesHtml}</span>`
                    });
                }
            }
        });
    };
}
