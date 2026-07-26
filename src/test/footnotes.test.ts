import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = {
    extensionPath: path.resolve(__dirname, '..', '..'),
} as any;

describe('Footnotes tests', () => {
    it('Doit convertir les notes de bas de page', () => {
        const md = "Texte avec note[^1].\n\n[^1]: Le contenu de la note.";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('Texte avec note#footnote[Le contenu de la note.]');
        expect(result).not.toContain('Le contenu de la note.\\n\\n'); 
    });
});
