import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Résout et charge le code source du thème Typst selon les priorités :
 *  1. :theme dans le Markdown
 *  2. Paramètre mk4.typst.customThemePath dans VS Code
 *  3. Thème fourni avec l'extension (mk4.typst.defaultTheme)
 */
export function loadTheme(
    ann: Record<string, any>,
    baseDir: string,
    extensionContext: vscode.ExtensionContext
): string {
    const config = vscode.workspace.getConfiguration('mk4');
    const defaultThemeName = config.get<string>('typst.defaultTheme') || 'default';
    const settingsCustomThemePath = config.get<string>('typst.customThemePath');

    let finalThemePath = '';

    if (ann.theme) {
        // PRIORITÉ 1 : La balise :theme dans le fichier Markdown
        finalThemePath = path.resolve(baseDir, ann.theme);
    } else if (settingsCustomThemePath && fs.existsSync(settingsCustomThemePath)) {
        // PRIORITÉ 2 : Le chemin personnalisé dans les paramètres VS Code
        finalThemePath = settingsCustomThemePath;
    } else {
        // PRIORITÉ 3 : Le thème par défaut fourni avec l'extension
        finalThemePath = path.join(extensionContext.extensionPath, 'themes', `${defaultThemeName}.typ`);
    }

    try {
        if (fs.existsSync(finalThemePath)) {
            return fs.readFileSync(finalThemePath, 'utf-8');
        } else {
            console.error(`Le thème Typst est introuvable au chemin : ${finalThemePath}`);
        }
    } catch (e) {
        console.error('Erreur lors de la lecture du thème Typst :', e);
    }

    // Fallback de sécurité
    return `#let conf(title: none, subtitle: none, author: none, date: none, numbering_style: none, toc: false, doc) = { doc }`;
}

/**
 * Assemble le document Typst final : thème + show rule + corps + bibliographie.
 */
export function assembleTypstDocument(
    themeCode: string,
    bodyTypst: string,
    ann: Record<string, any>
): string {
    const title = ann.title ? `"${ann.title}"` : 'none';
    const subtitle = ann.subtitle ? `"${ann.subtitle}"` : 'none';
    const author = ann.author ? `"${ann.author}"` : 'none';
    const date = ann.date ? `"${ann.date}"` : 'none';
    const numberingStyle = ann.numbering ? `"${ann.numbering}"` : 'none';
    const toc = ann.toc ? 'true' : 'false';

    // ── Bibliographie ──────────────────────────────────────────────────────
    let bibliographySection = '';
    if (ann.bibliography) {
        const VALID_STYLES = new Set(['ieee', 'apa', 'chicago', 'mla', 'vancouver']);
        const rawStyle = String(ann['bib-style'] || 'ieee').toLowerCase();
        const bibStyle = VALID_STYLES.has(rawStyle) ? rawStyle : 'ieee';
        bibliographySection = `\n#bibliography("${ann.bibliography}", style: "${bibStyle}")`;
    }

    return `${themeCode}

#show: doc => conf(
  title: ${title},
  subtitle: ${subtitle},
  author: ${author},
  date: ${date},
  numbering_style: ${numberingStyle},
  toc: ${toc},
  doc
)

${bodyTypst}${bibliographySection}
`;
}
