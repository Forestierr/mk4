import * as vscode from 'vscode';

/**
 * Fournisseur d'autocomplétion pour les annotations MK4 (`:key value`).
 */
export function createCompletionProvider(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
        'markdown',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substring(0, position.character);

                if (!linePrefix.trimStart().startsWith(':')) {
                    return undefined;
                }

                let targetLine = '';
                const usedKeys = new Set<string>();

                // Remonter pour trouver l'élément parent
                let i = position.line - 1;
                while (i >= 0) {
                    const text = document.lineAt(i).text.trim();
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
                let j = position.line + 1;
                while (j < document.lineCount) {
                    const text = document.lineAt(j).text.trim();
                    if (text.startsWith(':')) {
                        const match = text.match(/^:([a-zA-Z0-9_-]+)/);
                        if (match) { usedKeys.add(match[1]); }
                    } else {
                        break;
                    }
                    j++;
                }

                const completions: vscode.CompletionItem[] = [];

                const addItem = (label: string, insert: string, detail: string, kind: vscode.CompletionItemKind, filterKey?: string) => {
                    const keyToCheck = filterKey || label.split(' ')[0];
                    if (!usedKeys.has(keyToCheck)) {
                        const item = new vscode.CompletionItem(label, kind);
                        item.insertText = insert;
                        item.detail = detail;
                        completions.push(item);
                    }
                };

                // --- DOCUMENT (aucun élément parent) ---
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

                // --- ACTIONS GLOBALES ---
                addItem('layout pagebreak', 'layout pagebreak', 'Saut de page', vscode.CompletionItemKind.Keyword, 'layout');

                return completions;
            }
        },
        ':'
    );
}
