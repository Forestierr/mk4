import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser/index';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Math tests', () => {
    it('Doit convertir les blocs mathématiques LaTeX', () => {
        const md = "$$\na^2 + b^2 = c^2\n$$\n:id pythagore";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('$ a^2 + b^2 = c^2 $ <pythagore>');
    });
});
