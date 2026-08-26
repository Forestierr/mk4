import * as vscode from 'vscode';
import { DOCUMENT_KEYS, UNIVERSAL_KEYS, CONTEXT_KEYS, detectContext } from './diagnostics';

export class MK4CodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
        const diagnostics = context.diagnostics.filter(d => d.source === 'MK4' && d.message.startsWith('Annotation inconnue'));
        if (diagnostics.length === 0) {
            return [];
        }

        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of diagnostics) {
            const lineText = document.lineAt(diagnostic.range.start.line).text;
            const match = lineText.match(/^:([a-zA-Z0-9_-]+)/);
            if (!match) {continue;}

            const wrongKey = match[1];

            // Re-déterminer le contexte
            let contextLine = '';
            let j = diagnostic.range.start.line - 1;
            while (j >= 0) {
                const prev = document.lineAt(j).text.trim();
                if (prev === '' || prev.startsWith(':')) { j--; continue; }
                contextLine = prev;
                break;
            }
            const ctx = detectContext(contextLine);

            const validKeys = new Set<string>(UNIVERSAL_KEYS);
            if (ctx === 'document') {
                DOCUMENT_KEYS.forEach(k => validKeys.add(k));
            } else if (CONTEXT_KEYS[ctx]) {
                CONTEXT_KEYS[ctx].forEach(k => validKeys.add(k));
            }

            // Trouver les clés similaires
            const suggestions = this.getSuggestions(wrongKey, Array.from(validKeys));

            for (const suggestion of suggestions) {
                const action = new vscode.CodeAction(`Changer en ':${suggestion}'`, vscode.CodeActionKind.QuickFix);
                action.diagnostics = [diagnostic];
                action.isPreferred = true;
                
                const edit = new vscode.WorkspaceEdit();
                const replaceRange = new vscode.Range(
                    diagnostic.range.start.line,
                    lineText.indexOf(':') + 1,
                    diagnostic.range.start.line,
                    lineText.indexOf(':') + 1 + wrongKey.length
                );
                edit.replace(document.uri, replaceRange, suggestion);
                action.edit = edit;
                actions.push(action);
            }
        }

        return actions;
    }

    private getSuggestions(wrong: string, valids: string[]): string[] {
        return valids
            .map(valid => ({ key: valid, dist: this.levenshtein(wrong, valid) }))
            .filter(item => item.dist <= 3) // Autorise jusqu'à 3 erreurs
            .sort((a, b) => a.dist - b.dist)
            .map(item => item.key)
            .slice(0, 3); // Garder les 3 meilleures suggestions
    }

    private levenshtein(a: string, b: string): number {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }
}
