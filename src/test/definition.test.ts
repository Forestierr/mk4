import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers extraits de definition.ts — testés sans dépendance VS Code
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Trouve tous les @id dans un texte et retourne leurs positions. */
function findAllRefs(lines: string[], id: string): Array<{ line: number; start: number }> {
    const results: Array<{ line: number; start: number }> = [];
    const re = new RegExp(`@${escapeRegex(id)}\\b`, 'g');
    for (let i = 0; i < lines.length; i++) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(lines[i])) !== null) {
            results.push({ line: i, start: m.index });
        }
    }
    return results;
}

/** Trouve la déclaration :id foo dans les lignes. */
function findDeclaration(lines: string[], id: string): { line: number; start: number } | undefined {
    const re = new RegExp(`^\\s*:id\\s+(${escapeRegex(id)})\\s*$`);
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(re);
        if (m) {
            return { line: i, start: lines[i].indexOf(m[1]) };
        }
    }
    return undefined;
}

/** Vérifie si un nom est un identifiant MK4 valide. */
function isValidId(name: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(name);
}

/** Retourne le @id sous le curseur, ou undefined. */
function getRefIdAtPosition(line: string, charPos: number): string | undefined {
    const re = /@([a-zA-Z0-9_-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        if (charPos >= m.index && charPos <= m.index + m[0].length) {
            return m[1];
        }
    }
    return undefined;
}

/** Retourne le :id sous le curseur (déclaration), ou undefined. */
function getIdOnDeclaration(line: string, charPos: number): string | undefined {
    const m = line.match(/^\s*:id\s+([a-zA-Z0-9_-]+)/);
    if (!m) { return undefined; }
    const start = line.indexOf(m[1]);
    const end   = start + m[1].length;
    return (charPos >= start && charPos <= end) ? m[1] : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests : findDeclaration
// ─────────────────────────────────────────────────────────────────────────────
describe('definition — findDeclaration', () => {
    it('trouve une déclaration :id simple', () => {
        const lines = ['# Titre', ':id sec_intro'];
        const result = findDeclaration(lines, 'sec_intro');
        expect(result).toBeDefined();
        expect(result!.line).toBe(1);
    });

    it('retourne undefined si l\'id n\'est pas déclaré', () => {
        const lines = ['# Titre', ':id autre_id'];
        expect(findDeclaration(lines, 'inexistant')).toBeUndefined();
    });

    it('ne confond pas :id_foo avec :id foo', () => {
        const lines = [':id_foo bar', ':id foo'];
        const result = findDeclaration(lines, 'foo');
        expect(result!.line).toBe(1);
    });

    it('trouve l\'id parmi plusieurs déclarations', () => {
        const lines = [':id premier', ':id deuxieme', ':id troisieme'];
        expect(findDeclaration(lines, 'deuxieme')!.line).toBe(1);
        expect(findDeclaration(lines, 'troisieme')!.line).toBe(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : findAllRefs
// ─────────────────────────────────────────────────────────────────────────────
describe('definition — findAllRefs', () => {
    it('trouve toutes les occurrences de @id', () => {
        const lines = [
            'Voir @sec1 pour les détails.',
            'Comme expliqué en @sec1 et @sec2.',
        ];
        const refs = findAllRefs(lines, 'sec1');
        expect(refs).toHaveLength(2);
        expect(refs[0].line).toBe(0);
        expect(refs[1].line).toBe(1);
    });

    it('retourne [] si aucune référence', () => {
        const lines = ['Du texte sans référence.'];
        expect(findAllRefs(lines, 'inexistant')).toHaveLength(0);
    });

    it('ne confond pas @fig_1 avec @fig', () => {
        const lines = ['@fig et @fig_1'];
        expect(findAllRefs(lines, 'fig')).toHaveLength(1);
        expect(findAllRefs(lines, 'fig_1')).toHaveLength(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : getRefIdAtPosition / getIdOnDeclaration
// ─────────────────────────────────────────────────────────────────────────────
describe('definition — getRefIdAtPosition', () => {
    it('retourne l\'id quand le curseur est sur @ref', () => {
        expect(getRefIdAtPosition('Voir @sec_intro.', 5)).toBe('sec_intro');
    });

    it('retourne undefined hors d\'un @ref', () => {
        expect(getRefIdAtPosition('Voir @sec_intro.', 0)).toBeUndefined();
    });
});

describe('definition — getIdOnDeclaration', () => {
    it('retourne l\'id quand le curseur est sur la valeur d\'un :id', () => {
        const line = ':id sec_intro';
        // start=4, end=13
        expect(getIdOnDeclaration(line, 4)).toBe('sec_intro');
        expect(getIdOnDeclaration(line, 10)).toBe('sec_intro');
    });

    it('retourne undefined si le curseur est sur :id (la clé elle-même)', () => {
        const line = ':id sec_intro';
        // La clé ":id" est entre 0 et 3, avant la valeur qui commence en 4
        expect(getIdOnDeclaration(line, 1)).toBeUndefined();
    });

    it('retourne undefined pour une ligne non-:id', () => {
        expect(getIdOnDeclaration(':type warning', 5)).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : isValidId
// ─────────────────────────────────────────────────────────────────────────────
describe('definition — isValidId', () => {
    it('accepte les noms alphanumériques avec _ et -', () => {
        expect(isValidId('sec_intro')).toBe(true);
        expect(isValidId('fig-1')).toBe(true);
        expect(isValidId('ABC123')).toBe(true);
    });

    it('refuse les noms avec espaces ou caractères spéciaux', () => {
        expect(isValidId('mon titre')).toBe(false);
        expect(isValidId('fig.1')).toBe(false);
        expect(isValidId('sec@intro')).toBe(false);
    });
});
