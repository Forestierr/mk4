import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Résout le chemin absolu du thème Typst à utiliser.
 */
export function resolveThemePath(
    ann: Record<string, any>,
    baseDir: string,
    extensionContext?: vscode.ExtensionContext
): { path: string; isBuiltin: boolean } {
    const config = vscode.workspace.getConfiguration('mk4');
    const defaultThemeName = config.get<string>('typst.defaultTheme') || 'default';
    const settingsCustomThemePath = config.get<string>('typst.customThemePath');

    if (ann.theme) {
        // PRIORITÉ 1 : La balise :theme dans le fichier Markdown
        return {
            path: path.resolve(baseDir, String(ann.theme).trim().replace(/^['"]|['"]$/g, '')),
            isBuiltin: false
        };
    } else if (settingsCustomThemePath && fs.existsSync(settingsCustomThemePath)) {
        // PRIORITÉ 2 : Le chemin personnalisé dans les paramètres VS Code
        return {
            path: path.resolve(settingsCustomThemePath),
            isBuiltin: false
        };
    } else {
        // PRIORITÉ 3 : Le thème par défaut fourni avec l'extension
        const extPath = extensionContext?.extensionPath || '';
        return {
            path: path.join(extPath, 'themes', `${defaultThemeName}.typ`),
            isBuiltin: true
        };
    }
}

/**
 * Résout et charge le code source du thème Typst selon les priorités :
 *  1. :theme dans le Markdown
 *  2. Paramètre mk4.typst.customThemePath dans VS Code
 *  3. Thème fourni avec l'extension (mk4.typst.defaultTheme)
 */
export function loadTheme(
    ann: Record<string, any>,
    baseDir: string,
    extensionContext: vscode.ExtensionContext,
    readFile?: (filePath: string) => string | undefined
): string {
    const { path: finalThemePath } = resolveThemePath(ann, baseDir, extensionContext);

    if (readFile) {
        const content = readFile(finalThemePath);
        if (content !== undefined) {
            return content;
        }
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
 * Lit les réglages de mise en page et de typographie depuis la configuration VS Code.
 */
export interface TypstRenderConfig {
    lang: string;
    pageMargin: string;
    pageNumbering: string;
    fontFamily: string;
    fontSize: string;
    syntaxHighlighting: boolean;
}

export function getRenderConfig(): TypstRenderConfig {
    const config = vscode.workspace.getConfiguration('mk4');

    // Langue : réglage explicite → langue VS Code → 'fr'
    const langSetting = config.get<string>('typst.lang') || '';
    const vscodeLang = vscode.env.language?.split('-')[0] || 'fr';
    const lang = langSetting.trim() || vscodeLang;

    return {
        lang,
        pageMargin:        config.get<string>('typst.pageMargin')       || '2.5cm',
        pageNumbering:     config.get<string>('typst.pageNumbering')     || '1 / 1',
        fontFamily:        config.get<string>('typst.fontFamily')        || '',
        fontSize:          config.get<string>('typst.fontSize')          || '',
        syntaxHighlighting: config.get<boolean>('typst.syntaxHighlighting') ?? true,
    };
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

    // Réglages VS Code
    const rc = getRenderConfig();
    const lang          = `"${rc.lang}"`;
    const pageMargin    = `"${rc.pageMargin}"`;
    const pageNumbering = rc.pageNumbering === 'none' ? 'none' : `"${rc.pageNumbering}"`;
    const fontFamily    = rc.fontFamily ? `"${rc.fontFamily}"` : 'none';
    const fontSize      = rc.fontSize   ? `"${rc.fontSize}"`   : 'none';
    const syntaxHighlighting = rc.syntaxHighlighting ? 'true' : 'false';

    // ── Bibliographie ──────────────────────────────────────────────────────
    let bibliographySection = '';
    const bibFile = ann.bibliography || ann.biblio;
    if (bibFile && typeof bibFile === 'string' && bibFile.trim() !== '') {
        const cleanBib = bibFile.trim().replace(/^['"]|['"]$/g, '').replace(/\\/g, '/');
        const VALID_STYLES = new Set(['ieee', 'apa', 'chicago', 'mla', 'vancouver']);
        const rawStyle = String(ann['bib-style'] || ann['bibStyle'] || 'ieee').toLowerCase();
        const bibStyle = VALID_STYLES.has(rawStyle) ? rawStyle : 'ieee';
        bibliographySection = `\n#bibliography("${cleanBib}", style: "${bibStyle}")`;
    }

    return `${themeCode}

#show: doc => conf(
  title: ${title},
  subtitle: ${subtitle},
  author: ${author},
  date: ${date},
  numbering_style: ${numberingStyle},
  toc: ${toc},
  lang: ${lang},
  page_margin: ${pageMargin},
  page_numbering: ${pageNumbering},
  font_family: ${fontFamily},
  font_size: ${fontSize},
  syntax_highlighting: ${syntaxHighlighting},
  doc
)

${bodyTypst}
${bibliographySection}
`;
}


