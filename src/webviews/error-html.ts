import * as escapeHtml from './escape-html';

export function getErrorHtml(title: string, message: string): string {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <style>
            body { font-family: sans-serif; padding: 20px; color: #f87171; background: var(--vscode-editor-background); }
            pre { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 4px; overflow-x: auto; color: #d4d4d4; }
        </style>
    </head>
    <body>
        <h2>${title}</h2>
        <pre><code>${escapeHtml.escapeHtml(message)}</code></pre>
    </body>
    </html>`;
}
