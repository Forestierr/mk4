import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser/index';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Tables tests', () => {
    it('Doit convertir un tableau simple', () => {
        const md = "| A | B |\n|---|---|\n| 1 | 2 |\n\n:id my_tab\n:caption Mon tableau";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#table(');
        expect(result).toContain('[A]');
        expect(result).toContain('<my_tab>');
        expect(result).toContain('caption: [Mon tableau]');
    });
    it('Doit convertir un tableau compact', () => {
        const md = "| A | B |\n|---|---|\n| 1 | 2 |\n\n:compact true";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('size: 0.9em');
    });
    it('Doit supporter les annotations collées directement sous le tableau sans ligne vide', () => {
        const md = "| A | B |\n|---|---|\n| 1 | 2 |\n:id direct_tab\n:caption Tableau direct\n:compact true";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#table(');
        expect(result).toContain('<direct_tab>');
        expect(result).toContain('caption: [Tableau direct]');
        expect(result).toContain('size: 0.9em');
        expect(result).not.toContain('[:caption');
    });
});
