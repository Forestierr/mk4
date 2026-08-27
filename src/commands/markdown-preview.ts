import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { compileMarkdownToHtml } from '../parser';
import { normalizeFsPath } from '../parser/includes';
import { getMarkdownHtml } from '../webviews/markdown-html';
import { getErrorHtml } from '../webviews/error-html';

/** Helper pour lire le contenu d'un document ouvert dans VS Code ou sur le disque. */
function getDocumentOrDiskContent(filePath: string): string | undefined {
    const targetNorm = normalizeFsPath(filePath);
    const openDoc = vscode.workspace.textDocuments.find(
        doc => normalizeFsPath(doc.uri.fsPath) === targetNorm
    );
    if (openDoc) {
        return openDoc.getText();
    }
    if (fs.existsSync(filePath)) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch {
            return undefined;
        }
    }
    return undefined;
}

/**
 * Enregistre la commande `mk4.showMarkdownPreview`.
 */
export function registerMarkdownPreviewCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('mk4.showMarkdownPreview', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const panel = vscode.window.createWebviewPanel(
            'mk4MdPreview',
            'Aperçu Markdown',
            vscode.ViewColumn.Beside,
            {}
        );

        panel.iconPath = {
            light: vscode.Uri.joinPath(
                context.extensionUri,
                'resources',
                'icons',
                'md-light.svg'
            ),
            dark: vscode.Uri.joinPath(
                context.extensionUri,
                'resources',
                'icons',
                'md-dark.svg'
            )
        };

        const activeDependencies = new Set<string>();

        const updateMdWebview = () => {
            try {
                const text = editor.document.getText();
                const dependencies = new Set<string>();
                const htmlBody = compileMarkdownToHtml(text, editor.document.uri.fsPath, {
                    dependencies,
                    readFile: getDocumentOrDiskContent,
                });

                activeDependencies.clear();
                for (const dep of dependencies) {
                    activeDependencies.add(normalizeFsPath(dep));
                }

                panel.webview.html = getMarkdownHtml(htmlBody);
            } catch (err: any) {
                panel.webview.html = getErrorHtml('Erreur Markdown', err.message);
            }
        };

        updateMdWebview();

        let updateTimeout: ReturnType<typeof setTimeout> | null = null;
        const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
            const changedPath = normalizeFsPath(e.document.uri.fsPath);
            const rootPathNorm = normalizeFsPath(editor.document.uri.fsPath);

            if (changedPath === rootPathNorm || activeDependencies.has(changedPath)) {
                if (updateTimeout) { clearTimeout(updateTimeout); }
                updateTimeout = setTimeout(() => updateMdWebview(), 300);
            }
        });

        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        const onFsChange = (uri: vscode.Uri) => {
            const changedPath = normalizeFsPath(uri.fsPath);
            const rootPathNorm = normalizeFsPath(editor.document.uri.fsPath);

            if (changedPath === rootPathNorm || activeDependencies.has(changedPath)) {
                if (updateTimeout) { clearTimeout(updateTimeout); }
                updateTimeout = setTimeout(() => updateMdWebview(), 300);
            }
        };
        const watcherChangeSub = fileWatcher.onDidChange(onFsChange);
        const watcherCreateSub = fileWatcher.onDidCreate(onFsChange);
        const watcherDeleteSub = fileWatcher.onDidDelete(onFsChange);

        panel.onDidDispose(() => {
            changeSub.dispose();
            fileWatcher.dispose();
            watcherChangeSub.dispose();
            watcherCreateSub.dispose();
            watcherDeleteSub.dispose();
        }, null, context.subscriptions);
    });
}
