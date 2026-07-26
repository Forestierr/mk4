import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = { extensionPath: path.resolve(__dirname, '..', '..') } as any;

describe('Document metadata tests', () => {
    it('Doit parser les annotations globales du document', () => {
        const md = ":title Mon Titre\n:author Jean Dupont\n:date 2026\n:numbering 1.1\n\nContenu";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('title: "Mon Titre"');
        expect(result).toContain('author: "Jean Dupont"');
        expect(result).toContain('date: "2026"');
        expect(result).toContain('numbering_style: "1.1"');
    });
});
