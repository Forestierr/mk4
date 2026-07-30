import * as vscode from 'vscode';

export const DOCUMENT_KEYS = new Set(['title', 'subtitle', 'author', 'date', 'theme', 'lang', 'numbering', 'toc']);
export const UNIVERSAL_KEYS = new Set(['id', 'align', 'layout']);
export const CONTEXT_KEYS: Record<string, Set<string>> = {
    heading:    new Set(['short', 'numbering']),
    image:      new Set(['caption', 'width']),
    code:       new Set(['caption', 'filename', 'lines', 'highlight']),
    blockquote: new Set(['type', 'author', 'link', 'source']),
    table:      new Set(['caption', 'compact']),
};

export function detectContext(contextLine: string): string {
    if (contextLine === '') { return 'document'; }
    if (contextLine.startsWith('#')) { return 'heading'; }
    if (contextLine.startsWith('![')) { return 'image'; }
    if (contextLine.startsWith('```')) { return 'code'; }
    if (contextLine.startsWith('>')) { return 'blockquote'; }
    if (contextLine.startsWith('|')) { return 'table'; }
    return 'paragraph';
}

/**
 * Valide les annotations `:key` d'un document Markdown et retourne des diagnostics VS Code.
 */
export function validateAnnotations(text: string, document: vscode.TextDocument): vscode.Diagnostic[] {
    const lines = text.split(/\r?\n/);
    const diagnostics: vscode.Diagnostic[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed.startsWith(':')) { continue; }

        const keyMatch = trimmed.match(/^:([a-zA-Z0-9_-]+)/);
        if (!keyMatch) { continue; }
        const key = keyMatch[1];

        // Remonter pour trouver l'élément parent
        let contextLine = '';
        let j = i - 1;
        while (j >= 0) {
            const prev = lines[j].trim();
            if (prev === '' || prev.startsWith(':')) { j--; continue; }
            contextLine = prev;
            break;
        }

        const ctx = detectContext(contextLine);

        const validKeys = new Set(UNIVERSAL_KEYS);
        if (ctx === 'document') {
            DOCUMENT_KEYS.forEach(k => validKeys.add(k));
        } else if (CONTEXT_KEYS[ctx]) {
            CONTEXT_KEYS[ctx].forEach(k => validKeys.add(k));
        }

        if (!validKeys.has(key)) {
            const colonIdx = lines[i].indexOf(':');
            const range = new vscode.Range(i, colonIdx, i, colonIdx + 1 + key.length);
            const diag = new vscode.Diagnostic(
                range,
                `Annotation inconnue ":${key}" dans ce contexte`,
                vscode.DiagnosticSeverity.Warning
            );
            diag.source = 'MK4';
            diagnostics.push(diag);
        }
    }

    return diagnostics;
}

/**
 * Construit une table de correspondance ligne Typst → ligne Markdown.
 */
export function buildTypstToMdLineMap(typstCode: string): number[] {
    const lines = typstCode.split(/\r?\n/);
    const map: number[] = [];
    let currentMdLine = 1;

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/#metadata\("(\d+)"\)\s*<mk4_loc>/);
        if (match) {
            currentMdLine = parseInt(match[1]);
        }
        map[i] = currentMdLine;
    }

    return map;
}

/**
 * Analyse la sortie stderr de Typst et retourne des erreurs avec leurs lignes Markdown.
 */
export function parseTypstErrors(stderr: string, typstCode: string): { line: number; message: string }[] {
    const lineMap = buildTypstToMdLineMap(typstCode);
    const results: { line: number; message: string }[] = [];

    const stderrLines = stderr.split(/\r?\n/);
    let currentMessage = 'Erreur de compilation Typst';

    for (const stderrLine of stderrLines) {
        const errMatch = stderrLine.match(/^error:\s*(.+)/);
        if (errMatch) {
            currentMessage = errMatch[1].trim();
        }

        const refMatch = stderrLine.match(/\.typ:(\d+):(\d+)/);
        if (refMatch) {
            const typLine = parseInt(refMatch[1]) - 1;
            const mdLine = (typLine >= 0 && typLine < lineMap.length) ? lineMap[typLine] : 1;
            results.push({ line: mdLine, message: currentMessage });
        }
    }

    return results;
}
