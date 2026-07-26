import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Admonitions tests', () => {
    it('Doit convertir une admonition info', () => {
        const result = compileMarkdownToTypst("> citation\n:type info", '', mockContext);
        expect(result).toContain('*Information*');
    });
    it('Doit convertir une admonition warning', () => {
        const result = compileMarkdownToTypst("> attention\n:type warning", '', mockContext);
        expect(result).toContain('*Attention*');
        expect(result).toContain('rgb("fffbeb")');
    });
    it('Doit convertir une admonition error', () => {
        const result = compileMarkdownToTypst("> erreur\n:type error", '', mockContext);
        expect(result).toContain('*Erreur*');
        expect(result).toContain('rgb("fef2f2")');
    });
    it('Doit convertir une admonition tip', () => {
        const result = compileMarkdownToTypst("> astuce\n:type tip", '', mockContext);
        expect(result).toContain('*Astuce*');
    });
    it('Doit convertir une admonition note', () => {
        const result = compileMarkdownToTypst("> note\n:type note", '', mockContext);
        expect(result).toContain('*Note*');
    });
});
