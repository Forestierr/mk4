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

export interface SourceLocation {
    file: string;
    line: number;
}

export interface IncludeRecord {
    parentFile: string;
    parentLine: number; // Ligne 1-indexée de la directive :include dans le fichier parent
    childFile: string;
    mergedStartLine: number;
    mergedEndLine: number;
}

export class LineSourceMap {
    private map: SourceLocation[] = [];
    public includes: IncludeRecord[] = [];

    public addLine(loc: SourceLocation): void {
        this.map.push(loc);
    }

    public get(mergedLine: number): SourceLocation {
        const idx = mergedLine - 1;
        if (idx >= 0 && idx < this.map.length) {
            return this.map[idx];
        }
        if (this.map.length > 0) {
            return this.map[this.map.length - 1];
        }
        return { file: '', line: 1 };
    }

    public get totalLines(): number {
        return this.map.length;
    }
}

/**
 * Retrouve la ligne :include dans le fichier racine correspondant à un fichier inclus
 * (même en cas d'inclusions imbriquées).
 */
export function findRootIncludeLine(
    includes: IncludeRecord[],
    targetFile: string,
    rootFile: string
): number | undefined {
    const targetNorm = normalizeFsPath(targetFile);
    const rootNorm = normalizeFsPath(rootFile);

    // Recherche directe
    const direct = includes.find(
        inc => normalizeFsPath(inc.childFile) === targetNorm && normalizeFsPath(inc.parentFile) === rootNorm
    );
    if (direct) {
        return direct.parentLine;
    }

    // Remonter la chaîne des parents si inclusion indirecte (A inclut B qui inclut C)
    let currentChild = targetNorm;
    while (true) {
        const record = includes.find(inc => normalizeFsPath(inc.childFile) === currentChild);
        if (!record) { break; }
        if (normalizeFsPath(record.parentFile) === rootNorm) {
            return record.parentLine;
        }
        currentChild = normalizeFsPath(record.parentFile);
    }

    return undefined;
}

export interface ResolveIncludesOptions {
    visited?: Set<string>;
    depth?: number;
    rootDir?: string;
    dependencies?: Set<string>;
    readFile?: (filePath: string) => string | undefined;
    sourceMap?: LineSourceMap;
}

interface StrippedLine {
    text: string;
    originalLine: number; // 1-indexed dans le fichier source
}

/**
 * Supprime les annotations de niveau document (`:title`, `:theme`, …)
 * qui se trouvent en en-tête d'un sous-fichier inclus, tout en conservant
 * les numéros de ligne d'origine du sous-fichier.
 */
function stripDocumentAnnotationsWithMapping(text: string): StrippedLine[] {
    const lines = text.split(/\r?\n/);
    const result: StrippedLine[] = [];
    let headerDone = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!headerDone) {
            if (trimmed === '') {
                result.push({ text: line, originalLine: i + 1 });
                continue;
            }
            const m = trimmed.match(/^:([a-zA-Z0-9_-]+)/);
            if (m && DOCUMENT_LEVEL_KEYS.has(m[1])) {
                continue; // supprimée
            }
            headerDone = true;
        }

        result.push({ text: line, originalLine: i + 1 });
    }

    return result;
}

function resolveIncludesInternal(
    lines: StrippedLine[],
    filePath: string,
    options: {
        visited: Set<string>;
        depth: number;
        rootDir: string;
        dependencies?: Set<string>;
        readFile?: (p: string) => string | undefined;
        sourceMap?: LineSourceMap;
    }
): string[] {
    const resultLines: string[] = [];
    const baseDir = path.dirname(filePath);

    for (const item of lines) {
        const line = item.text;
        const origLineNum = item.originalLine;
        const includeMatch = line.match(/^\s*:include\s+(.+)$/);

        if (!includeMatch) {
            let processedLine = line;
            if (path.resolve(baseDir) !== path.resolve(options.rootDir)) {
                processedLine = rebaseRelativeAssetPaths(processedLine, baseDir, options.rootDir);
            }
            resultLines.push(processedLine);
            if (options.sourceMap) {
                options.sourceMap.addLine({ file: filePath, line: origLineNum });
            }
            continue;
        }

        // C'est une ligne :include
        const cleanPath = includeMatch[1].trim().replace(/^['"]|['"]$/g, '');
        const includePath = path.resolve(baseDir, cleanPath);
        const normalizedKey = normalizeFsPath(includePath);

        if (options.dependencies) {
            options.dependencies.add(normalizedKey);
        }

        if (options.depth > 20) {
            resultLines.push(line);
            if (options.sourceMap) {
                options.sourceMap.addLine({ file: filePath, line: origLineNum });
            }
            continue;
        }

        if (options.visited.has(normalizedKey)) {
            const err = makeError(`Inclusion circulaire détectée : "${cleanPath}"`);
            resultLines.push(err);
            if (options.sourceMap) {
                options.sourceMap.addLine({ file: filePath, line: origLineNum });
            }
            continue;
        }

        let subText: string | undefined;
        if (options.readFile) {
            subText = options.readFile(includePath);
        }
        if (subText === undefined) {
            if (!fs.existsSync(includePath)) {
                const err = makeError(`Fichier introuvable : "${cleanPath}"`);
                resultLines.push(err);
                if (options.sourceMap) {
                    options.sourceMap.addLine({ file: filePath, line: origLineNum });
                }
                continue;
            }
            try {
                subText = fs.readFileSync(includePath, 'utf-8');
            } catch {
                const err = makeError(`Impossible de lire : "${cleanPath}"`);
                resultLines.push(err);
                if (options.sourceMap) {
                    options.sourceMap.addLine({ file: filePath, line: origLineNum });
                }
                continue;
            }
        }

        const subLines = stripDocumentAnnotationsWithMapping(subText);
        const newVisited = new Set(options.visited);
        newVisited.add(normalizedKey);

        const mergedStartLine = options.sourceMap ? options.sourceMap.totalLines + 1 : 1;

        const resolvedSubLines = resolveIncludesInternal(subLines, includePath, {
            ...options,
            depth: options.depth + 1,
            visited: newVisited,
        });

        const mergedEndLine = options.sourceMap ? options.sourceMap.totalLines : 1;

        if (options.sourceMap) {
            options.sourceMap.includes.push({
                parentFile: filePath,
                parentLine: origLineNum,
                childFile: includePath,
                mergedStartLine,
                mergedEndLine,
            });
        }

        for (const subL of resolvedSubLines) {
            resultLines.push(subL);
        }
    }

    return resultLines;
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
    let sourceMap: LineSourceMap | undefined;

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
        sourceMap = visitedOrOptions.sourceMap;
    } else {
        visited = new Set();
        currentDepth = depth;
        rootDir = path.dirname(filePath);
    }

    const initialLines = text.split(/\r?\n/).map((t, idx) => ({ text: t, originalLine: idx + 1 }));

    const resolvedLines = resolveIncludesInternal(initialLines, filePath, {
        visited,
        depth: currentDepth,
        rootDir,
        dependencies,
        readFile,
        sourceMap,
    });

    return resolvedLines.join('\n');
}

/** Génère un bloc d'erreur visible dans le rendu Typst. */
function makeError(message: string): string {
    return `#rect(fill: rgb("fef2f2"), stroke: rgb("ef4444"), radius: 4pt, width: 100%, inset: 10pt)[*Erreur d'inclusion MK4* — ${message}]`;
}
