import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { registerPreviewCommand } from './commands/preview';
import { registerExportCommands } from './commands/export';
import { registerMarkdownPreviewCommand } from './commands/markdown-preview';
import { createCompletionProvider } from './providers/completion';

/** Sessions de preview actives (pour le nettoyage final). */
const activeSessions: { dir: string; id: string }[] = [];

export function activate(context: vscode.ExtensionContext) {
    // Nettoyage des fichiers temporaires orphelins au démarrage
    vscode.workspace.findFiles('**/.mk4-{temp,export}-*').then(files => {
        for (const file of files) {
            try { fs.unlinkSync(file.fsPath); } catch { /* ignore */ }
        }
    });
    vscode.workspace.findFiles('**/.mk4-export.typ').then(files => {
        for (const file of files) {
            try { fs.unlinkSync(file.fsPath); } catch { /* ignore */ }
        }
    });

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('mk4');

    const previewDisposable = registerPreviewCommand(context, diagnosticCollection, activeSessions);
    const [exportPdfDisposable, exportTypstDisposable] = registerExportCommands(context);
    const markdownPreviewDisposable = registerMarkdownPreviewCommand(context);
    const completionDisposable = createCompletionProvider();

    context.subscriptions.push(
        previewDisposable,
        exportPdfDisposable,
        exportTypstDisposable,
        markdownPreviewDisposable,
        completionDisposable,
        diagnosticCollection
    );
}

export function deactivate() {
    const cleanedDirs = new Set<string>();

    for (const session of activeSessions) {
        try {
            if (fs.existsSync(session.dir)) {
                cleanedDirs.add(session.dir);
                const files = fs.readdirSync(session.dir);
                for (const file of files) {
                    if (file.startsWith(`.mk4-temp-${session.id}`)) {
                        const filePath = path.join(session.dir, file);
                        if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
                    }
                }
            }
        } catch (err) {
            console.error('Erreur de nettoyage final:', err);
        }
    }

    // Nettoyage des fichiers d'export orphelins
    for (const dir of cleanedDirs) {
        try {
            const exportFile = path.join(dir, '.mk4-export.typ');
            if (fs.existsSync(exportFile)) { fs.unlinkSync(exportFile); }
        } catch { /* ignore */ }
    }
}