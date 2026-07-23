import * as assert from 'assert';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

// Mock minimal du contexte d'extension VS Code
const mockContext = {
    extensionPath: path.resolve(__dirname, '..', '..'),
} as any;

describe('MK4 Markdown to Typst Parser Tests', () => {

    it('Doit convertir un titre simple avec un ID', () => {
        const md = "# Mon Titre\n:id my_heading";
        const result = compileMarkdownToTypst(md, '', mockContext);
        assert.ok(result.includes('#heading(level: 1)[Mon Titre] <my_heading>'));
    });

    it('Doit convertir une image avec dimensions et légende', () => {
        const md = "![Logo](./logo.png)\n:width 50%\n:align center\n:caption Mon Super Logo";
        const result = compileMarkdownToTypst(md, '', mockContext);
        assert.ok(result.includes('image("./logo.png", width: 50%)'));
        assert.ok(result.includes('caption: [Mon Super Logo]'));
        assert.ok(result.includes('#align(center)'));
    });

    it('Doit convertir les blocs mathématiques LaTeX', () => {
        const md = "$$ a^2 + b^2 = c^2 $$\n:id pythagore";
        const result = compileMarkdownToTypst(md, '', mockContext);
        assert.ok(result.includes('$ a^2 + b^2 = c^2 $ <pythagore>'));
    });

    it('Doit convertir les listes de tâches interactives', () => {
        const md = "- [x] Tâche terminée\n- [ ] Tâche à faire";
        const result = compileMarkdownToTypst(md, '', mockContext);
        assert.ok(result.includes('✓'));
        assert.ok(result.includes('box(width: 8pt'));
    });

    it('Doit convertir les encadrés d\'alerte (Admonitions)', () => {
        const md = "> Attention au déploiement\n:type warning";
        const result = compileMarkdownToTypst(md, '', mockContext);
        assert.ok(result.includes('*Attention*'));
        assert.ok(result.includes('rgb("fffbeb")')); // Fond orange warning
    });

});