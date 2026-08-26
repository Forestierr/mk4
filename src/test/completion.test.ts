import { describe, it, expect } from 'vitest';
import { computeAnnotationCompletions } from '../providers/completion';

describe('computeAnnotationCompletions', () => {
    it('retourne une liste vide si la ligne ne commence pas par :', () => {
        const lines = ['du texte'];
        const completions = computeAnnotationCompletions(lines, 0, 4);
        expect(completions).toHaveLength(0);
    });

    it('propose les métadonnées de document (title, author, bibliography...) en tout début de document', () => {
        const lines = [':'];
        const completions = computeAnnotationCompletions(lines, 0, 1);
        const labels = completions.map(c => c.label);

        expect(labels).toContain('title');
        expect(labels).toContain('author');
        expect(labels).toContain('date');
        expect(labels).toContain('theme');
        expect(labels).toContain('bibliography');
        expect(labels).toContain('biblio');
        expect(labels).toContain('bib-style ieee');
        expect(labels).toContain('include');
        expect(labels).toContain('layout pagebreak');
    });

    it('ne propose PAS bibliography ou biblio au milieu du document après du texte', () => {
        const lines = [
            '# Titre',
            'Un paragraphe de texte.',
            ':',
        ];
        const completions = computeAnnotationCompletions(lines, 2, 1);
        const labels = completions.map(c => c.label);

        // Doit proposer include, layout pagebreak, align, id
        expect(labels).toContain('include');
        expect(labels).toContain('layout pagebreak');
        expect(labels).toContain('id');
        expect(labels).toContain('align center');

        // Ne doit PAS proposer bibliography, biblio, bib-style, title, author...
        expect(labels).not.toContain('bibliography');
        expect(labels).not.toContain('biblio');
        expect(labels).not.toContain('bib-style ieee');
        expect(labels).not.toContain('title');
        expect(labels).not.toContain('author');
    });

    it('propose caption et width sous une image', () => {
        const lines = [
            '![mon image](test.png)',
            ':',
        ];
        const completions = computeAnnotationCompletions(lines, 1, 1);
        const labels = completions.map(c => c.label);

        expect(labels).toContain('caption');
        expect(labels).toContain('width');
        expect(labels).toContain('id');
        expect(labels).toContain('include');
    });

    it('propose caption, lines, highlight sous un bloc de code', () => {
        const lines = [
            '```python',
            'print(1)',
            '```',
            ':',
        ];
        const completions = computeAnnotationCompletions(lines, 3, 1);
        const labels = completions.map(c => c.label);

        expect(labels).toContain('caption');
        expect(labels).toContain('filename');
        expect(labels).toContain('lines true');
        expect(labels).toContain('highlight');
    });
});
