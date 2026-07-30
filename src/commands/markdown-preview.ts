import * as vscode from 'vscode';
import { compileMarkdownToHtml } from '../parser';
import { getMarkdownHtml } from '../webviews/markdown-html';
import { getErrorHtml } from '../webviews/error-html';

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

        const updateMdWebview = () => {
            try {
                const text = editor.document.getText();
                const htmlBody = compileMarkdownToHtml(text);
                panel.webview.html = getMarkdownHtml(htmlBody);
            } catch (err: any) {
                panel.webview.html = getErrorHtml('Erreur Markdown', err.message);
            }
        };

        updateMdWebview();

        const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === editor.document) {
                updateMdWebview();
            }
        });

        panel.onDidDispose(() => changeSub.dispose(), null, context.subscriptions);
    });
}
