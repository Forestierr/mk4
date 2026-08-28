import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/** Scan récursif pour trouver les fichiers relatifs par extension. */
function getFilePathCompletions(document: vscode.TextDocument, extension: string): vscode.CompletionItem[] {
    const baseDir = path.dirname(document.uri.fsPath);
    const items: vscode.CompletionItem[] = [];

    function scanDir(dir: string, relBase: string, depth: number = 0) {
        if (depth > 4) { return; }
        if (!fs.existsSync(dir)) { return; }
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.')) { continue; }
                if (entry.name === 'node_modules' || entry.name === 'out') { continue; }

                const relPath = relBase ? `${relBase}/${entry.name}` : `./${entry.name}`;
                if (entry.isDirectory()) {
                    scanDir(path.join(dir, entry.name), relPath, depth + 1);
                } else if (entry.isFile() && entry.name.endsWith(extension)) {
                    const item = new vscode.CompletionItem(relPath, vscode.CompletionItemKind.File);
                    item.detail = `Fichier ${extension} relatif`;
                    item.insertText = relPath;
                    items.push(item);
                }
            }
        } catch { /* ignore */ }
    }

    scanDir(baseDir, '', 0);
    return items;
}

export interface CompletionDefinition {
    label: string;
    insertText: string;
    detail: string;
    kind: vscode.CompletionItemKind;
}

/**
 * Calcule la liste des suggestions d'annotations MK4 selon le contexte de la ligne.
 */
