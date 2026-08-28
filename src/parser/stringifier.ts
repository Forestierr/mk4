import type { Heading, Paragraph, Image, Link, List, Blockquote, Code, Table } from 'mdast';
import type {
    TypstAnnotations, MK4NodeWithData, MK4NodeData,
    MK4ListItem, FootnoteReferenceNode, FootnoteDefinitionNode,
} from './types';

/**
 * Convertit récursivement un nœud de l'AST remark en code Typst.
 */
export function stringifyToTypst(node: MK4NodeWithData, baseDir: string, footnotes?: Map<string, string>): string {
    const ann: TypstAnnotations = node.data?.typstAnnotations ?? {};
    let result = '';

    switch (node.type) {
        case 'root': {
            let setup = '';
            setup += `#let in_outline = state("in_outline", false)\n`;
            setup += `#show outline: it => { in_outline.update(true); it; in_outline.update(false) }\n\n`;

            // Collecter les définitions de notes de bas de page
            const footnoteMap = new Map<string, string>();
            for (const child of (node.children || [])) {
                const childNode = child as unknown as FootnoteDefinitionNode & { data?: MK4NodeData };
                if (childNode.type === 'footnoteDefinition') {
                    const fnContent = (childNode.children || [])
                        .map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnoteMap)).join('');
                    footnoteMap.set(childNode.identifier, fnContent);
                }
            }

            result = setup + (node.children || [])
                .filter((n) => (n as unknown as { type: string }).type !== 'footnoteDefinition')
                .map((n) => {
                    const childNode = n as unknown as MK4NodeWithData & { position?: { start: { line: number } } };
                    let childResult = stringifyToTypst(childNode, baseDir, footnoteMap);
                    // Injecter un marqueur de position pour chaque bloc de premier niveau
                    if (childNode.position && childNode.position.start) {
                        childResult = `#metadata("${childNode.position.start.line}") <mk4_loc>\n` + childResult;
                    }
                    return childResult;
                }).join('\n\n');
            break;
        }

        case 'heading': {
            const hNode = node as unknown as Heading & { data?: MK4NodeData };
            const title = hNode.children.map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes)).join('');

            let headingCode = `#heading(level: ${hNode.depth}`;
            if (ann.numbering === 'false' || ann.numbering === false) {
                headingCode += `, numbering: none`;
            }

            if (ann.short) {
                // Si Typst dessine l'outline, on donne le short, sinon on donne le long
                headingCode += `)[#context if in_outline.get() [${ann.short}] else [${title}]]`;
            } else {
                headingCode += `)[${title}]`;
            }

            if (ann.id) {
                headingCode += ` <${ann.id}>`;
            }
            if (ann.align) {
                headingCode = `#align(${ann.align})[${headingCode}]`;
            }

            result = headingCode;
            break;
        }

        case 'paragraph': {
            const pNode = node as unknown as Paragraph & { data?: MK4NodeData };
            if (pNode.children?.length === 1 && pNode.children[0].type === 'image') {
                const imgNode = pNode.children[0] as unknown as Image;
                let imgCode = `image("${imgNode.url}"`;
                if (ann.width) {
                    imgCode += `, width: ${ann.width}`;
                }
                imgCode += `)`;

                if (ann.caption) {
                    imgCode = `figure(\n  ${imgCode},\n  caption: [${ann.caption}]\n)`;
                }

                let pResult = `#${imgCode}`;
                if (ann.id) {
                    pResult += ` <${ann.id}>`;
                }
                if (ann.align) {
                    pResult = `#align(${ann.align})[\n  ${pResult}\n]`;
                }

                result = pResult;
                break;
            }

            let text = pNode.children.map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes)).join('');
            if (ann.id) {
                text += ` <${ann.id}>`;
            }
            if (ann.align) {
                text = `#align(${ann.align})[${text}]`;
            }
            result = text;
            break;
        }

        case 'text': {
            // On échappe le '@' s'il est précédé d'une lettre, chiffre, point ou tiret (ex: adresses email)
            // afin d'éviter que Typst ne le considère comme une référence croisée.
            result = node.value.replace(/([a-zA-Z0-9_À-ÿ\.\-])@/g, '$1\\@');
            break;
        }

        case 'strong': {
            const inner = (node.children || []).map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes)).join('');
            result = `*${inner}*`;
            break;
        }

        case 'emphasis': {
            const inner = (node.children || []).map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes)).join('');
            result = `_${inner}_`;
            break;
        }

        case 'delete': {
            const inner = (node.children || []).map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes)).join('');
            result = `#strike[${inner}]`;
            break;
        }

        case 'inlineCode': {
            result = `\`${node.value}\``;
            break;
        }

        case 'image': {
            result = `#image("${(node as unknown as Image).url}")`;
            break;
        }

        case 'link': {
            const linkNode = node as unknown as Link & { data?: MK4NodeData };
            const linkText = linkNode.children.map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes)).join('');
            result = `#link("${linkNode.url}")[${linkText}]`;
            break;
        }

        case 'list': {
            const listNode = node as unknown as List & { data?: MK4NodeData };
            const items = listNode.children.map((listItem) => {
                const item = listItem as unknown as MK4ListItem & { data?: MK4NodeData };
                item._mk4Ordered = listNode.ordered ?? false;
                return stringifyToTypst(item, baseDir, footnotes);
            }).join('\n');
            result = items;
            break;
        }

        case 'listItem': {
            const liNode = node as unknown as MK4ListItem & { data?: MK4NodeData };
            const children = liNode.children || [];
            const textParts: string[] = [];
            const nestedParts: string[] = [];

            for (const child of children) {
                if (child.type === 'list') {
                    const nested = stringifyToTypst(child as unknown as MK4NodeWithData, baseDir, footnotes);
                    nestedParts.push(nested.split('\n').map((line: string) => '  ' + line).join('\n'));
                } else {
                    textParts.push(stringifyToTypst(child as unknown as MK4NodeWithData, baseDir, footnotes));
                }
            }

            let content = textParts.join(' ').trim();
            const marker = liNode._mk4Ordered ? '+' : '-';

            // Détection et conversion propre des cases à cocher Markdown vers des boîtes Typst
            if (typeof liNode.checked === 'boolean') {
                const box = liNode.checked
                    ? `#box(width: 8pt, height: 8pt, stroke: 0.5pt, align(center)[#text(size: 6pt)[✓]])`
                    : `#box(width: 8pt, height: 8pt, stroke: 0.5pt)`;
                result = `${marker} ${box} ${content}`;
            } else if (content.startsWith('[ ]')) {
                result = `${marker} #box(width: 8pt, height: 8pt, stroke: 0.5pt) ${content.substring(3).trim()}`;
            } else if (content.startsWith('[x]') || content.startsWith('[X]')) {
                result = `${marker} #box(width: 8pt, height: 8pt, stroke: 0.5pt, align(center)[#text(size: 6pt)[✓]]) ${content.substring(3).trim()}`;
            } else if (content.startsWith('[/]')) {
                result = `${marker} #box(width: 8pt, height: 8pt, stroke: 0.5pt, fill: luma(200), align(center)[#text(size: 6pt)[/]]) ${content.substring(3).trim()}`;
            } else if (content.startsWith('[-]')) {
                result = `${marker} #box(width: 8pt, height: 8pt, stroke: 0.5pt, fill: luma(200)) ${content.substring(3).trim()}`;
            } else {
                result = `${marker} ${content}`;
            }

            if (nestedParts.length > 0) {
                result += '\n' + nestedParts.join('\n');
            }
            break;
        }

        case 'blockquote': {
            const bqNode = node as unknown as Blockquote & { data?: MK4NodeData };
            // On extrait uniquement le texte des paragraphes de la citation
            const text = bqNode.children.map((n) => {
                if (n.type === 'paragraph') {
                    const pNode = n as unknown as Paragraph & { data?: MK4NodeData };
                    return pNode.children.map((sub) => stringifyToTypst(sub as unknown as MK4NodeWithData, baseDir, footnotes)).join('');
                }
                return stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes);
            }).join('\n');

            const buildAdmonition = (title: string, fill: string, stroke: string) => {
                return `#rect(fill: ${fill}, stroke: ${stroke}, radius: 4pt, width: 100%, inset: 10pt)[\n  *${title}*\n  ${text}\n]`;
            };

            const type = ann.type ? String(ann.type).toLowerCase() : '';

            if (type === 'note') {
                result = buildAdmonition('Note', 'rgb("eef2ff")', 'rgb("3b82f6")');
            } else if (type === 'warning') {
                result = buildAdmonition('Attention', 'rgb("fffbeb")', 'rgb("f59e0b")');
            } else if (type === 'error') {
                result = buildAdmonition('Erreur', 'rgb("fef2f2")', 'rgb("ef4444")');
            } else if (type === 'tip') {
                result = buildAdmonition('Astuce', 'rgb("ecfdf5")', 'rgb("10b981")');
            } else if (type === 'info') {
                result = buildAdmonition('Information', 'rgb("ecfeff")', 'rgb("06b6d4")');
            } else {
                // Citation classique propre avec auteur et source
                let quoteOptions = 'block: true';
                const attributionParts: string[] = [];
                if (ann.author) {
                    attributionParts.push(String(ann.author));
                }
                const linkVal = ann.link || ann.source;
                if (linkVal) {
                    attributionParts.push(`#link("${linkVal}")[Source]`);
                }
                if (attributionParts.length > 0) {
                    quoteOptions += `, attribution: [${attributionParts.join(' — ')}]`;
                }
                result = `#quote(${quoteOptions})[${text}]`;
            }
            break;
        }

        case 'code': {
            const codeNode = node as unknown as Code & { data?: MK4NodeData };
            const lang = codeNode.lang ? codeNode.lang.toLowerCase() : '';
            const hasLines = ann.lines === 'true' || ann.lines === true;
            const hasHighlight = !!ann.highlight;

            // 1. Le bloc brut avec les sauts de ligne vitaux pour la coloration
            let codeBlock = `\n\`\`\`${lang}\n${codeNode.value}\n\`\`\`\n`;

            // 2. Numérotation et Surlignage combinés
            if (hasLines || hasHighlight) {
                let hlLinesStr = '()';
                if (hasHighlight) {
                    const hl: number[] = [];
                    const parts = String(ann.highlight).split(',');
                    for (let p of parts) {
                        p = p.trim();
                        const sep = p.includes('-') ? '-' : (p.includes(':') ? ':' : null);
                        if (sep) {
                            const [startStr, endStr] = p.split(sep);
                            const s = startStr === '' ? 1 : parseInt(startStr);
                            const e = parseInt(endStr);
                            if (!isNaN(s) && !isNaN(e)) {
                                for (let k = s; k <= e; k++) {
                                    hl.push(k);
                                }
                            }
                        } else {
                            const n = parseInt(p);
                            if (!isNaN(n)) {
                                hl.push(n);
                            }
                        }
                    }
                    hlLinesStr = `(${hl.join(', ')}${hl.length === 1 ? ',' : ''})`;
                }

                const cols = hasLines ? '(auto, 1fr)' : '(1fr,)';
                const gutter = hasLines ? '1em' : '0pt';
                let mapFunc = `((i, line)) => {\n      let ln = i + 1\n      let bg = if ln in hl_lines { rgb(255, 235, 50, 40%) } else { none }\n      let styled_line = block(width: 100%, fill: bg, inset: (x: 4pt, y: 1.5pt), radius: 2pt, line)\n      `;

                if (hasLines) {
                    mapFunc += `(align(right, text(fill: luma(150), size: 0.85em, str(ln))), styled_line)\n    }`;
                } else {
                    mapFunc += `(styled_line,)\n    }`;
                }

                codeBlock = `#block([\n  #let hl_lines = ${hlLinesStr}\n  #show raw.where(block: true): it => grid(\n    columns: ${cols},\n    gutter: ${gutter},\n    ..it.lines.enumerate().map(${mapFunc}).flatten()\n  )\n  ${codeBlock}\n])`;
            }

            // 3. Encadré avec le nom du fichier
            let finalCode = codeBlock;
            if (ann.filename) {
                finalCode = `#rect(fill: luma(250), stroke: luma(200), radius: 4pt, width: 100%, inset: 0pt)[\n  #rect(fill: luma(230), width: 100%, radius: (top: 4pt), inset: 6pt)[*${ann.filename}*]\n  #block(inset: 8pt, width: 100%)[\n    ${codeBlock}\n  ]\n]`;
            }

            // 4. Légende (Figure)
            if (ann.caption) {
                finalCode = `#figure(caption: [${ann.caption}])[${finalCode}]`;
            }

            // 5. Alignement global
            if (ann.align) {
                finalCode = `#align(${ann.align})[\n  #show figure.caption: set align(${ann.align})\n  ${finalCode}\n]`;
            }

            // 6. Identifiant Typst
            if (ann.id) {
                finalCode += ` <${ann.id}>`;
            }

            result = finalCode;
            break;
        }

        case 'table': {
            const tableNode = node as unknown as Table & { data?: MK4NodeData };
            const hasCompact = ann.compact === 'true' || ann.compact === true;

            // 1. Alignement des colonnes
            const aligns = (tableNode.align || []).map((a: string | null) => {
                if (a === 'center') { return 'center'; }
                if (a === 'right') { return 'right'; }
                return 'left';
            });
            const columnsDef = aligns.length > 0 ? `(${aligns.map(() => 'auto').join(', ')})` : 'auto';
            const alignDef = aligns.length > 0 ? `(${aligns.join(', ')})` : 'left';

            // 2. Construction des cellules Typst
            const cells: string[] = [];
            if (tableNode.children) {
                tableNode.children.forEach((row) => {
                    const rowNode = row as unknown as { children?: Array<{ children?: unknown[] }> };
                    if (rowNode.children) {
                        rowNode.children.forEach((cell) => {
                            const cellNode = cell as unknown as { children?: unknown[] };
                            const cellContent = (cellNode.children || []).map((n) => stringifyToTypst(n as unknown as MK4NodeWithData, baseDir, footnotes)).join('');
                            cells.push(`[${cellContent}]`);
                        });
                    }
                });
            }

            // 3. Configuration du tableau
            let tableArgs = `columns: ${columnsDef}, align: ${alignDef}`;
            if (hasCompact) {
                tableArgs += `, inset: (x: 0.4em, y: 0.3em)`;
            }

            let finalTable = `#table(${tableArgs},\n  ${cells.join(',\n  ')}\n)`;

            // 4. Réduction globale du texte si compact
            if (hasCompact) {
                finalTable = `#block([\n  #set text(size: 0.9em)\n  ${finalTable}\n])`;
            }

            // 5. Légende (Figure)
            if (ann.caption) {
                finalTable = `#figure(caption: [${ann.caption}])[${finalTable}]`;
            }

            // 6. Alignement global du bloc/figure
            if (ann.align) {
                finalTable = `#align(${ann.align})[\n  #show figure.caption: set align(${ann.align})\n  ${finalTable}\n]`;
            }

            // 7. Identifiant Typst
            if (ann.id) {
                finalTable += ` <${ann.id}>`;
            }

            result = finalTable;
            break;
        }

        case 'thematicBreak': {
            result = `#line(length: 100%, stroke: 0.5pt + luma(150))`;
            break;
        }

        case 'inlineMath': {
            result = `$${node.value}$`;
            break;
        }

        case 'math': {
            let mathCode = `$ ${node.value} $`;
            if (ann.id) {
                mathCode += ` <${ann.id}>`;
            }
            if (ann.align) {
                mathCode = `#align(${ann.align})[${mathCode}]`;
            }
            result = mathCode;
            break;
        }

        case 'footnoteReference': {
            const fnNode = node as unknown as FootnoteReferenceNode;
            const fnContent = footnotes?.get(fnNode.identifier) || '?';
            result = `#footnote[${fnContent}]`;
            break;
        }

        case 'footnoteDefinition': {
            // Déjà traité dans le case 'root'
            result = '';
            break;
        }

        default:
            result = '';
            break;
    }

    // Gestion des layouts spéciaux
    if (typeof ann.layout === 'string') {
        const layout = ann.layout.trim().toLowerCase();

        if (layout === 'pagebreak') {
            result += `\n\n#pagebreak()`;
        } else if (layout === 'landscape') {
            if (node.type === 'root') {
                result = `#set page(flipped: true)\n` + result;
            } else {
                // Pour un bloc spécifique, on l'isole sur une page paysage
                result = `#page(flipped: true)[\n  ${result}\n]`;
            }
        } else if (layout === 'portrait') {
            if (node.type === 'root') {
                result = `#set page(flipped: false)\n` + result;
            } else {
                result = `#page(flipped: false)[\n  ${result}\n]`;
            }
        } else if (layout.startsWith('columns')) {
            const match = layout.match(/columns\s*[-:]?\s*(\d+)/);
            if (match) {
                const cols = parseInt(match[1], 10);
                if (node.type === 'root') {
                    result = `#show: columns.with(${cols})\n` + result;
                } else {
                    result = `#columns(${cols})[\n  ${result}\n]`;
                }
            }
        }
    }

    return result;
}
