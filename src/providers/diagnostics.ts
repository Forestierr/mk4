import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeFsPath, LineSourceMap, findRootIncludeLine } from '../parser/includes';

export const DOCUMENT_KEYS = new Set(['title', 'subtitle', 'author', 'date', 'theme', 'lang', 'numbering', 'toc', 'bibliography', 'biblio', 'bib-style', 'bibStyle', 'include']);
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

        // 1. Directives globales de document et de fichier (:include, :theme, :bibliography, :title...)
        // Elles sont autorisées partout dans le document.
        const isDocumentDirective = DOCUMENT_KEYS.has(key);

        if (!isDocumentDirective) {
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
            if (CONTEXT_KEYS[ctx]) {
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
                continue;
            }
        }

        // 2. Vérification de l'existence des fichiers pour :include, :theme, :bibliography
        if (['include', 'theme', 'bibliography', 'biblio'].includes(key)) {
            const valMatch = trimmed.match(/^:([a-zA-Z0-9_-]+)\s+(.+)$/);
            if (valMatch && document?.uri?.fsPath) {
                const rawVal = valMatch[2].trim().replace(/^['"]|['"]$/g, '');
                const baseDir = path.dirname(document.uri.fsPath);
                const targetPath = path.resolve(baseDir, rawVal);
                const normalized = normalizeFsPath(targetPath);
                const isOpen = vscode.workspace.textDocuments?.some(d => normalizeFsPath(d.uri.fsPath) === normalized);

                if (!isOpen && !fs.existsSync(targetPath)) {
                    const valIdx = lines[i].indexOf(valMatch[2]);
                    const range = new vscode.Range(i, valIdx, i, valIdx + valMatch[2].length);
                    const label = key === 'include' ? 'inclus' : key === 'theme' ? 'de thème' : 'de bibliographie';
                    const diag = new vscode.Diagnostic(
                        range,
                        `Fichier ${label} introuvable : "${rawVal}"`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diag.source = 'MK4';
                    diagnostics.push(diag);
                }
            } else if (!valMatch) {
                const colonIdx = lines[i].indexOf(':');
                const range = new vscode.Range(i, colonIdx, i, colonIdx + 1 + key.length);
                const diag = new vscode.Diagnostic(
                    range,
                    `Chemin de fichier manquant pour ":${key}"`,
                    vscode.DiagnosticSeverity.Warning
                );
                diag.source = 'MK4';
                diagnostics.push(diag);
            }
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

export interface TypstParsedError {
    line: number;
    message: string;
    sourceFile?: string;
    sourceLine?: number;
    rootIncludeLine?: number;
}

/**
 * Analyse la sortie stderr de Typst et retourne des erreurs avec leurs lignes Markdown
 * et l'attribution au fichier d'origine (sous-fichier ou document racine).
 */
export function parseTypstErrors(
    stderr: string,
    typstCode: string,
    sourceMap?: LineSourceMap,
    rootFilePath?: string
): TypstParsedError[] {
    const lineMap = buildTypstToMdLineMap(typstCode);
    const results: TypstParsedError[] = [];

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
            const mergedMdLine = (typLine >= 0 && typLine < lineMap.length) ? lineMap[typLine] : 1;

            if (sourceMap) {
                const loc = sourceMap.get(mergedMdLine);
                const sourceFile = loc.file;
                const sourceLine = loc.line;

                if (rootFilePath && sourceFile && normalizeFsPath(sourceFile) !== normalizeFsPath(rootFilePath)) {
                    // L'erreur provient d'un sous-fichier inclus
                    const rootIncLine = findRootIncludeLine(sourceMap.includes, sourceFile, rootFilePath);
                    const effectiveLine = rootIncLine !== undefined ? rootIncLine : mergedMdLine;
                    const fileName = path.basename(sourceFile);
                    const formattedMsg = `Erreur dans "${fileName}" (ligne ${sourceLine}) : ${currentMessage}`;

                    results.push({
                        line: effectiveLine,
                        message: formattedMsg,
                        sourceFile,
                        sourceLine,
                        rootIncludeLine: rootIncLine,
                    });
                } else {
                    // L'erreur provient du document racine
                    results.push({
                        line: sourceLine || mergedMdLine,
                        message: currentMessage,
                        sourceFile: sourceFile || rootFilePath,
                        sourceLine: sourceLine || mergedMdLine,
                    });
                }
            } else {
                results.push({ line: mergedMdLine, message: currentMessage });
            }
        }
    }

    return results;
}
