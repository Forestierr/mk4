import * as vscode from 'vscode';
import * as path from 'path';
import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFootnotes from 'remark-footnotes';
import remarkHtml from 'remark-html';

import { remarkTypstAnnotations, remarkHtmlAnnotations } from './annotations';
import { stringifyToTypst } from './stringifier';
import { loadTheme, resolveThemePath, assembleTypstDocument } from './theme';
import { resolveIncludes, normalizeFsPath, LineSourceMap, findRootIncludeLine, SourceLocation, IncludeRecord } from './includes';
import type { MK4NodeWithData } from './types';

export { LineSourceMap, findRootIncludeLine, SourceLocation, IncludeRecord };

export interface CompileOptions {
    dependencies?: Set<string>;
    readFile?: (filePath: string) => string | undefined;
    sourceMap?: LineSourceMap;
}

/**
 * Compile un document Markdown en code Typst complet (thème inclus).
 */
export function compileMarkdownToTypst(
    markdownText: string,
    documentPath: string,
    extensionContext: vscode.ExtensionContext,
    options?: CompileOptions
): string {
    // ── Étape 0 : résoudre les :include avant le parsing AST ──────────────
    const resolvedText = resolveIncludes(markdownText, documentPath, {
        dependencies: options?.dependencies,
        readFile: options?.readFile,
        sourceMap: options?.sourceMap,
    });

    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkFootnotes, { inlineNotes: true })
        .use(remarkTypstAnnotations);

    const ast = processor.parse(resolvedText);
    const transformedAst = processor.runSync(ast);
    const baseDir = path.dirname(documentPath);

    const bodyTypst = stringifyToTypst(transformedAst as unknown as MK4NodeWithData, baseDir);
    const ann = (transformedAst.data as MK4NodeWithData['data'])?.typstAnnotations || {};

    // Collecter la dépendance du thème
    const themeInfo = resolveThemePath(ann, baseDir, extensionContext);
    if (!themeInfo.isBuiltin && options?.dependencies) {
        options.dependencies.add(normalizeFsPath(themeInfo.path));
    }

    // Collecter la dépendance de la bibliographie si spécifiée
    const bibFile = ann.bibliography || ann.biblio;
    if (bibFile && typeof bibFile === 'string' && bibFile.trim() !== '' && options?.dependencies) {
        const cleanBib = bibFile.trim().replace(/^['"]|['"]$/g, '');
        const absBib = path.resolve(baseDir, cleanBib);
        options.dependencies.add(normalizeFsPath(absBib));
    }

    const themeCode = loadTheme(ann, baseDir, extensionContext, options?.readFile);

    return assembleTypstDocument(themeCode, bodyTypst, ann);
}

/**
 * Compile un document Markdown en HTML (pour la preview Markdown).
 */
export function compileMarkdownToHtml(
    markdownText: string,
    documentPath?: string,
    options?: CompileOptions
): string {
    const resolvedText = documentPath ? resolveIncludes(markdownText, documentPath, {
        dependencies: options?.dependencies,
        readFile: options?.readFile,
    }) : markdownText;

    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkFootnotes, { inlineNotes: true })
        .use(remarkTypstAnnotations)  // 1. Extrait les annotations
        .use(remarkHtmlAnnotations)   // 2. Les transforme en badges
        .use(remarkHtml, { sanitize: false }); // 3. Convertit le tout en HTML brut

    const ast = processor.parse(resolvedText);
    const transformedAst = processor.runSync(ast);
    return processor.stringify(transformedAst as any) as string;
}
