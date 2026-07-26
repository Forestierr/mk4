import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Images tests', () => {
    it('Doit convertir une image avec dimensions et légende', () => {
        const md = "![Logo](./logo.png)\n:width 50%\n:align center\n:caption Mon Super Logo";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('image("./logo.png", width: 50%)');
        expect(result).toContain('caption: [Mon Super Logo]');
        expect(result).toContain('#align(center)');
    });
    it('Doit aligner à droite', () => {
        const md = "![Logo](./logo.png)\n:align right";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#align(right)');
    });
});
