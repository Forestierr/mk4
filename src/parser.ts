import * as path from 'path';
import remarkParse from 'remark-parse';
import unified from 'unified';
import visit from 'unist-util-visit';

import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkHtml from 'remark-html';

function remarkTypstAnnotations() {
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
                            const prevNode = parent.children[index - 1];
                            prevNode.data = prevNode.data || {};
                            prevNode.data.typstAnnotations = { ...(prevNode.data.typstAnnotations || {}), ...annotations };
                        }
                        // Premier bloc, annotation du document
                        else if (parent && parent.type === 'root' && index === 0) {
                            parent.data = parent.data || {};
                            parent.data.typstAnnotations = { ...(parent.data.typstAnnotations || {}), ...annotations };
                        }
                        // On supprime ce paragraphe vide
                        parent.children.splice(index, 1);
                        return index;
                    } else {
                        // On les garde pour ce paragraphe (ex: une image suivie de ses annotations)
                        node.data = node.data || {};
                        node.data.typstAnnotations = { ...(node.data.typstAnnotations || {}), ...annotations };
                        
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

function stringifyToTypst(node: any, baseDir: string): string {
    const ann = node.data?.typstAnnotations || {};
    let result = '';

    switch (node.type) {
        case 'root': {
            const rootAnn = node.data?.typstAnnotations || {};
            let setup = '';

            setup += `#let in_outline = state("in_outline", false)\n`;
            setup += `#show outline: it => { in_outline.update(true); it; in_outline.update(false) }\n\n`;

            if (rootAnn.theme) {
                let themePath = rootAnn.theme.replace(/\\/g, '/');
                setup += `#import "${themePath}": conf\n`;
                setup += `#show: conf.with(\n`;
                if (rootAnn.title) {
                    setup += `  title: [${rootAnn.title}],\n`;
                }
                if (rootAnn.subtitle) {
                    setup += `  subtitle: [${rootAnn.subtitle}],\n`;
                }
                if (rootAnn.author) {
                    setup += `  author: [${rootAnn.author}],\n`;
                }
                if (rootAnn.date) {
                    setup += `  date: [${rootAnn.date}],\n`;
                }
                if (rootAnn.lang) {
                    setup += `  lang: "${rootAnn.lang}",\n`;
                }
                if (rootAnn.toc) {
                    setup += `  toc: ${rootAnn.toc},\n`;
                }
                setup += `)\n\n`;
            } else {
                setup += `#set page(paper: "a4", margin: 2.5cm)\n`;
                setup += `#set text(lang: "${rootAnn.lang || 'fr'}")\n\n`;
                if (rootAnn.numbering) {
                    setup += `#set heading(numbering: "${rootAnn.numbering}")\n`;
                }
                if (rootAnn.title) {
                    setup += `#align(center)[#text(22pt, weight: "bold")[${rootAnn.title}]]\n`;
                }
                if (rootAnn.subtitle) {
                    setup += `#v(0.5em)\n`;
                    setup += `#align(center)[#text(18pt, fill: luma(50))[${rootAnn.subtitle}]]\n`;
                }
                if (rootAnn.author) {
                    setup += `#align(center)[#text(12pt)[*${rootAnn.author}*]]\n`;
                }
                if (rootAnn.date) {
                    setup += `#align(center)[#text(10pt)[_${rootAnn.date}_]]\n`;
                }
                if (rootAnn.title || rootAnn.author || rootAnn.date) {
                    setup += `#v(2em)\n\n`; 
                }
                if (rootAnn.toc) {
                    setup += `#outline(title: "Table des matières", depth: 3, indent: auto)\n`;
                    setup += `#pagebreak()\n\n`;
                }
            }

            result = setup + (node.children || []).map((n: any) => stringifyToTypst(n, baseDir)).join('\n\n');
            break;
        }
            
        case 'heading': {
            const title = (node.children || []).map((n: any) => stringifyToTypst(n, baseDir)).join('');
            
            let headingCode = `#heading(level: ${node.depth}`;
            if (ann.numbering === 'false' || ann.numbering === false) {
                headingCode += `, numbering: none`;
            }
            
            // --- NOUVEAU : CHANGEMENT DYNAMIQUE DU TEXTE ---
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
            if (node.children?.length === 1 && node.children[0].type === 'image') {
                const img = node.children[0];
                let imgCode = `image("${img.url}"`;
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

            let text = (node.children || []).map((n: any) => stringifyToTypst(n, baseDir)).join('');
            if (ann.align) {
                text = `#align(${ann.align})[${text}]`;
            }
            result = text;
            break;
        }
            
        case 'text': {
            result = node.value;
            break;
        }

        case 'image': {
            result = `#image("${node.url}")`;
            break;
        }

        case 'link': {
            const linkText = (node.children || []).map((n: any) => stringifyToTypst(n, baseDir)).join('');
            result = `#link("${node.url}")[${linkText}]`;
            break;
        }

        case 'list': {
            const marker = node.ordered ? '+' : '-';
            const items = (node.children || []).map((listItem: any) => {
                return stringifyToTypst(listItem, baseDir);
            }).join('\n');

            result = items;
            break;
        }

        case 'listItem': {
            let content = (node.children || []).map((n: any) => stringifyToTypst(n, baseDir)).join(' ').trim();
            const marker = node.parent?.ordered ? '+' : '-';

            // Détection et conversion propre des cases à cocher Markdown vers des boîtes Typst
            if (typeof node.checked === 'boolean') {
                const box = node.checked 
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
            break;
        }
            
        case 'blockquote': {
            // On extrait uniquement le texte des paragraphes de la citation
            const text = (node.children || []).map((n: any) => {
                if (n.type === 'paragraph') {
                    return (n.children || []).map((sub: any) => stringifyToTypst(sub, baseDir)).join('');
                }
                return stringifyToTypst(n, baseDir);
            }).join('\n');

            const buildAdmonition = (title: string, fill: string, stroke: string) => {
                return `#rect(fill: ${fill}, stroke: ${stroke}, radius: 4pt, width: 100%, inset: 10pt)[\n  *${title}*\n  ${text}\n]`;
            };

            const type = ann.type ? ann.type.toLowerCase() : '';

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
                let attributionParts = [];
                if (ann.author) {
                    attributionParts.push(ann.author);
                }
                const link = ann.link || ann.source;
                if (link) {
                    attributionParts.push(`#link("${link}")[Source]`);
                }
                
                if (attributionParts.length > 0) {
                    quoteOptions += `, attribution: [${attributionParts.join(' — ')}]`;
                }
                
                result = `#quote(${quoteOptions})[${text}]`;
            }
            break;
        }
        
        case 'code': {
            const lang = node.lang ? node.lang.toLowerCase() : '';
            const hasLines = ann.lines === 'true' || ann.lines === true;
            const hasHighlight = !!ann.highlight;

            // 1. Le bloc brut avec les sauts de ligne vitaux pour la coloration
            let codeBlock = `\n\`\`\`${lang}\n${node.value}\n\`\`\`\n`;

            // 2. Numérotation et Surlignage combinés
            if (hasLines || hasHighlight) {
                // Parseur intelligent pour la syntaxe des lignes à surligner
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
                                for (let k = s; k <= e; k++) hl.push(k);
                            }
                        } else {
                            const n = parseInt(p);
                            if (!isNaN(n)) hl.push(n);
                        }
                    }
                    // Conversion en tableau Typst (avec une virgule finale si 1 seul élément pour respecter la syntaxe Typst)
                    hlLinesStr = `(${hl.join(', ')}${hl.length === 1 ? ',' : ''})`;
                }

                // Configuration de la grille Typst
                const cols = hasLines ? '(auto, 1fr)' : '(1fr,)';
                const gutter = hasLines ? '1em' : '0pt';

                // Construction de la fonction de mapping Typst pour dessiner chaque ligne
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
            const hasCompact = ann.compact === 'true' || ann.compact === true;
            
            // 1. Détermination de l'alignement des colonnes (natif Markdown)
            // remark-gfm fournit un tableau node.align avec 'left', 'center', 'right' ou null
            const aligns = (node.align || []).map((a: string | null) => {
                if (a === 'center') return 'center';
                if (a === 'right') return 'right';
                return 'left'; // Alignement par défaut
            });
            const columnsDef = aligns.length > 0 ? `(${aligns.map(() => 'auto').join(', ')})` : 'auto';
            const alignDef = aligns.length > 0 ? `(${aligns.join(', ')})` : 'left';

            // 2. Construction des cellules Typst
            const cells: string[] = [];
            if (node.children) {
                node.children.forEach((row: any) => {
                    if (row.children) {
                        row.children.forEach((cell: any) => {
                            const cellContent = (cell.children || []).map((n: any) => stringifyToTypst(n, baseDir)).join('');
                            cells.push(`[${cellContent}]`);
                        });
                    }
                });
            }

            // 3. Configuration du tableau
            let tableArgs = `columns: ${columnsDef}, align: ${alignDef}`;
            if (hasCompact) {
                // On réduit drastiquement les marges internes (inset) pour le mode compact
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

        default:
            result = '';
            break;
    }

    // Si n'importe quel élément possède l'annotation :layout pagebreak, on coupe la page juste après lui !
    if (ann.layout === 'pagebreak') {
        result += `\n\n#pagebreak()`;
    }

    return result;
}

export function compileMarkdownToTypst(markdownText: string, documentPath: string): string {
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkTypstAnnotations);

    const ast = processor.parse(markdownText);
    const transformedAst = processor.runSync(ast);
    const baseDir = path.dirname(documentPath);
    
    return stringifyToTypst(transformedAst, baseDir);
}

function remarkHtmlAnnotations() {
    return (tree: any) => {
        visit(tree, (node: any) => {
            const anns = node.data?.typstAnnotations;
            if (anns && Object.keys(anns).length > 0) {
                // Création des badges HTML pour chaque annotation
                const badgesHtml = Object.entries(anns)
                    .map(([k, v]) => `<span class="mk4-badge">:${k}${v === true ? '' : ' ' + v}</span>`)
                    .join(' ');

                // On injecte ces badges à la fin de l'élément (titre, image, paragraphe...)
                if (node.children) {
                    node.children.push({
                        type: 'html',
                        value: ` <span class="mk4-badges-container">${badgesHtml}</span>`
                    });
                }
            }
        });
    };
}

export function compileMarkdownToHtml(markdownText: string): string {
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkTypstAnnotations) // 1. Extrait les annotations
        .use(remarkHtmlAnnotations)  // 2. Les transforme en badges
        .use(remarkHtml, { sanitize: false }); // 3. Convertit le tout en HTML brut

    const ast = processor.parse(markdownText);
    const transformedAst = processor.runSync(ast);
    return processor.stringify(transformedAst as any) as string;
}