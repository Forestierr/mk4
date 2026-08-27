import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { compileMarkdownToTypst } from '../parser';
import { getTypstRootPath } from './preview';
import { getTypstBinary } from '../typst-binary';

/**
 * Enregistre les commandes `mk4.exportPdf` et `mk4.exportTypst`.
 */
export function registerExportCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
    const exportPdf = vscode.commands.registerCommand('mk4.exportPdf', () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showErrorMessage("Veuillez ouvrir un fichier Markdown pour l'exporter.");
            return;
        }

        if (editor.document.isUntitled) {
            vscode.window.showWarningMessage("Veuillez d'abord sauvegarder votre fichier Markdown (Ctrl+S).");
            return;
        }

        const mdPath = editor.document.uri.fsPath;
        const pdfPath = mdPath.replace(/\.md$/, '.pdf');

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Génération du PDF Typst en cours...',
            cancellable: false
        }, async () => {
            return new Promise<void>((resolve) => {
                try {
                    const text = editor.document.getText();
                    const typstCode = compileMarkdownToTypst(text, mdPath, context);

                    const baseDir = path.dirname(mdPath);
                    const rootPath = getTypstRootPath(mdPath);
                    const tempExportTypst = path.join(baseDir, '.mk4-export.typ');
                    fs.writeFileSync(tempExportTypst, typstCode, 'utf8');

                    execFile(getTypstBinary(context), ['compile', tempExportTypst, pdfPath, '--root', rootPath], (error, _stdout, stderr) => {
                        if (fs.existsSync(tempExportTypst)) {
                            fs.unlinkSync(tempExportTypst);
                        }

                        if (error) {
                            vscode.window.showErrorMessage(`Erreur de compilation Typst : ${stderr || error.message}`);
                            resolve();
                            return;
                        }

                        vscode.window.showInformationMessage('PDF généré avec succès !', 'Ouvrir le PDF').then(choice => {
                            if (choice === 'Ouvrir le PDF') {
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

    const exportTypst = vscode.commands.registerCommand('mk4.exportTypst', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.isUntitled) { return; }

        const mdPath = editor.document.uri.fsPath;
        const typPath = mdPath.replace(/\.md$/, '.typ');

        try {
            const text = editor.document.getText();
            const typstCode = compileMarkdownToTypst(text, mdPath, context);
            fs.writeFileSync(typPath, typstCode, 'utf8');

            vscode.window.showInformationMessage('Code Typst généré avec succès !', 'Ouvrir').then(choice => {
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

    return [exportPdf, exportTypst];
}
