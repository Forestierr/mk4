import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser/index';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Layout tests', () => {
    it('Doit convertir les sauts de page', () => {
        const md = "# Titre\n:layout pagebreak\n\nContenu";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#pagebreak()');
    });
});
