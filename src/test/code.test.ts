import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Code block tests', () => {
    it('Doit convertir un bloc de code avec id, caption et filename', () => {
        const md = "```python\nprint(1)\n```\n:id my_code\n:caption Mon code\n:filename test.py";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#figure(');
        expect(result).toContain('caption: [Mon code]');
        expect(result).toContain('<my_code>');
        expect(result).toContain('test.py');
    });
    it('Doit aligner le code', () => {
        const md = "```python\nprint(1)\n```\n:align center";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#align(center)');
    });
    it('Doit gérer la numérotation des lignes et le highlight', () => {
        const md = "```python\nprint(1)\nprint(2)\n```\n:lines true\n:highlight 2";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('python');
        expect(result).toContain('print(1)');
    });
});
