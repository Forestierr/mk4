import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { compileMarkdownToTypst } from '../parser';

const mockContext = {
    extensionPath: path.resolve(__dirname, '..', '..'),
} as any;

describe('Lists parsing tests', () => {
    it('Doit convertir les listes de tâches interactives', () => {
        const md = "- [x] Tâche terminée\n- [ ] Tâche à faire";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('✓');
        expect(result).toContain('box(width: 8pt');
    });

    it('Doit convertir les listes imbriquées', () => {
        const md = "- Niveau 1\n  - Niveau 2\n    - Niveau 3";
        const result = compileMarkdownToTypst(md, '', mockContext);
        expect(result).toContain('- Niveau 1');
        expect(result).toContain('  - Niveau 2');
        expect(result).toContain('    - Niveau 3');
    });
});
