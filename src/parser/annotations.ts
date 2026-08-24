import visit from 'unist-util-visit';
import type { MK4NodeData } from './types';

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
                        if (spaceIdx !== -1) {
                            annotations[trimmed.substring(1, spaceIdx)] = trimmed.substring(spaceIdx + 1).trim();
                        } else {
                            annotations[trimmed.substring(1)] = true;
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
                        // On les donne au bloc du dessus (ex: un bloc de code juste avant)
                        if (parent && index !== undefined && index > 0) {
                            const prevNode = parent.children[index - 1] as { data?: MK4NodeData };
                            prevNode.data = prevNode.data || {};
                            prevNode.data.typstAnnotations = { ...(prevNode.data.typstAnnotations || {}), ...annotations };
                        }
                        // Premier bloc, annotation du document
                        else if (parent && parent.type === 'root' && index === 0) {
                            const parentTyped = parent as { data?: MK4NodeData; type: string };
                            parentTyped.data = parentTyped.data || {};
                            parentTyped.data.typstAnnotations = { ...(parentTyped.data.typstAnnotations || {}), ...annotations };
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
    };
}

/**
 * Plugin remark : transforme les annotations stockées en `node.data.typstAnnotations`
 * en badges HTML visibles dans la preview Markdown.
 */
export function remarkHtmlAnnotations() {
    return (tree: any) => {
        visit(tree, (node: any) => {
            const typedNode = node as { data?: MK4NodeData; children?: unknown[] };
            const anns = typedNode.data?.typstAnnotations;
            if (anns && Object.keys(anns).length > 0) {
                // Création des badges HTML pour chaque annotation
                const badgesHtml = Object.entries(anns)
                    .map(([k, v]) => `<span class="mk4-badge">:${k}${v === true ? '' : ' ' + v}</span>`)
                    .join(' ');

                // On injecte ces badges à la fin de l'élément (titre, image, paragraphe...)
                if (typedNode.children) {
                    (typedNode.children as unknown[]).push({
                        type: 'html',
                        value: ` <span class="mk4-badges-container">${badgesHtml}</span>`
                    });
                }
            }
        });
    };
}
