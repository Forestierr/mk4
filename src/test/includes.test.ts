import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveIncludes } from '../parser/includes';

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
