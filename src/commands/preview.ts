import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile, ChildProcess } from 'child_process';
import { compileMarkdownToTypst } from '../parser';
import { normalizeFsPath, LineSourceMap } from '../parser/includes';
import { validateAnnotations, parseTypstErrors } from '../providers/diagnostics';
import { getSvgHtml } from '../webviews/preview-html';
import { getTypstBinary } from '../typst-binary';

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

/** Calcule le chemin racine pour l'option --root de Typst */
export function getTypstRootPath(docPath: string): string {
    const baseDir = path.dirname(docPath);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const wsPath = folder.uri.fsPath;
            const rel = path.relative(wsPath, docPath);
            if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
                return wsPath;
            }
        }
    }
    return baseDir;
}

/**
 * Enregistre la commande `mk4.showPreview` et gère le cycle de vie de la webview Typst.
 *
 * Améliorations :
 *  - #2  : Anti race-condition — le process typst précédent est annulé avant d'en démarrer un nouveau.
 *  - #16 : DOM incrémental — la webview est initialisée une fois ; les mises à jour
 *          se font via postMessage { type: 'update' } sans recharger toute la page.
 *  - Dépendances : Mise à jour automatique en temps réel lors de la modification de fichiers :include ou thèmes.
 */
export function registerPreviewCommand(
    context: vscode.ExtensionContext,
    diagnosticCollection: vscode.DiagnosticCollection,
    activeSessions: { dir: string; id: string }[]
): vscode.Disposable {
    return vscode.commands.registerCommand('mk4.showPreview', () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showInformationMessage("Veuillez ouvrir un fichier Markdown pour lancer l'aperçu.");
            return;
        }

        if (editor.document.isUntitled) {
            vscode.window.showWarningMessage("Veuillez d'abord sauvegarder votre fichier Markdown (Ctrl+S).");
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'mk4Preview',
            'Aperçu MK4',
            vscode.ViewColumn.Beside,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.iconPath = {
            light: vscode.Uri.joinPath(
                context.extensionUri,
                'resources',
                'icons',
                'preview-light.svg'
            ),
            dark: vscode.Uri.joinPath(
                context.extensionUri,
                'resources',
                'icons',
                'preview-dark.svg'
            )
        };

        // --- #16 : Initialisation unique du HTML ---
        panel.webview.html = getSvgHtml();

        const baseDir = path.dirname(editor.document.uri.fsPath);
        const sessionId = Math.random().toString(36).substring(2, 9);
        activeSessions.push({ dir: baseDir, id: sessionId });

        const tempTypstFile = path.join(baseDir, `.mk4-temp-${sessionId}.typ`);
        const tempSvgPattern = path.join(baseDir, `.mk4-temp-${sessionId}-{n}.svg`);
        const tempSvgBase = path.join(baseDir, `.mk4-temp-${sessionId}-`);

        const rootPath = getTypstRootPath(editor.document.uri.fsPath);

        // --- Dépendances suivies (fichiers inclus, thème, biblio) ---
        const activeDependencies = new Set<string>();
        let currentSourceMap: LineSourceMap | null = null;
        const subFilesWithDiagnostics = new Set<string>();

        const clearSubFileDiagnostics = () => {
            for (const subNorm of subFilesWithDiagnostics) {
                const openDoc = vscode.workspace.textDocuments.find(d => normalizeFsPath(d.uri.fsPath) === subNorm);
                if (openDoc && normalizeFsPath(openDoc.uri.fsPath) !== normalizeFsPath(editor.document.uri.fsPath)) {
                    const subWarnings = validateAnnotations(openDoc.getText(), openDoc);
                    diagnosticCollection.set(openDoc.uri, subWarnings);
                } else {
                    for (const [uri] of diagnosticCollection) {
                        if (normalizeFsPath(uri.fsPath) === subNorm) {
                            diagnosticCollection.delete(uri);
                        }
                    }
                }
            }
            subFilesWithDiagnostics.clear();
        };

        // --- #2 : Référence au process actif pour pouvoir l'annuler ---
        let activeCompileProcess: ChildProcess | null = null;
        let activeEvalProcess: ChildProcess | null = null;

        const updateWebview = () => {
            const text = editor.document.getText();
            const annotationWarnings = validateAnnotations(text, editor.document);

            try {
                const dependencies = new Set<string>();
                const sourceMap = new LineSourceMap();
                const typstCode = compileMarkdownToTypst(text, editor.document.uri.fsPath, context, {
                    dependencies,
                    readFile: getDocumentOrDiskContent,
                    sourceMap,
                });
                currentSourceMap = sourceMap;

                // Mettre à jour la liste des dépendances actives
                activeDependencies.clear();
                for (const dep of dependencies) {
                    activeDependencies.add(normalizeFsPath(dep));
                }

                fs.writeFileSync(tempTypstFile, typstCode, 'utf8');

                // Nettoyage des SVG précédents (évite les pages fantômes)
                try {
                    const existingFiles = fs.readdirSync(baseDir);
                    for (const file of existingFiles) {
                        if (file.startsWith(`.mk4-temp-${sessionId}-`) && file.endsWith('.svg')) {
                            fs.unlinkSync(path.join(baseDir, file));
                        }
                    }
                } catch { /* ignore */ }

                // --- #2 : Annuler les compilations précédentes en cours ---
                if (activeEvalProcess) {
                    activeEvalProcess.kill();
                    activeEvalProcess = null;
                }
                if (activeCompileProcess) {
                    activeCompileProcess.kill();
                    activeCompileProcess = null;
                }

                activeCompileProcess = execFile(
                    getTypstBinary(context),
                    ['compile', tempTypstFile, tempSvgPattern, '--root', rootPath],
                    (error, _stdout, stderr) => {
                        activeCompileProcess = null;

                        if (error) {
                            console.error('[MK4] Erreur de compilation Typst :', stderr || error.message);
                            const shortError = error.message.split('\n')[0] || 'Erreur de compilation';
                            panel.webview.postMessage({ type: 'showError', text: shortError });

                            clearSubFileDiagnostics();

                            const errors = parseTypstErrors(stderr || error.message, typstCode, sourceMap, editor.document.uri.fsPath);
                            const diagnostics: vscode.Diagnostic[] = errors.map(err => {
                                const lineIdx = Math.max(0, Math.min(err.line - 1, editor.document.lineCount - 1));
                                const lineText = editor.document.lineAt(lineIdx).text;
                                const range = new vscode.Range(lineIdx, 0, lineIdx, lineText.length);
                                const diag = new vscode.Diagnostic(range, err.message, vscode.DiagnosticSeverity.Error);
                                diag.source = 'MK4';
                                return diag;
                            });
                            diagnosticCollection.set(editor.document.uri, [...diagnostics, ...annotationWarnings]);

                            // Attribuer aussi les erreurs directement sur les sous-fichiers ouverts
                            for (const err of errors) {
                                if (err.sourceFile && normalizeFsPath(err.sourceFile) !== normalizeFsPath(editor.document.uri.fsPath)) {
                                    const subNorm = normalizeFsPath(err.sourceFile);
                                    subFilesWithDiagnostics.add(subNorm);
                                    const openSub = vscode.workspace.textDocuments.find(d => normalizeFsPath(d.uri.fsPath) === subNorm);
                                    if (openSub) {
                                        const sLine = Math.max(0, Math.min((err.sourceLine || 1) - 1, openSub.lineCount - 1));
                                        const sText = openSub.lineAt(sLine).text;
                                        const sRange = new vscode.Range(sLine, 0, sLine, sText.length);
                                        const sDiag = new vscode.Diagnostic(sRange, err.message, vscode.DiagnosticSeverity.Error);
                                        sDiag.source = 'MK4';
                                        diagnosticCollection.set(openSub.uri, [sDiag]);
                                    }
                                }
                            }
                            return;
                        }

                        clearSubFileDiagnostics();
                        diagnosticCollection.set(editor.document.uri, annotationWarnings);

                        // Lire les SVG générés
                        let pageNum = 1;
                        const pages: string[] = [];
                        try {
                            while (true) {
                                const pagePath = `${tempSvgBase}${pageNum}.svg`;
                                if (fs.existsSync(pagePath)) {
                                    pages.push(fs.readFileSync(pagePath, 'utf8'));
                                    pageNum++;
                                } else {
                                    break;
                                }
                            }
                        } catch { /* ignore */ }

                        // Lancer typst eval pour la map de positions (scroll sync)
                        const evalExpr = `query(<mk4_loc>).map(el => (value: el.value, pos: el.location().position()))`;
                        activeEvalProcess = execFile(
                            getTypstBinary(context),
                            ['eval', evalExpr, '--in', tempTypstFile, '--root', rootPath],
                            (qErr, qStdout) => {
                                activeEvalProcess = null;

                                let map: any[] = [];
                                if (!qErr && qStdout) {
                                    try { map = JSON.parse(qStdout.trim()); } catch { map = []; }
                                }

                                // --- #16 : Mise à jour incrémentale du DOM ---
                                panel.webview.postMessage({ type: 'update', pages, map });
                            }
                        );
                    }
                );
            } catch (err: any) {
                panel.webview.postMessage({ type: 'showError', text: err.message });
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

        // --- Garde anti-boucle de scroll ---
        let isScrollingFromWebview = false;
        let webviewScrollTimeout: ReturnType<typeof setTimeout> | null = null;

        // Preview → Éditeur
        panel.webview.onDidReceiveMessage(async message => {
            if (message.command === 'openSource') {
                const targetLine = message.line;
                const loc = currentSourceMap ? currentSourceMap.get(targetLine) : { file: editor.document.uri.fsPath, line: targetLine };
                const targetFilePath = loc?.file || editor.document.uri.fsPath;
                const targetFileLine = loc?.line ? Math.max(0, loc.line - 1) : Math.max(0, targetLine - 1);

                if (normalizeFsPath(targetFilePath) === normalizeFsPath(editor.document.uri.fsPath)) {
                    const line = Math.min(targetFileLine, editor.document.lineCount - 1);
                    const range = new vscode.Range(line, 0, line, 0);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    editor.selection = new vscode.Selection(range.start, range.end);
                } else {
                    try {
                        const doc = await vscode.workspace.openTextDocument(targetFilePath);
                        const targetEditor = await vscode.window.showTextDocument(doc, {
                            viewColumn: vscode.ViewColumn.One,
                            preserveFocus: false,
                        });
                        const line = Math.min(targetFileLine, doc.lineCount - 1);
                        const range = new vscode.Range(line, 0, line, 0);
                        targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                        targetEditor.selection = new vscode.Selection(range.start, range.end);
                    } catch (openErr) {
                        console.error("Impossible d'ouvrir le fichier source :", targetFilePath, openErr);
                    }
                }
            } else if (message.command === 'revealLine') {
                // Preview → Éditeur (scroll sync)
                const scrollSyncEnabled = vscode.workspace.getConfiguration('mk4').get<boolean>('preview.enableScrollSync') ?? true;
                if (!scrollSyncEnabled) { return; }

                isScrollingFromWebview = true;
                if (webviewScrollTimeout) { clearTimeout(webviewScrollTimeout); }
                webviewScrollTimeout = setTimeout(() => { isScrollingFromWebview = false; }, 150);

                const line = Math.max(0, Math.min(message.line - 1, editor.document.lineCount - 1));
                const range = new vscode.Range(line, 0, line, 0);
                editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
            }
        });

        // Éditeur → Preview (scroll sync)
        let scrollPending = false;
        const scrollSub = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            if (e.textEditor === editor) {
                const scrollSyncEnabled = vscode.workspace.getConfiguration('mk4').get<boolean>('preview.enableScrollSync') ?? true;
                if (!scrollSyncEnabled) { return; }
                if (isScrollingFromWebview) { return; }
                if (scrollPending) { return; }
                scrollPending = true;

                setImmediate(() => {
                    scrollPending = false;
                    const visibleRanges = e.visibleRanges;
                    if (visibleRanges.length > 0) {
                        panel.webview.postMessage({
                            command: 'syncScroll',
                            line: visibleRanges[0].start.line + 1
                        });
                    }
                });
            }
        });

        let updateTimeout: ReturnType<typeof setTimeout> | null = null;

        // Détection de frappe dans le document racine OU dans l'une de ses dépendances ouvertes
        const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
            const changedPath = normalizeFsPath(e.document.uri.fsPath);
            const rootPathNorm = normalizeFsPath(editor.document.uri.fsPath);

            if (changedPath === rootPathNorm || activeDependencies.has(changedPath)) {
                if (updateTimeout) { clearTimeout(updateTimeout); }
                const debounce = vscode.workspace.getConfiguration('mk4').get<number>('preview.debounceMs') ?? 300;
                updateTimeout = setTimeout(() => updateWebview(), debounce);
            }
        });

        // Surveillance des modifications sur le système de fichiers (fichiers non ouverts dans l'éditeur)
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        const onFsChange = (uri: vscode.Uri) => {
            const changedPath = normalizeFsPath(uri.fsPath);
            const rootPathNorm = normalizeFsPath(editor.document.uri.fsPath);

            if (changedPath === rootPathNorm || activeDependencies.has(changedPath)) {
                if (updateTimeout) { clearTimeout(updateTimeout); }
                const debounce = vscode.workspace.getConfiguration('mk4').get<number>('preview.debounceMs') ?? 300;
                updateTimeout = setTimeout(() => updateWebview(), debounce);
            }
        };
        const watcherChangeSub = fileWatcher.onDidChange(onFsChange);
        const watcherCreateSub = fileWatcher.onDidCreate(onFsChange);
        const watcherDeleteSub = fileWatcher.onDidDelete(onFsChange);

        panel.onDidDispose(() => {
            changeSub.dispose();
            scrollSub.dispose();
            fileWatcher.dispose();
            watcherChangeSub.dispose();
            watcherCreateSub.dispose();
            watcherDeleteSub.dispose();
            clearSubFileDiagnostics();
            diagnosticCollection.delete(editor.document.uri);

            // Tuer les process en cours si la webview est fermée
            if (activeCompileProcess) { activeCompileProcess.kill(); }
            if (activeEvalProcess) { activeEvalProcess.kill(); }

            // Retirer la session
            const idx = activeSessions.findIndex(s => s.id === sessionId);
            if (idx !== -1) { activeSessions.splice(idx, 1); }

            // Nettoyer les fichiers temporaires
            try {
                const files = fs.readdirSync(baseDir);
                for (const file of files) {
                    if (file.startsWith(`.mk4-temp-${sessionId}`)) {
                        const filePath = path.join(baseDir, file);
                        if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
                    }
                }
            } catch (err) { console.error(err); }
        }, null, context.subscriptions);

        // Réagir aux changements de configuration VS Code
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                if (
                    event.affectsConfiguration('mk4.typst.defaultTheme') ||
                    event.affectsConfiguration('mk4.typst.customThemePath') ||
                    event.affectsConfiguration('mk4.typst.lang') ||
                    event.affectsConfiguration('mk4.typst.pageMargin') ||
                    event.affectsConfiguration('mk4.typst.pageNumbering') ||
                    event.affectsConfiguration('mk4.typst.fontFamily') ||
                    event.affectsConfiguration('mk4.typst.fontSize') ||
                    event.affectsConfiguration('mk4.typst.syntaxHighlighting')
                ) {
                    updateWebview();
                }
            })
        );
    });
}
