export function getMarkdownHtml(bodyContent: string): string {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <style>
            body {
                font-family: var(--vscode-editor-font-family, sans-serif);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px 40px;
                line-height: 1.6;
                max-width: 900px;
                margin: 0 auto;
            }
            img { max-width: 100%; border-radius: 4px; }
            pre { background: rgba(0,0,0,0.1); padding: 15px; border-radius: 6px; overflow-x: auto; }
            code { background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 15px; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid var(--vscode-panel-border); padding: 8px 12px; }
            th { background: rgba(0,0,0,0.05); }

            /* Annotations MK4 */
            .mk4-badges-container { margin-left: 10px; opacity: 0.8; }
            .mk4-badge {
                background: var(--vscode-badge-background, #007acc);
                color: var(--vscode-badge-foreground, white);
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.75em;
                font-family: monospace;
                margin-right: 4px;
                display: inline-block;
                vertical-align: middle;
            }
        </style>
    </head>
    <body>
        ${bodyContent}
    </body>
    </html>`;
}
