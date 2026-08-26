import * as fs from 'fs';
import * as path from 'path';

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
 * Résout récursivement toutes les directives `:include ./chemin.md`
 * dans un texte Markdown et retourne le texte assemblé.
 *
 * @param text       Contenu Markdown brut à traiter.
 * @param filePath   Chemin absolu du fichier contenant ce texte (pour la résolution relative).
 * @param visited    Ensemble de chemins réels déjà inclus (protection anti-boucle).
 * @param depth      Profondeur de récursion courante (sécurité max 20 niveaux).
 */
export function resolveIncludes(
    text: string,
    filePath: string,
    visited: Set<string> = new Set(),
    depth: number = 0
): string {
    if (depth > 20) {
        return text; // Sécurité anti-récursion infinie
    }

    const baseDir = path.dirname(filePath);

    // DEBUG: Dump resolved content to a temp file
    const isRoot = depth === 0;

    const resolved = text.replace(/^\s*:include\s+(.+)$/gm, (_match, rawPath: string) => {
        const cleanPath = rawPath.trim().replace(/^['"]|['"]$/g, '');
        const includePath = path.resolve(baseDir, cleanPath);

        // Protection anti-boucle
        if (visited.has(includePath)) {
            return makeError(`Inclusion circulaire détectée : "${cleanPath}"`);
        }

        if (!fs.existsSync(includePath)) {
            return makeError(`Fichier introuvable : "${cleanPath}"`);
        }

        let subText: string;
        try {
            subText = fs.readFileSync(includePath, 'utf-8');
        } catch (e) {
            return makeError(`Impossible de lire : "${cleanPath}"`);
        }

        // Ignorer les annotations de document du sous-fichier
        subText = stripDocumentAnnotations(subText);

        // Récursion sur le sous-fichier
        const newVisited = new Set(visited);
        newVisited.add(includePath);
        return resolveIncludes(subText, includePath, newVisited, depth + 1);
    });

    if (isRoot) {
        try {
            fs.writeFileSync(path.join(baseDir, '.mk4-debug-resolve.txt'), resolved, 'utf-8');
        } catch (e) {
            // Ignore
        }
    }

    return resolved;
}

/** Génère un bloc d'erreur visible dans le rendu Typst. */
function makeError(message: string): string {
    return `#rect(fill: rgb("fef2f2"), stroke: rgb("ef4444"), radius: 4pt, width: 100%, inset: 10pt)[*Erreur d'inclusion MK4* — ${message}]`;
}
