import { describe, it, expect } from 'vitest';
import {
    detectContext,
    buildTypstToMdLineMap,
    parseTypstErrors,
} from '../providers/diagnostics';

// ──────────────────────────────────────────────────────────────
// detectContext
// ──────────────────────────────────────────────────────────────
describe('detectContext', () => {
    it('retourne "document" si la ligne est vide', () => {
        expect(detectContext('')).toBe('document');
    });
    it('retourne "heading" pour une ligne commençant par #', () => {
        expect(detectContext('# Mon titre')).toBe('heading');
    });
    it('retourne "image" pour une ligne commençant par ![', () => {
        expect(detectContext('![alt](img.png)')).toBe('image');
    });
    it('retourne "code" pour une ligne commençant par ```', () => {
        expect(detectContext('```python')).toBe('code');
    });
    it('retourne "blockquote" pour une ligne commençant par >', () => {
        expect(detectContext('> citation')).toBe('blockquote');
    });
    it('retourne "table" pour une ligne commençant par |', () => {
        expect(detectContext('| col1 | col2 |')).toBe('table');
    });
    it('retourne "paragraph" pour du texte ordinaire', () => {
        expect(detectContext('Un paragraphe')).toBe('paragraph');
    });
});

// ──────────────────────────────────────────────────────────────
// buildTypstToMdLineMap — correspondance lignes Typst → Markdown
// ──────────────────────────────────────────────────────────────
describe('buildTypstToMdLineMap', () => {
    it('retourne la ligne 1 par défaut avant tout marqueur', () => {
        const code = 'du code\nsans marqueur';
        const map = buildTypstToMdLineMap(code);
        expect(map[0]).toBe(1);
        expect(map[1]).toBe(1);
    });

    it('met à jour la ligne courante quand il trouve un marqueur #metadata', () => {
        const code = [
            '#metadata("5") <mk4_loc>',
            '= Titre',
            '#metadata("12") <mk4_loc>',
            'paragraphe',
        ].join('\n');

        const map = buildTypstToMdLineMap(code);
        expect(map[0]).toBe(5);   // ligne du marqueur
        expect(map[1]).toBe(5);   // ligne qui suit hérite de 5
        expect(map[2]).toBe(12);  // nouveau marqueur
        expect(map[3]).toBe(12);  // hérite de 12
    });

    it('retourne un tableau de la même longueur que les lignes Typst', () => {
        const code = 'a\nb\nc';
        const map = buildTypstToMdLineMap(code);
        expect(map).toHaveLength(3);
    });
});

// ──────────────────────────────────────────────────────────────
// parseTypstErrors — mapping erreurs Typst → lignes Markdown
// ──────────────────────────────────────────────────────────────
describe('parseTypstErrors', () => {
    it('retourne un tableau vide si stderr est vide', () => {
        expect(parseTypstErrors('', 'code')).toEqual([]);
    });

    it('extrait le message et la ligne depuis stderr Typst', () => {
        const typstCode = [
            'ligne 0',
            '#metadata("7") <mk4_loc>',
            '= Titre',
        ].join('\n');

        const stderr = [
            'error: unknown variable: xyz',
            '  --> .mk4-temp-abc.typ:3:1',
        ].join('\n');

        const errors = parseTypstErrors(stderr, typstCode);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('unknown variable: xyz');
        // La ligne Typst 3 (index 2) → hérite du marqueur ligne 7
        expect(errors[0].line).toBe(7);
    });

    it('utilise la ligne 1 si le numéro de ligne dépasse la map', () => {
        const stderr = 'error: oops\n  --> .mk4-temp.typ:9999:1';
        const errors = parseTypstErrors(stderr, 'une seule ligne');
        expect(errors[0].line).toBe(1);
    });

    it('gère plusieurs erreurs dans le même stderr', () => {
        const typstCode = '#metadata("3") <mk4_loc>\nligne\n#metadata("8") <mk4_loc>\nfin';
        const stderr = [
            'error: erreur A',
            '  --> .mk4-temp.typ:1:1',
            'error: erreur B',
            '  --> .mk4-temp.typ:3:5',
        ].join('\n');

        const errors = parseTypstErrors(stderr, typstCode);
        expect(errors).toHaveLength(2);
        expect(errors[0].message).toBe('erreur A');
        expect(errors[1].message).toBe('erreur B');
    });
});

// ──────────────────────────────────────────────────────────────
// validateAnnotations
// ──────────────────────────────────────────────────────────────
import { validateAnnotations } from '../providers/diagnostics';

describe('validateAnnotations', () => {
    it('détecte une annotation inconnue', () => {
        const text = ':title Mon document\n:inconnu valeur';
        const mockDoc: any = { uri: { fsPath: '/test/doc.md' } };
        const diags = validateAnnotations(text, mockDoc);

        expect(diags).toHaveLength(1);
        expect(diags[0].message).toContain('Annotation inconnue ":inconnu"');
    });

    it('émet un warning si le fichier :include est introuvable', () => {
        const text = ':title Mon document\n:include ./fichier_inexistant.md';
        const mockDoc: any = { uri: { fsPath: '/test/doc.md' } };
        const diags = validateAnnotations(text, mockDoc);

        expect(diags).toHaveLength(1);
        expect(diags[0].message).toContain('Fichier inclus introuvable');
        expect(diags[0].message).toContain('fichier_inexistant.md');
    });

    it('émet un warning si le fichier :theme est introuvable', () => {
        const text = ':theme ./theme_inexistant.typ\n# Contenu';
        const mockDoc: any = { uri: { fsPath: '/test/doc.md' } };
        const diags = validateAnnotations(text, mockDoc);

        expect(diags).toHaveLength(1);
        expect(diags[0].message).toContain('Fichier de thème introuvable');
    });
});

