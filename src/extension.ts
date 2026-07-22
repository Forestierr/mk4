import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { compileMarkdownToTypst, compileMarkdownToHtml } from './parser';

let activeSessions: { dir: string, id: string }[] = [];

export function activate(context: vscode.ExtensionContext) {
	// nettoyage des fichiers fantôme
	vscode.workspace.findFiles('**/.mk4-temp-*').then(files => {
        for (const file of files) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {
                // On ignore silencieusement si le fichier est verrouillé
            }
        }
    });

    const previewDisposable = vscode.commands.registerCommand('mk4.showPreview', () => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showInformationMessage("Veuillez ouvrir un fichier Markdown pour lancer l'aperçu.");
            return;
        }

		if (editor.document.isUntitled) {
            vscode.window.showWarningMessage("Veuillez d'abord sauvegarder votre fichier Markdown (Ctrl+S) pour lancer l'aperçu.");
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'mk4Preview',
            'Aperçu MK4',
            vscode.ViewColumn.Beside,
            { enableScripts: true, retainContextWhenHidden: true }
        );

		const baseDir = path.dirname(editor.document.uri.fsPath);
		const sessionId = Math.random().toString(36).substring(2, 9);

		activeSessions.push({ dir: baseDir, id: sessionId });

        const tempTypstFile = path.join(baseDir, `.mk4-temp-${sessionId}.typ`);
        const tempSvgPattern = path.join(baseDir, `.mk4-temp-${sessionId}-{n}.svg`); 
        const tempSvgBase = path.join(baseDir, `.mk4-temp-${sessionId}-`);

        const updateWebview = () => {
            const text = editor.document.getText();
            
            try {
                const typstCode = compileMarkdownToTypst(text, editor.document.uri.fsPath);
                fs.writeFileSync(tempTypstFile, typstCode, 'utf8');

                // On compile avec le pattern {n}
                exec(`typst compile "${tempTypstFile}" "${tempSvgPattern}"`, (error, stdout, stderr) => {
                    if (error) {
                        panel.webview.html = getErrorHtml("Erreur Typst", stderr || error.message);
                        return;
                    }

                    try {
                        // On boucle pour lire page-1, page-2, etc.
                        let pageNum = 1;
                        let allPagesHtml = '';
                        
                        while (true) {
                            const pagePath = `${tempSvgBase}${pageNum}.svg`;
                            if (fs.existsSync(pagePath)) {
                                const svgContent = fs.readFileSync(pagePath, 'utf8');
                                allPagesHtml += `<div class="page">${svgContent}</div>`;
                                pageNum++;
                            } else {
                                // Dès qu'un numéro n'existe pas, on a lu toutes les pages
                                break;
                            }
                        }

                        panel.webview.html = getSvgHtml(allPagesHtml);
                        
                    } catch (readErr: any) {
                        panel.webview.html = getErrorHtml("Erreur SVG", readErr.message);
                    }
                });

            } catch (err: any) {
                panel.webview.html = getErrorHtml("Erreur de Parsing", err.message);
            }
        };

        updateWebview();

        const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === editor.document) {
                updateWebview();
            }
        });

        panel.onDidDispose(() => {
            changeSub.dispose();

			activeSessions = activeSessions.filter(s => s.id !== sessionId);

            try {
                const files = fs.readdirSync(baseDir); 
                for (const file of files) {
                    if (file.startsWith(`.mk4-temp-${sessionId}`)) {
                        const filePath = path.join(baseDir, file);
                        if (fs.existsSync(filePath)) {
							 fs.unlinkSync(filePath);
						}
                    }
                }
            } catch (err) { console.error(err); }
        }, null, context.subscriptions);
    });

	const exportDisposable = vscode.commands.registerCommand('mk4.exportPdf', () => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showErrorMessage("Veuillez ouvrir un fichier Markdown pour l'exporter.");
            return;
        }

        // On vérifie que le fichier a bien été sauvegardé sur le disque
        if (editor.document.isUntitled) {
            vscode.window.showWarningMessage("Veuillez d'abord sauvegarder votre fichier Markdown (Ctrl+S) pour pouvoir générer le PDF à côté.");
            return;
        }

        // On déduit le chemin du PDF (on remplace .md par .pdf)
        const mdPath = editor.document.uri.fsPath;
        const pdfPath = mdPath.replace(/\.md$/, '.pdf');

        // On affiche une barre de chargement en bas à droite
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Génération du PDF Typst en cours...",
            cancellable: false
        }, async (progress) => {
            return new Promise<void>((resolve) => {
                try {
                    const text = editor.document.getText();
                    const typstCode = compileMarkdownToTypst(text, editor.document.uri.fsPath);
                    
                    // On utilise un fichier temporaire unique pour l'export
                    const baseDir = path.dirname(editor.document.uri.fsPath);
                    const tempExportTypst = path.join(baseDir, '.mk4-export.typ');
                    
					fs.writeFileSync(tempExportTypst, typstCode, 'utf8');

                    // Compilation Typst vers PDF
                    exec(`typst compile "${tempExportTypst}" "${pdfPath}"`, (error, stdout, stderr) => {
                        if (fs.existsSync(tempExportTypst)) {
							fs.unlinkSync(tempExportTypst);
						}
						
						if (error) {
                            vscode.window.showErrorMessage(`Erreur de compilation Typst : ${stderr || error.message}`);
                            resolve();
                            return;
                        }

                        // Succès ! On propose un bouton pour l'ouvrir directement
                        vscode.window.showInformationMessage(`PDF généré avec succès !`, 'Ouvrir le PDF').then(choice => {
                            if (choice === 'Ouvrir le PDF') {
                                // Ouvre le PDF avec le lecteur par défaut de l'OS (Acrobat, Evince, Edge, etc.)
                                vscode.env.openExternal(vscode.Uri.file(pdfPath));
                            }
                        });
                        resolve();
                    });
                } catch (err: any) {
                    vscode.window.showErrorMessage(`Erreur de parsing : ${err.message}`);
                    resolve();
                }
            });
        });
    });

	const exportTypstDisposable = vscode.commands.registerCommand('mk4.exportTypst', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.isUntitled) { 
			return;
		}

        const mdPath = editor.document.uri.fsPath;
        const typPath = mdPath.replace(/\.md$/, '.typ');
        
        try {
            const text = editor.document.getText();
            const typstCode = compileMarkdownToTypst(text, mdPath);
            fs.writeFileSync(typPath, typstCode, 'utf8');
            
            vscode.window.showInformationMessage(`Code Typst généré avec succès !`, 'Ouvrir').then(choice => {
                if (choice === 'Ouvrir') {
                    vscode.workspace.openTextDocument(typPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });
        } catch (err: any) {
            vscode.window.showErrorMessage(`Erreur de génération Typst : ${err.message}`);
        }
    });

	const markdownPreviewDisposable = vscode.commands.registerCommand('mk4.showMarkdownPreview', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
			return;
		}

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
                panel.webview.html = getErrorHtml("Erreur Markdown", err.message);
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

	const completionProvider = vscode.languages.registerCompletionItemProvider(
        'markdown',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substring(0, position.character);
                
                // 1. On s'assure qu'on tape bien une annotation
                if (!linePrefix.trimStart().startsWith(':')) {
                    return undefined;
                }

                let targetLine = '';
                const usedKeys = new Set<string>();

                // 2. On remonte vers le haut pour trouver l'élément Markdown parent
                let i = position.line - 1;
                while (i >= 0) {
                    const text = document.lineAt(i).text.trim();
                    
                    if (text.startsWith(':')) {
                        // C'est une autre annotation, on mémorise sa clé (ex: ":id mon_id" -> "id")
                        const match = text.match(/^:([a-zA-Z0-9_-]+)/);
                        if (match) { 
							usedKeys.add(match[1]); 
						}
                    } else if (text !== '') {
                        // Ce n'est ni une annotation ni une ligne vide : on a trouvé notre élément parent !
                        targetLine = text;
                        break;
                    }
                    i--;
                }

                // 3. On scanne aussi vers le bas (au cas où tu insères une annotation au milieu d'autres)
                let j = position.line + 1;
                while (j < document.lineCount) {
                    const text = document.lineAt(j).text.trim();
                    if (text.startsWith(':')) {
                        const match = text.match(/^:([a-zA-Z0-9_-]+)/);
                        if (match) {
							usedKeys.add(match[1]);
						}
                    } else {
                        break; // Fin du bloc d'annotations
                    }
                    j++;
                }

                const completions: vscode.CompletionItem[] = [];

                // 4. Fonction d'ajout intelligente avec filtrage des doublons
                const addItem = (label: string, insert: string, detail: string, kind: vscode.CompletionItemKind, filterKey?: string) => {
                    // La clé pour vérifier le doublon est soit fournie (ex: 'type'), soit déduite du premier mot
                    const keyToCheck = filterKey || label.split(' ')[0];
                    
                    // Si la clé n'a pas encore été utilisée dans ce bloc, on la propose
                    if (!usedKeys.has(keyToCheck)) {
                        const item = new vscode.CompletionItem(label, kind);
                        item.insertText = insert;
                        item.detail = detail;
                        completions.push(item);
                    }
                };

                // --- CLÉS UNIVERSELLES ---
                addItem('id', 'id ', 'Identifiant Typst (ex: mon_titre)', vscode.CompletionItemKind.Property);
                addItem('align', 'align ', 'left | center | right', vscode.CompletionItemKind.Enum);

                // --- CONTEXTE : TITRES (#) ---
                if (targetLine.startsWith('#')) {
                    addItem('short', 'short ', 'Titre court pour la TOC', vscode.CompletionItemKind.Property);
                    // Pour numbering, on vérifie la clé 'numbering' pour éviter les doublons
                    addItem('numbering false', 'numbering false', 'Désactive la numérotation', vscode.CompletionItemKind.Value, 'numbering');
                } 
                // --- CONTEXTE : IMAGES ET FIGURES (![...]) ---
                else if (targetLine.startsWith('![')) {
                    addItem('caption', 'caption ', 'Légende de la figure', vscode.CompletionItemKind.Property);
                    addItem('width', 'width ', 'Largeur (ex: 80%, 10cm)', vscode.CompletionItemKind.Property);
                } 
                // --- CONTEXTE : CODE (```) ---
                else if (targetLine.startsWith('```')) {
                    addItem('caption', 'caption ', 'Légende du code', vscode.CompletionItemKind.Property);
                    addItem('filename', 'filename ', 'Nom du fichier', vscode.CompletionItemKind.Property);
                    addItem('lines true', 'lines true', 'Afficher numéros de lignes', vscode.CompletionItemKind.Value, 'lines');
                    addItem('highlight', 'highlight ', 'Lignes à surligner (ex: 2-4)', vscode.CompletionItemKind.Property);
                } 
                // --- CONTEXTE : CITATIONS (>) ---
                else if (targetLine.startsWith('>')) {
                    // Si on utilise 'type note', on bloque 'type warning' avec la clé commune 'type'
                    addItem('type note', 'type note', 'Bloc Note (bleu)', vscode.CompletionItemKind.Enum, 'type');
                    addItem('type warning', 'type warning', 'Bloc Attention (orange)', vscode.CompletionItemKind.Enum, 'type');
                    addItem('type error', 'type error', 'Bloc Erreur (rouge)', vscode.CompletionItemKind.Enum, 'type');
                }

                // --- ACTIONS GLOBALES ---
                addItem('layout pagebreak', 'layout pagebreak', 'Saut de page', vscode.CompletionItemKind.Keyword, 'layout');

                return completions;
            }
        },
        ':'
    );

    context.subscriptions.push(previewDisposable, exportDisposable, exportTypstDisposable, markdownPreviewDisposable, completionProvider);
}

