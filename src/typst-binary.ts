import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Retourne le chemin absolu vers le binaire Typst bundlé dans l'extension.
 *
 * En production (extension installée depuis le marketplace), le binaire est
 * toujours présent dans `dist/typst[.exe]`.
 *
 * En développement local (sans avoir exécuté `npm run vscode:prepublish`),
 * si le binaire bundlé est absent, on retourne `'typst'` pour utiliser
 * le binaire du PATH système comme fallback.
 */
export function getTypstBinary(context: vscode.ExtensionContext): string {
    const binaryName = process.platform === 'win32' ? 'typst.exe' : 'typst';
    const bundledPath = path.join(context.extensionPath, 'dist', binaryName);

    if (fs.existsSync(bundledPath)) {
        return bundledPath;
    }

    // Fallback : binaire système (développement local uniquement)
    return 'typst';
}

/**
 * Indique si le binaire Typst bundlé est présent.
 * Retourne false uniquement en développement local sans fetch préalable.
 */
export function isBundledBinaryAvailable(context: vscode.ExtensionContext): boolean {
    const binaryName = process.platform === 'win32' ? 'typst.exe' : 'typst';
    const bundledPath = path.join(context.extensionPath, 'dist', binaryName);
    return fs.existsSync(bundledPath);
}
