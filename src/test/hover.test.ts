import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers extraits de hover.ts — testés indépendamment du contexte VS Code
// ─────────────────────────────────────────────────────────────────────────────

/** Reconstruit buildIdMap sans dépendance VS Code. */
function buildIdMap(lines: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\s*:id\s+(\S+)/);
        if (m) { map.set(m[1], i); }
    }
    return map;
}

/** Retourne la documentation de la clé d'annotation ou undefined. */
const ANNOTATION_DOCS: Record<string, { description: string; values?: string; targets: string }> = {
    theme:     { description: 'Chemin vers un gabarit Typst externe.', values: '`./theme.typ`',      targets: 'Document' },
    title:     { description: 'Titre principal du document.',           values: 'Texte libre',        targets: 'Document' },
    id:        { description: 'Définit une ancre pour les références.', values: 'Identifiant',        targets: 'Universel' },
    type:      { description: 'Transforme la citation en callout.',     values: '`note` `warning` …', targets: 'Citation (`>`)' },
    highlight: { description: 'Surligne des lignes de code.',           values: '`2` `1-3`',          targets: 'Code' },
};

function getAnnotationKey(line: string): string | undefined {
    const m = line.match(/^\s*:([a-zA-Z0-9_-]+)/);
    return m ? m[1] : undefined;
}

function getRefId(line: string, charPos: number): string | undefined {
    const refRegex = /@([a-zA-Z0-9_-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = refRegex.exec(line)) !== null) {
        if (charPos >= m.index && charPos <= m.index + m[0].length) {
            return m[1];
        }
    }
    return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests : buildIdMap
// ─────────────────────────────────────────────────────────────────────────────
describe('hover — buildIdMap', () => {
    it('retourne une map vide si aucun :id', () => {
        const lines = ['# Titre', 'Du texte', ':align center'];
        expect(buildIdMap(lines).size).toBe(0);
    });

    it('mappe correctement un :id simple', () => {
        const lines = ['# Titre', ':id sec_intro'];
        const map = buildIdMap(lines);
        expect(map.get('sec_intro')).toBe(1);
    });

    it('mappe plusieurs :id', () => {
        const lines = [
            '# Section 1',
            ':id sec1',
            '![Fig](img.png)',
            ':id fig_1',
        ];
        const map = buildIdMap(lines);
        expect(map.get('sec1')).toBe(1);
        expect(map.get('fig_1')).toBe(3);
    });

    it('ignore les lignes qui ne commencent pas par :id', () => {
        const lines = [':align center', ':caption Mon titre'];
        expect(buildIdMap(lines).size).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : documentation des annotations
// ─────────────────────────────────────────────────────────────────────────────
describe('hover — ANNOTATION_DOCS', () => {
    it('possède une entrée pour les clés courantes', () => {
        expect(ANNOTATION_DOCS['theme']).toBeDefined();
        expect(ANNOTATION_DOCS['type']).toBeDefined();
        expect(ANNOTATION_DOCS['id']).toBeDefined();
        expect(ANNOTATION_DOCS['highlight']).toBeDefined();
    });

    it('chaque entrée a un champ description et targets', () => {
        for (const [key, doc] of Object.entries(ANNOTATION_DOCS)) {
            expect(doc.description, `${key}.description`).toBeTruthy();
            expect(doc.targets, `${key}.targets`).toBeTruthy();
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : getAnnotationKey
// ─────────────────────────────────────────────────────────────────────────────
describe('hover — getAnnotationKey', () => {
    it('extrait la clé d\'une annotation :key value', () => {
        expect(getAnnotationKey(':type warning')).toBe('type');
        expect(getAnnotationKey(':highlight 2-4')).toBe('highlight');
        expect(getAnnotationKey(':id sec_intro')).toBe('id');
    });

    it('retourne undefined pour une ligne non-annotation', () => {
        expect(getAnnotationKey('# Titre')).toBeUndefined();
        expect(getAnnotationKey('du texte')).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : getRefId (détection @id à une position de curseur)
// ─────────────────────────────────────────────────────────────────────────────
describe('hover — getRefId', () => {
    it('retourne l\'id quand le curseur est sur @ref', () => {
        const line = 'Voir @sec_intro pour plus de détails.';
        // Curseur sur le "@" (pos 5)
        expect(getRefId(line, 5)).toBe('sec_intro');
        // Curseur au milieu de l'id (pos 10)
        expect(getRefId(line, 10)).toBe('sec_intro');
    });

    it('retourne undefined si le curseur n\'est pas sur @id', () => {
        const line = 'Voir @sec_intro pour plus.';
        // Avant le @
        expect(getRefId(line, 0)).toBeUndefined();
        // Après l'id
        expect(getRefId(line, 20)).toBeUndefined();
    });

    it('gère plusieurs @id sur la même ligne', () => {
        const line = '@fig1 et @fig2';
        expect(getRefId(line, 0)).toBe('fig1');
        expect(getRefId(line, 10)).toBe('fig2');
    });
});
