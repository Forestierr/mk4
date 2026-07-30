import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser/index';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Headings tests', () => {
    it('Doit convertir un titre simple avec un ID', () => {
        const md = "# Mon Titre\n:id my_heading";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#heading(level: 1)');
        expect(result).toContain('Mon Titre');
        expect(result).toContain('<my_heading>');
    });
    it('Doit appliquer short title si présent', () => {
        const md = "# Titre Long\n:short Titre Court";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#context if in_outline.get() [Titre Court] else [Titre Long]');
    });
    it('Doit désactiver la numérotation si numbering est false', () => {
        const md = "# Mon Titre\n:numbering false";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('numbering: none');
    });
});
