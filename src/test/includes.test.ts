import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveIncludes, normalizeFsPath, LineSourceMap, findRootIncludeLine } from '../parser/includes';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers : création de fichiers temporaires dans os.tmpdir()
// ─────────────────────────────────────────────────────────────────────────────

function writeTmp(filename: string, content: string, dir?: string): string {
    const targetDir = dir || os.tmpdir();
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'mk4-test-'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests : cas nominaux
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveIncludes — cas nominaux', () => {
    it('retourne le texte inchangé si aucun :include', () => {
        const main = writeTmp('main_no_include.md', '# Titre\n\nDu texte.');
        const result = resolveIncludes('# Titre\n\nDu texte.', main);
        expect(result).toBe('# Titre\n\nDu texte.');
    });

    it('substitue un :include par le contenu du sous-fichier', () => {
        const dir = createTmpDir();
        const subFile = writeTmp('sub.md', '## Section incluse\n\nContenu.', dir);
        const mainFile = writeTmp('main.md', `:include ./sub.md\n\nSuite.`, dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        expect(result).toContain('## Section incluse');
        expect(result).toContain('Contenu.');
        expect(result).toContain('Suite.');
        expect(result).not.toContain(':include');
    });

    it('inclut plusieurs sous-fichiers dans l\'ordre', () => {
        const dir = createTmpDir();
        writeTmp('chap1.md', 'Chapitre 1', dir);
        writeTmp('chap2.md', 'Chapitre 2', dir);
        const mainFile = writeTmp('main2.md', ':include ./chap1.md\n:include ./chap2.md', dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        const pos1 = result.indexOf('Chapitre 1');
        const pos2 = result.indexOf('Chapitre 2');
        expect(pos1).toBeGreaterThanOrEqual(0);
        expect(pos2).toBeGreaterThan(pos1);
    });

    it('résout les includes récursivement', () => {
        const dir = createTmpDir();
        writeTmp('leaf.md', 'Contenu feuille', dir);
        writeTmp('mid.md', ':include ./leaf.md\n\nMilieu', dir);
        const mainFile = writeTmp('root.md', ':include ./mid.md\n\nRacine', dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        expect(result).toContain('Contenu feuille');
        expect(result).toContain('Milieu');
        expect(result).toContain('Racine');
    });

    it('gère les chemins entourés de guillemets', () => {
        const dir = createTmpDir();
        writeTmp('quoted.md', 'Contenu avec guillemets', dir);
        const mainFile = writeTmp('main_q.md', ':include "./quoted.md"', dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        expect(result).toContain('Contenu avec guillemets');
    });

    it('gère les espaces en début de ligne devant :include', () => {
        const dir = createTmpDir();
        writeTmp('spaced.md', 'Contenu avec espaces', dir);
        const mainFile = writeTmp('main_s.md', '  :include ./spaced.md', dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        expect(result).toContain('Contenu avec espaces');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : suppression des annotations de document dans les sous-fichiers
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveIncludes — suppression annotations document', () => {
    it('supprime :title, :author, :theme en en-tête du sous-fichier', () => {
        const dir = createTmpDir();
        const subContent = ':title Mon chapitre\n:author Robin\n:theme ./t.typ\n\n## Vraie section\n\nTexte.';
        writeTmp('sub_meta.md', subContent, dir);
        const mainFile = writeTmp('main_meta.md', ':include ./sub_meta.md', dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        expect(result).not.toContain(':title');
        expect(result).not.toContain(':author');
        expect(result).not.toContain(':theme');
        expect(result).toContain('## Vraie section');
        expect(result).toContain('Texte.');
    });

    it('conserve les annotations de bloc (:align, :caption, :id) dans les sous-fichiers', () => {
        const dir = createTmpDir();
        const subContent = ':title Ignoré\n\n![Logo](logo.png)\n:caption Mon logo\n:align center';
        writeTmp('sub_block.md', subContent, dir);
        const mainFile = writeTmp('main_block.md', ':include ./sub_block.md', dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        expect(result).not.toContain(':title');
        expect(result).toContain(':caption Mon logo');
        expect(result).toContain(':align center');
    });

    it('conserve :toc et :bibliography du document principal', () => {
        const dir = createTmpDir();
        writeTmp('sub_simple.md', '## Section\n\nTexte simple.', dir);
        const mainContent = ':title Doc principal\n:toc true\n:bibliography ./refs.bib\n\n:include ./sub_simple.md';
        const mainFile = writeTmp('main_toc.md', mainContent, dir);

        // Le texte principal ne passe pas par resolveIncludes pour les meta du root,
        // on vérifie juste que le sous-fichier n'a pas supprimé le contenu principal
        const result = resolveIncludes(mainContent, mainFile);
        expect(result).toContain(':title Doc principal');
        expect(result).toContain(':toc true');
        expect(result).toContain(':bibliography ./refs.bib');
        expect(result).toContain('## Section');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : gestion des erreurs
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveIncludes — gestion des erreurs', () => {
    it('génère un bloc d\'erreur Typst si le fichier est introuvable', () => {
        const dir = createTmpDir();
        const mainFile = writeTmp('main_err.md', ':include ./inexistant.md', dir);

        const result = resolveIncludes(fs.readFileSync(mainFile, 'utf-8'), mainFile);
        expect(result).toContain('#rect(');
        expect(result).toContain('Fichier introuvable');
        expect(result).toContain('inexistant.md');
    });

    it('génère un bloc d\'erreur pour une inclusion circulaire', () => {
        const dir = createTmpDir();
        // a.md inclut b.md, b.md inclut a.md
        const aPath = path.join(dir, 'a_circ.md');
        const bPath = path.join(dir, 'b_circ.md');
        fs.writeFileSync(aPath, ':include ./b_circ.md', 'utf-8');
        fs.writeFileSync(bPath, ':include ./a_circ.md\n\nContenu B', 'utf-8');

        const result = resolveIncludes(fs.readFileSync(aPath, 'utf-8'), aPath);
        expect(result).toContain('circulaire');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : Dépendances, lecture in-memory et rebasage d'images relatives
// ─────────────────────────────────────────────────────────────────────────────

import { rebaseRelativeAssetPaths } from '../parser/includes';

describe('resolveIncludes — fonctionnalités avancées & réactivité', () => {
    it('collecte correctement toutes les dépendances dans un Set', () => {
        const dir = createTmpDir();
        const chap1 = writeTmp('chap1.md', 'Chapitre 1', dir);
        const chap2 = writeTmp('chap2.md', 'Chapitre 2', dir);
        const main = writeTmp('main.md', ':include ./chap1.md\n:include ./chap2.md', dir);

        const deps = new Set<string>();
        resolveIncludes(fs.readFileSync(main, 'utf-8'), main, { dependencies: deps });

        expect(deps.has(normalizeFsPath(chap1))).toBe(true);
        expect(deps.has(normalizeFsPath(chap2))).toBe(true);
        expect(deps.size).toBe(2);
    });

    it('utilise readFile pour injecter le contenu non-sauvegardé (in-memory)', () => {
        const dir = createTmpDir();
        const subFile = writeTmp('sub.md', 'Contenu disque', dir);
        const main = writeTmp('main.md', ':include ./sub.md', dir);

        const customReader = (filePath: string) => {
            if (path.normalize(filePath) === path.normalize(subFile)) {
                return 'Contenu mémoire en direct !';
            }
            return undefined;
        };

        const result = resolveIncludes(fs.readFileSync(main, 'utf-8'), main, { readFile: customReader });
        expect(result).toContain('Contenu mémoire en direct !');
        expect(result).not.toContain('Contenu disque');
    });

    it('rebase les chemins relatifs d\'images pour les sous-fichiers dans des sous-dossiers', () => {
        const dir = createTmpDir();
        const subDir = path.join(dir, 'chapitres');
        fs.mkdirSync(subDir, { recursive: true });

        const subFile = writeTmp('intro.md', '# Intro\n\n![Schema](./images/archi.png "Architecture")\n<img src="img/test.jpg" />', subDir);
        const main = writeTmp('main.md', ':include ./chapitres/intro.md', dir);

        const result = resolveIncludes(fs.readFileSync(main, 'utf-8'), main);
        expect(result).toContain('![Schema](./chapitres/images/archi.png "Architecture")');
        expect(result).toContain('src="./chapitres/img/test.jpg"');
    });

    it('ne modifie pas les URLs absolues ou web lors du rebasage', () => {
        const text = '![Web](https://example.com/pic.png)\n![Data](data:image/png;base64,123)';
        const rebased = rebaseRelativeAssetPaths(text, '/dir/chap', '/dir');
        expect(rebased).toContain('https://example.com/pic.png');
        expect(rebased).toContain('data:image/png;base64,123');
    });

    it('génère un LineSourceMap précis pour les lignes fusionnées et fichiers inclus', () => {
        const dir = createTmpDir();
        const sub = writeTmp('sub.md', ':title Sub\n## Section 1\nParagraphe 1', dir);
        const main = writeTmp('main.md', ':title Main\n# Titre Principal\n:include ./sub.md\n# Conclusion', dir);

        const sourceMap = new LineSourceMap();
        const result = resolveIncludes(fs.readFileSync(main, 'utf-8'), main, { sourceMap });

        expect(result).toContain('## Section 1');
        expect(result).toContain('# Conclusion');

        // Merged lines:
        // 1: :title Main (main.md:1)
        // 2: # Titre Principal (main.md:2)
        // 3: ## Section 1 (sub.md:2 because :title Sub was stripped)
        // 4: Paragraphe 1 (sub.md:3)
        // 5: # Conclusion (main.md:4)
        expect(sourceMap.totalLines).toBe(5);
        expect(sourceMap.get(1)).toEqual({ file: main, line: 1 });
        expect(sourceMap.get(2)).toEqual({ file: main, line: 2 });
        expect(sourceMap.get(3)).toEqual({ file: sub, line: 2 });
        expect(sourceMap.get(4)).toEqual({ file: sub, line: 3 });
        expect(sourceMap.get(5)).toEqual({ file: main, line: 4 });

        expect(sourceMap.includes).toHaveLength(1);
        expect(sourceMap.includes[0].parentFile).toBe(main);
        expect(sourceMap.includes[0].parentLine).toBe(3);
        expect(sourceMap.includes[0].childFile).toBe(sub);
    });

    it('retrouve la ligne :include racine pour des inclusions imbriquées via findRootIncludeLine', () => {
        const dir = createTmpDir();
        const sub2 = writeTmp('sub2.md', '### Deep content', dir);
        const sub1 = writeTmp('sub1.md', '## Sub 1\n:include ./sub2.md', dir);
        const main = writeTmp('main.md', '# Main\n:include ./sub1.md\nFin', dir);

        const sourceMap = new LineSourceMap();
        resolveIncludes(fs.readFileSync(main, 'utf-8'), main, { sourceMap });

        const rootLineForSub1 = findRootIncludeLine(sourceMap.includes, sub1, main);
        const rootLineForSub2 = findRootIncludeLine(sourceMap.includes, sub2, main);

        expect(rootLineForSub1).toBe(2);
        expect(rootLineForSub2).toBe(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : bibliographie dans assembleTypstDocument
// ─────────────────────────────────────────────────────────────────────────────

import { assembleTypstDocument } from '../parser/theme';

// Mock minimal du thème
const THEME_CODE = '#let conf(title: none, subtitle: none, author: none, date: none, numbering_style: none, toc: false, doc) = { doc }';

describe('assembleTypstDocument — bibliographie', () => {
    it('n\'ajoute pas #bibliography si l\'annotation est absente', () => {
        const result = assembleTypstDocument(THEME_CODE, '= Titre', {});
        expect(result).not.toContain('#bibliography');
    });

    it('ajoute #bibliography avec style par défaut (ieee) si :bibliography est présent', () => {
        const result = assembleTypstDocument(THEME_CODE, '= Titre', { bibliography: './refs.bib' });
        expect(result).toContain('#bibliography("./refs.bib", style: "ieee")');
    });

    it('utilise le style spécifié par :bib-style', () => {
        const result = assembleTypstDocument(THEME_CODE, '= Titre', {
            bibliography: './refs.bib',
            'bib-style': 'apa',
        });
        expect(result).toContain('#bibliography("./refs.bib", style: "apa")');
    });

    it('utilise ieee si le style spécifié est invalide', () => {
        const result = assembleTypstDocument(THEME_CODE, '= Titre', {
            bibliography: './refs.bib',
            'bib-style': 'invalide',
        });
        expect(result).toContain('style: "ieee"');
    });

    it('la section bibliographie est placée après le corps du document', () => {
        const result = assembleTypstDocument(THEME_CODE, '= Corps', { bibliography: './refs.bib' });
        const bodyPos = result.indexOf('= Corps');
        const bibPos = result.indexOf('#bibliography');
        expect(bibPos).toBeGreaterThan(bodyPos);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests : Intégration réelle avec le CLI Typst sur les exemples
// ─────────────────────────────────────────────────────────────────────────────

import { execFile } from 'child_process';
import { promisify } from 'util';
import { compileMarkdownToTypst } from '../parser';

const execFileAsync = promisify(execFile);

describe('Integration — Compilation Typst CLI réelle', () => {
    it('compile example/multi-file/base.md avec succès via Typst', async () => {
        const mdPath = path.resolve(__dirname, '../../example/multi-file/base.md');
        if (!fs.existsSync(mdPath)) {
            return;
        }

        const mockContext = {
            asAbsolutePath: (p: string) => path.resolve(__dirname, '../..', p)
        } as any;

        const text = fs.readFileSync(mdPath, 'utf8');
        const deps = new Set<string>();
        const typstCode = compileMarkdownToTypst(text, mdPath, mockContext, { dependencies: deps });

        expect(deps.size).toBeGreaterThanOrEqual(4);
        expect(typstCode).toContain('Systèmes Multi-Agents');

        const baseDir = path.dirname(mdPath);
        const tempTyp = path.join(baseDir, '.test-multi.typ');
        const tempSvg = path.join(baseDir, '.test-multi-{n}.svg');
        fs.writeFileSync(tempTyp, typstCode, 'utf8');

        try {
            const rootPath = path.resolve(__dirname, '../..');
            await execFileAsync('typst', ['compile', tempTyp, tempSvg, '--root', rootPath]);
            const page1 = path.join(baseDir, '.test-multi-1.svg');
            expect(fs.existsSync(page1)).toBe(true);
        } finally {
            if (fs.existsSync(tempTyp)) {
                fs.unlinkSync(tempTyp);
            }
            for (const f of fs.readdirSync(baseDir)) {
                if (f.startsWith('.test-multi-')) {
                    fs.unlinkSync(path.join(baseDir, f));
                }
            }
        }
    });

    it('compile example/bibliographie/bibliographie.md avec succès via Typst', async () => {
        const mdPath = path.resolve(__dirname, '../../example/bibliographie/bibliographie.md');
        if (!fs.existsSync(mdPath)) {
            return;
        }

        const mockContext = {
            asAbsolutePath: (p: string) => path.resolve(__dirname, '../..', p)
        } as any;

        const text = fs.readFileSync(mdPath, 'utf8');
        const deps = new Set<string>();
        const typstCode = compileMarkdownToTypst(text, mdPath, mockContext, { dependencies: deps });

        expect(typstCode).toContain('#bibliography("./references.bib", style: "ieee")');

        const baseDir = path.dirname(mdPath);
        const tempTyp = path.join(baseDir, '.test-bib.typ');
        const tempSvg = path.join(baseDir, '.test-bib-{n}.svg');
        fs.writeFileSync(tempTyp, typstCode, 'utf8');

        try {
            const rootPath = path.resolve(__dirname, '../..');
            await execFileAsync('typst', ['compile', tempTyp, tempSvg, '--root', rootPath]);
            const page1 = path.join(baseDir, '.test-bib-1.svg');
            expect(fs.existsSync(page1)).toBe(true);
        } finally {
            if (fs.existsSync(tempTyp)) {
                fs.unlinkSync(tempTyp);
            }
            for (const f of fs.readdirSync(baseDir)) {
                if (f.startsWith('.test-bib-')) {
                    fs.unlinkSync(path.join(baseDir, f));
                }
            }
        }
    });
});
