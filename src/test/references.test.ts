import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = {
    extensionPath: path.resolve(__dirname, '..', '..'),
} as any;

describe('Cross-references tests', () => {
    it('Doit conserver les références croisées', () => {
        const md = "Voir la @sec_archi.";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('Voir la @sec_archi.');
    });
});
