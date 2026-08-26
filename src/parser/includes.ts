import * as fs from 'fs';
import * as path from 'path';

/**
 * Normalise un chemin de fichier pour les comparaisons et les clés de Set / Map.
 * Sur Windows, passe tout en minuscules et remplace les antislashs par des slashs.
 */
export function normalizeFsPath(filePath: string): string {
    const norm = path.normalize(filePath).replace(/\\/g, '/');
    return process.platform === 'win32' ? norm.toLowerCase() : norm;
}

/** Clés d'annotation considérées comme "document-level" — ignorées dans les sous-fichiers. */
const DOCUMENT_LEVEL_KEYS = new Set([
    'theme', 'title', 'subtitle', 'author', 'date',
    'lang', 'numbering', 'toc', 'bibliography', 'biblio', 'bib-style', 'bibStyle',
]);

/**
 * Supprime les annotations de niveau document (`:title`, `:theme`, …)
 * qui se trouvent en en-tête d'un sous-fichier inclus.
 *
 * Seule la "zone de métadonnées" est purgée : les lignes `:key` situées
 * avant le premier contenu non-annotation du document.
 */
function stripDocumentAnnotations(text: string): string {
    const lines = text.split(/\r?\n/);
    const result: string[] = [];
    let headerDone = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (!headerDone) {
            // Ligne vide en en-tête : on la garde pour ne pas casser la mise en page
            if (trimmed === '') {
                result.push(line);
                continue;
            }
            // Annotation de document : on la supprime silencieusement
            const m = trimmed.match(/^:([a-zA-Z0-9_-]+)/);
            if (m && DOCUMENT_LEVEL_KEYS.has(m[1])) {
                continue; // supprimée
            }
            // Premier contenu réel : la zone d'en-tête est terminée
            headerDone = true;
        }

        result.push(line);
    }

    return result.join('\n');
}

/**
 * Rebase les chemins relatifs d'images d'un sous-dossier vers le dossier racine du document.
 */
export function rebaseRelativeAssetPaths(text: string, fromDir: string, toDir: string): string {
    if (path.resolve(fromDir) === path.resolve(toDir)) {
        return text;
    }

    // Images Markdown : ![alt](url "titre")
    let result = text.replace(/!\[(.*?)\]\((<[^>]+>|[^)\s]+)(?:\s+("[^"]*"|'[^']*'))?\)/g, (fullMatch, alt, rawUrl, titlePart) => {
        const isAngle = rawUrl.startsWith('<') && rawUrl.endsWith('>');
        const cleanUrl = isAngle ? rawUrl.slice(1, -1) : rawUrl;

        // Ne pas toucher aux URLs absolues, protocoles web, ancres ou data URIs
        if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/|#|data:|[a-zA-Z]:\\|[a-zA-Z]:\/)/.test(cleanUrl)) {
            return fullMatch;
        }

        const absTarget = path.resolve(fromDir, cleanUrl);
        let rebased = path.relative(toDir, absTarget).replace(/\\/g, '/');
        if (!rebased.startsWith('.') && !rebased.startsWith('/')) {
            rebased = './' + rebased;
        }

        const formattedUrl = isAngle ? `<${rebased}>` : rebased;
        const formattedTitle = titlePart ? ` ${titlePart}` : '';
        return `![${alt}](${formattedUrl}${formattedTitle})`;
    });

    // Images HTML : <img ... src="..." ... />
    result = result.replace(/<img\s+([^>]*?)src=(["'])(.*?)\2([^>]*?)>/gi, (fullMatch, before, quote, rawUrl, after) => {
        if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/|#|data:|[a-zA-Z]:\\|[a-zA-Z]:\/)/.test(rawUrl)) {
            return fullMatch;
        }

        const absTarget = path.resolve(fromDir, rawUrl);
        let rebased = path.relative(toDir, absTarget).replace(/\\/g, '/');
        if (!rebased.startsWith('.') && !rebased.startsWith('/')) {
            rebased = './' + rebased;
        }

        return `<img ${before}src=${quote}${rebased}${quote}${after}>`;
    });

    return result;
}

