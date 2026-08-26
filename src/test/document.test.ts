import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser/index';

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

    it('Doit ajouter la section bibliographie en fin de document', () => {
        const md = ":title Mon Titre\n:bibliography ./references.bib\n:bib-style apa\n\n# Introduction\n\nTexte ici @cle";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#bibliography("./references.bib", style: "apa")');
        const introPos = result.indexOf('Introduction');
        const bibPos = result.indexOf('#bibliography');
        expect(bibPos).toBeGreaterThan(introPos);
    });

    it('Doit accepter :bibliography même placé en bas du document', () => {
        const md = "# Introduction\n\nTexte ici @cle\n\n:bibliography ./references.bib\n:bib-style ieee";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('#bibliography("./references.bib", style: "ieee")');
    });
});
