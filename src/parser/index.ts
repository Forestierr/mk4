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
import { loadTheme, assembleTypstDocument } from './theme';
import { resolveIncludes } from './includes';
import type { MK4NodeWithData } from './types';

/**
 * Compile un document Markdown en code Typst complet (thème inclus).
 */
export function compileMarkdownToTypst(
    markdownText: string,
    documentPath: string,
    extensionContext: vscode.ExtensionContext
): string {
    // ── Étape 0 : résoudre les :include avant le parsing AST ──────────────
    const resolvedText = resolveIncludes(markdownText, documentPath);

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
    console.log('[MK4 compileMarkdownToTypst] Extracted annotations (ann):', ann);
    const themeCode = loadTheme(ann, baseDir, extensionContext);

    return assembleTypstDocument(themeCode, bodyTypst, ann);
}

/**
 * Compile un document Markdown en HTML (pour la preview Markdown).
 */
export function compileMarkdownToHtml(markdownText: string, documentPath?: string): string {
    const resolvedText = documentPath ? resolveIncludes(markdownText, documentPath) : markdownText;

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
