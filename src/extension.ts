import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';

import { registerPreviewCommand } from './commands/preview';
import { registerExportCommands } from './commands/export';
import { registerMarkdownPreviewCommand } from './commands/markdown-preview';
import { createCompletionProvider } from './providers/completion';
import { createHoverProvider } from './providers/hover';
import { createDefinitionProvider, createReferenceProvider, createRenameProvider } from './providers/definition';
import { MK4StatusBar, registerThemePickerCommand } from './providers/statusBar';
import { createCodeLensProvider } from './providers/codelens';
import { MK4CodeActionProvider } from './providers/codeAction';

/** Sessions de preview actives (pour le nettoyage final). */
const activeSessions: { dir: string; id: string }[] = [];

export function activate(context: vscode.ExtensionContext) {
    // Vérification de la disponibilité du binaire Typst (non-bloquante)
    execFile('typst', ['--version'], (error) => {
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            vscode.window.showErrorMessage(
                "MK4 : la commande `typst` est introuvable. Veuillez l'installer et l'ajouter à votre PATH.",
                'Installer Typst'
            ).then(choice => {
                if (choice === 'Installer Typst') {
                    vscode.env.openExternal(vscode.Uri.parse('https://typst.app/docs/'));
                }
            });
        }
    });

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

    // ── Providers & commandes ────────────────────────────────────────────────
    const previewDisposable        = registerPreviewCommand(context, diagnosticCollection, activeSessions);
    const [exportPdfDisposable, exportTypstDisposable] = registerExportCommands(context);
    const markdownPreviewDisposable = registerMarkdownPreviewCommand(context);
    const completionDisposable     = createCompletionProvider();
    const hoverDisposable          = createHoverProvider();
    const definitionDisposable     = createDefinitionProvider();
    const referenceDisposable      = createReferenceProvider();
    const renameDisposable         = createRenameProvider();
    const codeLensDisposable       = createCodeLensProvider();
    const themePickerDisposable    = registerThemePickerCommand();
    const codeActionDisposable     = vscode.languages.registerCodeActionsProvider('markdown', new MK4CodeActionProvider(), { providedCodeActionKinds: MK4CodeActionProvider.providedCodeActionKinds });

    // ── Barre d'état ────────────────────────────────────────────────────────
    const statusBar = new MK4StatusBar();

    // Afficher la barre d'état pour l'éditeur actif au démarrage
    if (vscode.window.activeTextEditor) {
        statusBar.show(vscode.window.activeTextEditor.document);
    }

    const activeEditorSub = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            statusBar.show(editor.document);
        } else {
            statusBar.hide();
        }
    });

    context.subscriptions.push(
        previewDisposable,
        exportPdfDisposable,
        exportTypstDisposable,
        markdownPreviewDisposable,
        completionDisposable,
        hoverDisposable,
        definitionDisposable,
        referenceDisposable,
        renameDisposable,
        codeLensDisposable,
        themePickerDisposable,
        codeActionDisposable,
        activeEditorSub,
        diagnosticCollection,
        { dispose: () => statusBar.dispose() }
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