export interface ResolveIncludesOptions {
    visited?: Set<string>;
    depth?: number;
    rootDir?: string;
    dependencies?: Set<string>;
    readFile?: (filePath: string) => string | undefined;
}

/**
 * Résout récursivement toutes les directives `:include ./chemin.md`
 * dans un texte Markdown et retourne le texte assemblé.
 *
 * @param text               Contenu Markdown brut à traiter.
 * @param filePath           Chemin absolu du fichier contenant ce texte (pour la résolution relative).
 * @param visitedOrOptions   Options de résolution ou ensemble de chemins déjà visités (compatibilité).
 * @param depth              Profondeur courante si appelée sous forme positionnelle.
 */
export function resolveIncludes(
    text: string,
    filePath: string,
    visitedOrOptions?: Set<string> | ResolveIncludesOptions,
    depth: number = 0
): string {
    let visited: Set<string>;
    let currentDepth: number;
    let rootDir: string;
    let dependencies: Set<string> | undefined;
    let readFile: ((p: string) => string | undefined) | undefined;

    if (visitedOrOptions instanceof Set) {
        visited = visitedOrOptions;
        currentDepth = depth;
        rootDir = path.dirname(filePath);
    } else if (visitedOrOptions && typeof visitedOrOptions === 'object') {
        visited = visitedOrOptions.visited || new Set();
        currentDepth = visitedOrOptions.depth ?? 0;
        rootDir = visitedOrOptions.rootDir || path.dirname(filePath);
        dependencies = visitedOrOptions.dependencies;
        readFile = visitedOrOptions.readFile;
    } else {
        visited = new Set();
        currentDepth = depth;
        rootDir = path.dirname(filePath);
    }

    if (currentDepth > 20) {
        return text; // Sécurité anti-récursion infinie
    }

    const baseDir = path.dirname(filePath);

    return text.replace(/^\s*:include\s+(.+)$/gm, (_match, rawPath: string) => {
        const cleanPath = rawPath.trim().replace(/^['"]|['"]$/g, '');
        const includePath = path.resolve(baseDir, cleanPath);
        const normalizedKey = normalizeFsPath(includePath);

        if (dependencies) {
            dependencies.add(normalizedKey);
        }

        // Protection anti-boucle
        if (visited.has(normalizedKey)) {
            return makeError(`Inclusion circulaire détectée : "${cleanPath}"`);
        }

        let subText: string | undefined;
        if (readFile) {
            subText = readFile(includePath);
        }

        if (subText === undefined) {
            if (!fs.existsSync(includePath)) {
                return makeError(`Fichier introuvable : "${cleanPath}"`);
            }

            try {
                subText = fs.readFileSync(includePath, 'utf-8');
            } catch {
                return makeError(`Impossible de lire : "${cleanPath}"`);
            }
        }

        // Ignorer les annotations de document du sous-fichier
        subText = stripDocumentAnnotations(subText);

        // Rebaser les chemins relatifs d'images si le sous-fichier est dans un sous-dossier
        const subDir = path.dirname(includePath);
        if (path.resolve(subDir) !== path.resolve(rootDir)) {
            subText = rebaseRelativeAssetPaths(subText, subDir, rootDir);
        }

        // Récursion sur le sous-fichier
        const newVisited = new Set(visited);
        newVisited.add(normalizedKey);

        return resolveIncludes(subText, includePath, {
            visited: newVisited,
            depth: currentDepth + 1,
            rootDir,
            dependencies,
            readFile,
        });
    });
}

/** Génère un bloc d'erreur visible dans le rendu Typst. */
function makeError(message: string): string {
    return `#rect(fill: rgb("fef2f2"), stroke: rgb("ef4444"), radius: 4pt, width: 100%, inset: 10pt)[*Erreur d'inclusion MK4* — ${message}]`;
}
