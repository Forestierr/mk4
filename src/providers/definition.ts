import * as vscode from 'vscode';

/**
 * Fournisseur "Go to Definition" pour les références croisées MK4.
 *
 * Permet de sauter (Ctrl+Clic / F12) depuis une citation `@mon_id`
 * vers la ligne déclarant l'ancre `:id mon_id` dans le même document.
 *
 * Supporte également :
 *  - "Find All References" (`Shift+F12`) — via `registerReferenceProvider`.
 *  - Renommage sécurisé (`F2`) — via `registerRenameProvider`.
 */

// ─── Definition ────────────────────────────────────────────────────────────

export function createDefinitionProvider(): vscode.Disposable {
    return vscode.languages.registerDefinitionProvider('markdown', {
        provideDefinition(
            document: vscode.TextDocument,
            position: vscode.Position
        ): vscode.Location | undefined {
            const refId = getRefIdAtPosition(document, position);
            if (!refId) { return undefined; }

            return findIdDeclaration(document, refId);
        }
    });
}

// ─── Find All References ────────────────────────────────────────────────────

export function createReferenceProvider(): vscode.Disposable {
    return vscode.languages.registerReferenceProvider('markdown', {
        provideReferences(
            document: vscode.TextDocument,
            position: vscode.Position,
            _context: vscode.ReferenceContext
        ): vscode.Location[] {
            // Identifier si le curseur est sur une déclaration `:id foo` ou une référence `@foo`
            const idOnDecl = getIdOnDeclaration(document, position);
            const idOnRef  = getRefIdAtPosition(document, position);
            const targetId = idOnDecl ?? idOnRef;
            if (!targetId) { return []; }

            const refs: vscode.Location[] = [];
            for (let i = 0; i < document.lineCount; i++) {
                const text = document.lineAt(i).text;

                // Référence @id
                const refRegex = new RegExp(`@${escapeRegex(targetId)}\\b`, 'g');
                let m: RegExpExecArray | null;
                while ((m = refRegex.exec(text)) !== null) {
                    const range = new vscode.Range(i, m.index, i, m.index + m[0].length);
                    refs.push(new vscode.Location(document.uri, range));
                }

                // Déclaration :id foo
                const declRegex = new RegExp(`^\\s*:id\\s+(${escapeRegex(targetId)})\\s*$`);
                const dm = text.match(declRegex);
                if (dm) {
                    const start = text.indexOf(dm[1]);
                    const range = new vscode.Range(i, start, i, start + dm[1].length);
                    refs.push(new vscode.Location(document.uri, range));
                }
            }

            return refs;
        }
    });
}

// ─── Rename ────────────────────────────────────────────────────────────────

export function createRenameProvider(): vscode.Disposable {
    return vscode.languages.registerRenameProvider('markdown', {
        prepareRename(
            document: vscode.TextDocument,
            position: vscode.Position
        ): vscode.Range | undefined {
            const idOnDecl = getIdOnDeclaration(document, position);
            const idOnRef  = getRefIdAtPosition(document, position);
            const targetId = idOnDecl ?? idOnRef;
            if (!targetId) {
                throw new Error('Pas de référence MK4 à renommer à cette position.');
            }

            const line = document.lineAt(position.line).text;
            const idx  = findTokenIndex(line, targetId, position.character);
            if (idx === -1) { return undefined; }

            return new vscode.Range(position.line, idx, position.line, idx + targetId.length);
        },

        provideRenameEdits(
            document: vscode.TextDocument,
            position: vscode.Position,
            newName: string
        ): vscode.WorkspaceEdit | undefined {
            if (!/^[a-zA-Z0-9_-]+$/.test(newName)) {
                throw new Error('Le nouveau nom ne peut contenir que des lettres, chiffres, _ et -');
            }

            const idOnDecl = getIdOnDeclaration(document, position);
            const idOnRef  = getRefIdAtPosition(document, position);
            const targetId = idOnDecl ?? idOnRef;
            if (!targetId) { return undefined; }

            const edit = new vscode.WorkspaceEdit();

            for (let i = 0; i < document.lineCount; i++) {
                const text = document.lineAt(i).text;

                // Remplacer @old_id → @new_id
                const refRegex = new RegExp(`@${escapeRegex(targetId)}\\b`, 'g');
                let m: RegExpExecArray | null;
                while ((m = refRegex.exec(text)) !== null) {
                    const range = new vscode.Range(i, m.index, i, m.index + m[0].length);
                    edit.replace(document.uri, range, `@${newName}`);
                }

                // Remplacer :id old_id → :id new_id
                const declRegex = new RegExp(`(^\\s*:id\\s+)${escapeRegex(targetId)}(\\s*)$`);
                const dm = text.match(declRegex);
                if (dm) {
                    const start = dm[1].length;
                    const end   = start + targetId.length;
                    edit.replace(document.uri, new vscode.Range(i, start, i, end), newName);
                }
            }

            return edit;
        }
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Retourne le `id` sous un `@id` à la position donnée, ou undefined. */
function getRefIdAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    const line = document.lineAt(position.line).text;
    const refRegex = /@([a-zA-Z0-9_-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = refRegex.exec(line)) !== null) {
        const start = m.index;
        const end   = start + m[0].length;
        if (position.character >= start && position.character <= end) {
            return m[1];
        }
    }
    return undefined;
}

/** Retourne l'id déclaré sur `:id foo` si le curseur est dessus, ou undefined. */
function getIdOnDeclaration(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    const line = document.lineAt(position.line).text;
    const m = line.match(/^\s*:id\s+([a-zA-Z0-9_-]+)/);
    if (!m) { return undefined; }
    const start = line.indexOf(m[1]);
    const end   = start + m[1].length;
    if (position.character >= start && position.character <= end) {
        return m[1];
    }
    return undefined;
}

/** Trouve la déclaration `:id foo` dans le document et retourne sa Location. */
function findIdDeclaration(document: vscode.TextDocument, id: string): vscode.Location | undefined {
    for (let i = 0; i < document.lineCount; i++) {
        const m = document.lineAt(i).text.match(new RegExp(`^\\s*:id\\s+(${escapeRegex(id)})\\s*$`));
        if (m) {
            const start = document.lineAt(i).text.indexOf(m[1]);
            const range = new vscode.Range(i, start, i, start + m[1].length);
            return new vscode.Location(document.uri, range);
        }
    }
    return undefined;
}

/** Trouve l'index de début du `token` dans `line` autour du `charHint`. */
function findTokenIndex(line: string, token: string, charHint: number): number {
    let idx = line.indexOf(token);
    while (idx !== -1) {
        if (charHint >= idx && charHint <= idx + token.length) { return idx; }
        idx = line.indexOf(token, idx + 1);
    }
    return -1;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