// -- Fonctions d'interface HTML --

function getSvgHtml(svgContent: string) {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <style>
            body { 
                background-color: var(--vscode-editor-background); 
                margin: 0; padding: 40px 20px; 
                display: flex; 
                flex-direction: column; /* Empile les pages verticalement */
                align-items: center; 
                gap: 30px; /* Espace entre les pages */
            }
            .page { 
                background: white; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
                /* Les SVGs Typst gardent leurs dimensions, on s'assure qu'ils tiennent à l'écran */
                max-width: 100%;
                height: auto;
            }
            svg { 
                display: block;
                width: 100%;
                height: auto;
            }
        </style>
    </head>
    <body>
        ${svgContent}
    </body>
    </html>`;
}

function getMarkdownHtml(bodyContent: string) {
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
            blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 15px; color: opacity(0.8); }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid var(--vscode-panel-border); padding: 8px 12px; }
            th { background: rgba(0,0,0,0.05); }
            
            /* Le style de nos annotations Typst */
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

function getErrorHtml(title: string, message: string) {
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
        <pre><code>${escapeHtml(message)}</code></pre>
    </body>
    </html>`;
}

function escapeHtml(unsafe: string) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function deactivate() {
    for (const session of activeSessions) {
        try {
            if (fs.existsSync(session.dir)) {
                const files = fs.readdirSync(session.dir);
                for (const file of files) {
                    if (file.startsWith(`.mk4-temp-${session.id}`)) {
                        const filePath = path.join(session.dir, file);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Erreur de nettoyage final:", err);
        }
    }
}