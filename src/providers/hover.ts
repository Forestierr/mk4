import * as vscode from 'vscode';

/** Documentation enrichie par clé d'annotation MK4. */
const ANNOTATION_DOCS: Record<string, { description: string; values?: string; targets: string }> = {
    // Document
    theme:     { description: 'Chemin vers un gabarit Typst externe à appliquer au document.',      values: '`./theme.typ`',                               targets: 'Document' },
    title:     { description: 'Titre principal du document, affiché sur la page de garde.',          values: 'Texte libre',                                 targets: 'Document' },
    subtitle:  { description: 'Sous-titre du document.',                                             values: 'Texte libre',                                 targets: 'Document' },
    author:    { description: 'Auteur du document ou de la citation.',                               values: 'Texte libre',                                 targets: 'Document / Citation' },
    date:      { description: 'Date du document.',                                                   values: 'Texte libre (ex: `Août 2026`)',                targets: 'Document' },
    lang:      { description: 'Langue du document pour la gestion des césures Typst.',               values: '`fr` `en` `de` `es`',                         targets: 'Document' },
    numbering: { description: 'Format de numérotation des titres.',                                  values: '`1.1` `1.a` `false`',                         targets: 'Document / Titre' },
    toc:       { description: 'Génère automatiquement la table des matières.',                       values: '`true` `false`',                              targets: 'Document' },
    // Universel
    id:        { description: 'Définit une ancre pour les références croisées (`@mon_id`).',         values: 'Identifiant sans espaces (ex: `sec_intro`)',   targets: 'Universel' },
    align:     { description: 'Alignement horizontal du bloc.',                                      values: '`left` `center` `right`',                    targets: 'Universel' },
    layout:    { description: 'Contrôle la mise en page. `pagebreak` insère un saut de page.',       values: '`pagebreak`',                                 targets: 'Universel' },
    // Titre
    short:     { description: 'Titre abrégé utilisé dans la table des matières.',                    values: 'Texte libre',                                 targets: 'Titre (`#`)' },
    // Image
    width:     { description: "Largeur de l'image.",                                                 values: '`50%` `4cm` `300pt`',                         targets: 'Image' },
    caption:   { description: 'Ajoute une légende numérotée (figure Typst).',                        values: 'Texte libre',                                 targets: 'Image / Code / Tableau' },
    // Code
    filename:  { description: "Affiche un bandeau d'en-tête avec le nom du fichier.",                values: '`main.rs` `index.ts` …',                      targets: 'Code' },
    lines:     { description: 'Active la numérotation des lignes de code.',                          values: '`true` `false`',                              targets: 'Code' },
    highlight: { description: 'Surligne des lignes spécifiques dans le bloc de code.',               values: '`2` `1-3` `2,5,8-10`',                        targets: 'Code' },
    // Tableau
    compact:   { description: 'Réduit les marges intérieures et la taille du texte du tableau.',     values: '`true` `false`',                              targets: 'Tableau' },
    // Citation
    type:      { description: 'Transforme la citation en callout stylisé avec icône et couleur.',    values: '`note` `info` `tip` `warning` `error`',       targets: 'Citation (`>`)' },
    link:      { description: 'Ajoute un lien source cliquable sous la citation.',                   values: 'URL',                                         targets: 'Citation (`>`)' },
    source:    { description: 'Alias de `:link`. Ajoute un lien source cliquable sous la citation.', values: 'URL',                                         targets: 'Citation (`>`)' },
};

/**
 * Construit la table clé→ligne de déclaration pour les ancres `:id` du document.
 */
function buildIdMap(document: vscode.TextDocument): Map<string, number> {
    const map = new Map<string, number>();
    for (let i = 0; i < document.lineCount; i++) {
        const m = document.lineAt(i).text.match(/^\s*:id\s+(\S+)/);
        if (m) { map.set(m[1], i); }
    }
    return map;
}

/**
 * Fournisseur de documentation au survol pour les fichiers Markdown MK4.
 *
 * - Sur une annotation `:key` → infobulle avec description, valeurs acceptées, cible.
 * - Sur une référence `@id` → indique la ligne de déclaration de l'ancre (ou "introuvable").
 */
export function createHoverProvider(): vscode.Disposable {
    return vscode.languages.registerHoverProvider('markdown', {
        provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
            const line = document.lineAt(position.line).text;

            // ── 1. Survol d'une annotation `:key ...` ──
            const annotationMatch = line.match(/^\s*(:)([a-zA-Z0-9_-]+)/);
            if (annotationMatch) {
                const colonStart = line.indexOf(':');
                const keyStart   = colonStart + 1;
                const keyEnd     = keyStart + annotationMatch[2].length;

                if (position.character >= colonStart && position.character <= keyEnd) {
                    const key  = annotationMatch[2];
                    const info = ANNOTATION_DOCS[key];

                    if (!info) { return undefined; }

                    const md = new vscode.MarkdownString();
                    md.isTrusted = true;
                    md.supportHtml = false;

                    md.appendMarkdown(`**MK4** · \`:${key}\`\n\n`);
                    md.appendMarkdown(`${info.description}\n\n`);
                    if (info.values) {
                        md.appendMarkdown(`**Valeurs :** ${info.values}\n\n`);
                    }
                    md.appendMarkdown(`**Cible :** ${info.targets}`);

                    const range = new vscode.Range(
                        position.line, colonStart,
                        position.line, keyEnd
                    );
                    return new vscode.Hover(md, range);
                }
            }

            // ── 2. Survol d'une référence `@id` ──
            const refRegex = /@([a-zA-Z0-9_-]+)/g;
            let m: RegExpExecArray | null;
            while ((m = refRegex.exec(line)) !== null) {
                const start = m.index;
                const end   = start + m[0].length;

                if (position.character >= start && position.character <= end) {
                    const refId = m[1];
                    const idMap = buildIdMap(document);
                    const decLine = idMap.get(refId);

                    const md = new vscode.MarkdownString();
                    md.isTrusted = true;

                    if (decLine !== undefined) {
                        const preview = document.lineAt(Math.max(0, decLine - 1)).text.trim();
                        md.appendMarkdown(`**MK4** · Référence croisée \`@${refId}\`\n\n`);
                        md.appendMarkdown(`Ancre déclarée à la **ligne ${decLine + 1}**\n\n`);
                        if (preview) {
                            md.appendMarkdown(`> ${preview}`);
                        }
                    } else {
                        md.appendMarkdown(`**MK4** · Référence croisée \`@${refId}\`\n\n`);
                        md.appendMarkdown(`⚠️ Aucune ancre \`:id ${refId}\` trouvée dans ce document.`);
                    }

                    const range = new vscode.Range(position.line, start, position.line, end);
                    return new vscode.Hover(md, range);
                }
            }

            return undefined;
        }
    });
}
