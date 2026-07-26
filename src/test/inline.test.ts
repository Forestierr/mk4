import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = {
    extensionPath: path.resolve(__dirname, '..', '..'),
} as any;

describe('Inline formatting tests', () => {
    it('Doit convertir le formatage inline', () => {
        const md = "**gras** et *italique* et ~~barré~~ et `code`";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('*gras*');
        expect(result).toContain('_italique_');
        expect(result).toContain('#strike[barré]');
        expect(result).toContain('`code`');
    });
});