export function computeAnnotationCompletions(
    lines: string[],
    lineIndex: number,
    charIndex: number
): CompletionDefinition[] {
    const fullLine = lines[lineIndex] || '';
    const linePrefix = fullLine.substring(0, charIndex);

    if (!linePrefix.trimStart().startsWith(':')) {
        return [];
    }

    let targetLine = '';
    const usedKeys = new Set<string>();

    // Remonter pour trouver l'élément parent
    let i = lineIndex - 1;
    while (i >= 0) {
        const text = lines[i].trim();
        if (text.startsWith(':')) {
            const match = text.match(/^:([a-zA-Z0-9_-]+)/);
            if (match) { usedKeys.add(match[1]); }
        } else if (text !== '') {
            targetLine = text;
            break;
        }
        i--;
    }

    // Scanner aussi vers le bas
    let j = lineIndex + 1;
    while (j < lines.length) {
        const text = lines[j].trim();
        if (text.startsWith(':')) {
            const match = text.match(/^:([a-zA-Z0-9_-]+)/);
            if (match) { usedKeys.add(match[1]); }
        } else {
            break;
        }
        j++;
    }

    const completions: CompletionDefinition[] = [];

    const addItem = (label: string, insert: string, detail: string, kind: vscode.CompletionItemKind, filterKey?: string) => {
        const keyToCheck = filterKey || label.split(' ')[0];
        if (!usedKeys.has(keyToCheck)) {
            completions.push({ label, insertText: insert, detail, kind });
        }
    };

    // --- DOCUMENT (aucun élément parent, en début de document) ---
    if (targetLine === '') {
        addItem('title', 'title ', 'Titre principal du document', vscode.CompletionItemKind.Property);
        addItem('subtitle', 'subtitle ', 'Sous-titre du document', vscode.CompletionItemKind.Property);
        addItem('author', 'author ', 'Auteur du document', vscode.CompletionItemKind.Property);
        addItem('date', 'date ', 'Date du document', vscode.CompletionItemKind.Property);
        addItem('theme', 'theme ', 'Chemin vers un template Typst externe', vscode.CompletionItemKind.Property);
        addItem('lang', 'lang ', 'Langue du document (ex: fr, en)', vscode.CompletionItemKind.Property);
        addItem('numbering', 'numbering "1.1"', 'Format de numérotation des titres', vscode.CompletionItemKind.Property);
        addItem('toc true', 'toc true', 'Afficher la table des matières', vscode.CompletionItemKind.Value, 'toc');
        addItem('toc false', 'toc false', 'Masquer la table des matières', vscode.CompletionItemKind.Value, 'toc');
        addItem('bibliography', 'bibliography ', 'Chemin vers le fichier de références (.bib)', vscode.CompletionItemKind.Property);
        addItem('biblio', 'biblio ', 'Alias : Chemin vers le fichier de références (.bib)', vscode.CompletionItemKind.Property);
        addItem('bib-style ieee', 'bib-style ieee', 'Style de citation IEEE (défaut)', vscode.CompletionItemKind.Enum, 'bib-style');
        addItem('bib-style apa', 'bib-style apa', 'Style de citation APA', vscode.CompletionItemKind.Enum, 'bib-style');
        addItem('bib-style chicago', 'bib-style chicago', 'Style de citation Chicago', vscode.CompletionItemKind.Enum, 'bib-style');
        addItem('bib-style mla', 'bib-style mla', 'Style de citation MLA', vscode.CompletionItemKind.Enum, 'bib-style');
        addItem('bib-style vancouver', 'bib-style vancouver', 'Style de citation Vancouver', vscode.CompletionItemKind.Enum, 'bib-style');
    }

    // --- CLÉS UNIVERSELLES ---
    if (targetLine !== '') {
        addItem('id', 'id ', 'Identifiant Typst (ex: mon_titre)', vscode.CompletionItemKind.Property);
        addItem('align center', 'align center', "Centrer l'élément", vscode.CompletionItemKind.Value, 'align');
        addItem('align left', 'align left', 'Aligner à gauche', vscode.CompletionItemKind.Value, 'align');
        addItem('align right', 'align right', 'Aligner à droite', vscode.CompletionItemKind.Value, 'align');
    }

    // --- TITRES (#) ---
    if (targetLine.startsWith('#')) {
        addItem('short', 'short ', 'Titre court pour la TOC', vscode.CompletionItemKind.Property);
        addItem('numbering false', 'numbering false', 'Désactive la numérotation', vscode.CompletionItemKind.Value, 'numbering');
    }
    // --- IMAGES (![...]) ---
    else if (targetLine.startsWith('![')) {
        addItem('caption', 'caption ', 'Légende de la figure', vscode.CompletionItemKind.Property);
        addItem('width', 'width ', 'Largeur (ex: 80%, 10cm)', vscode.CompletionItemKind.Property);
    }
    // --- CODE (```) ---
    else if (targetLine.startsWith('```')) {
        addItem('caption', 'caption ', 'Légende du code', vscode.CompletionItemKind.Property);
        addItem('filename', 'filename ', 'Nom du fichier', vscode.CompletionItemKind.Property);
        addItem('lines true', 'lines true', 'Afficher les numéros de ligne', vscode.CompletionItemKind.Value, 'lines');
        addItem('lines false', 'lines false', 'Masquer les numéros de ligne', vscode.CompletionItemKind.Value, 'lines');
        addItem('highlight', 'highlight ', 'Lignes à surligner (ex: 2-4)', vscode.CompletionItemKind.Property);
    }
    // --- CITATIONS (>) ---
    else if (targetLine.startsWith('>')) {
        addItem('type note', 'type note', 'Bloc Note (bleu)', vscode.CompletionItemKind.Enum, 'type');
        addItem('type info', 'type info', 'Bloc Info (bleu clair)', vscode.CompletionItemKind.Enum, 'type');
        addItem('type tip', 'type tip', 'Bloc Astuce (vert)', vscode.CompletionItemKind.Enum, 'type');
        addItem('type warning', 'type warning', 'Bloc Attention (orange)', vscode.CompletionItemKind.Enum, 'type');
        addItem('type error', 'type error', 'Bloc Erreur (rouge)', vscode.CompletionItemKind.Enum, 'type');
    }
    // --- TABLEAUX (|) ---
    else if (targetLine.startsWith('|')) {
        addItem('caption', 'caption ', 'Légende du tableau', vscode.CompletionItemKind.Property);
        addItem('compact true', 'compact true', 'Tableau compact', vscode.CompletionItemKind.Value, 'compact');
    }

    // --- ACTIONS GLOBALES (disponibles partout) ---
    addItem('layout pagebreak', 'layout pagebreak', 'Saut de page', vscode.CompletionItemKind.Keyword, 'layout');
    addItem('layout landscape', 'layout landscape', 'Page au format paysage', vscode.CompletionItemKind.Keyword, 'layout');
    addItem('layout portrait', 'layout portrait', 'Page au format portrait', vscode.CompletionItemKind.Keyword, 'layout');
    addItem('layout columns 2', 'layout columns 2', 'Texte sur 2 colonnes', vscode.CompletionItemKind.Keyword, 'layout');
    addItem('layout columns 3', 'layout columns 3', 'Texte sur 3 colonnes', vscode.CompletionItemKind.Keyword, 'layout');
    addItem('include', 'include ', 'Inclure un sous-fichier Markdown', vscode.CompletionItemKind.File);

    return completions;
}

/**
 * Fournisseur d'autocomplétion pour les annotations MK4 (`:key value`) et chemins de fichiers.
 */
export function createCompletionProvider(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
        'markdown',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const fullLine = document.lineAt(position).text;
                const linePrefix = fullLine.substring(0, position.character);

                // --- 1. Autocomplétion de chemins pour directives de fichiers ---
                if (/^\s*:include\s+/.test(linePrefix)) {
                    return getFilePathCompletions(document, '.md');
                }
                if (/^\s*:theme\s+/.test(linePrefix)) {
                    return getFilePathCompletions(document, '.typ');
                }
                if (/^\s*:(bibliography|biblio)\s+/.test(linePrefix)) {
                    return getFilePathCompletions(document, '.bib');
                }

                if (!linePrefix.trimStart().startsWith(':')) {
                    return undefined;
                }

                const lines: string[] = [];
                for (let k = 0; k < document.lineCount; k++) {
                    lines.push(document.lineAt(k).text);
                }

                const defs = computeAnnotationCompletions(lines, position.line, position.character);
                return defs.map(d => {
                    const item = new vscode.CompletionItem(d.label, d.kind);
                    item.insertText = d.insertText;
                    item.detail = d.detail;
                    return item;
                });
            }
        },
        ':', ' ', '/', '.'
    );
}
