import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { compileMarkdownToTypst, compileMarkdownToHtml } from './parser';

let activeSessions: { dir: string, id: string }[] = [];

export function activate(context: vscode.ExtensionContext) {
	// nettoyage des fichiers fantôme
	vscode.workspace.findFiles('**/.mk4-{temp,export}-*').then(files => {
        for (const file of files) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {
                // On ignore silencieusement si le fichier est verrouillé
            }
        }
    });
	vscode.workspace.findFiles('**/.mk4-export.typ').then(files => {
        for (const file of files) {
            try {
                fs.unlinkSync(file.fsPath);
            } catch (e) {
                // On ignore silencieusement si le fichier est verrouillé
            }
        }
    });

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('mk4');

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

        // Récupère la racine de l'espace de travail VS Code actuel
        // Utiliser pour l'ouverture d'image dans d'autre dossier
        const workspaceFolders = vscode.workspace.workspaceFolders;

        // Si un dossier est ouvert dans VS Code, on l'utilise comme racine de sécurité Typst.
        // Sinon, on prend au moins le dossier où se trouve le fichier Markdown.
        const rootPath = workspaceFolders 
            ? workspaceFolders[0].uri.fsPath 
            : baseDir;

        const updateWebview = () => {
            const text = editor.document.getText();
            const annotationWarnings = validateAnnotations(text, editor.document);
            
            try {
                const typstCode = compileMarkdownToTypst(text, editor.document.uri.fsPath, context);
                fs.writeFileSync(tempTypstFile, typstCode, 'utf8');

                // Nettoyage des SVG de la compilation précédente (évite les pages fantômes)
                try {
                    const existingFiles = fs.readdirSync(baseDir);
                    for (const file of existingFiles) {
                        if (file.startsWith(`.mk4-temp-${sessionId}-`) && file.endsWith('.svg')) {
                            fs.unlinkSync(path.join(baseDir, file));
                        }
                    }
                } catch (e) { /* ignore */ }

                // On compile avec le pattern {n}
                exec(`typst compile "${tempTypstFile}" "${tempSvgPattern}" --root "${rootPath}"`, (error, stdout, stderr) => {
                    if (error) {
                        const shortError = error.message.split('\n')[0] || "Erreur de compilation";
    
                        // On envoie un message à la Webview pour afficher le bandeau
                        panel.webview.postMessage({ 
                            type: 'showError', 
                            text: shortError 
                        });

                        // Soulignement rouge des erreurs dans l'éditeur
                        const errorSource = stderr || error.message;
                        const errors = parseTypstErrors(errorSource, typstCode);
                        const diagnostics: vscode.Diagnostic[] = errors.map(err => {
                            const lineIdx = Math.max(0, Math.min(err.line - 1, editor.document.lineCount - 1));
                            const lineText = editor.document.lineAt(lineIdx).text;
                            const range = new vscode.Range(lineIdx, 0, lineIdx, lineText.length);
                            const diag = new vscode.Diagnostic(range, err.message, vscode.DiagnosticSeverity.Error);
                            diag.source = 'MK4';
                            return diag;
                        });
                        diagnosticCollection.set(editor.document.uri, [...diagnostics, ...annotationWarnings]);
                        
                        return;
                    } else {
                        panel.webview.postMessage({ type: 'clearError' });
                        diagnosticCollection.set(editor.document.uri, annotationWarnings);
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
                        // Query pour les positions physiques de tous les blocs
                        const evalExpr = `query(<mk4_loc>).map(el => (value: el.value, pos: el.location().position()))`;
                        exec(`typst eval "${evalExpr}" --in "${tempTypstFile}" --root "${rootPath}"`, (qErr, qStdout, qStderr) => {
                            let mapJson = "[]";
                            if (!qErr && qStdout) {
                                mapJson = qStdout.trim();
                            }
                            panel.webview.html = getSvgHtml(allPagesHtml, mapJson);
                        });
                        
                    } catch (readErr: any) {
                        panel.webview.html = getErrorHtml("Erreur SVG", readErr.message);
                    }
                });

            } catch (err: any) {
                panel.webview.html = getErrorHtml("Erreur de Parsing", err.message);
                const diag = new vscode.Diagnostic(
                    new vscode.Range(0, 0, 0, 0),
                    err.message,
                    vscode.DiagnosticSeverity.Error
                );
                diag.source = 'MK4';
                diagnosticCollection.set(editor.document.uri, [diag, ...annotationWarnings]);
            }
        };

        updateWebview();

        // --- Garde anti-boucle ---
        let isScrollingFromWebview = false;
        let webviewScrollTimeout: ReturnType<typeof setTimeout> | null = null;

        // --- Preview → Éditeur ---
        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'revealLine') {
                isScrollingFromWebview = true;
                if (webviewScrollTimeout) {
                    clearTimeout(webviewScrollTimeout);
                }
                webviewScrollTimeout = setTimeout(() => { isScrollingFromWebview = false; }, 150);

                const line = Math.max(0, Math.min(message.line - 1, editor.document.lineCount - 1));
                const range = new vscode.Range(line, 0, line, 0);
                editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
            }
        });

        // --- Éditeur → Preview ---
        let scrollPending = false;
        const scrollSub = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            if (e.textEditor === editor) {
                if (isScrollingFromWebview) {
                    return;
                }
                if (scrollPending) {
                    return;
                }
                scrollPending = true;

                setImmediate(() => {
                    scrollPending = false;
                    const visibleRanges = e.visibleRanges;
                    if (visibleRanges.length > 0) {
                        const topVisibleLine = visibleRanges[0].start.line;
                        panel.webview.postMessage({
                            command: 'syncScroll',
                            line: topVisibleLine + 1
                        });
                    }
                });
            }
        });

        let updateTimeout: ReturnType<typeof setTimeout> | null = null;

        const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === editor.document) {
                if (updateTimeout) { clearTimeout(updateTimeout); }
                updateTimeout = setTimeout(() => updateWebview(), 300);
            }
        });

        panel.onDidDispose(() => {
            changeSub.dispose();
            scrollSub.dispose();
            diagnosticCollection.delete(editor.document.uri);

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

        // Écouter les changements dans les paramètres VS Code
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                // Vérifier si le changement concerne notre extension MK4
                if (event.affectsConfiguration('mk4.typst.defaultTheme') || 
                    event.affectsConfiguration('mk4.typst.customThemePath')) {
                    
                    // Forcer la mise à jour de la Webview immédiatement
                    updateWebview();
                }
            })
        );
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
                    const typstCode = compileMarkdownToTypst(text, editor.document.uri.fsPath, context);
                    
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
            const typstCode = compileMarkdownToTypst(text, mdPath, context);
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

                // --- DOCUMENT ---
                if (targetLine === '') {
                    addItem('title', 'title ', 'Titre principal du document', vscode.CompletionItemKind.Property);
                    addItem('subtitle', 'subtitle ', 'Sous-titre du document', vscode.CompletionItemKind.Property);
                    addItem('author', 'author ', 'Auteur du document', vscode.CompletionItemKind.Property);
                    addItem('date', 'date ', 'Date du document', vscode.CompletionItemKind.Property);
                    addItem('theme', 'theme ', 'Chemin vers un template Typst externe', vscode.CompletionItemKind.Property);
                    addItem('lang', 'lang ', 'Langue du document (ex: fr, en)', vscode.CompletionItemKind.Property);
                    addItem('numbering', 'numbering "1.1"', 'Format de numérotation des titres (ex: 1.1, I.a)', vscode.CompletionItemKind.Property);
                    
                    // On utilise le 5ème paramètre pour filtrer la clé de base
                    addItem('toc true', 'toc true', 'Afficher la table des matières', vscode.CompletionItemKind.Value, 'toc');
                    addItem('toc false', 'toc false', 'Masquer la table des matières', vscode.CompletionItemKind.Value, 'toc');
                }

                // --- CLÉS UNIVERSELLES ---
                if (targetLine !== '') {
                    addItem('id', 'id ', 'Identifiant Typst (ex: mon_titre)', vscode.CompletionItemKind.Property);
                    
                    // On propose les alignements fréquents pour faire gagner du temps
                    addItem('align center', 'align center', 'Centrer l\'élément', vscode.CompletionItemKind.Value, 'align');
                    addItem('align left', 'align left', 'Aligner à gauche', vscode.CompletionItemKind.Value, 'align');
                    addItem('align right', 'align right', 'Aligner à droite', vscode.CompletionItemKind.Value, 'align');
                }

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
                    addItem('lines true', 'lines true', 'Afficher les numéros de ligne (Code)', vscode.CompletionItemKind.Value, 'lines');
                    addItem('lines false', 'lines false', 'Masquer les numéros de ligne', vscode.CompletionItemKind.Value, 'lines');
                    addItem('highlight', 'highlight ', 'Lignes à surligner (ex: 2-4)', vscode.CompletionItemKind.Property);
                } 
                // --- CONTEXTE : CITATIONS (>) ---
                else if (targetLine.startsWith('>')) {
                    // Si on utilise 'type note', on bloque 'type warning' avec la clé commune 'type'
                    addItem('type note', 'type note', 'Bloc Note (bleu)', vscode.CompletionItemKind.Enum, 'type');
                    addItem('type info', 'type info', 'Bloc Info (bleu claire)', vscode.CompletionItemKind.Enum, 'type');
                    addItem('type tip', 'type tip', 'Bloc Astuce (vert)', vscode.CompletionItemKind.Enum, 'type');
                    addItem('type warning', 'type warning', 'Bloc Attention (orange)', vscode.CompletionItemKind.Enum, 'type');
                    addItem('type error', 'type error', 'Bloc Erreur (rouge)', vscode.CompletionItemKind.Enum, 'type');
                }
                // --- CONTEXTE : TABLE (|)
                else if (targetLine.startsWith('|')) {
                    addItem('caption', 'caption ', 'Légende du tableau', vscode.CompletionItemKind.Property);
                    addItem('compact true', 'compact true', 'Rendre le tableau plus compact (texte plus petit, marges réduites)', vscode.CompletionItemKind.Value, 'compact');
                }

                // --- ACTIONS GLOBALES ---
                addItem('layout pagebreak', 'layout pagebreak', 'Saut de page', vscode.CompletionItemKind.Keyword, 'layout');

                return completions;
            }
        },
        ':'
    );

    context.subscriptions.push(previewDisposable, exportDisposable, exportTypstDisposable, markdownPreviewDisposable, completionProvider, diagnosticCollection);
}

// -- Validation des annotations Markdown --

const DOCUMENT_KEYS = new Set(['title', 'subtitle', 'author', 'date', 'theme', 'lang', 'numbering', 'toc']);
const UNIVERSAL_KEYS = new Set(['id', 'align', 'layout']);
const CONTEXT_KEYS: Record<string, Set<string>> = {
    heading:    new Set(['short', 'numbering']),
    image:      new Set(['caption', 'width']),
    code:       new Set(['caption', 'filename', 'lines', 'highlight']),
    blockquote: new Set(['type', 'author', 'link', 'source']),
    table:      new Set(['caption', 'compact']),
};

function detectContext(contextLine: string): string {
    if (contextLine === '') { return 'document'; }
    if (contextLine.startsWith('#')) { return 'heading'; }
    if (contextLine.startsWith('![')) { return 'image'; }
    if (contextLine.startsWith('```')) { return 'code'; }
    if (contextLine.startsWith('>')) { return 'blockquote'; }
    if (contextLine.startsWith('|')) { return 'table'; }
    return 'paragraph';
}

function validateAnnotations(text: string, document: vscode.TextDocument): vscode.Diagnostic[] {
    const lines = text.split(/\r?\n/);
    const diagnostics: vscode.Diagnostic[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed.startsWith(':')) { continue; }

        const keyMatch = trimmed.match(/^:([a-zA-Z0-9_-]+)/);
        if (!keyMatch) { continue; }
        const key = keyMatch[1];

        // Remonter pour trouver l'élément parent (première ligne non-annotation, non-vide)
        let contextLine = '';
        let j = i - 1;
        while (j >= 0) {
            const prev = lines[j].trim();
            if (prev === '' || prev.startsWith(':')) { j--; continue; }
            contextLine = prev;
            break;
        }

        const ctx = detectContext(contextLine);

        // Construire l'ensemble des clés valides pour ce contexte
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

// -- Fonctions d'analyse des erreurs Typst --

function buildTypstToMdLineMap(typstCode: string): number[] {
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

function parseTypstErrors(stderr: string, typstCode: string): { line: number, message: string }[] {
    const lineMap = buildTypstToMdLineMap(typstCode);
    const results: { line: number, message: string }[] = [];
    
    const stderrLines = stderr.split(/\r?\n/);
    let currentMessage = 'Erreur de compilation Typst';
    
    for (const stderrLine of stderrLines) {
        // Capture le message d'erreur (ex: "error: unknown variable: xyz")
        const errMatch = stderrLine.match(/^error:\s*(.+)/);
        if (errMatch) {
            currentMessage = errMatch[1].trim();
        }
        
        // Capture la référence fichier:ligne:colonne (ex: ".mk4-temp-abc.typ:15:3")
        const refMatch = stderrLine.match(/\.typ:(\d+):(\d+)/);
        if (refMatch) {
            const typLine = parseInt(refMatch[1]) - 1; // index 0-based
            const mdLine = (typLine >= 0 && typLine < lineMap.length) ? lineMap[typLine] : 1;
            results.push({ line: mdLine, message: currentMessage });
        }
    }
    
    return results;
}

// -- Fonctions d'interface HTML --

function getSvgHtml(svgContent: string, mapJson: string = "[]") {
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
        <div id="error-banner" style="display: none; position: fixed; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 10px 15px; border-radius: 5px; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-family: sans-serif; max-width: 300px; font-size: 12px;">
            <strong>Erreur Typst</strong><br>
            <span id="error-text"></span>
        </div>

        ${svgContent}
        
        <script>
            // Erreur typst
            const errorBanner = document.getElementById('error-banner');
            const errorText = document.getElementById('error-text');

            // Écouter les messages venant de l'extension
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'showError') {
                    errorText.textContent = message.text;
                    errorBanner.style.display = 'block';
                } else if (message.type === 'clearError') {
                    errorBanner.style.display = 'none';
                }
            });

            // scroll automatique
            const vscode = acquireVsCodeApi();
            let currentMap = [];
            let absYCache = [];  // cache des positions absolues en px
            let isScrollingFromEditor = false;
            let editorScrollTimer = null;

            try {
                const rawMap = ${mapJson};
                currentMap = rawMap.map(item => ({
                    line: parseInt(item.value),
                    page: item.pos.page,
                    y: parseFloat(String(item.pos.y).replace('pt', ''))
                })).sort((a, b) => a.line - b.line);
            } catch (e) {
                console.error('Map parsing error', e);
            }

            // Convertit une ancre {page, y(pt)} en position absolue en pixels dans le scroll
            function getAbsoluteY(anchor) {
                const pages = document.querySelectorAll('.page');
                const pageDiv = pages[anchor.page - 1];
                if (!pageDiv) return 0;

                const svg = pageDiv.querySelector('svg');
                if (!svg) return 0;

                const svgNativeHeight = parseFloat(svg.getAttribute('height')) || 1;
                const svgDomHeight = svg.getBoundingClientRect().height;
                const ratio = svgDomHeight / svgNativeHeight;

                return pageDiv.offsetTop + (anchor.y * ratio);
            }

            // Reconstruit le cache des Y absolus (après chargement ou resize)
            function rebuildAbsYCache() {
                absYCache = currentMap.map(a => getAbsoluteY(a));
            }
            window.addEventListener('load', rebuildAbsYCache);
            window.addEventListener('resize', rebuildAbsYCache);

            // ========== Éditeur → Preview ==========
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'syncScroll') {
                    if (currentMap.length === 0) return;

                    // Poser le verrou
                    isScrollingFromEditor = true;
                    if (editorScrollTimer) clearTimeout(editorScrollTimer);
                    editorScrollTimer = setTimeout(() => { isScrollingFromEditor = false; }, 300);

                    const targetLine = message.line;

                    // Trouver les deux ancres encadrant la ligne courante
                    let prevIdx = -1;
                    for (let i = 0; i < currentMap.length; i++) {
                        if (currentMap[i].line <= targetLine) {
                            prevIdx = i;
                        } else {
                            break;
                        }
                    }

                    const prev = prevIdx >= 0 ? currentMap[prevIdx] : null;
                    const next = (prevIdx + 1 < currentMap.length) ? currentMap[prevIdx + 1] : null;
                    const prevAbsY = prev ? absYCache[prevIdx] : null;
                    const nextAbsY = next ? absYCache[prevIdx + 1] : null;

                    let targetY;

                    if (prev && next && next.line > prev.line) {
                        const ratio = (targetLine - prev.line) / (next.line - prev.line);
                        targetY = prevAbsY + ratio * (nextAbsY - prevAbsY);
                    } else if (prev) {
                        targetY = prevAbsY;
                    } else if (next) {
                        targetY = nextAbsY;
                    } else {
                        return;
                    }

                    const topOffset = window.innerHeight * 0.33;
                    window.scrollTo({
                        top: Math.max(0, targetY - topOffset),
                        behavior: 'smooth'
                    });
                }
            });

            // ========== Preview → Éditeur ==========
            let scrollScheduled = false;
            window.addEventListener('scroll', () => {
                if (isScrollingFromEditor || currentMap.length === 0) return;
                if (scrollScheduled) return;
                scrollScheduled = true;

                requestAnimationFrame(() => {
                    scrollScheduled = false;
                    if (absYCache.length === 0) rebuildAbsYCache();

                    const topOffset = window.innerHeight * 0.33;
                    const currentY = window.scrollY + topOffset;

                    // Trouver les deux ancres encadrant cette position Y
                    let prevIdx = -1;
                    for (let i = 0; i < absYCache.length; i++) {
                        if (absYCache[i] <= currentY) {
                            prevIdx = i;
                        } else {
                            break;
                        }
                    }

                    const prev = prevIdx >= 0 ? currentMap[prevIdx] : null;
                    const next = (prevIdx + 1 < currentMap.length) ? currentMap[prevIdx + 1] : null;
                    const prevAbsY = prevIdx >= 0 ? absYCache[prevIdx] : null;
                    const nextAbsY = (prevIdx + 1 < absYCache.length) ? absYCache[prevIdx + 1] : null;

                    let targetLine;

                    if (prev && next && nextAbsY > prevAbsY) {
                        const ratio = (currentY - prevAbsY) / (nextAbsY - prevAbsY);
                        targetLine = prev.line + ratio * (next.line - prev.line);
                    } else if (prev) {
                        targetLine = prev.line;
                    } else if (next) {
                        targetLine = next.line;
                    } else {
                        return;
                    }

                    vscode.postMessage({
                        command: 'revealLine',
                        line: Math.round(targetLine)
                    });
                });
            });
        </script>
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
    const cleanedDirs = new Set<string>();
    for (const session of activeSessions) {
        try {
            if (fs.existsSync(session.dir)) {
                cleanedDirs.add(session.dir);
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

    // Nettoyage des fichiers d'export orphelins
    for (const dir of cleanedDirs) {
        try {
            const exportFile = path.join(dir, '.mk4-export.typ');
            if (fs.existsSync(exportFile)) {
                fs.unlinkSync(exportFile);
            }
        } catch (err) {
            // On ignore silencieusement
        }
    }
}